import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export const multerOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueSuffix = randomUUID();
      const ext = extname(file.originalname).toLowerCase();
      callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    if (!allowedTypes.includes(file.mimetype) || !allowedExtensions.includes(extname(file.originalname).toLowerCase())) {
      return callback(new Error('Seules les images sont autorisées'), false);
    }
    callback(null, true);
  },
};