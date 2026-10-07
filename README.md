# even-odds

Settle the score online, at even odds

## Running it

The app is two processes. Start both with one command:

```
npm install
npm run dev
```

|        | port | what it is             |
| ------ | ---- | ---------------------- |
| web    | 3000 | Next.js app            |
| server | 4000 | Socket.IO match server |

Both reload on change. `npm run dev:web` and `npm run dev:server` run either
one alone.

If the home page loads but starting a game errors, the match server is not up
— the web app cannot tell you that any more clearly, because it only finds out
when the socket fails. If it refuses to start with `EADDRINUSE`, an older
server is still holding the port; stop that process before starting a new one.

## Deploying

Three free services:

| Piece       | Host   | Notes                                                |
| ----------- | ------ | ---------------------------------------------------- |
| web app     | Vercel | always up                                            |
| game server | Render | sleeps after 15 quiet minutes, ~1 minute to wake     |
| database    | Neon   | pauses after 5 idle minutes, wakes in under a second |

The web app and the game server end up on unrelated sites, so the browser does
not send the sign-in cookie to the game server. Instead the web app hands each
signed-in player a short-lived ticket, signed with `SOCKET_SECRET`, which the
game server checks. Both must have the same `SOCKET_SECRET`.

There is no sign-up. The only accounts are the two the seed script creates.

### 1. Database (Neon)

1. Create a project on the free plan. From **Connect**, copy two connection
   strings: the **pooled** one (its host contains `-pooler`) and the **direct**
   one (pooling turned off).
2. From your machine, create the tables and the two accounts, against the
   direct string. A `DATABASE_URL` set in the shell wins over the one in `.env`.

   ```
   DATABASE_URL="<direct string>" npm run db:migrate
   DATABASE_URL="<direct string>" SEED_PASSWORD="<a strong password>" npm run db:seed
   ```

   Both accounts get that password. Run `db:migrate` again whenever a new
   migration lands; `db:seed` only once.

### 2. Secret

Generate one value for `SOCKET_SECRET` and keep it for both hosts:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 3. Web app (Vercel)

1. **Add New → Project**, import the repository, set **Root Directory** to
   `apps/web`. Vercel recognises Next.js and the npm workspace.
2. Environment variables:

   | Name                     | Value                                      |
   | ------------------------ | ------------------------------------------ |
   | `DATABASE_URL`           | the Neon **pooled** string                 |
   | `SOCKET_SECRET`          | the secret from step 2                     |
   | `NEXT_PUBLIC_SERVER_URL` | leave for now; set once Render gives a URL |

3. Deploy, and note the production address, `https://<name>.vercel.app`.

### 4. Game server (Render)

1. **New → Web Service**, connect the repository, instance type **Free**.
   - Root directory: blank (the repository root)
   - Build command: `npm ci`
   - Start command: `npm run start --workspace apps/server`
   - Health check path: `/`
2. Environment variables (Render sets `PORT` itself):

   | Name             | Value                                 |
   | ---------------- | ------------------------------------- |
   | `NODE_ENV`       | `production`                          |
   | `DATABASE_URL`   | the Neon **pooled** string            |
   | `SOCKET_SECRET`  | the same secret as on Vercel          |
   | `ALLOWED_ORIGIN` | `https://<name>.vercel.app`, no slash |

   The server refuses to start without `SOCKET_SECRET` or `ALLOWED_ORIGIN`, and
   `NODE_ENV=production` keeps Pong off the shelf.

3. Deploy, and note its address, `https://<service>.onrender.com`.

### 5. Connect the two

Set `NEXT_PUBLIC_SERVER_URL` on Vercel to the Render address, then **redeploy**
the web app: it is read at build time, so a running deployment never sees it.

### 6. Check

- Sign in at the Vercel address as either account.
- Start a game. After a quiet spell the first one may show "Waking up the game
  server" for up to a minute; the home page already knocked when it loaded.
- Join from the other account and play a move. If the game server refuses the
  connection, check that `SOCKET_SECRET` matches on both hosts and that
  `ALLOWED_ORIGIN` is exactly the Vercel production address.

Only the production address works: Vercel preview deployments have their own
addresses, which `ALLOWED_ORIGIN` does not match.

### Living with the free plans

- A match lives in the game server's memory. Redeploying the game server, or it
  sleeping, ends any match in progress; neither happens mid-game, since play
  keeps it awake.
- Render's free hours (750 a month) cover the server being awake all month.
- Neon keeps the data indefinitely; Render's own free Postgres would expire
  after 30 days, which is why the database is on Neon.

## Checks

```
npm test        # vitest
npm run lint    # eslint
npm run typecheck
```
