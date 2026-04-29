const path = require('path');
const multer = require('multer');
const UploadJob = require('../models/UploadJob');
const { getUploadQueue } = require('../queues/upload.queue');
const { UPLOADS_DIR, saveUploadFile, getSignedDownloadUrl } = require('../services/storage.service');
const { success, error, paginated } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { isRedisEnabled } = require('../config/redis');
const { getSampleUploadCsv, SAMPLE_CSV_FILE_NAME } = require('../services/csv.service');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = path.extname(file.originalname) || '.csv';
    cb(null, `upload-${unique}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ['.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error('Only CSV files are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const uploadMiddleware = upload.single('file');

function downloadSampleCsv(_req, res) {
  const body = getSampleUploadCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${SAMPLE_CSV_FILE_NAME}"; filename*=UTF-8''${encodeURIComponent(SAMPLE_CSV_FILE_NAME)}`
  );
  res.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(body);
}

async function uploadCSV(req, res, next) {
  try {
    if (!isRedisEnabled()) {
      return error(res, 'Bulk upload requires Redis. Enable Redis and restart the server.', 503, 'REDIS_DISABLED');
    }

    const queue = getUploadQueue();
    if (!queue) {
      return error(res, 'Upload queue is unavailable. Check Redis connection.', 503, 'QUEUE_UNAVAILABLE');
    }

    if (!req.file) {
      return error(res, 'No CSV file provided. Send a file with field name "file".', 400, 'NO_FILE');
    }

    const storedFile = await saveUploadFile(req.file, { orgId: String(req.user.orgId) });

    const uploadJob = await UploadJob.create({
      fileName: storedFile.fileName || req.file.filename,
      originalName: req.file.originalname,
      storageProvider: storedFile.provider,
      fileKey: storedFile.objectKey || storedFile.filePath || req.file.path,
      orgId: req.user.orgId,
      uploadedBy: req.user.id,
    });

    await queue.add('process-csv', {
      uploadJobId: String(uploadJob._id),
      storageProvider: storedFile.provider,
      filePath: storedFile.filePath,
      fileKey: storedFile.objectKey,
      orgId: String(req.user.orgId),
      uploadedBy: String(req.user.id),
    });

    return success(res, { jobId: uploadJob._id, fileName: uploadJob.originalName, status: uploadJob.status }, 'File queued for processing', 202);
  } catch (err) {
    next(err);
  }
}

async function listUploads(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { orgId: req.user.orgId };

    if (req.query.status) filter.status = req.query.status;

    const [docs, total] = await Promise.all([
      UploadJob.find(filter)
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UploadJob.countDocuments(filter),
    ]);

    return paginated(res, { docs, total, page, limit });
  } catch (err) {
    next(err);
  }
}

async function getUpload(req, res, next) {
  try {
    const uploadJob = await UploadJob.findOne({
      _id: req.params.id,
      orgId: req.user.orgId,
    }).populate('uploadedBy', 'name email');

    if (!uploadJob) return error(res, 'Upload job not found', 404, 'NOT_FOUND');

    return success(res, uploadJob);
  } catch (err) {
    next(err);
  }
}

async function getUploadErrorUrl(req, res, next) {
  try {
    const uploadJob = await UploadJob.findOne({
      _id: req.params.id,
      orgId: req.user.orgId,
    });

    if (!uploadJob) return error(res, 'Upload job not found', 404, 'NOT_FOUND');
    if (!uploadJob.errorFileUrl && !uploadJob.errorFileKey) {
      return error(res, 'No error CSV is available for this upload', 404, 'ERROR_FILE_NOT_FOUND');
    }

    if (uploadJob.storageProvider === 's3' && uploadJob.errorFileKey) {
      const url = await getSignedDownloadUrl(uploadJob.errorFileKey);
      return success(res, { url }, 'Signed error CSV URL generated');
    }

    const baseUrl = (process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
    return success(res, { url: `${baseUrl}${uploadJob.errorFileUrl}` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadMiddleware,
  downloadSampleCsv,
  uploadCSV,
  listUploads,
  getUpload,
  getUploadErrorUrl,
};
