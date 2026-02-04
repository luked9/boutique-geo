/**
 * Migration script: Copy existing Square data from Store to POSConnection
 *
 * Run with: npx ts-node scripts/migrate-square-to-pos-connection.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Square data migration to POSConnection...\n');

  // Find all stores with Square credentials
  const storesWithSquare = await prisma.store.findMany({
    where: {
      OR: [
        { squareMerchantId: { not: null } },
        { accessTokenEnc: { not: null } },
      ],
    },
  });

  console.log(`Found ${storesWithSquare.length} stores with Square data\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const store of storesWithSquare) {
    try {
      // Check if POSConnection already exists
      const existing = await prisma.pOSConnection.findUnique({
        where: {
          storeId_provider: {
            storeId: store.id,
            provider: 'SQUARE',
          },
        },
      });

      if (existing) {
        console.log(`⏭️  Store "${store.name}" (${store.publicId}): Already has POSConnection, skipping`);
        skipped++;
        continue;
      }

      // Create POSConnection from Store data
      await prisma.pOSConnection.create({
        data: {
          storeId: store.id,
          provider: 'SQUARE',
          merchantId: store.squareMerchantId,
          locationId: store.squareLocationId,
          accessTokenEnc: store.accessTokenEnc,
          refreshTokenEnc: store.refreshTokenEnc,
          tokenExpiresAt: store.tokenExpiresAt,
          isActive: !!store.accessTokenEnc,
          providerMetadata: {},
        },
      });

      console.log(`✅ Store "${store.name}" (${store.publicId}): Migrated to POSConnection`);
      migrated++;
    } catch (error) {
      console.error(`❌ Store "${store.name}" (${store.publicId}): Error - ${error}`);
      errors++;
    }
  }

  // Also migrate existing orders to have the externalOrderId field set
  console.log('\nUpdating existing orders with externalOrderId from squareOrderId...');

  // Set externalOrderId from squareOrderId for existing orders
  const ordersToUpdate = await prisma.order.findMany({
    where: {
      squareOrderId: { not: null },
      externalOrderId: null,
    },
  });

  let ordersUpdated = 0;
  for (const order of ordersToUpdate) {
    if (order.squareOrderId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { externalOrderId: order.squareOrderId },
      });
      ordersUpdated++;
    }
  }

  console.log(`Updated ${ordersUpdated} orders with externalOrderId`);

  console.log('\n--- Migration Summary ---');
  console.log(`✅ Migrated: ${migrated}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log('------------------------\n');

  if (errors === 0) {
    console.log('Migration completed successfully!');
  } else {
    console.log('Migration completed with errors. Please review above.');
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
