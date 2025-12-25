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
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Load Swagger documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yml'));

// Parse JSON bodies (for non-multipart requests)
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log after response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const method = req.method;
    const path = req.path;
    const status = res.statusCode;

    // Log format: [timestamp] IP -> METHOD /path - STATUS (duration ms)
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${timestamp}] ${ip} -> ${method} ${path} - ${status} (${duration}ms)`);
  });

  next();
});

// Swagger UI at root (no auth required for documentation)
app.get('/', swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ImageMagick API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Apply authentication middleware globally (except for / and /health)
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
  - GET  /              Swagger UI (Browser-based testing)
  - GET  /health        Health check
  - POST /terminal      Terminal dithering effect
  - POST /resize        Resize images
  - POST /convert       Format conversion
  - POST /rotate        Rotate/flip images
  - POST /crop          Crop images
  - POST /optimize      Optimize images

  Open http://localhost:${PORT}/ in your browser to test the API!
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
