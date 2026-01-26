/**
 * Mock Square Webhook Script
 *
 * Simulates a Square payment webhook to create test orders and review sessions.
 * Usage: npm run mock:webhook
 */

import { PrismaClient, SessionStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

const DEMO_ITEMS = [
  { name: 'Cashmere Sweater', amount: 12500 },
  { name: 'Silk Blouse', amount: 8900 },
  { name: 'Leather Belt', amount: 6500 },
  { name: 'Designer Sunglasses', amount: 15000 },
  { name: 'Wool Scarf', amount: 4500 },
  { name: 'Canvas Tote Bag', amount: 7500 },
  { name: 'Pearl Earrings', amount: 9500 },
  { name: 'Linen Dress', amount: 11000 },
];

function randomItems(): { name: string; quantity: number; amount: number }[] {
  const count = Math.floor(Math.random() * 3) + 1;
  const items: { name: string; quantity: number; amount: number }[] = [];

  for (let i = 0; i < count; i++) {
    const item = DEMO_ITEMS[Math.floor(Math.random() * DEMO_ITEMS.length)];
    if (item) {
      const quantity = Math.floor(Math.random() * 2) + 1;
      items.push({
        name: item.name,
        quantity,
        amount: item.amount * quantity,
      });
    }
  }

  return items;
}

async function main() {
  console.log('Mock Webhook: Simulating Square payment...\n');

  // Find the demo store
  const store = await prisma.store.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!store) {
    console.error('No store found. Run `npm run seed` first.');
    process.exit(1);
  }

  console.log(`Using store: ${store.name} (${store.publicId})`);

  // Generate mock order data
  const items = randomItems();
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const squareOrderId = `mock_${nanoid(10)}`;

  // Create order
  const order = await prisma.order.create({
    data: {
      storeId: store.id,
      squareOrderId,
      totalAmount,
      currency: 'USD',
      lineItemsJson: items,
    },
  });

  console.log(`\nCreated order: ${order.squareOrderId}`);
  console.log(`  Total: $${(totalAmount / 100).toFixed(2)}`);
  console.log(`  Items:`);
  items.forEach((item) => {
    console.log(`    - ${item.quantity}x ${item.name} ($${(item.amount / 100).toFixed(2)})`);
  });

  // Create pending review session
  const sessionPublicId = `sess_${nanoid(12)}`;
  const session = await prisma.reviewSession.create({
    data: {
      publicId: sessionPublicId,
      storeId: store.id,
      orderId: order.id,
      status: SessionStatus.PENDING,
    },
  });

  console.log(`\nCreated pending review session: ${session.publicId}`);

  // Create audit event
  await prisma.auditEvent.create({
    data: {
      storeId: store.id,
      reviewSessionId: session.id,
      eventType: 'SESSION_CREATED',
      payload: {
        source: 'mock_webhook',
        squareOrderId: order.squareOrderId,
      },
    },
  });

  console.log(`\n--- Mock Webhook Complete ---`);
  console.log(`\nThe iPad app should now show this session.`);
  console.log(`Session ID: ${session.publicId}`);
  console.log(`\nAPI endpoint to check:`);
  console.log(`  GET http://localhost:3000/api/v1/kiosk/${store.publicId}/next`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
