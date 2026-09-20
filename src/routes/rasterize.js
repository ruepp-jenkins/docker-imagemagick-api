const express = require('express');
const multer = require('multer');
const {rasterize, parseOptions} = require('../utils/rasterize');
const {successResponse, binaryResponse} = require('../utils/response');
const router = express.Router();
const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: 5 * 1024 * 1024}});

// Generic image conversion only: no URL fetching, team data, layout or fonts.
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file?.buffer?.length) throw Object.assign(new Error('image file is required'), {statusCode: 400});
    const options = parseOptions(req.body);
    const responseMode = req.query.responseMode || 'base64';
    if (!['base64', 'binary'].includes(responseMode)) throw Object.assign(new Error('Invalid responseMode'), {statusCode: 400});
    const result = await rasterize(req.file.buffer, options);
    const metadata = {format: result.format, width: result.width, height: result.height, channels: 4, depth: 8};
    if (responseMode === 'binary') {
      binaryResponse(res, result.buffer, metadata, result.format, `rasterized.${result.format}`);
    } else {
      res.json(successResponse(result.buffer.toString('base64'), {
        ...metadata, mimetype: result.format === 'png' ? 'image/png' : 'application/octet-stream'
      }));
    }
  } catch (error) {next(error);}
});
module.exports = router;
