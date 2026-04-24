const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

ensureUploadsDir();

function getAbsolutePath(fileName) {
  return path.join(UPLOADS_DIR, fileName);
}

/**
 * URL path that maps to the Express static middleware mount.
 * e.g. "/uploads/error-abc123.csv"
 */
function getFileUrl(fileName) {
  return `/uploads/${fileName}`;
}

async function saveBuffer(buffer, fileName) {
  const dest = getAbsolutePath(fileName);
  await fsp.writeFile(dest, buffer);
  return { filePath: dest, url: getFileUrl(fileName) };
}

async function readFile(fileName) {
  return fsp.readFile(getAbsolutePath(fileName));
}

async function deleteFile(fileName) {
  const filePath = getAbsolutePath(fileName);
  try {
    await fsp.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

async function fileExists(fileName) {
  try {
    await fsp.access(getAbsolutePath(fileName));
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  UPLOADS_DIR,
  getAbsolutePath,
  getFileUrl,
  saveBuffer,
  readFile,
  deleteFile,
  fileExists,
};
