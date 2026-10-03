export const SESSION_COOKIE = 'eo_session';

/* The session token from a raw Cookie header, which is all a socket handshake
   has to offer. Its own subpath export so a reader of cookies -- the web proxy,
   the game server's handshake -- does not pull in a database client with it. */
export const sessionTokenFrom = (header: string | undefined): string | null => {
  for (const part of (header ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join('='));
  }
  return null;
};
