import { PrismaClient, ReviewPlatform, SessionStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a test store
  const store = await prisma.store.upsert({
    where: { publicId: 'store_demo123456' },
    update: {},
    create: {
      publicId: 'store_demo123456',
      name: 'Demo Boutique',
      primaryReviewPlatform: ReviewPlatform.GOOGLE,
      reviewDestinationUrl: 'https://g.page/r/demo-boutique/review',
    },
  });

  console.log(`Created store: ${store.name} (${store.publicId})`);

  // Create a test order
  const order = await prisma.order.upsert({
    where: { squareOrderId: 'demo_order_001' },
    update: {},
    create: {
      storeId: store.id,
      squareOrderId: 'demo_order_001',
      totalAmount: 8500, // $85.00
      currency: 'USD',
      lineItemsJson: [
        { name: 'Silk Scarf', quantity: 1, amount: 4500 },
        { name: 'Leather Wallet', quantity: 1, amount: 4000 },
      ],
    },
  });

  console.log(`Created order: ${order.squareOrderId}`);

  // Create a pending review session
  const pendingSession = await prisma.reviewSession.upsert({
    where: { publicId: 'sess_pending12345' },
    update: {},
    create: {
      publicId: 'sess_pending12345',
      storeId: store.id,
      orderId: order.id,
      status: SessionStatus.PENDING,
    },
  });

  console.log(`Created pending session: ${pendingSession.publicId}`);

  // Create an approved session for testing landing pages
  const approvedSession = await prisma.reviewSession.upsert({
    where: { publicId: 'sess_approved1234' },
    update: {},
    create: {
      publicId: 'sess_approved1234',
      storeId: store.id,
      orderId: order.id,
      status: SessionStatus.APPROVED,
      starRating: 5,
      generatedReviewText:
        'Absolutely loved my experience at Demo Boutique! The silk scarf is gorgeous and the leather wallet is high quality. Will definitely be back!',
    },
  });

  console.log(`Created approved session: ${approvedSession.publicId}`);

  // Update store with last approved session
  await prisma.store.update({
    where: { id: store.id },
    data: { lastApprovedSessionId: approvedSession.id },
  });

  // Create some audit events
  await prisma.auditEvent.createMany({
    data: [
      {
        storeId: store.id,
        reviewSessionId: approvedSession.id,
        eventType: 'SESSION_CREATED',
        payload: { orderId: order.id },
      },
      {
        storeId: store.id,
        reviewSessionId: approvedSession.id,
        eventType: 'RATING_SUBMITTED',
        payload: { starRating: 5 },
      },
      {
        storeId: store.id,
        reviewSessionId: approvedSession.id,
        eventType: 'APPROVED',
        payload: {},
      },
    ],
    skipDuplicates: true,
  });

  console.log('Created audit events');

  console.log('\n--- Seed Complete ---');
  console.log(`\nTest with these IDs:`);
  console.log(`  Store Public ID: ${store.publicId}`);
  console.log(`  Pending Session: ${pendingSession.publicId}`);
  console.log(`  Approved Session: ${approvedSession.publicId}`);
  console.log(`\nLanding page URLs:`);
  console.log(`  Store tap: http://localhost:3000/tap/${store.publicId}`);
  console.log(`  Session: http://localhost:3000/r/${approvedSession.publicId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
