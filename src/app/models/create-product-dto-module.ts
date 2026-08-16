export interface CreateProductDto {
  title: string;
  price: number;
  quantity: number;
  description?: string;
  image?: File | null;
}

/**
 * Converts CreateProductDto into native multipart/form-data required by .NET [FromForm] attributes.
 */
export function toProductFormData(dto: CreateProductDto): FormData {
  const formData = new FormData();
  formData.append('title', dto.title);
  formData.append('price', dto.price.toString());
  formData.append('quantity', dto.quantity.toString());
  formData.append('description', dto.description || '');

  if (dto.image) {
    formData.append('image', dto.image, dto.image.name);
  }

  return formData;
}