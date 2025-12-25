const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const { validateFile, validateParams, validateNumeric, successResponse, binaryResponse } = require('../utils/response');
const { saveTempFile, readFileAsBase64, cleanupFiles, getExtension, getMimeType } = require('../utils/fileHandler');
const { resizeImage } = require('../utils/imagemagick');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10)
  }
});

/**
 * POST /resize
 * Resize image with optional aspect ratio preservation
 *
 * Request:
 *   - Body (multipart/form-data):
 *     - image: Image file (required)
 *     - width: Target width in pixels (optional if height provided)
 *     - height: Target height in pixels (optional if width provided)
 *     - format: Output format - png, jpg, webp, etc. (required)
 *
 * Behavior:
 *   - Both width and height: Image is resized to exact dimensions (may distort)
 *   - Only width: Height is calculated to preserve aspect ratio
 *   - Only height: Width is calculated to preserve aspect ratio
 *
 * Response:
 *   - success: 1 on success, 0 on error
 *   - image: Base64 encoded resized image (on success)
 *   - width: Final image width
 *   - height: Final image height
 *   - errormessage: Error description (on error)
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  let inputPath = null;
  let outputPath = null;

  try {
    // Validate uploaded file
    validateFile(req.file);

    // Get parameters
    const { width, height, format } = req.body;

    // Validate format is provided
    validateParams({ format }, ['format']);

    // Validate at least one dimension is provided
    if (!width && !height) {
      throw new Error('At least one of width or height must be specified');
    }

    // Validate numeric parameters
    validateNumeric({ width, height }, ['width', 'height']);

    // Save input file
    const inputExt = getExtension(req.file.mimetype);
    inputPath = await saveTempFile(req.file.buffer, inputExt);

    // Generate output path
    const outputExt = getExtension(format);
    outputPath = inputPath.replace(/\.[^.]+$/, `_resized.${outputExt}`);

    // Resize image
    const targetWidth = width ? parseInt(width, 10) : null;
    const targetHeight = height ? parseInt(height, 10) : null;
    await resizeImage(inputPath, outputPath, targetWidth, targetHeight, format);

    // Get response mode
    const responseMode = req.query.responseMode || 'base64';

    // Validate responseMode
    if (!['base64', 'binary'].includes(responseMode)) {
      throw new Error('responseMode must be "base64" or "binary"');
    }

    // Read output image
    const imageBuffer = await fs.readFile(outputPath);

    // Send response based on mode
    if (responseMode === 'binary') {
      binaryResponse(res, imageBuffer, {
        format: outputExt,
        width: targetWidth || 'auto',
        height: targetHeight || 'auto'
      }, outputExt, `resized.${outputExt}`);
    } else {
      const base64Image = imageBuffer.toString('base64');
      res.json(successResponse(base64Image, {
        mimetype: getMimeType(outputExt),
        format: outputExt,
        width: targetWidth || 'auto',
        height: targetHeight || 'auto'
      }));
    }

    // Cleanup temp files
    await cleanupFiles([inputPath, outputPath]);
  } catch (error) {
    // Cleanup on error
    if (inputPath || outputPath) {
      await cleanupFiles([inputPath, outputPath].filter(Boolean));
    }
    next(error);
  }
});

module.exports = router;
