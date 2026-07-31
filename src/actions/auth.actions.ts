'use server';

import { db } from '@/lib/db';
import { setSessionCookie, clearSessionCookie, getSession } from '@/lib/auth';
import { loginSchema } from '@/lib/schemas';
import bcrypt from 'bcryptjs';
import { UserRole, SubscriptionStatus } from '@/lib/types';

export async function loginAction(formData: FormData) {
  try {
    const rawEmail = formData.get('email')?.toString() || '';
    const rawPassword = formData.get('password')?.toString() || '';

    const validated = loginSchema.safeParse({ email: rawEmail, password: rawPassword });
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
    }

    const { email, password } = validated.data;

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { workspace: true },
    });

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (user.isSuspended) {
      return { success: false, error: 'Your account has been suspended. Please contact support.' };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: 'Invalid email or password' };
    }

    await setSessionCookie({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      workspaceId: user.workspace?.id || null,
      workspaceName: user.workspace?.name || null,
    });

    return {
      success: true,
      role: user.role,
      redirectUrl: user.role === UserRole.SUPER_ADMIN ? '/super-admin' : '/dashboard',
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred during login' };
  }
}

export async function registerAdminUserAction(formData: FormData) {
  try {
    const businessName = formData.get('businessName')?.toString().trim();
    const fullName = formData.get('fullName')?.toString().trim();
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const phone = formData.get('phone')?.toString().trim();
    const password = formData.get('password')?.toString();

    if (!businessName || !email || !password) {
      return { success: false, error: 'Business name, email, and password are required.' };
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.ADMIN,
        workspace: {
          create: {
            name: businessName,
            supportEmail: email,
            subscription: {
              create: {
                planName: 'Unlimited',
                price: 500.0,
                currency: 'USD',
                billingType: 'One Time',
                status: SubscriptionStatus.ACTIVE,
              },
            },
          },
        },
      },
    });

    return { success: true, userId: newUser.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to complete registration.' };
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  return { success: true };
}

export async function getCurrentUserAction() {
  return await getSession();
}
