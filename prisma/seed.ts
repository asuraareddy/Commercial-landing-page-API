import { PrismaClient } from '@prisma/client';
import { UserRole, SubscriptionStatus, DomainStatus } from '../src/lib/types';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial WA Gateway production database...');

  // 1. Create Super Admin Account
  const superAdminPassword = await bcrypt.hash('admin123456', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@wagateway.com' },
    update: {},
    create: {
      email: 'admin@wagateway.com',
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log('Super Admin created:', superAdmin.email);

  // 2. Create Default Admin User
  const demoAdminPassword = await bcrypt.hash('demo123456', 10);
  const demoAdmin = await prisma.user.upsert({
    where: { email: 'demo@client.com' },
    update: {},
    create: {
      email: 'demo@client.com',
      passwordHash: demoAdminPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log('Default Admin created:', demoAdmin.email);

  // 3. Create Workspace for Default Admin
  const workspace = await prisma.workspace.upsert({
    where: { userId: demoAdmin.id },
    update: {},
    create: {
      userId: demoAdmin.id,
      name: 'Apex Digital Marketing',
      primaryColor: '#0f172a',
      buttonColor: '#25D366',
      supportEmail: 'support@apexdigital.com',
      defaultWhatsapp: '15550192834',
    },
  });
  console.log('Workspace created:', workspace.name);

  // 4. Create Active Subscription for Workspace
  await prisma.subscription.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      planName: 'Unlimited SaaS License',
      price: 500.0,
      currency: 'USD',
      billingType: 'One Time',
      status: SubscriptionStatus.ACTIVE,
      gateway: 'MANUAL',
      activationDate: new Date(),
    },
  });

  // 5. Create Default Domain Endpoint
  await prisma.domain.upsert({
    where: { domainName: 'go.apexdigital.com' },
    update: {},
    create: {
      workspaceId: workspace.id,
      domainName: 'go.apexdigital.com',
      isPrimary: true,
      status: DomainStatus.ACTIVE,
    },
  });

  console.log('Database bootstrapping completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
