const { Worker } = require('bullmq');
const { getRedisConnection, isRedisEnabled } = require('../config/redis');
const { parseCSV, parseCSVBuffer, validateRow, buildErrorCSV, generateErrorCSV } = require('../services/csv.service');
const {
  getAbsolutePath,
  getFileUrl,
  readObjectBuffer,
  saveErrorReport,
  getSignedDownloadUrl,
} = require('../services/storage.service');
const { sendUploadReport } = require('../services/email.service');
const { emitToOrg } = require('../config/socket');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const UploadJob = require('../models/UploadJob');
const User = require('../models/User');
const OrderStatusLog = require('../models/OrderStatusLog');
const { UPLOAD_STATUSES, ORDER_STATUSES } = require('../utils/constants');
const { QUEUE_NAME } = require('./upload.queue');

const PROGRESS_INTERVAL = 50;

async function processUploadJob(job) {
  const { uploadJobId, filePath, fileKey, storageProvider, orgId, uploadedBy } = job.data;

  const uploadJob = await UploadJob.findById(uploadJobId);
  if (!uploadJob) throw new Error(`UploadJob ${uploadJobId} not found`);

  uploadJob.status = UPLOAD_STATUSES.PROCESSING;
  await uploadJob.save();

  let rows;
  try {
    if (storageProvider === 's3' || uploadJob.storageProvider === 's3') {
      const csvBuffer = await readObjectBuffer(fileKey || uploadJob.fileKey);
      rows = await parseCSVBuffer(csvBuffer);
    } else {
      rows = await parseCSV(filePath || uploadJob.fileKey);
    }
  } catch (err) {
    uploadJob.status = UPLOAD_STATUSES.FAILED;
    uploadJob.completedAt = new Date();
    await uploadJob.save();
    throw new Error(`CSV parse error: ${err.message}`);
  }

  uploadJob.totalRows = rows.length;
  await uploadJob.save();

  const failedRows = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because row 1 is the header, and humans use 1-based indexing

    const validationError = validateRow(row);
    if (validationError) {
      failedRows.push({ row, reason: validationError, rowNumber });
      continue;
    }

    const saleOrderId = String(row.saleOrderId).trim();
    const existingBySaleId = await Order.findOne({ orgId, saleOrderId }).lean();
    if (existingBySaleId) {
      failedRows.push({
        row,
        reason: 'Duplicate — saleOrderId already exists for this organization',
        rowNumber,
      });
      continue;
    }

    try {
      const seq = await Counter.getNextSequence('orderId');
      const orderId = `ORD-${String(seq).padStart(6, '0')}`;

      const order = await Order.create({
        orderId,
        saleOrderId,
        customerName: String(row.customerName).trim(),
        customerPhone: String(row.customerPhone).trim(),
        customerAddress: String(row.customerAddress).trim(),
        packageDetails: String(row.packageDetails || '').trim(),
        orgId,
        uploadJobId,
      });

      await OrderStatusLog.create({
        orderId: order._id,
        fromStatus: null,
        toStatus: ORDER_STATUSES.CREATED,
        changedBy: uploadedBy,
        changedByModel: 'User',
      });

      successCount++;
    } catch (err) {
      const reason = err.code === 11000
        ? `Duplicate saleOrderId "${row.saleOrderId}" in this organization`
        : err.message;
      failedRows.push({ row, reason, rowNumber });
    }

    if ((i + 1) % PROGRESS_INTERVAL === 0) {
      emitToOrg(orgId, 'upload:progress', {
        jobId: uploadJobId,
        processed: i + 1,
        total: rows.length,
      });
    }
  }

  uploadJob.successCount = successCount;
  uploadJob.failCount = failedRows.length;
  uploadJob.status = UPLOAD_STATUSES.COMPLETED;
  uploadJob.completedAt = new Date();

  if (failedRows.length > 0) {
    const errorFileName = `errors-${uploadJobId}-${Date.now()}.csv`;
    if (uploadJob.storageProvider === 's3') {
      const errorCsv = Buffer.from(buildErrorCSV(failedRows), 'utf8');
      const savedError = await saveErrorReport(errorCsv, { orgId, fileName: errorFileName });
      uploadJob.errorFileKey = savedError.objectKey;
      uploadJob.errorFileUrl = savedError.url;
    } else {
      const errorFilePath = getAbsolutePath(errorFileName);
      await generateErrorCSV(failedRows, errorFilePath);
      uploadJob.errorFileUrl = getFileUrl(errorFileName);
    }
  }

  await uploadJob.save();

  emitToOrg(orgId, 'upload:complete', {
    jobId: uploadJobId,
    successCount,
    failCount: failedRows.length,
    errorFileUrl: uploadJob.errorFileUrl,
  });

  try {
    const uploader = await User.findById(uploadedBy).lean();
    if (uploader?.email) {
      const downloadBaseUrl = (
        process.env.PUBLIC_API_URL ||
        process.env.SERVER_URL ||
        'http://localhost:5000'
      ).replace(/\/+$/, '');

      await sendUploadReport({
        to: uploader.email,
        originalName: uploadJob.originalName,
        totalRows: rows.length,
        successCount,
        failCount: failedRows.length,
        errorFileUrl: await resolveErrorFileUrl(uploadJob, downloadBaseUrl),
      });
    }
  } catch {
    /* email failure is non-critical */
  }

  return { successCount, failCount: failedRows.length };
}

async function resolveErrorFileUrl(uploadJob, downloadBaseUrl) {
  if (!uploadJob.errorFileUrl && !uploadJob.errorFileKey) return null;
  if (uploadJob.storageProvider === 's3' && uploadJob.errorFileKey) {
    return getSignedDownloadUrl(uploadJob.errorFileKey);
  }
  return `${downloadBaseUrl}${uploadJob.errorFileUrl}`;
}

let worker = null;

function startUploadWorker() {
  if (!isRedisEnabled()) {
    console.log('Redis disabled — upload worker not started.');
    return null;
  }

  const connection = getRedisConnection();
  if (!connection) return null;

  worker = new Worker(QUEUE_NAME, processUploadJob, {
    connection,
    concurrency: 2,
  });

  worker.on('completed', (job, result) => {
    console.log(`Upload job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`Upload job ${job?.id} failed:`, err.message);
  });

  console.log('BullMQ upload worker started');
  return worker;
}

async function closeUploadWorker() {
  if (worker) {
    await worker.close();
    console.log('BullMQ upload worker closed');
  }
}

module.exports = { startUploadWorker, closeUploadWorker };
