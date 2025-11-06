const sendResponse = (res, statusCode, data = null, message = '') => {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    timestamp: new Date().toISOString()
  };

  if (data) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
};

const sendSuccess = (res, data = null, message = 'Success') => {
  sendResponse(res, 200, data, message);
};

const sendCreated = (res, data = null, message = 'Resource created successfully') => {
  sendResponse(res, 201, data, message);
};

const sendAccepted = (res, data = null, message = 'Request accepted') => {
  sendResponse(res, 202, data, message);
};

const sendNoContent = (res, message = 'No content') => {
  sendResponse(res, 204, null, message);
};

const sendBadRequest = (res, message = 'Bad request') => {
  sendResponse(res, 400, null, message);
};

const sendUnauthorized = (res, message = 'Unauthorized') => {
  sendResponse(res, 401, null, message);
};

const sendForbidden = (res, message = 'Forbidden') => {
  sendResponse(res, 403, null, message);
};

const sendNotFound = (res, message = 'Resource not found') => {
  sendResponse(res, 404, null, message);
};

const sendConflict = (res, message = 'Conflict') => {
  sendResponse(res, 409, null, message);
};

const sendUnprocessableEntity = (res, message = 'Unprocessable entity') => {
  sendResponse(res, 422, null, message);
};

const sendTooManyRequests = (res, message = 'Too many requests') => {
  sendResponse(res, 429, null, message);
};

const sendInternalServerError = (res, message = 'Internal server error') => {
  sendResponse(res, 500, null, message);
};

const sendServiceUnavailable = (res, message = 'Service unavailable') => {
  sendResponse(res, 503, null, message);
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendCreated,
  sendAccepted,
  sendNoContent,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendUnprocessableEntity,
  sendTooManyRequests,
  sendInternalServerError,
  sendServiceUnavailable
};