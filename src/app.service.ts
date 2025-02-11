import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /*getHello(): string {
    return 'Hello World!';
  }*/
  getFeatures() {
    return [
      { 
        title: 'Gestion des Cultures', 
        icon: 'tractor',
        description: 'Suivi en temps réel et analyse prédictive'
      },
      // ... autres features
    ];
  }
}
