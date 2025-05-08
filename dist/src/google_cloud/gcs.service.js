"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GCSService = void 0;
const common_1 = require("@nestjs/common");
const storage_1 = require("@google-cloud/storage");
const path = require("path");
let GCSService = class GCSService {
    constructor() {
        const gcpKey = process.env.GCP_KEY_JSON;
        if (!gcpKey) {
            throw new Error('La clé GCP_KEY_JSON n\'est pas définie dans les variables d\'environnement.');
        }
        try {
            const credentials = JSON.parse(gcpKey);
            this.storage = new storage_1.Storage({
                credentials,
            });
        }
        catch (error) {
            console.error('Erreur lors du parsing de GCP_KEY_JSON :', error.message);
            throw error;
        }
    }
    async uploadImage(filePath) {
        try {
            const bucketName = process.env.GCS_BUCKET_NAME;
            if (!bucketName) {
                throw new Error('Le nom du bucket GCS n\'est pas défini.');
            }
            const bucket = this.storage.bucket(bucketName);
            const fileName = `${Date.now()}-${path.basename(filePath)}`;
            await bucket.upload(filePath, {
                destination: fileName,
                public: true,
            });
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            console.log('Image uploadée avec succès :', publicUrl);
            return publicUrl;
        }
        catch (error) {
            console.error('Erreur lors de l\'upload de l\'image :', error.message);
            throw new Error('Impossible d\'uploader l\'image.');
        }
    }
};
exports.GCSService = GCSService;
exports.GCSService = GCSService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GCSService);
//# sourceMappingURL=gcs.service.js.map