const express = require('express');
const multer = require('multer');
const { validateFile, validateParams, validateNumeric } = require('../utils/response');
const { successResponse } = require('../utils/response');
const { saveTempFile, readFileAsBase64, cleanupFiles, getExtension } = require('../utils/fileHandler');
const { convertFormat } = require('../utils/imagemagick');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10)
  }
});

/**
 * POST /convert
 * Convert image between different formats
 *
 * Request:
 *   - Body (multipart/form-data):
 *     - image: Image file (required)
 *     - format: Target format - png, jpg, webp, gif, bmp, tiff, svg (required)
 *     - quality: Image quality for lossy formats like jpg/webp (1-100, optional)
 *
 * Response:
 *   - success: 1 on success, 0 on error
 *   - image: Base64 encoded converted image (on success)
 *   - format: Output format
 *   - errormessage: Error description (on error)
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  let inputPath = null;
  let outputPath = null;

  try {
    // Validate uploaded file
    validateFile(req.file);

    // Get parameters
    const { format, quality } = req.body;

    // Validate required parameters
    validateParams({ format }, ['format']);

    // Validate quality if provided
    if (quality) {
      validateNumeric({ quality }, ['quality']);
      const qualityNum = parseInt(quality, 10);
      if (qualityNum < 1 || qualityNum > 100) {
        throw new Error('Quality must be between 1 and 100');
      }
    }

    // Validate format
    const validFormats = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'svg'];
    const targetFormat = format.toLowerCase();
    if (!validFormats.includes(targetFormat)) {
      throw new Error(`Invalid format. Supported formats: ${validFormats.join(', ')}`);
    }

    // Save input file
    const inputExt = getExtension(req.file.mimetype);
    inputPath = await saveTempFile(req.file.buffer, inputExt);

    // Generate output path
    const outputExt = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    outputPath = inputPath.replace(/\.[^.]+$/, `_converted.${outputExt}`);

    // Convert format
    const qualityNum = quality ? parseInt(quality, 10) : null;
    await convertFormat(inputPath, outputPath, targetFormat, qualityNum);

    // Read output as base64
    const base64Image = await readFileAsBase64(outputPath);

    // Cleanup temp files
    await cleanupFiles([inputPath, outputPath]);

    // Send success response
    res.json(successResponse(base64Image, {
      format: outputExt,
      quality: qualityNum || 'default'
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
