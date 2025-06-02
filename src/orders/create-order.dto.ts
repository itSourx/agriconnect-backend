import { IsString, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';


export class OrderProductDto {
  @ApiProperty({
    example: 'recQW2EwO7NhBBUkX',
    description: 'ID du produit',
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: '25',
    description: 'La quantité du produit',
  })
  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  //@IsString()
  //farmerId: string;
  @ApiProperty({
    example: '[{ "id": "rec4aAR2UPDfhYcRG", "quantity": 2 }, { "id": "recCzV2gqqSK721IE", "quantity": 3 }]',
    description: 'Formater les détails du produits (id et quantité) en tableau',
  })

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products: OrderProductDto[];

  @ApiProperty({
    example: 'recQW2EwO7NhBBUkX',
    description: 'ID du paiement',
  })
  @IsString()
  transaction_id: string;
  
  @ApiProperty({
    example: 'recQW2EwO7NhBBUkX',
    description: 'montant total payé par le client',
  })
  @IsNumber()
  totalPaid: number;
}