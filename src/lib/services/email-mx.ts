/**
 * Node-only DNS checks for email domains. Do not import from client components —
 * `email.ts` is shared with the browser; MX validation lives here.
 */
import { promises as dns } from "node:dns";

export async function hasMXRecords(domain: string): Promise<boolean> {
  try {
    const mx = await dns.resolveMx(domain);
    return Array.isArray(mx) && mx.length > 0;
  } catch {
    return false;
  }
}
