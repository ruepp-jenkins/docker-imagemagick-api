const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

/**
 * ImageMagick Command Utilities
 * Wrapper functions for executing ImageMagick commands
 */

/**
 * Execute ImageMagick command
 * @param {string} command - Full magick command to execute
 * @returns {Promise<{stdout: string, stderr: string}>}
 * @throws {Error} If command fails
 */
const executeCommand = async (command) => {
  try {
    const { stdout, stderr } = await execPromise(command, {
      maxBuffer: 50 * 1024 * 1024 // 50 MB buffer for large images
    });

    if (stderr && stderr.trim()) {
      console.warn('ImageMagick stderr:', stderr);
    }

    return { stdout, stderr };
  } catch (error) {
    throw new Error(`ImageMagick command failed: ${error.message}`);
  }
};

/**
 * Get image dimensions
 * @param {string} inputPath - Path to image file
 * @returns {Promise<{width: number, height: number}>}
 */
const getImageDimensions = async (inputPath) => {
  const command = `magick identify -format "%w %h" "${inputPath}"`;
  const { stdout } = await executeCommand(command);
  const [width, height] = stdout.trim().split(' ').map(Number);
  return { width, height };
};

/**
 * Terminal dithering effect (as specified)
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 */
const terminalDither = async (inputPath, outputPath) => {
  const command = `magick "${inputPath}" -contrast-stretch 0x10% -sharpen 0x1 -dither FloydSteinberg -remap pattern:gray50 -depth 1 -strip png:"${outputPath}"`;
  await executeCommand(command);
};

/**
 * Resize image with aspect ratio preservation
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 * @param {number|null} width - Target width (null to auto-calculate)
 * @param {number|null} height - Target height (null to auto-calculate)
 * @param {string} format - Output format
 */
const resizeImage = async (inputPath, outputPath, width, height, format) => {
  let geometry;

  if (width && height) {
    // Both specified - force exact dimensions
    geometry = `${width}x${height}!`;
  } else if (width) {
    // Only width - preserve aspect ratio
    geometry = `${width}x`;
  } else if (height) {
    // Only height - preserve aspect ratio
    geometry = `x${height}`;
  } else {
    throw new Error('At least width or height must be specified');
  }

  const command = `magick "${inputPath}" -resize ${geometry} "${format}:${outputPath}"`;
  await executeCommand(command);
};

/**
 * Convert image format
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 * @param {string} format - Target format (png, jpg, webp, etc.)
 * @param {number|null} quality - Quality for lossy formats (1-100)
 */
const convertFormat = async (inputPath, outputPath, format, quality = null) => {
  let command = `magick "${inputPath}"`;

  if (quality !== null && (format === 'jpg' || format === 'jpeg' || format === 'webp')) {
    command += ` -quality ${quality}`;
  }

  command += ` "${format}:${outputPath}"`;
  await executeCommand(command);
};

/**
 * Rotate image
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 * @param {number} degrees - Rotation angle (90, 180, 270)
 * @param {string} format - Output format
 */
const rotateImage = async (inputPath, outputPath, degrees, format) => {
  const command = `magick "${inputPath}" -rotate ${degrees} "${format}:${outputPath}"`;
  await executeCommand(command);
};

/**
 * Flip image
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 * @param {string} direction - 'horizontal' or 'vertical'
 * @param {string} format - Output format
 */
const flipImage = async (inputPath, outputPath, direction, format) => {
  const operation = direction === 'horizontal' ? '-flop' : '-flip';
  const command = `magick "${inputPath}" ${operation} "${format}:${outputPath}"`;
  await executeCommand(command);
};

/**
 * Crop image
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 * @param {number} width - Crop width
 * @param {number} height - Crop height
 * @param {number} x - X offset
 * @param {number} y - Y offset
 * @param {string} format - Output format
 */
const cropImage = async (inputPath, outputPath, width, height, x, y, format) => {
  const command = `magick "${inputPath}" -crop ${width}x${height}+${x}+${y} +repage "${format}:${outputPath}"`;
  await executeCommand(command);
};

/**
 * Auto-trim transparent/white borders
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 * @param {string} format - Output format
 */
const trimImage = async (inputPath, outputPath, format) => {
  const command = `magick "${inputPath}" -trim +repage "${format}:${outputPath}"`;
  await executeCommand(command);
};

/**
 * Optimize image quality/size
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output image
 * @param {number} quality - Quality percentage (1-100)
 * @param {string} format - Output format
 */
const optimizeImage = async (inputPath, outputPath, quality, format) => {
  const command = `magick "${inputPath}" -strip -quality ${quality} "${format}:${outputPath}"`;
  await executeCommand(command);
};

module.exports = {
  executeCommand,
  getImageDimensions,
  terminalDither,
  resizeImage,
  convertFormat,
  rotateImage,
  flipImage,
  cropImage,
  trimImage,
  optimizeImage
};
