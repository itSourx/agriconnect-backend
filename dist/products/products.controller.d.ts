import { ProductsService } from './products.service';
import { CreateProductDto } from './create-product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(): Promise<any[]>;
    findAllByCategory(category: string): Promise<any[]>;
    search(query: string): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(CreateProductDto: CreateProductDto, files: Express.Multer.File[], req: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    updatePhoto(productId: string, photo: Express.Multer.File): Promise<any>;
    delete(id: string): Promise<any>;
}
