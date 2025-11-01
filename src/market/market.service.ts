import { Injectable } from '@nestjs/common';
import * as math from 'mathjs';

@Injectable()
export class MarketService {
  private mockData = {
    maize: { basePrice: 150, trend: 0.02, regions: { 'benin-south': 1.1, 'benin-north': 0.9 } },
    rice: { basePrice: 200, trend: 0.01, regions: { 'benin-south': 0.95, 'benin-north': 1.05 } },
  };

  async predict(cropType: string = 'maize', region: string = 'benin-south', timePeriod: string): Promise<any> {
    if (!cropType) {
      return { error: 'Crop type is required' };
    }

    const normalizedCropType = cropType.toLowerCase();
    const crop = this.mockData[normalizedCropType];
    if (!crop) {
      return { error: `Crop type '${cropType}' not supported. Available types: maize, rice` };
    }

    if (!region) {
      return { error: 'Region is required' };
    }

    const normalizedRegion = region.toLowerCase();
    const regionFactor = crop.regions[normalizedRegion];
    if (!regionFactor) {
      return { error: `Region '${region}' not supported for ${cropType}. Available regions: benin-south, benin-north` };
    }

    const monthsAhead = parseInt(timePeriod) || 1;
    const priceTrend = crop.trend * monthsAhead;

    const predictedPrice = crop.basePrice * (1 + priceTrend) * regionFactor;

    const recommendation = `Plantez ${cropType} dans ${region} dans ${monthsAhead} mois pour un prix estimé de ${predictedPrice.toFixed(2)} FCFA/kg.`;

    return {
      cropType,
      region,
      timePeriod: `${monthsAhead} mois`,
      predictedPrice: `${predictedPrice.toFixed(2)} FCFA/kg`,
      recommendation,
    };
  }
}