/**
 * Initialize Superadmin Account
 *
 * Run this script ONCE to create your superadmin account:
 * npx tsx scripts/init-superadmin.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing Jarvis Superadmin Account\n');

  // Configure your superadmin details here
  const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'ben@jarvis-ai.co';
  const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Ben Kennon';

  console.log(`Email: ${SUPERADMIN_EMAIL}`);
  console.log(`Name: ${SUPERADMIN_NAME}\n`);

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email: SUPERADMIN_EMAIL },
    include: { subscription: true, apiKeys: true },
  });

  if (user) {
    console.log('✅ User already exists');

    // Upgrade to superadmin if needed
    if (user.role !== 'SUPERADMIN') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SUPERADMIN' },
        include: { subscription: true, apiKeys: true },
      });
      console.log('✅ Upgraded to SUPERADMIN role');
    } else {
      console.log('✅ Already has SUPERADMIN role');
    }
  } else {
    // Create new superadmin
    console.log('Creating new superadmin user...');
    user = await prisma.user.create({
      data: {
        email: SUPERADMIN_EMAIL,
        name: SUPERADMIN_NAME,
        role: 'SUPERADMIN',
        subscription: {
          create: {
            product: 'JARVIS',
            planTier: 'ENTERPRISE',
            status: 'ACTIVE',
            aiRequestsPerDay: 99999, // Unlimited
            observatoriesLimit: 999,  // Unlimited
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        },
        usageStats: {
          create: {},
        },
      },
      include: { subscription: true, apiKeys: true },
    });
    console.log('✅ Superadmin user created');
  }

  // Create API key if doesn't exist
  if (user.apiKeys.length === 0) {
    const apiKey = `jarvis_${randomBytes(32).toString('hex')}`;

    await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: 'Superadmin API Key',
        key: apiKey,
        active: true,
        scopes: ['read', 'write', 'admin'],
      },
    });

    console.log('\n✅ API key created:');
    console.log(`\n   ${apiKey}\n`);
    console.log('⚠️  SAVE THIS API KEY - it will not be shown again!\n');
  } else {
    console.log('\n✅ API key already exists');
    console.log(`   Key ID: ${user.apiKeys[0].id}`);
    console.log('   (Use existing key or generate a new one from the admin panel)\n');
  }

  // Print summary
  console.log('═══════════════════════════════════════════════');
  console.log('SUPERADMIN ACCOUNT SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`User ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Name: ${user.name}`);
  console.log(`Role: ${user.role}`);
  console.log(`\nSubscription:`);
  console.log(`  Product: ${user.subscription?.product}`);
  console.log(`  Plan: ${user.subscription?.planTier}`);
  console.log(`  Status: ${user.subscription?.status}`);
  console.log(`  AI Requests/Day: ${user.subscription?.aiRequestsPerDay}`);
  console.log(`  Observatories: ${user.subscription?.observatoriesLimit}`);
  console.log('═══════════════════════════════════════════════\n');

  console.log('🎉 Superadmin initialization complete!\n');
  console.log('Next steps:');
  console.log('1. Save your API key in a secure location');
  console.log('2. Use the API key in requests: Authorization: Bearer <your-api-key>');
  console.log('3. Access superadmin panel at: http://localhost:4000/admin');
  console.log('4. Run database migrations: npx prisma db push\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
