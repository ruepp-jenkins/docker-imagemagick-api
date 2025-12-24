const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Import route handlers
const terminalRoute = require('./routes/terminal');
const resizeRoute = require('./routes/resize');
const convertRoute = require('./routes/convert');
const rotateRoute = require('./routes/rotate');
const cropRoute = require('./routes/crop');
const optimizeRoute = require('./routes/optimize');

const app = express();
const PORT = process.env.PORT || 3000;

// Load Swagger documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yml'));

// Parse JSON bodies (for non-multipart requests)
app.use(express.json());

// Swagger UI (no auth required for documentation)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ImageMagick API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Apply authentication middleware globally (except for /api-docs)
app.use(authMiddleware);

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    success: 1,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API information endpoint
app.get('/', (req, res) => {
  res.json({
    success: 1,
    name: 'ImageMagick API',
    version: '1.0.0',
    description: 'RESTful API wrapper for ImageMagick functionality',
    endpoints: [
      {
        path: '/terminal',
        method: 'POST',
        description: 'Apply terminal dithering effect to image',
        parameters: ['image (file)']
      },
      {
        path: '/resize',
        method: 'POST',
        description: 'Resize image with optional aspect ratio preservation',
        parameters: ['image (file)', 'width (optional)', 'height (optional)', 'format']
      },
      {
        path: '/convert',
        method: 'POST',
        description: 'Convert image between different formats',
        parameters: ['image (file)', 'format', 'quality (optional)']
      },
      {
        path: '/rotate',
        method: 'POST',
        description: 'Rotate or flip image',
        parameters: ['image (file)', 'operation (rotate/flip)', 'value', 'format']
      },
      {
        path: '/crop',
        method: 'POST',
        description: 'Crop image to specific dimensions or auto-trim borders',
        parameters: ['image (file)', 'mode (manual/trim)', 'format', 'width (manual)', 'height (manual)', 'x (manual)', 'y (manual)']
      },
      {
        path: '/optimize',
        method: 'POST',
        description: 'Optimize image quality and file size',
        parameters: ['image (file)', 'quality (1-100)', 'format']
      }
    ],
    authentication: process.env.API_TOKEN ? 'enabled' : 'disabled'
  });
});

// Mount route handlers
app.use('/terminal', terminalRoute);
app.use('/resize', resizeRoute);
app.use('/convert', convertRoute);
app.use('/rotate', rotateRoute);
app.use('/crop', cropRoute);
app.use('/optimize', optimizeRoute);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: 0,
    errormessage: `Endpoint ${req.method} ${req.path} not found`
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║       ImageMagick API Server Started           ║
╚════════════════════════════════════════════════╝

  Port:           ${PORT}
  Environment:    ${process.env.NODE_ENV || 'development'}
  Authentication: ${process.env.API_TOKEN ? 'Enabled' : 'Disabled'}
  Max File Size:  ${(parseInt(process.env.MAX_FILE_SIZE || '52428800', 10) / 1024 / 1024).toFixed(0)} MB

  Endpoints:
  - GET  /              API information
  - GET  /health        Health check
  - GET  /api-docs      Swagger UI (Browser-based testing)
  - POST /terminal      Terminal dithering effect
  - POST /resize        Resize images
  - POST /convert       Format conversion
  - POST /rotate        Rotate/flip images
  - POST /crop          Crop images
  - POST /optimize      Optimize images

  Open http://localhost:${PORT}/api-docs in your browser to test the API!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
