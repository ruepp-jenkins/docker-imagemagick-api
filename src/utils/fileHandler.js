const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * File Handler Utilities
 * Manages temporary file creation, reading, and cleanup
 */

const TEMP_DIR = path.join(__dirname, '../../tmpfiles');

/**
 * Ensure temp directory exists
 */
const ensureTempDir = async () => {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
};

/**
 * Generate unique file path
 * @param {string} extension - File extension (e.g., 'png', 'jpg')
 * @returns {string} Full file path
 */
const generateTempPath = (extension) => {
  const filename = `${uuidv4()}.${extension}`;
  return path.join(TEMP_DIR, filename);
};

/**
 * Save uploaded file to temp directory
 * @param {Buffer} buffer - File buffer
 * @param {string} extension - File extension
 * @returns {Promise<string>} Path to saved file
 */
const saveTempFile = async (buffer, extension) => {
  await ensureTempDir();
  const filePath = generateTempPath(extension);
  await fs.writeFile(filePath, buffer);
  return filePath;
};

/**
 * Read file as base64
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} Base64 encoded file content
 */
const readFileAsBase64 = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
};

/**
 * Delete file with optional delay
 * @param {string} filePath - Path to file
 * @param {number} delay - Delay in milliseconds (default: 0)
 */
const deleteFile = async (filePath, delay = 0) => {
  const doDelete = async () => {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error(`Failed to delete file ${filePath}:`, err.message);
    }
  };

  if (delay > 0) {
    setTimeout(doDelete, delay);
  } else {
    await doDelete();
  }
};

/**
 * Cleanup multiple files
 * @param {string[]} filePaths - Array of file paths
 * @param {number} delay - Delay in milliseconds
 */
const cleanupFiles = async (filePaths, delay = 0) => {
  const cleanupDelay = delay || parseInt(process.env.CLEANUP_DELAY || '0', 10);

  for (const filePath of filePaths) {
    await deleteFile(filePath, cleanupDelay);
  }
};

/**
 * Get file extension from mimetype or filename
 * @param {string} mimeTypeOrFilename - MIME type or filename
 * @returns {string} File extension
 */
const getExtension = (mimeTypeOrFilename) => {
  if (!mimeTypeOrFilename) return 'png';

  // If it's a filename with extension
  if (mimeTypeOrFilename.includes('.')) {
    return mimeTypeOrFilename.split('.').pop().toLowerCase();
  }

  // MIME type mapping
  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/svg+xml': 'svg'
  };

  return mimeMap[mimeTypeOrFilename] || 'png';
};

module.exports = {
  ensureTempDir,
  generateTempPath,
  saveTempFile,
  readFileAsBase64,
  deleteFile,
  cleanupFiles,
  getExtension
};
