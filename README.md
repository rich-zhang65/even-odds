# even-odds
Settle the score online, at even odds

## Running it

The app is two processes. Start both with one command:

```
npm install
npm run dev
```

| | port | what it is |
|---|---|---|
| web | 3000 | Next.js app |
| server | 4000 | Socket.IO match server |

Both reload on change. `npm run dev:web` and `npm run dev:server` run either
one alone.

If the home page loads but starting a game errors, the match server is not up
— the web app cannot tell you that any more clearly, because it only finds out
when the socket fails. If it refuses to start with `EADDRINUSE`, an older
server is still holding the port; stop that process before starting a new one.

## Checks

```
npm test        # vitest
npm run lint    # eslint
npm run typecheck
```

