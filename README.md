# ImageMagick API

A RESTful API for ImageMagick functionality running in a Docker container.

## Features

- **Swagger UI** - Interactive API documentation and browser-based testing
- **Terminal Dithering Effect** - Floyd-Steinberg dithering for terminal display
- **Image Resize** - Resize with automatic aspect ratio calculation
- **Format Conversion** - Convert between different image formats
- **Rotation & Flip** - Rotate and flip images
- **Image Cropping** - Manual or automatic cropping
- **Image Optimization** - Quality optimization for smaller file sizes
- **Optional Authentication** - Token-based authentication
- **Parallel Processing** - Asynchronous processing of multiple requests

## Quick Start

### With Docker Compose (recommended)

```bash
# 1. Clone repository or download files
cd imagemagick-api

# 2. Build and start container
docker-compose up -d

# 3. API is available at http://localhost:3000
curl http://localhost:3000/health

# 4. Open Swagger UI in browser for testing
# http://localhost:3000/api-docs
```

### Swagger UI - Browser-based Testing

After starting, you can test the API directly in your browser:

1. Open **http://localhost:3000/api-docs** in your browser
2. You'll see interactive API documentation
3. Click on an endpoint (e.g. `/terminal`)
4. Click "Try it out"
5. Upload an image and click "Execute"
6. The response will be displayed directly in the browser

**Authentication in Swagger:**

- If `API_TOKEN` is set, click "Authorize" (top right)
- Enter your token (without "Bearer")
- Click "Authorize" and close the window

````

### With Docker

```bash
# Build image
docker build -t imagemagick-api .

# Start container
docker run -d -p 3000:3000 --name imagemagick-api imagemagick-api

# With authentication
docker run -d -p 3000:3000 -e API_TOKEN="your-secret-token" imagemagick-api
````

## Configuration

### Environment Variables

| Variable        | Description                                  | Default            |
| --------------- | -------------------------------------------- | ------------------ |
| `API_TOKEN`     | Optional: API token for authentication      | (empty, no auth)   |
| `PORT`          | Server port                                  | 3000               |
| `NODE_ENV`      | Environment (production/development)         | production         |
| `MAX_FILE_SIZE` | Maximum upload size in bytes                 | 52428800 (50 MB)   |
| `CLEANUP_DELAY` | Delay for deleting temporary files (ms)      | 0                  |

### Enable Authentication

Edit `docker-compose.yml` and set `API_TOKEN`:

```yaml
environment:
  - API_TOKEN=my-secret-token-12345
```

Or when starting directly with Docker:

```bash
docker run -d -p 3000:3000 -e API_TOKEN="my-secret-token-12345" imagemagick-api
```

Requests must then include the token in the header:

```bash
Authorization: Bearer my-secret-token-12345
```

## API Endpoints

### Response Modes

All image processing endpoints (`/resize`, `/convert`, `/rotate`, `/crop`, `/optimize`, `/terminal`) support two response modes via the `responseMode` query parameter:

#### Base64 Mode (Default)

Returns JSON with the image encoded as a base64 string. This is the default mode and maintains backward compatibility.

**Example:**

```bash
curl -X POST http://localhost:3000/resize \
  -F "image=@input.jpg" \
  -F "width=800" \
  -F "height=600" \
  -F "format=png"
```

**Response:**

```json
{
  "success": 1,
  "image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mimetype": "image/png",
  "format": "png",
  "width": 800,
  "height": 600
}
```

#### Binary Mode (Recommended)

Returns raw binary image data with metadata in HTTP response headers. This mode provides significant performance benefits.

**Example:**

```bash
curl -X POST "http://localhost:3000/resize?responseMode=binary" \
  -F "image=@input.jpg" \
  -F "width=800" \
  -F "height=600" \
  -F "format=png" \
  --output resized.png
```

**Response Structure:**

- **Body**: Raw binary image data
- **Headers**:
  - `Content-Type`: image/png (or image/jpeg, etc.)
  - `Content-Disposition`: attachment; filename="resized.png"
  - `X-Image-Success`: 1
  - `X-Image-Mimetype`: image/png (matches Content-Type)
  - `X-Image-Format`: png
  - `X-Image-Width`: 800 (or "auto")
  - `X-Image-Height`: 600 (or "auto")

**Benefits:**
- ~33% smaller response size (no base64 overhead)
- ~15% faster processing (no encoding step)
- Direct binary image data (no client-side decoding needed)
- Simple response format (just save the body to a file)

**Reading Headers Example (Node.js):**

```javascript
const response = await fetch('http://localhost:3000/resize?responseMode=binary', {
  method: 'POST',
  body: formData
});

// Get metadata from headers
const metadata = {
  success: response.headers.get('X-Image-Success'),
  mimetype: response.headers.get('X-Image-Mimetype'),
  format: response.headers.get('X-Image-Format'),
  width: response.headers.get('X-Image-Width'),
  height: response.headers.get('X-Image-Height')
};

// Get binary image data
const imageBuffer = await response.arrayBuffer();

// Save to file
await fs.writeFile('output.png', Buffer.from(imageBuffer));
```

**Reading Headers Example (curl):**

```bash
curl -X POST "http://localhost:3000/resize?responseMode=binary" \
  -F "image=@input.jpg" \
  -F "width=800" \
  -F "format=png" \
  -D headers.txt \
  --output resized.png

# View headers
cat headers.txt
```

---

### GET /

API information and available endpoints

```bash
curl http://localhost:3000/
```

### GET /health

Health check endpoint

```bash
curl http://localhost:3000/health
```

### POST /terminal

Apply terminal dithering effect (Floyd-Steinberg dithering)

**Parameters:**

- `image` (file, required) - Image file

**Example:**

```bash
curl -X POST http://localhost:3000/terminal \
  -F "image=@downtown.png" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "format": "png",
  "effect": "terminal-dithering"
}
```

### POST /resize

Resize image with optional aspect ratio calculation

**Parameters:**

- `image` (file, required) - Image file
- `width` (number, optional) - Target width in pixels
- `height` (number, optional) - Target height in pixels
- `format` (string, required) - Output format (png, jpg, webp, etc.)

**Behavior:**

- Both specified: Exact dimensions (may distort)
- Only width: Height calculated automatically
- Only height: Width calculated automatically

**Example:**

```bash
curl -X POST http://localhost:3000/resize \
  -F "image=@photo.jpg" \
  -F "width=800" \
  -F "format=png" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "format": "png",
  "width": 800,
  "height": "auto"
}
```

### POST /convert

Convert image format

**Parameters:**

- `image` (file, required) - Image file
- `format` (string, required) - Target format (png, jpg, webp, gif, bmp, tiff, svg)
- `quality` (number, optional) - Quality for JPG/WebP (1-100)

**Example:**

```bash
curl -X POST http://localhost:3000/convert \
  -F "image=@image.png" \
  -F "format=jpg" \
  -F "quality=85" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "format": "jpg",
  "quality": 85
}
```

### POST /rotate

Rotate or flip image

**Parameters:**

- `image` (file, required) - Image file
- `operation` (string, required) - "rotate" or "flip"
- `value` (string/number, required) -
  - For rotate: 90, 180, 270 (degrees)
  - For flip: "horizontal" or "vertical"
- `format` (string, required) - Output format

**Example Rotation:**

```bash
curl -X POST http://localhost:3000/rotate \
  -F "image=@photo.jpg" \
  -F "operation=rotate" \
  -F "value=90" \
  -F "format=jpg" \
  > response.json
```

**Example Flip:**

```bash
curl -X POST http://localhost:3000/rotate \
  -F "image=@photo.jpg" \
  -F "operation=flip" \
  -F "value=horizontal" \
  -F "format=jpg" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "format": "jpg",
  "operation": "rotate",
  "value": "90"
}
```

### POST /crop

Crop image

**Parameters:**

- `image` (file, required) - Image file
- `mode` (string, required) - "manual" or "trim"
- `format` (string, required) - Output format

**For mode="manual":**

- `width` (number, required) - Crop width
- `height` (number, required) - Crop height
- `x` (number, required) - X offset
- `y` (number, required) - Y offset

**Example Manual Crop:**

```bash
curl -X POST http://localhost:3000/crop \
  -F "image=@photo.jpg" \
  -F "mode=manual" \
  -F "width=500" \
  -F "height=500" \
  -F "x=100" \
  -F "y=50" \
  -F "format=jpg" \
  > response.json
```

**Example Auto-Trim:**

```bash
curl -X POST http://localhost:3000/crop \
  -F "image=@photo.jpg" \
  -F "mode=trim" \
  -F "format=jpg" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "format": "jpg",
  "mode": "manual",
  "width": 500,
  "height": 500,
  "x": 100,
  "y": 50
}
```

### POST /optimize

Optimize image quality and file size

**Parameters:**

- `image` (file, required) - Image file
- `quality` (number, required) - Quality 1-100 (lower = smaller file)
- `format` (string, required) - Output format

**Example:**

```bash
curl -X POST http://localhost:3000/optimize \
  -F "image=@photo.jpg" \
  -F "quality=70" \
  -F "format=jpg" \
  > response.json
```

**Response:**

```json
{
  "success": 1,
  "image": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "format": "jpg",
  "quality": 70
}
```

## Response Format

All endpoints return JSON responses:

### Success

```json
{
  "success": 1,
  "image": "base64-encoded-image-data",
  "format": "png",
  ...
}
```

### Error

```json
{
  "success": 0,
  "errormessage": "Error description"
}
```

## Converting Base64 to File

The `image` field contains base64-encoded image data. Here's how to convert it:

### JavaScript/Node.js

```javascript
const fs = require("fs");
const response = require("./response.json");

const buffer = Buffer.from(response.image, "base64");
fs.writeFileSync("output.png", buffer);
```

### Python

```python
import json
import base64

with open('response.json', 'r') as f:
    response = json.load(f)

image_data = base64.b64decode(response['image'])
with open('output.png', 'wb') as f:
    f.write(image_data)
```

### Bash

```bash
cat response.json | jq -r '.image' | base64 -d > output.png
```

## Supported Image Formats

- PNG
- JPEG/JPG
- WebP
- GIF
- BMP
- TIFF
- SVG

## Architecture

```
imagemagick-api/
├── src/
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   └── errorHandler.js      # Global error handler
│   ├── routes/
│   │   ├── terminal.js          # Terminal dithering endpoint
│   │   ├── resize.js            # Resize endpoint
│   │   ├── convert.js           # Format conversion endpoint
│   │   ├── rotate.js            # Rotation/Flip endpoint
│   │   ├── crop.js              # Crop endpoint
│   │   └── optimize.js          # Optimization endpoint
│   ├── utils/
│   │   ├── fileHandler.js       # File management utilities
│   │   ├── imagemagick.js       # ImageMagick command wrapper
│   │   └── response.js          # Response formatting
│   └── server.js                # Express server & routing
├── tmpfiles/                    # Temporary files (auto-created)
├── Dockerfile                   # Docker build configuration
├── docker-compose.yml           # Docker Compose configuration
├── package.json                 # Node.js dependencies
└── .env.example                 # Example configuration
```

## Error Handling

The API handles various error types:

- **401 Unauthorized** - Missing Authorization header
- **403 Forbidden** - Invalid API token
- **413 Payload Too Large** - File exceeds MAX_FILE_SIZE
- **400 Bad Request** - Missing or invalid parameters
- **404 Not Found** - Unknown endpoint
- **500 Internal Server Error** - ImageMagick or server error

## Development

### Local Development without Docker

```bash
# Install dependencies
npm install

# Install ImageMagick (depending on OS)
# macOS:
brew install imagemagick

# Ubuntu/Debian:
sudo apt-get install imagemagick

# Start development server
npm run dev
```

### View Logs

```bash
# Docker Compose logs
docker-compose logs -f

# Docker logs
docker logs -f imagemagick-api
```

## Performance & Scaling

- **Parallel Processing**: Node.js processes multiple requests asynchronously
- **Resource Limits**: Configurable in docker-compose.yml
- **Automatic Cleanup**: Temporary files are deleted immediately
- **Health Check**: Container health monitoring integrated

## Security

- **Optional Authentication**: Token-based authentication
- **File Size Limits**: Protection against overly large uploads
- **MIME Type Validation**: Only image files are accepted
- **Temporary File Isolation**: Secure processing in tmpfiles/
- **Error Information**: No sensitive data in error messages

## Troubleshooting

### Container won't start

```bash
docker-compose logs
```

### ImageMagick commands don't work

Check if all dependencies are installed:

```bash
docker exec -it imagemagick-api sh
magick --version
```

### Temporary files are not deleted

Check `CLEANUP_DELAY` in the configuration.

## Support

For issues or questions, please create an issue in the repository.
