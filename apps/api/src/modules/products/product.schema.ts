import { z } from 'zod';

// ----- categories / brands (same shape) -----
export const nameSchema = z.object({ name: z.string().min(2) });
export const updateNameSchema = z.object({ name: z.string().min(2).optional() });

// ----- products -----
const money = z.coerce.number().nonnegative();
const qty = z.coerce.number().nonnegative();

export const createProductSchema = z.object({
  name: z.string().min(2),
  barcode: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  costPrice: money.default(0),
  salePrice: money.default(0),
  stock: qty.default(0), // initial stock (movement handled in estoque module later)
  minStock: qty.default(0),
  allowNegative: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listProductQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
