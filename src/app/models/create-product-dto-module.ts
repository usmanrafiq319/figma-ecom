export interface CreateProductDto {
  title: string;
  price: number;
  quantity: number;
  category: string;
  description?: string;
  image?: File | null;
}

export function toProductFormData(dto: CreateProductDto): FormData {
  const formData = new FormData();
  formData.append('title', dto.title);
  formData.append('price', dto.price.toString());
  formData.append('quantity', dto.quantity.toString());
  formData.append('description', dto.description || '');
  formData.append('category', dto.category);

  if (dto.image) {
    formData.append('image', dto.image, dto.image.name);
  }

  return formData;
}