import type { LoginEntry } from './login-activity';

/** Eligibility is supplied by the verified-owner API; fail closed on stale flags. */
export function canEndLoginSession(entry: LoginEntry): boolean {
  return entry.can_end === true && entry.active === true && entry.is_current === false
    && /^[1-9]\d{0,18}$/.test(entry.id) && BigInt(entry.id) <= 9223372036854775807n;
}
