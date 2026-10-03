import { createDb, hashPassword, users } from '../src';

/* The two accounts the site is private to. There is no sign-up yet, so these are
   the only way in. */
const ACCOUNTS = [
  { email: 'victoria@evenodds.com', username: 'victoria' },
  { email: 'richard@evenodds.com', username: 'richard' },
];

/* The password comes from the environment rather than this file, so the repo
   never holds one -- only its scrypt hash ever reaches the database. */
const main = async (): Promise<void> => {
  const url = process.env.DATABASE_URL;
  const password = process.env.SEED_PASSWORD;
  if (url === undefined || password === undefined || password === '') {
    throw new Error('Set DATABASE_URL and SEED_PASSWORD to seed accounts.');
  }

  const db = createDb(url);
  for (const { email, username } of ACCOUNTS) {
    const passwordHash = await hashPassword(password);
    await db
      .insert(users)
      .values({ email, username, passwordHash })
      .onConflictDoUpdate({
        target: users.email,
        set: { username, passwordHash },
      });
    console.log(`seeded ${username} <${email}>`);
  }
  await db.$client.end();
};

await main();
