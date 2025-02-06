import { Injectable } from '@nestjs/common';

@Injectable()
export class MockProfilesService {
  findOneByType(type: string) {
    return Promise.resolve({ id: 'recMOCKPROFILE' });
  }
}