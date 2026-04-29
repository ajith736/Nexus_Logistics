const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const STORAGE_PROVIDER = String(process.env.STORAGE_PROVIDER || 'local').toLowerCase();
const S3_BUCKET = process.env.S3_BUCKET;
const S3_UPLOAD_PREFIX = process.env.S3_UPLOAD_PREFIX || 'uploads';
const S3_ERROR_PREFIX = process.env.S3_ERROR_PREFIX || 'errors';
const S3_SIGNED_URL_TTL_SECONDS = parseInt(process.env.S3_SIGNED_URL_TTL_SECONDS, 10) || 900;

let s3Client = null;

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

ensureUploadsDir();

function isS3Enabled() {
  return STORAGE_PROVIDER === 's3';
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1',
    });
  }
  return s3Client;
}

function requireS3Config() {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET is required when STORAGE_PROVIDER=s3');
  }
}

function safeFileName(name) {
  const ext = path.extname(name || '') || '.csv';
  const base = path.basename(name || 'upload.csv', ext).replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${base.slice(0, 80)}${ext}`;
}

function buildObjectKey({ type = 'uploads', orgId, fileName }) {
  const prefix = type === 'errors' ? S3_ERROR_PREFIX : S3_UPLOAD_PREFIX;
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${orgId || 'unknown-org'}/${timestamp}-${random}-${safeFileName(fileName)}`;
}

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

async function saveUploadFile(file, { orgId }) {
  if (!isS3Enabled()) {
    return {
      provider: 'local',
      fileName: file.filename,
      filePath: file.path,
      url: getFileUrl(file.filename),
    };
  }

  requireS3Config();
  const objectKey = buildObjectKey({ type: 'uploads', orgId, fileName: file.originalname });
  const body = await fsp.readFile(file.path);
  await getS3Client().send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: objectKey,
    Body: body,
    ContentType: file.mimetype || 'text/csv',
  }));

  await deletePath(file.path);

  return {
    provider: 's3',
    fileName: path.basename(objectKey),
    objectKey,
  };
}

async function readObjectBuffer(objectKey) {
  requireS3Config();
  const res = await getS3Client().send(new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: objectKey,
  }));
  return Buffer.from(await res.Body.transformToByteArray());
}

async function saveErrorReport(buffer, { orgId, fileName }) {
  if (!isS3Enabled()) {
    const result = await saveBuffer(buffer, fileName);
    return { provider: 'local', ...result };
  }

  requireS3Config();
  const objectKey = buildObjectKey({ type: 'errors', orgId, fileName });
  await getS3Client().send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: objectKey,
    Body: buffer,
    ContentType: 'text/csv; charset=utf-8',
  }));

  return {
    provider: 's3',
    objectKey,
    url: await getSignedDownloadUrl(objectKey),
  };
}

async function getSignedDownloadUrl(objectKey) {
  requireS3Config();
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectKey,
    }),
    { expiresIn: S3_SIGNED_URL_TTL_SECONDS }
  );
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

async function deletePath(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

async function deleteObject(objectKey) {
  requireS3Config();
  await getS3Client().send(new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: objectKey,
  }));
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
  isS3Enabled,
  getAbsolutePath,
  getFileUrl,
  saveBuffer,
  saveUploadFile,
  readObjectBuffer,
  saveErrorReport,
  getSignedDownloadUrl,
  readFile,
  deleteFile,
  deletePath,
  deleteObject,
  fileExists,
};
