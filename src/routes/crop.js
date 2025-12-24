const express = require('express');
const multer = require('multer');
const { validateFile, validateParams, validateNumeric } = require('../utils/response');
const { successResponse } = require('../utils/response');
const { saveTempFile, readFileAsBase64, cleanupFiles, getExtension } = require('../utils/fileHandler');
const { cropImage, trimImage } = require('../utils/imagemagick');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10)
  }
});

/**
 * POST /crop
 * Crop image to specific dimensions or auto-trim borders
 *
 * Request:
 *   - Body (multipart/form-data):
 *     - image: Image file (required)
 *     - mode: 'manual' or 'trim' (required)
 *     - format: Output format - png, jpg, webp, etc. (required)
 *
 *     For mode='manual':
 *       - width: Crop width in pixels (required)
 *       - height: Crop height in pixels (required)
 *       - x: X offset in pixels (required, default 0)
 *       - y: Y offset in pixels (required, default 0)
 *
 *     For mode='trim':
 *       - Automatically removes transparent/white borders
 *
 * Response:
 *   - success: 1 on success, 0 on error
 *   - image: Base64 encoded cropped image (on success)
 *   - mode: Crop mode used
 *   - errormessage: Error description (on error)
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  let inputPath = null;
  let outputPath = null;

  try {
    // Validate uploaded file
    validateFile(req.file);

    // Get parameters
    const { mode, format, width, height, x, y } = req.body;

    // Validate required parameters
    validateParams({ mode, format }, ['mode', 'format']);

    const cropMode = mode.toLowerCase();

    // Validate mode
    if (!['manual', 'trim'].includes(cropMode)) {
      throw new Error('Mode must be "manual" or "trim"');
    }

    // Save input file
    const inputExt = getExtension(req.file.mimetype);
    inputPath = await saveTempFile(req.file.buffer, inputExt);

    // Generate output path
    const outputExt = getExtension(format);
    outputPath = inputPath.replace(/\.[^.]+$/, `_cropped.${outputExt}`);

    if (cropMode === 'manual') {
      // Validate manual crop parameters
      validateParams({ width, height, x, y }, ['width', 'height', 'x', 'y']);
      validateNumeric({ width, height, x, y }, ['width', 'height', 'x', 'y']);

      const cropWidth = parseInt(width, 10);
      const cropHeight = parseInt(height, 10);
      const cropX = parseInt(x, 10);
      const cropY = parseInt(y, 10);

      await cropImage(inputPath, outputPath, cropWidth, cropHeight, cropX, cropY, format);
    } else {
      // Auto-trim mode
      await trimImage(inputPath, outputPath, format);
    }

    // Read output as base64
    const base64Image = await readFileAsBase64(outputPath);

    // Cleanup temp files
    await cleanupFiles([inputPath, outputPath]);

    // Send success response
    res.json(successResponse(base64Image, {
      format: outputExt,
      mode: cropMode,
      ...(cropMode === 'manual' && {
        width: parseInt(width, 10),
        height: parseInt(height, 10),
        x: parseInt(x, 10),
        y: parseInt(y, 10)
      })
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
