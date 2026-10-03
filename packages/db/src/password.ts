import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/* OWASP's scrypt floor: N=2^17, r=8, p=1. That is 128MiB per hash, which Node's
   32MiB default memory cap refuses, so the cap is raised alongside it. */
const COST = 2 ** 17;
const BLOCK = 8;
const PARALLEL = 1;
const KEY_BYTES = 64;
const SALT_BYTES = 16;
const MAX_MEMORY = 256 * 1024 * 1024;

const derive = (
  password: string,
  salt: Buffer,
  cost: number,
  block: number,
  parallel: number,
  bytes: number,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      bytes,
      { N: cost, r: block, p: parallel, maxmem: MAX_MEMORY },
      (error, key) => (error === null ? resolve(key) : reject(error)),
    );
  });

/* The parameters travel with the hash, so they can be raised later without
   locking out anyone whose hash was made with the old ones. */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, COST, BLOCK, PARALLEL, KEY_BYTES);
  return [
    'scrypt',
    COST,
    BLOCK,
    PARALLEL,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
};

export const verifyPassword = async (
  password: string,
  stored: string,
): Promise<boolean> => {
  const [scheme, cost, block, parallel, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || key === undefined || salt === undefined) {
    return false;
  }

  const expected = Buffer.from(key, 'base64');
  const actual = await derive(
    password,
    Buffer.from(salt, 'base64'),
    Number(cost),
    Number(block),
    Number(parallel),
    expected.length,
  );
  return timingSafeEqual(actual, expected);
};
