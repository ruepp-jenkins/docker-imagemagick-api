# AI Codebase Reference - ImageMagick API

> **Purpose**: This document provides a comprehensive overview of the ImageMagick API codebase for AI assistants to quickly understand the project structure, architecture, and key components.

---

## Project Overview

**ImageMagick API** is a production-ready, containerized RESTful web service that wraps ImageMagick CLI functionality for server-based image processing operations.

**Primary Use Case**: Provide HTTP endpoints for common image manipulation tasks (resize, convert, rotate, crop, optimize, terminal dithering) with base64-encoded responses.

**Deployment Model**: Docker container (Alpine Linux + Node.js LTS + ImageMagick)

---

## Technology Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Runtime | Node.js | LTS version (Alpine Linux) |
| Framework | Express.js | v4.18.2 |
| Image Processing | ImageMagick | CLI-based (via child_process) |
| File Upload | Multer | v1.4.5-lts.1 (memory storage) |
| API Docs | Swagger UI Express | v5.0.0 |
| Containerization | Docker | Multi-platform (amd64/arm64) |
| CI/CD | Jenkins | Automated builds with security scanning |
| Security Scanning | Trivy | SBOM generation + vulnerability checks |

---

## Architecture Overview

### Request Flow
```
Client Request (multipart/form-data)
    ↓
Express Server (:3000)
    ↓
Multer Middleware (file upload to memory)
    ↓
Auth Middleware (optional token validation)
    ↓
Route Handler (POST endpoint)
    ↓
File Handler (save to tmpfiles/ with UUID)
    ↓
Parameter Validation
    ↓
ImageMagick Wrapper (spawn CLI process)
    ↓
Base64 Encoding
    ↓
JSON Response (success + image data)
    ↓
File Cleanup (temp file deletion)
```

### Design Patterns

1. **Middleware Chain**: Authentication → Error Handling → Routing
2. **Wrapper/Abstraction**: ImageMagick CLI operations abstracted into utility modules
3. **Consistent Response Format**: All endpoints return `{ success, image, format, metadata }` or `{ success, errormessage }`
4. **Temporary File Management**: UUID-based naming with automatic cleanup
5. **Validation Layer**: Parameter validation utility for all inputs

---

## Directory Structure

```
src/
├── middleware/
│   ├── auth.js              # Bearer token authentication
│   └── errorHandler.js      # Global error handler (last in chain)
├── routes/                  # One file per endpoint
│   ├── terminal.js          # POST /terminal (dithering)
│   ├── resize.js            # POST /resize
│   ├── convert.js           # POST /convert
│   ├── rotate.js            # POST /rotate
│   ├── crop.js              # POST /crop
│   └── optimize.js          # POST /optimize
├── utils/
│   ├── fileHandler.js       # Temp file save/cleanup
│   ├── imagemagick.js       # CLI command wrapper
│   └── response.js          # Validation + response formatting
└── server.js                # App entry point

tmpfiles/                    # Temp storage (auto-created)
scripts/                     # Build/deploy scripts
swagger.yml                  # OpenAPI 3.0 specification
Dockerfile                   # Alpine-based multi-stage build
docker-compose.yml           # Production deployment config
Jenkinsfile                  # CI/CD pipeline definition
```

---

## Key Files Deep Dive

### [src/server.js](src/server.js)
- **Purpose**: Express application initialization and configuration
- **Key Responsibilities**:
  - Load Swagger YAML and mount at `/` (root)
  - Configure multer with memory storage + file size limits
  - Apply auth middleware (if `API_TOKEN` env var set)
  - Mount all route handlers
  - Apply global error handler (must be last)
  - Start HTTP server on configured port
- **Important**: Error handler middleware must be registered AFTER all routes

### [src/middleware/auth.js](src/middleware/auth.js)
- **Pattern**: Bearer token authentication
- **Behavior**:
  - If `API_TOKEN` env var not set → skip authentication
  - If set → validate `Authorization: Bearer <token>` header
  - Excludes `/` (Swagger UI) and `/health` endpoints
- **Error Response**: `401 Unauthorized` with JSON error

### [src/utils/imagemagick.js](src/utils/imagemagick.js)
- **Purpose**: Abstraction layer for ImageMagick CLI
- **Key Functions**:
  - `executeCommand(args)` - Spawns ImageMagick process with arguments
  - `getImageInfo(filePath)` - Uses `identify` command for metadata
- **Implementation**: Uses Node.js `child_process.spawn()` for CLI execution
- **Error Handling**: Captures stderr, throws on non-zero exit codes

### [src/utils/fileHandler.js](src/utils/fileHandler.js)
- **Purpose**: Temporary file lifecycle management
- **Key Functions**:
  - `saveTempFile(buffer, originalName)` - Saves uploaded file with UUID prefix
  - `cleanupFile(filePath, delay)` - Deletes temp file after optional delay
  - `ensureTempDir()` - Creates `tmpfiles/` if not exists
- **File Naming**: `{uuid}-{timestamp}-{originalName}`

### [src/utils/response.js](src/utils/response.js)
- **Purpose**: Parameter validation and response formatting
- **Key Functions**:
  - `validateNumericParam(value, min, max, defaultValue)`
  - `validateMimeType(mimetype)` - Whitelist check for image formats
  - `createSuccessResponse(imageBuffer, format, metadata)`
  - `createErrorResponse(message)`
- **Response Format**:
  - Success: `{ success: 1, image: "base64...", format: "png", metadata: {...} }`
  - Error: `{ success: 0, errormessage: "..." }`

### Route Files Pattern
All route files follow this structure:
```javascript
const express = require('express');
const router = express.Router();
const { saveTempFile, cleanupFile } = require('../utils/fileHandler');
const { executeCommand, getImageInfo } = require('../utils/imagemagick');
const { validateNumericParam, createSuccessResponse } = require('../utils/response');

router.post('/', upload.single('image'), async (req, res, next) => {
  let tempPath = null;
  try {
    // 1. Save uploaded file
    tempPath = await saveTempFile(req.file.buffer, req.file.originalname);

    // 2. Validate parameters
    const param = validateNumericParam(req.body.param, min, max, default);

    // 3. Execute ImageMagick command
    const outputPath = await executeCommand(['input', tempPath, 'operations', 'output']);

    // 4. Read result and encode base64
    const imageBuffer = await fs.promises.readFile(outputPath);
    const metadata = await getImageInfo(outputPath);

    // 5. Send response
    res.json(createSuccessResponse(imageBuffer, format, metadata));

    // 6. Cleanup
    await cleanupFile(tempPath);
    await cleanupFile(outputPath);
  } catch (error) {
    if (tempPath) await cleanupFile(tempPath);
    next(error);
  }
});

module.exports = router;
```

---

## API Endpoints Reference

### POST /terminal
- **Purpose**: Apply Floyd-Steinberg dithering for terminal display
- **Parameters**:
  - `image` (file, required)
  - `width` (number, 1-1000, default: 80)
  - `height` (number, 1-1000, default: 24)
- **ImageMagick Args**: `-resize {w}x{h}! -colorspace gray -ordered-dither o8x8`

### POST /resize
- **Purpose**: Resize image with aspect ratio preservation
- **Parameters**:
  - `image` (file, required)
  - `width` (number, 1-10000, required)
  - `height` (number, 1-10000, required)
  - `format` (string, default: original format)
- **ImageMagick Args**: `-resize {w}x{h}`

### POST /convert
- **Purpose**: Convert between image formats
- **Parameters**:
  - `image` (file, required)
  - `format` (string, required: jpg/png/webp/gif/bmp/tiff/svg)
- **ImageMagick Args**: Just changes output extension

### POST /rotate
- **Purpose**: Rotate or flip image
- **Parameters**:
  - `image` (file, required)
  - `degrees` (number, 0-360, default: 0)
  - `flip` (string: none/horizontal/vertical, default: none)
- **ImageMagick Args**: `-rotate {degrees}` and/or `-flip/-flop`

### POST /crop
- **Purpose**: Manual crop or auto-trim whitespace
- **Parameters**:
  - `image` (file, required)
  - `auto` (boolean, default: false) - auto-trim mode
  - Manual mode: `x`, `y`, `width`, `height`
- **ImageMagick Args**: `-crop {w}x{h}+{x}+{y}` or `-trim`

### POST /optimize
- **Purpose**: Reduce file size with quality adjustment
- **Parameters**:
  - `image` (file, required)
  - `quality` (number, 1-100, default: 85)
  - `format` (string, default: original)
- **ImageMagick Args**: `-quality {quality}`

### GET /health
- **Purpose**: Container health check endpoint
- **Authentication**: None (excluded from auth middleware)
- **Response**: `{ status: "healthy", uptime: seconds }`

### GET /
- **Purpose**: Swagger UI interactive documentation
- **Authentication**: None
- **Source**: [swagger.yml](swagger.yml) (OpenAPI 3.0)

---

## Configuration (Environment Variables)

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `API_TOKEN` | Bearer token for auth | None (auth disabled) | No |
| `PORT` | HTTP server port | 3000 | No |
| `NODE_ENV` | Environment mode | development | No |
| `MAX_FILE_SIZE` | Upload limit (bytes) | 52428800 (50MB) | No |
| `CLEANUP_DELAY` | File deletion delay (ms) | 0 | No |

---

## Docker Configuration

### Dockerfile Key Points
- **Base Image**: `node:lts-alpine`
- **ImageMagick Installation**: `apk add imagemagick imagemagick-dev`
- **Supporting Libs**: librsvg, inkscape, fontconfig, freetype, libpng, libjpeg-turbo
- **Working Directory**: `/usr/src/app`
- **Exposed Port**: 3000
- **User**: Runs as `node` (non-root)
- **Multi-platform**: Built for linux/amd64 and linux/arm64

### docker-compose.yml
- **Service Name**: `imagemagick-api`
- **Resource Limits**: 2 CPU, 1GB memory (limit), 0.5 CPU, 256MB (reservation)
- **Restart Policy**: `unless-stopped`
- **Health Check**: HTTP GET to `/health` every 30s
- **Port Mapping**: 3000:3000

---

## CI/CD Pipeline (Jenkinsfile)

### Triggers
- Cron: `H/30 * * * *` (every 30 minutes, checks for Node.js LTS updates)
- Manual builds via Jenkins UI

### Stages
1. **Checkout**: Clone from GitHub main branch
2. **Build**: Docker buildx multi-platform build → push to Docker Hub
3. **SBOM Generation**: Trivy generates CycloneDX format
4. **Vulnerability Scan**: Trivy security scan
5. **DependencyTrack**: Upload SBOM (currently commented out)

### Notifications
- Discord webhooks for build success/failure
- Includes commit info, build duration, console logs

### Build Options
- Concurrent builds: Disabled (aborts previous)
- Build timeout: 60 minutes
- Disable resume: Enabled

---

## Security Considerations

### Authentication
- Optional Bearer token authentication
- Token configured via `API_TOKEN` environment variable
- Health check and API docs endpoints excluded from auth

### Input Validation
- File size limits (default 50MB, configurable)
- MIME type whitelist (only image formats accepted)
- Numeric parameter range validation
- File extension validation for format conversions

### File Handling
- Temporary files isolated in dedicated directory
- UUID-based unique naming prevents collisions
- Automatic cleanup after processing
- Memory storage for uploads (no disk writes until processing)

### Container Security
- Runs as non-root user (`node`)
- Resource limits prevent DoS (CPU/memory caps)
- Regular vulnerability scanning via Trivy
- SBOM tracking for dependency management
- Alpine Linux base for minimal attack surface

### Error Handling
- Generic error messages to prevent information leakage
- ImageMagick stderr captured but not exposed to client
- Global error handler prevents unhandled exceptions

---

## Common Modification Scenarios

### Adding a New Endpoint
1. Create new route file in `src/routes/`
2. Follow the route pattern (see "Route Files Pattern" above)
3. Import and mount route in [src/server.js](src/server.js)
4. Add endpoint definition to [swagger.yml](swagger.yml)
5. Update [README.md](README.md) with endpoint documentation

### Changing ImageMagick Behavior
- Edit `src/utils/imagemagick.js` to modify CLI argument construction
- Route files call `executeCommand()` with argument arrays
- Test with various ImageMagick versions (Alpine package updates)

### Adding Authentication Requirements
- Modify `src/middleware/auth.js` to change excluded paths
- Or remove auth middleware from `server.js` entirely
- Update Swagger docs to reflect auth requirements

### Adjusting Resource Limits
- Docker Compose: Edit `deploy.resources` in [docker-compose.yml](docker-compose.yml)
- File upload: Change `MAX_FILE_SIZE` env var or multer limits in [src/server.js](src/server.js)
- Processing timeout: Add timeout to `executeCommand()` in [src/utils/imagemagick.js](src/utils/imagemagick.js)

---

## Testing Considerations

### Manual Testing
- Swagger UI at `/` provides interactive testing interface
- Health check: `curl http://localhost:3000/health`
- Example resize:
  ```bash
  curl -X POST http://localhost:3000/resize \
    -F "image=@test.jpg" \
    -F "width=800" \
    -F "height=600"
  ```

### Edge Cases to Test
- Very large files (near MAX_FILE_SIZE limit)
- Invalid image formats/corrupted files
- Extreme parameter values (min/max ranges)
- Missing required parameters
- Invalid authentication tokens
- Concurrent requests (file naming collisions)
- ImageMagick command failures

### No Automated Tests
- Project currently lacks unit/integration tests
- Manual testing via Swagger UI is primary validation
- CI/CD pipeline only validates Docker build success

---

## Maintenance Notes

### Dependency Updates
- Node.js version: Follows LTS, Alpine package manager handles updates
- ImageMagick: Alpine package updates (automatic via `apk upgrade`)
- npm packages: Manual updates via `npm update` + testing
- Jenkins pipeline checks for Node.js LTS updates every 30 minutes

### Monitoring in Production
- Health check endpoint for orchestrator liveness probes
- Docker logs: `docker-compose logs -f imagemagick-api`
- No built-in metrics/telemetry (consider adding)

### Known Limitations
- No request rate limiting (consider adding middleware)
- No persistent storage (all operations in-memory/temp files)
- Synchronous image processing (blocking, not queued)
- No webhook/async response options
- No image caching mechanism

---

## Quick Reference Commands

### Development
```bash
npm install              # Install dependencies
npm run dev              # Start with nodemon (auto-reload)
npm start                # Production start
```

### Docker
```bash
docker-compose up -d     # Start container
docker-compose logs -f   # View logs
docker-compose down      # Stop container
docker build -t imagemagick-api .  # Build image
```

### ImageMagick CLI (for debugging)
```bash
docker exec -it <container> sh   # Enter container
magick --version                 # Check ImageMagick version
magick identify image.jpg        # Get image info
```

---

## Important Implementation Details

### Why Multer Memory Storage?
- Files stored in memory as Buffer objects
- Faster than disk I/O for small-medium files
- Simpler cleanup (no orphaned files on crash)
- Trade-off: Higher memory usage during upload

### Why UUID Prefixes for Temp Files?
- Prevents filename collisions in concurrent requests
- Timestamp adds additional uniqueness
- Original filename preserved for debugging
- Format: `{uuid}-{timestamp}-{originalFilename}`

### Why Separate Output Files?
- ImageMagick writes to new file (doesn't overwrite input)
- Allows format conversion
- Both input and output cleaned up after response
- Pattern: `output-{uuid}.{format}`

### Why Base64 Response?
- JSON-compatible (no multipart response complexity)
- Client-side rendering without additional request
- Simpler than streaming/chunked responses
- Trade-off: ~33% larger payload size

---

## Future Enhancement Ideas

- [ ] Add request rate limiting middleware
- [ ] Implement job queue for async processing (Bull/BullMQ)
- [ ] Add metrics/telemetry (Prometheus exporter)
- [ ] Implement response caching (Redis)
- [ ] Add automated test suite (Jest/Mocha)
- [ ] Support batch operations (multiple images)
- [ ] Add webhook callback option for async responses
- [ ] Implement streaming responses for large images
- [ ] Add image comparison/diff endpoint
- [ ] Support for video thumbnail generation (ffmpeg)

---

**Last Updated**: 2025-12-25
**Document Version**: 1.0
**Codebase Version**: Based on git commit `55a435e`
