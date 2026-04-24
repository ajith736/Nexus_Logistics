function success(res, data = null, message = 'Success', statusCode = 200) {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
}

function error(res, message = 'Internal Server Error', statusCode = 500, errorCode = null) {
  const payload = { success: false, message };
  if (errorCode) payload.errorCode = errorCode;
  return res.status(statusCode).json(payload);
}

function paginated(res, { docs, total, page, limit }, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data: docs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}

module.exports = { success, error, paginated };
