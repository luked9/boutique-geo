import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('=== Migration Verification ===\n');

  const connections = await prisma.pOSConnection.findMany({
    include: { store: { select: { name: true, publicId: true } } }
  });
  console.log(`POSConnections: ${connections.length}`);
  connections.forEach(c => {
    console.log(`  - ${c.provider}: ${c.store.name} (${c.store.publicId})`);
    console.log(`    merchantId: ${c.merchantId || '(none)'}`);
    console.log(`    locationId: ${c.locationId || '(none)'}`);
    console.log(`    hasToken: ${!!c.accessTokenEnc}`);
    console.log(`    isActive: ${c.isActive}`);
  });

  const ordersWithExternal = await prisma.order.count({ where: { externalOrderId: { not: null } } });
  const ordersWithoutExternal = await prisma.order.count({ where: { externalOrderId: null } });
  console.log(`\nOrders with externalOrderId: ${ordersWithExternal}`);
  console.log(`Orders without externalOrderId: ${ordersWithoutExternal}`);

  console.log('\n✅ Verification complete!');
  await prisma.$disconnect();
}

check().catch(console.error);
