const multer = require('multer');
const { AppError } = require('../errors/app-error');
const { logger } = require('../utils/logger');

// Memory storage for file uploads
const storage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.', 400), false);
  }
};

// File filter for documents
const documentFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images, PDF, and Word documents are allowed.', 400), false);
  }
};

// Upload middleware for profile photos
const uploadProfilePhoto = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
}).single('photo');

// Upload middleware for KYC documents
const uploadKycDocument = multer({
  storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
}).single('document');

// Upload middleware for goods images
const uploadGoodsImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
}).single('goodsImage');

// Error handling middleware for multer
const handleUploadError = (req, res, next) => {
  return (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size too large.', 400));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(new AppError('Too many files uploaded.', 400));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Unexpected file field.', 400));
      }
    }
    
    if (err.message === 'Invalid file type') {
      return next(new AppError(err.message, 400));
    }
    
    logger.error('File upload error:', err);
    return next(new AppError('File upload failed.', 500));
  };
};

// Wrapper functions to handle async upload
const uploadProfilePhotoMiddleware = (req, res, next) => {
  uploadProfilePhoto(req, res, handleUploadError(req, res, next));
};

const uploadKycDocumentMiddleware = (req, res, next) => {
  uploadKycDocument(req, res, handleUploadError(req, res, next));
};

const uploadGoodsImageMiddleware = (req, res, next) => {
  uploadGoodsImage(req, res, handleUploadError(req, res, next));
};

module.exports = {
  uploadProfilePhotoMiddleware,
  uploadKycDocumentMiddleware,
  uploadGoodsImageMiddleware
};