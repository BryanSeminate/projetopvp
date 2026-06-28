/**
 * Single source of truth for permission codes. Used by the seed (to populate
 * the Permission table + role mappings) and by route guards (requirePermission).
 */
export const PERMISSIONS = {
  // companies
  COMPANY_VIEW: 'company.view',
  COMPANY_CREATE: 'company.create',
  COMPANY_UPDATE: 'company.update',
  COMPANY_DELETE: 'company.delete',
  // users
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_BLOCK: 'user.block',
  // customers
  CUSTOMER_VIEW: 'customer.view',
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_UPDATE: 'customer.update',
  // products
  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  // stock
  STOCK_VIEW: 'stock.view',
  STOCK_MANAGE: 'stock.manage',
  // sales / PDV
  SALE_CREATE: 'sale.create',
  SALE_CANCEL: 'sale.cancel',
  // cash register
  CASH_OPEN: 'cash.open',
  CASH_CLOSE: 'cash.close',
  CASH_MOVE: 'cash.move',
  // finance
  FINANCE_VIEW: 'finance.view',
  FINANCE_MANAGE: 'finance.manage',
  // credit
  CREDIT_VIEW: 'credit.view',
  CREDIT_MANAGE: 'credit.manage',
  CREDIT_OVERRIDE: 'credit.override', // gerente: venda acima do limite
  // renegociação
  RENEGOTIATION_MANAGE: 'renegotiation.manage',
  // delinquency / collection
  DELINQUENCY_VIEW: 'delinquency.view',
  COLLECTION_SEND: 'collection.send',
  // audit
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
