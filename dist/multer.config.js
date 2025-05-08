"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerOptions = void 0;
const multer_1 = require("multer");
const path_1 = require("path");
exports.multerOptions = {
    storage: (0, multer_1.diskStorage)({
        destination: './uploads',
        filename: (req, file, cb) => {
            const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
            return cb(null, `${randomName}${(0, path_1.extname)(file.originalname)}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
            cb(null, true);
        }
        else {
            cb(new Error('Type de fichier non supporté'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
};
//# sourceMappingURL=multer.config.js.map