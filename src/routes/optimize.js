const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const { validateFile, validateParams, validateNumeric, successResponse, binaryResponse } = require('../utils/response');
const { saveTempFile, readFileAsBase64, cleanupFiles, getExtension, getMimeType } = require('../utils/fileHandler');
const { optimizeImage } = require('../utils/imagemagick');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10)
  }
});

/**
 * POST /optimize
 * Optimize image quality and file size
 *
 * Request:
 *   - Body (multipart/form-data):
 *     - image: Image file (required)
 *     - quality: Quality percentage 1-100 (required, lower = smaller file)
 *
 * Response:
 *   - success: 1 on success, 0 on error
 *   - image: Base64 encoded optimized image (on success)
 *   - quality: Applied quality setting
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
    const { quality } = req.body;

    // Validate required parameters
    validateParams({ quality }, ['quality']);

    // Validate quality
    validateNumeric({ quality }, ['quality']);
    const qualityNum = parseInt(quality, 10);
    if (qualityNum < 1 || qualityNum > 100) {
      throw new Error('Quality must be between 1 and 100');
    }

    // Save input file
    const inputExt = getExtension(req.file.mimetype);
    inputPath = await saveTempFile(req.file.buffer, inputExt);

    // Generate output path (keep original format)
    outputPath = inputPath.replace(/\.[^.]+$/, `_optimized.${inputExt}`);

    // Optimize image
    await optimizeImage(inputPath, outputPath, qualityNum, inputExt);

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
        format: inputExt,
        quality: qualityNum
      }, inputExt, `optimized.${inputExt}`);
    } else {
      const base64Image = imageBuffer.toString('base64');
      res.json(successResponse(base64Image, {
        mimetype: getMimeType(inputExt),
        format: inputExt,
        quality: qualityNum
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
