/**
 * Response Formatting Utilities
 * Consistent JSON response structure for all endpoints
 */

/**
 * Success response with base64 encoded image
 * @param {string} base64Image - Base64 encoded image data
 * @param {Object} metadata - Optional additional metadata
 * @returns {Object} Success response object
 */
const successResponse = (base64Image, metadata = {}) => {
  return {
    success: 1,
    image: base64Image,
    ...metadata
  };
};

/**
 * Error response
 * @param {string} message - Error message
 * @returns {Object} Error response object
 */
const errorResponse = (message) => {
  return {
    success: 0,
    errormessage: message
  };
};

/**
 * Validate required parameters
 * @param {Object} params - Parameters object
 * @param {string[]} required - Array of required parameter names
 * @throws {Error} If any required parameter is missing
 */
const validateParams = (params, required) => {
  const missing = required.filter(key => !params[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
};

/**
 * Validate numeric parameters
 * @param {Object} params - Parameters object with numeric values
 * @param {string[]} keys - Keys to validate
 * @throws {Error} If any value is not a valid number
 */
const validateNumeric = (params, keys) => {
  for (const key of keys) {
    if (params[key] !== undefined && params[key] !== null) {
      const value = Number(params[key]);
      if (isNaN(value) || value < 0) {
        throw new Error(`Parameter '${key}' must be a positive number`);
      }
    }
  }
};

/**
 * Validate file upload
 * @param {Object} file - Multer file object
 * @throws {Error} If file is missing or invalid
 */
const validateFile = (file) => {
  if (!file) {
    throw new Error('No image file provided. Please upload an image using the "image" field.');
  }

  // Validate MIME type
  const validMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml'
  ];

  if (!validMimeTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Supported formats: ${validMimeTypes.join(', ')}`);
  }
};

/**
 * Send binary image response with metadata in HTTP headers
 * @param {Object} res - Express response object
 * @param {Buffer} imageBuffer - Binary image data
 * @param {Object} metadata - Metadata object (format, width, height, etc.)
 * @param {string} format - Image format/extension
 * @param {string} filename - Filename for Content-Disposition header
 */
const binaryResponse = (res, imageBuffer, metadata, format, filename) => {
  const { getMimeType } = require('./fileHandler');
  const mimeType = getMimeType(format);

  // Set standard headers
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', imageBuffer.length);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Set custom metadata headers (prefixed with X-Image-)
  res.setHeader('X-Image-Success', '1');
  res.setHeader('X-Image-Mimetype', mimeType);

  // Add all metadata fields as custom headers
  Object.keys(metadata).forEach(key => {
    const headerName = `X-Image-${key.charAt(0).toUpperCase() + key.slice(1)}`;
    res.setHeader(headerName, String(metadata[key]));
  });

  // Send binary image data
  res.status(200);
  res.send(imageBuffer);
};

module.exports = {
  successResponse,
  errorResponse,
  validateParams,
  validateNumeric,
  validateFile,
  binaryResponse
};
