/**
 * Middleware to enforce consistent TryFit API response structures
 * Success format: { success: true, data: ..., message: null, error: null }
 * Error format: { success: false, data: null, message: "...", error: { code: "..." } }
 */

function responseEnhancer(req, res, next) {
  res.success = function (data = {}, message = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      error: null,
    });
  };

  res.fail = function (message = 'An error occurred', errorCode = 'BAD_REQUEST', statusCode = 400, details = null) {
    return res.status(statusCode).json({
      success: false,
      data: null,
      message,
      error: {
        code: errorCode,
        ...(details ? { details } : {}),
      },
    });
  };

  next();
}

function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error: {
      code: errorCode,
    },
  });
}

module.exports = {
  responseEnhancer,
  errorHandler,
};
