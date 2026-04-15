/**
 * Standardized API response helpers
 * Ensures consistent response shape across all endpoints
 */

const success = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
};

const error = (res, message, statusCode = 400, details = null) => {
  const body = { success: false, error: message, timestamp: new Date().toISOString() };
  if (details) body.details = details;
  res.status(statusCode).json(body);
};

const paginated = (res, data, total, page, limit) => {
  res.json({
    success: true,
    data,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString(),
  });
};

module.exports = { success, error, paginated };
