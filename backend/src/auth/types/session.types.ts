export type UserRole = 'admin' | 'supervisor' | 'user';

export interface HandshakePayload {
  userId: string;
  email: string;
  role: UserRole;
  rememberMe?: boolean;
  handshakeId: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  rememberMe?: boolean;
  sessionId: string;
  expiresAt: number;
}

