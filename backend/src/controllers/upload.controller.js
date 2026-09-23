import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import * as storageService from '../services/storage.service.js';
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES } from '../validators/upload.validation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      cb(new AppError('Unsupported file type', 422, 'VALIDATION_ERROR', { file: 'Unsupported file type' }));
      return;
    }
    cb(null, true);
  },
});

export const uploadSingleFile = upload.single('file');

export const handleUpload = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file provided', 422, 'VALIDATION_ERROR', { file: 'File is required' });
  }
  const result = await storageService.uploadBuffer(req.file.buffer, req.file.originalname, {
    mimetype: req.file.mimetype,
  });
  res.status(201).json({ success: true, message: 'File uploaded', data: result });
});
