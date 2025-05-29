export declare class OrderProductDto {
    id: string;
    quantity: number;
}
export declare class CreateOrderDto {
    products: OrderProductDto[];
    transaction_id: string;
}
