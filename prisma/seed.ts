import { PrismaClient } from '@prisma/client';
import { UserRole, PageStatus, DomainStatus, SubscriptionStatus, MediaType } from '../src/lib/types';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial WA Gateway database...');

  // 1. Create Super Admin
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

  // 2. Create Demo Admin User
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
  console.log('Demo Admin created:', demoAdmin.email);

  // 3. Create Workspace for Demo Admin
  const workspace = await prisma.workspace.upsert({
    where: { userId: demoAdmin.id },
    update: {},
    create: {
      userId: demoAdmin.id,
      name: 'Apex Digital Marketing',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      primaryColor: '#0f172a',
      buttonColor: '#25D366',
      supportEmail: 'support@apexdigital.com',
      defaultWhatsapp: '15550192834',
      defaultPixelId: '123456789012345',
      defaultMessage: 'Hello Apex Team, I am interested in your services.',
    },
  });
  console.log('Workspace created:', workspace.name);

  // 4. Create Subscription for Workspace
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

  // 5. Create Custom Domain
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

  // 6. Create Sample Landing Pages
  await prisma.landingPage.upsert({
    where: { slug: 'summer-sale' },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'Summer Campaign 2026',
      slug: 'summer-sale',
      companyName: 'Apex Digital Agency',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
      mediaType: MediaType.IMAGE,
      mediaWidth: '100%',
      mediaHeight: '260px',
      borderRadius: '16px',
      shadow: 'lg',
      objectFit: 'cover',
      mediaPosition: 'center',
      whatsappNumber: '15550192834',
      prefilledMessage: 'Hi! I saw your Meta Ad for the Summer Sale and want more info.',
      buttonText: 'Chat on WhatsApp Now',
      metaPixelId: '123456789012345',
      status: PageStatus.ACTIVE,
      viewsCount: 1420,
      clicksCount: 680,
    },
  });

  await prisma.landingPage.upsert({
    where: { slug: 'vip-consultation' },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: 'VIP Executive Consultation',
      slug: 'vip-consultation',
      companyName: 'Apex Growth Advisors',
      logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mediaType: MediaType.VIDEO,
      mediaWidth: '100%',
      mediaHeight: '280px',
      borderRadius: '20px',
      shadow: 'xl',
      objectFit: 'cover',
      mediaPosition: 'center',
      whatsappNumber: '15550192834',
      prefilledMessage: 'Hi Apex, I would like to schedule a VIP consultation.',
      buttonText: 'Connect via WhatsApp',
      metaPixelId: '987654321098765',
      status: PageStatus.ACTIVE,
      viewsCount: 890,
      clicksCount: 410,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
