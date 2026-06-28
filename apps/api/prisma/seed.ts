import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, ALL_PERMISSIONS } from '../src/shared/permissions.js';

const prisma = new PrismaClient();

// module label per permission code (for UI grouping)
const moduleOf = (code: string) => code.split('.')[0];

// role -> permission codes
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS as string[],
  gerente: [
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.CUSTOMER_CREATE, PERMISSIONS.CUSTOMER_UPDATE,
    PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_CREATE, PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.STOCK_VIEW, PERMISSIONS.STOCK_MANAGE,
    PERMISSIONS.SUPPLIER_VIEW, PERMISSIONS.SUPPLIER_CREATE, PERMISSIONS.SUPPLIER_UPDATE,
    PERMISSIONS.PURCHASE_VIEW, PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.SALE_CREATE, PERMISSIONS.SALE_CANCEL,
    PERMISSIONS.CASH_OPEN, PERMISSIONS.CASH_CLOSE, PERMISSIONS.CASH_MOVE,
    PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.CREDIT_VIEW, PERMISSIONS.CREDIT_MANAGE, PERMISSIONS.CREDIT_OVERRIDE,
    PERMISSIONS.RENEGOTIATION_MANAGE,
    PERMISSIONS.DELINQUENCY_VIEW, PERMISSIONS.COLLECTION_SEND,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],
  caixa: [
    PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.CASH_OPEN, PERMISSIONS.CASH_CLOSE, PERMISSIONS.CASH_MOVE,
    PERMISSIONS.CREDIT_VIEW,
    PERMISSIONS.DELINQUENCY_VIEW,
  ],
  vendedor: [
    PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.CREDIT_VIEW,
  ],
};

async function main() {
  console.log('🌱 Seeding...');

  // 1. permissions
  for (const code of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, module: moduleOf(code), description: code },
    });
  }
  const permissions = await prisma.permission.findMany();
  const permByCode = new Map(permissions.map((p) => [p.code, p.id]));

  // 2. roles + role_permissions
  const roleIds: Record<string, string> = {};
  for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `Perfil ${roleName}` },
    });
    roleIds[roleName] = role.id;

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: codes.map((code) => ({ roleId: role.id, permissionId: permByCode.get(code)! })),
      skipDuplicates: true,
    });
  }

  // 3. demo company
  const company = await prisma.company.upsert({
    where: { document: '11222333000181' },
    update: {},
    create: {
      legalName: 'Empresa Demonstração LTDA',
      tradeName: 'Loja Demo',
      document: '11222333000181',
      email: 'contato@demo.com',
    },
  });

  // 3b. default payment methods (per company)
  const methods = [
    { name: 'Dinheiro', isCash: true, isCredit: false },
    { name: 'PIX', isCash: false, isCredit: false },
    { name: 'Cartão Débito', isCash: false, isCredit: false },
    { name: 'Cartão Crédito', isCash: false, isCredit: false },
    { name: 'Crediário', isCash: false, isCredit: true },
  ];
  for (const m of methods) {
    await prisma.paymentMethod.upsert({
      where: { companyId_name: { companyId: company.id, name: m.name } },
      update: {},
      create: { companyId: company.id, ...m },
    });
  }

  // 3c. default collection message template
  const existingMsg = await prisma.collectionMessage.findFirst({
    where: { companyId: company.id, name: 'Cobrança padrão' },
  });
  if (!existingMsg) {
    await prisma.collectionMessage.create({
      data: {
        companyId: company.id,
        name: 'Cobrança padrão',
        template:
          'Olá {nome}, identificamos a parcela {parcela} em aberto no valor de R$ {valor}, vencida há {dias} dias. Por favor regularize. Atenciosamente, {empresa}.',
      },
    });
  }

  // 4. admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@demo.com', passwordHash },
  });

  // 5. link admin -> company as admin role
  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    update: { roleId: roleIds.admin },
    create: { userId: admin.id, companyId: company.id, roleId: roleIds.admin },
  });

  console.log('✅ Seed done.');
  console.log('   Login: admin@demo.com / admin123');
  console.log(`   Company: ${company.tradeName} (${company.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
