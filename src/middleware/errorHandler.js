/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent JSON response
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Handle multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: 0,
      errormessage: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE || 52428800} bytes (50 MB).`
    });
  }

  // Handle multer field errors
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: 0,
      errormessage: 'Unexpected file field. Please use "image" as the field name.'
    });
  }

  // Handle other multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: 0,
      errormessage: `Upload error: ${err.message}`
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: 0,
    errormessage: message
  });
};

module.exports = errorHandler;
