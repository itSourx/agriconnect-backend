import { ProductsService } from './products.service';
import { CreateProductDto } from './create-product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(): Promise<any[]>;
    findAllByCategory(category: string): Promise<any[]>;
    search(query: string): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(CreateProductDto: CreateProductDto): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<any>;
}
