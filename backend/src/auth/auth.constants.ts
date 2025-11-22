export const SESSION_COOKIE_NAME = 'session';
export const HANDSHAKE_COOKIE_NAME = 'handshake';

// JWT metadata defaults
export const DEFAULT_TOKEN_ISSUER = 'metavr-backend';
export const SESSION_TOKEN_AUDIENCE = 'metavr-dashboard';
export const HANDSHAKE_TOKEN_AUDIENCE = 'metavr-handshake';

export const DEFAULT_SESSION_EXPIRY_SECONDS = 12 * 60 * 60; // 12h
export const REMEMBER_ME_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7d
export const DEFAULT_HANDSHAKE_TTL_SECONDS = 60;
export const SESSION_IDLE_TIMEOUT_SECONDS = 60 * 60 * 6; // 6h of inactivity

