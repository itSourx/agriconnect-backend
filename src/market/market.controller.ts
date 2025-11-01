import { Controller, Get, Query } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('insights')
  async getMarketInsights(
    @Query('cropType') cropType: string,
    @Query('region') region: string,
    @Query('timePeriod') timePeriod: string,
  ) {
    return this.marketService.predict(cropType, region, timePeriod);
  }
}