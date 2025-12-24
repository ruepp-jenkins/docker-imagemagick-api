const express = require('express');
const multer = require('multer');
const { validateFile } = require('../utils/response');
const { successResponse } = require('../utils/response');
const { saveTempFile, readFileAsBase64, cleanupFiles, getExtension } = require('../utils/fileHandler');
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

    // Read output as base64
    const base64Image = await readFileAsBase64(outputPath);

    // Cleanup temp files
    await cleanupFiles([inputPath, outputPath]);

    // Send success response
    res.json(successResponse(base64Image, {
      format: 'png',
      effect: 'terminal-dithering'
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
