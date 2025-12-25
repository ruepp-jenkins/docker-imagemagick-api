const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const { validateFile, successResponse, binaryResponse } = require('../utils/response');
const { saveTempFile, readFileAsBase64, cleanupFiles, getExtension, getMimeType } = require('../utils/fileHandler');
const { terminalDither } = require('../utils/imagemagick');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10)
  }
});

/**
 * POST /terminal
 * Apply terminal dithering effect to image
 *
 * Request:
 *   - Body (multipart/form-data):
 *     - image: Image file (required)
 *
 * Response:
 *   - success: 1 on success, 0 on error
 *   - image: Base64 encoded processed image (on success)
 *   - errormessage: Error description (on error)
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  let inputPath = null;
  let outputPath = null;

  try {
    // Validate uploaded file
    validateFile(req.file);

    // Save input file
    const inputExt = getExtension(req.file.mimetype);
    inputPath = await saveTempFile(req.file.buffer, inputExt);

    // Generate output path (always PNG for terminal effect)
    outputPath = inputPath.replace(/\.[^.]+$/, '_out.png');

    // Apply terminal dithering effect
    await terminalDither(inputPath, outputPath);

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
        format: 'png',
        effect: 'terminal-dithering'
      }, 'png', 'terminal-dithered.png');
    } else {
      const base64Image = imageBuffer.toString('base64');
      res.json(successResponse(base64Image, {
        mimetype: getMimeType('png'),
        format: 'png',
        effect: 'terminal-dithering'
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
