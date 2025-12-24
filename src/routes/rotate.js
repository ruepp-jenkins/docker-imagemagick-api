const express = require('express');
const multer = require('multer');
const { validateFile, validateParams } = require('../utils/response');
const { successResponse } = require('../utils/response');
const { saveTempFile, readFileAsBase64, cleanupFiles, getExtension } = require('../utils/fileHandler');
const { rotateImage, flipImage } = require('../utils/imagemagick');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10)
  }
});

/**
 * POST /rotate
 * Rotate or flip image
 *
 * Request:
 *   - Body (multipart/form-data):
 *     - image: Image file (required)
 *     - operation: 'rotate' or 'flip' (required)
 *     - value: For rotate: 90, 180, 270 (degrees). For flip: 'horizontal' or 'vertical' (required)
 *     - format: Output format - png, jpg, webp, etc. (required)
 *
 * Response:
 *   - success: 1 on success, 0 on error
 *   - image: Base64 encoded transformed image (on success)
 *   - operation: Applied operation
 *   - errormessage: Error description (on error)
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  let inputPath = null;
  let outputPath = null;

  try {
    // Validate uploaded file
    validateFile(req.file);

    // Get parameters
    const { operation, value, format } = req.body;

    // Validate required parameters
    validateParams({ operation, value, format }, ['operation', 'value', 'format']);

    const op = operation.toLowerCase();

    // Validate operation type
    if (!['rotate', 'flip'].includes(op)) {
      throw new Error('Operation must be "rotate" or "flip"');
    }

    // Save input file
    const inputExt = getExtension(req.file.mimetype);
    inputPath = await saveTempFile(req.file.buffer, inputExt);

    // Generate output path
    const outputExt = getExtension(format);
    outputPath = inputPath.replace(/\.[^.]+$/, `_${op}.${outputExt}`);

    // Apply operation
    if (op === 'rotate') {
      const degrees = parseInt(value, 10);
      if (![90, 180, 270, -90, -180, -270].includes(degrees)) {
        throw new Error('Rotation degrees must be 90, 180, or 270 (or negative equivalents)');
      }
      await rotateImage(inputPath, outputPath, degrees, format);
    } else if (op === 'flip') {
      const direction = value.toLowerCase();
      if (!['horizontal', 'vertical'].includes(direction)) {
        throw new Error('Flip direction must be "horizontal" or "vertical"');
      }
      await flipImage(inputPath, outputPath, direction, format);
    }

    // Read output as base64
    const base64Image = await readFileAsBase64(outputPath);

    // Cleanup temp files
    await cleanupFiles([inputPath, outputPath]);

    // Send success response
    res.json(successResponse(base64Image, {
      format: outputExt,
      operation: op,
      value: value
    }));
  } catch (error) {
    // Cleanup on error
    if (inputPath || outputPath) {
      await cleanupFiles([inputPath, outputPath].filter(Boolean));
    }
    next(error);
  }
});

module.exports = router;
