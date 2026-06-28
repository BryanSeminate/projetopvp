import '@fastify/jwt';
import type { FastifyRequest, FastifyReply } from 'fastify';

// JWT access-token payload
export interface AccessTokenPayload {
  sub: string; // userId
  companyId?: string; // set after select-company
}

// Authenticated request context populated by middlewares
export interface AuthContext {
  userId: string;
  companyId?: string;
  roleId?: string;
  permissions?: string[];
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext;
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireCompany: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (
      code: string,
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
