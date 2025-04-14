import { IsString, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderProductDto {
  @IsString()
  id: string;

  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  //@IsString()
  //farmerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products: OrderProductDto[];

  /*@IsString()
  status: string; // Par défaut : "pending"*/
}