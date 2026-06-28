import crypto from 'node:crypto';

/** Opaque refresh token (not a JWT) — stored hashed-free in DB, rotated on use. */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Compute an expiry Date from a duration string like "7d", "15m", "24h". */
export function expiryFromNow(duration: string): Date {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = Number(match[1]);
  const unit = match[2];
  const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return new Date(Date.now() + value * ms);
}
