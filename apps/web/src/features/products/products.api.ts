import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  salePrice: string;
  costPrice?: string;
  stock: string;
  isActive: boolean;
  category?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
}

export async function listProducts(params: { search?: string; page?: number }): Promise<Paginated<Product>> {
  const { data } = await api.get<Paginated<Product>>('/products', { params });
  return data;
}

export async function getProductByBarcode(barcode: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/barcode/${encodeURIComponent(barcode)}`);
  return data;
}

export interface CreateProductInput {
  name: string;
  barcode?: string;
  costPrice?: number;
  salePrice?: number;
  minStock?: number;
  stock?: number;
  categoryId?: string;
  brandId?: string;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data } = await api.post<Product>('/products', input);
  return data;
}

export async function updateProduct(id: string, input: Partial<CreateProductInput> & { isActive?: boolean }): Promise<Product> {
  const { data } = await api.put<Product>(`/products/${id}`, input);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

// ----- categories / brands -----
export interface Taxonomy {
  id: string;
  name: string;
}

export async function listCategories(): Promise<Taxonomy[]> {
  const { data } = await api.get<Taxonomy[]>('/products/categories');
  return data;
}
export async function createCategory(name: string): Promise<Taxonomy> {
  const { data } = await api.post<Taxonomy>('/products/categories', { name });
  return data;
}
export async function listBrands(): Promise<Taxonomy[]> {
  const { data } = await api.get<Taxonomy[]>('/products/brands');
  return data;
}
export async function createBrand(name: string): Promise<Taxonomy> {
  const { data } = await api.post<Taxonomy>('/products/brands', { name });
  return data;
}
