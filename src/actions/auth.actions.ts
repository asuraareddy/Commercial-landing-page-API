'use server';

import { db } from '@/lib/db';
import { setSessionCookie, clearSessionCookie, getSession } from '@/lib/auth';
import { loginSchema } from '@/lib/schemas';
import bcrypt from 'bcryptjs';
import { UserRole } from '@/lib/types';

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

export async function logoutAction() {
  await clearSessionCookie();
  return { success: true };
}

export async function getCurrentUserAction() {
  return await getSession();
}
