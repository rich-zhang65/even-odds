// Kept apart from the session code so the proxy can read the name without
// pulling a database client into every request.
export const SESSION_COOKIE = 'eo_session';
