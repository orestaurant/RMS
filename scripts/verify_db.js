const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findFirst();
    console.log('VERIFICATION SUCCESSFUL!');
    console.log('PostgreSQL Connection is ACTIVE and working.');
    console.log('Sample record retrieved -> User email:', user ? user.email : 'None found');
  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();

