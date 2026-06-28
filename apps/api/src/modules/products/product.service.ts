import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { ConflictError, NotFoundError, BadRequestError } from '../../shared/errors/AppError.js';
import type { CreateProductInput, UpdateProductInput } from './product.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

interface ListParams {
  search?: string;
  categoryId?: string;
  brandId?: string;
  active?: 'true' | 'false';
  page: number;
  pageSize: number;
}

export class ProductService {
  private async assertCategory(actor: Actor, id?: string) {
    if (!id) return;
    const cat = await prisma.productCategory.findFirst({
      where: { id, companyId: actor.companyId, deletedAt: null },
    });
    if (!cat) throw new BadRequestError('Categoria inválida');
  }

  private async assertBrand(actor: Actor, id?: string) {
    if (!id) return;
    const brand = await prisma.productBrand.findFirst({
      where: { id, companyId: actor.companyId, deletedAt: null },
    });
    if (!brand) throw new BadRequestError('Marca inválida');
  }

  async list(actor: Actor, params: ListParams) {
    const where = {
      companyId: actor.companyId,
      deletedAt: null,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.brandId ? { brandId: params.brandId } : {}),
      ...(params.active ? { isActive: params.active === 'true' } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' as const } },
              { barcode: { contains: params.search } },
              { sku: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getById(actor: Actor, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, companyId: actor.companyId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new NotFoundError('Produto não encontrado');
    return product;
  }

  /** Lookup by exact barcode — used by the PDV later. */
  async findByBarcode(actor: Actor, barcode: string) {
    const product = await prisma.product.findFirst({
      where: { companyId: actor.companyId, barcode, deletedAt: null, isActive: true },
    });
    if (!product) throw new NotFoundError('Produto não encontrado por código de barras');
    return product;
  }

  async create(actor: Actor, data: CreateProductInput) {
    await this.assertCategory(actor, data.categoryId);
    await this.assertBrand(actor, data.brandId);

    if (data.barcode) {
      const dup = await prisma.product.findFirst({
        where: { companyId: actor.companyId, barcode: data.barcode, deletedAt: null },
      });
      if (dup) throw new ConflictError('Já existe produto com este código de barras');
    }

    const product = await prisma.product.create({
      data: { ...data, companyId: actor.companyId },
    });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      after: product,
    });
    return product;
  }

  async update(actor: Actor, id: string, data: UpdateProductInput) {
    const before = await this.getById(actor, id);
    await this.assertCategory(actor, data.categoryId);
    await this.assertBrand(actor, data.brandId);

    if (data.barcode && data.barcode !== before.barcode) {
      const dup = await prisma.product.findFirst({
        where: { companyId: actor.companyId, barcode: data.barcode, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictError('Já existe produto com este código de barras');
    }

    const product = await prisma.product.update({ where: { id }, data });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      before,
      after: product,
    });
    return product;
  }

  /** Soft delete — product keeps history (sales/stock). Never hard delete. */
  async softDelete(actor: Actor, id: string) {
    const before = await this.getById(actor, id);
    const product = await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'DELETE',
      entity: 'Product',
      entityId: id,
      before,
    });
    return product;
  }
}
