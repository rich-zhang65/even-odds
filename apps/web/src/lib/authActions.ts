'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@even-odds/db';
import { db } from './session';
import { SESSION_COOKIE } from './sessionCookie';

/* Returns the message to show, or redirects home. One message covers an unknown
   account and a wrong password alike, so the form cannot be used to find out
   which accounts exist. */
export const logIn = async (
  _previous: string | null,
  form: FormData,
): Promise<string | null> => {
  const login = form.get('login');
  const password = form.get('password');
  if (typeof login !== 'string' || typeof password !== 'string') {
    return 'Enter your username or email, and your password.';
  }
  if (login.trim() === '' || password === '') {
    return 'Enter your username or email, and your password.';
  }

  const session = await signIn(db, login, password);
  if (session === null) return 'Those details do not match an account.';

  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: session.expiresAt,
  });
  redirect('/');
};

export const logOut = async (): Promise<void> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token !== undefined) await signOut(db, token);
  jar.delete(SESSION_COOKIE);
  redirect('/login');
};
