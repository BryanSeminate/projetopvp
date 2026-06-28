import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import type { CreateMovementInput } from './stock.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

interface ApplyParams {
  companyId: string;
  productId: string;
  type: MovementType;
  quantity: number; // see stock.schema for semantics per type
  reason?: string | null;
  refType?: string | null; // SALE, PURCHASE, MANUAL
  refId?: string | null;
  userId?: string | null;
}

/**
 * Core stock mutation. MUST run inside a transaction (pass the tx client) so the
 * product balance + movement are atomic. Reused by the PDV (sale) and purchases.
 *
 * Returns the created movement (with resulting balance).
 */
export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  params: ApplyParams,
) {
  const product = await tx.product.findFirst({
    where: { id: params.productId, companyId: params.companyId, deletedAt: null },
    select: { id: true, stock: true, allowNegative: true },
  });
  if (!product) throw new NotFoundError('Produto não encontrado');

  const current = Number(product.stock);
  let newBalance: number;
  let storedQty: number;

  if (params.type === 'IN') {
    storedQty = params.quantity;
    newBalance = current + params.quantity;
  } else if (params.type === 'OUT') {
    storedQty = params.quantity;
    newBalance = current - params.quantity;
    if (newBalance < 0 && !product.allowNegative) {
      throw new BadRequestError('Estoque insuficiente para esta saída');
    }
  } else {
    // ADJUSTMENT: quantity is the target absolute stock
    newBalance = params.quantity;
    storedQty = params.quantity - current; // signed delta
    if (!params.reason) throw new BadRequestError('Motivo é obrigatório no ajuste');
  }

  await tx.product.update({
    where: { id: product.id },
    data: { stock: newBalance },
  });

  return tx.stockMovement.create({
    data: {
      companyId: params.companyId,
      productId: product.id,
      type: params.type,
      quantity: storedQty,
      balanceAfter: newBalance,
      reason: params.reason ?? null,
      refType: params.refType ?? null,
      refId: params.refId ?? null,
      userId: params.userId ?? null,
    },
  });
}

export class StockService {
  async createManual(actor: Actor, input: CreateMovementInput) {
    const movement = await prisma.$transaction((tx) =>
      applyStockMovement(tx, {
        companyId: actor.companyId,
        productId: input.productId,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        refType: 'MANUAL',
        userId: actor.userId,
      }),
    );

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: input.type === 'ADJUSTMENT' ? 'ADJUSTMENT' : 'STOCK_MOVE',
      entity: 'StockMovement',
      entityId: movement.id,
      after: movement,
    });
    return movement;
  }

  async list(
    actor: Actor,
    params: { productId?: string; type?: MovementType; page: number; pageSize: number },
  ) {
    const where = {
      companyId: actor.companyId,
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.type ? { type: params.type } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { select: { id: true, name: true, barcode: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  /** Products at or below their minimum stock. */
  async lowStock(actor: Actor) {
    return prisma.$queryRaw<
      Array<{ id: string; name: string; stock: string; minStock: string }>
    >(Prisma.sql`
      SELECT id, name, stock, "minStock"
      FROM "Product"
      WHERE "companyId" = ${actor.companyId}
        AND "deletedAt" IS NULL
        AND "isActive" = true
        AND stock <= "minStock"
      ORDER BY name ASC
    `);
  }
}
