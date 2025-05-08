import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';

@Injectable()
export class GCSService {
  private storage: Storage;

  constructor() {
    const gcpKey = process.env.GCP_KEY_JSON;
    if (!gcpKey) {
      throw new Error('La clé GCP_KEY_JSON n\'est pas définie dans les variables d\'environnement.');
    }

    try {
      // Convertir la chaîne JSON en objet JavaScript
      const credentials = JSON.parse(gcpKey);

      this.storage = new Storage({
        credentials,
      });
    } catch (error) {
      console.error('Erreur lors du parsing de GCP_KEY_JSON :', error.message);
      throw error; //('Impossible de parser GCP_KEY_JSON. Vérifiez que le JSON est valide.');
    }
  }

  async uploadImage(filePath: string): Promise<string> {
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
    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'image :', error.message);
      throw new Error('Impossible d\'uploader l\'image.');
    }
  }
}