#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'kennonjarvis@gmail.com';
  const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Kennon Jarvis';

  console.log('🚀 Creating SUPERADMIN account...');
  console.log(`Email: ${SUPERADMIN_EMAIL}`);
  console.log(`Name: ${SUPERADMIN_NAME}`);

  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: SUPERADMIN_EMAIL },
    });

    if (user) {
      // Update existing user
      console.log('✅ User found, updating to SUPERADMIN');
      user = await prisma.user.update({
        where: { email: SUPERADMIN_EMAIL },
        data: {
          emailVerified: new Date(),
          name: SUPERADMIN_NAME,
        },
      });
    } else {
      // Create new SUPERADMIN user
      user = await prisma.user.create({
        data: {
          email: SUPERADMIN_EMAIL,
          name: SUPERADMIN_NAME,
          emailVerified: new Date(),
        },
      });
      console.log('✅ SUPERADMIN user created');
    }

    console.log('');
    console.log('🎉 SUPERADMIN account setup complete!');
    console.log('');
    console.log('Account Details:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  ID: ${user.id}`);
    console.log('');
    console.log('You can now login at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Error creating SUPERADMIN:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
