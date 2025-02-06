import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class OrdersService {
  private readonly apiKey = process.env.AIRTABLE_API_KEY;
  private readonly baseId = process.env.AIRTABLE_BASE_ID;
  private readonly tableName = process.env.AIRTABLE_ORDERS_TABLE;

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getUrl() {
    return `https://api.airtable.com/v0/${this.baseId}/${this.tableName}`;
  }

  async findAll(): Promise<any[]> {
    const response = await axios.get(this.getUrl(), { headers: this.getHeaders() });
    return response.data.records;
  }

  async findOne(id: string): Promise<any> {
    const response = await axios.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
    return response.data;
  }

  async create(data: any): Promise<any> {
    const response = await axios.post(
      this.getUrl(),
      { records: [{ fields: data }] },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async update(id: string, data: any): Promise<any> {
    const response = await axios.patch(
      `${this.getUrl()}/${id}`,
      { fields: data },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async delete(id: string): Promise<any> {
    const response = await axios.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
    return response.data;
  }
}