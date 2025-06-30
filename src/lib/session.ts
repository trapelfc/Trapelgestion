
'use server';

import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User } from './types';

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
    if (!secretKey) {
        throw new Error('JWT_SECRET is not set in environment variables.');
    }
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Token expires in 1 hour
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    if (!secretKey) {
        throw new Error('JWT_SECRET is not set in environment variables.');
    }
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // This will be caught if the token is expired or invalid
    console.log('Failed to verify session');
    return null;
  }
}

export async function createSession(user: Pick<User, 'id' | 'role'>, permissions: string[]) {
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const session = await encrypt({ sub: user.id, role: user.role, permissions, expires });

  // Save the session in a cookie
  cookies().set('session', session, { expires, httpOnly: true, path: '/' });
}

export async function getSession() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;
  return await decrypt(sessionCookie);
}

export async function deleteSession() {
  cookies().delete('session');
}
