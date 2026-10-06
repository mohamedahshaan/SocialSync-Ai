import { config } from '../config/index.js';

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let errorCode = err.code || err.error || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred. Please try again.';

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds maximum allowed limit (100MB).';
      errorCode = 'FILE_TOO_LARGE';
    } else {
      errorCode = err.code;
    }
  } else if (err.message && err.message.includes('Unsupported file type')) {
    statusCode = 400;
    errorCode = 'UNSUPPORTED_MEDIA_TYPE';
  }

  // Safe structured log without secrets
  const safeLog = {
    timestamp: new Date().toISOString(),
    userId: req.user?.id || 'anonymous',
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorCode,
    message: err.message
  };

  console.error('[ERROR_LOG]', JSON.stringify(safeLog));

  const response = {
    success: false,
    message,
    error: errorCode
  };

  // Only include stack traces in non-production environments when specifically requested
  if (config.nodeEnv === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
