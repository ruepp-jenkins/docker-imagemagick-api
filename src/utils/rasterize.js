const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { saveTempFile, cleanupFiles } = require('./fileHandler');
const run = promisify(execFile);

function inputFormat(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (/^GIF8[79]a/.test(buffer.subarray(0, 6).toString())) return 'gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  const xml = buffer.toString('utf8');
  if (/<svg(?:\s|>)/i.test(xml.slice(0, 4096))) {
    // Only self-contained SVGs: uploaded files must not read external resources.
    if (/<!DOCTYPE|<!ENTITY|@import|href\s*=\s*["']\s*(?!#|data:)|url\(\s*["']?\s*(?!#|data:)/i.test(xml)) {
      throw Object.assign(new Error('SVG must not reference external resources'), { statusCode: 400 });
    }
    return 'svg';
  }
  throw Object.assign(new Error('Supported image inputs: PNG, JPEG, GIF, WebP, SVG'), { statusCode: 400 });
}

function parseOptions({size = 72, format = 'rgba'} = {}) {
  const dimension = Number(size);
  if (!Number.isInteger(dimension) || dimension < 16 || dimension > 512) {
    throw Object.assign(new Error('size must be an integer between 16 and 512'), {statusCode: 400});
  }
  if (!['rgba', 'png'].includes(format)) {
    throw Object.assign(new Error('format must be "rgba" or "png"'), {statusCode: 400});
  }
  return {size: dimension, format};
}

async function rasterize(buffer, options = {}) {
  const {size, format} = parseOptions(options);
  const extension = inputFormat(buffer);
  let inputPath;
  try {
    inputPath = await saveTempFile(buffer, extension);
    const {stdout} = await run('magick', [
      '-limit', 'memory', '128MiB', '-limit', 'map', '128MiB',
      '-limit', 'disk', '128MiB', '-limit', 'thread', '1',
      '-background', 'none', `${inputPath}[0]`, '-auto-orient',
      '-colorspace', 'sRGB', '-alpha', 'on', '-resize', `${size}x${size}`,
      '-gravity', 'center', '-extent', `${size}x${size}`, '-depth', '8',
      '-strip', `${format}:-`
    ], {encoding: 'buffer', timeout: 15000, maxBuffer: 4 * 1024 * 1024});
    if (format === 'rgba' && stdout.length !== size * size * 4) {
      throw new Error('Unexpected RGBA output length');
    }
    return {buffer: stdout, width: size, height: size, format};
  } finally {
    if (inputPath) await cleanupFiles([inputPath]);
  }
}
module.exports = {rasterize, parseOptions, inputFormat};
