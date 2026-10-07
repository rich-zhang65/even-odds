/* Where the game server is. Deployed, it is another site entirely (the web app
   on Vercel, the game server on Render), set at build time; locally it is the
   dev server's port. */
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
