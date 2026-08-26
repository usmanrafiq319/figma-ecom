export interface ProductModel {
  id: string;
  title: string;
  price: number;     
  description: string; 
  category: string;
  quantity?: number;
  url:string;
  createdAt: Date;
}
