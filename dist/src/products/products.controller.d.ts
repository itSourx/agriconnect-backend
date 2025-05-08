import { ProductsService } from './products.service';
import { CreateProductDto } from './create-product.dto';
export declare class ProductsController {
    private readonly productsService;
    private readonly logger;
    constructor(productsService: ProductsService);
    findAll(): Promise<any[]>;
    findByFarmer(id: string): Promise<any[]>;
    findAllByCategory(category: string): Promise<any[]>;
    delete(id: string): Promise<any>;
    findOne(id: string): Promise<any>;
    create(files: Express.Multer.File[], data: CreateProductDto): Promise<any>;
    update(id: string, data: any, files: {
        Photo?: Express.Multer.File[];
        Gallery?: Express.Multer.File[];
    }): Promise<any>;
    search(query: string): Promise<any[]>;
}
