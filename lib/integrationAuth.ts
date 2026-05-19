import crypto from 'crypto'

/**
 * Constant-time HMAC verification for inbound Calling-Agent events.
 *
 * Contract:
 *   - Calling-Agent backend signs (timestamp + "." + raw body) with
 *     CALLING_AGENT_INTEGRATION_SECRET using HMAC-SHA256.
 *   - Sends headers: X-Integration-Signature (hex), X-Integration-Timestamp (unix seconds).
 *   - We reject when:
 *       * secret is unset (501 from caller),
 *       * either header is missing,
 *       * timestamp drift exceeds the allowed window (replay defence),
 *       * signature does not match.
 */
export type IntegrationAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

const DEFAULT_SKEW_SECONDS = 300

function readEnvSecret(): string {
  return (process.env.CALLING_AGENT_INTEGRATION_SECRET || '').trim()
}

function readEnvSkew(): number {
  const raw = (process.env.CALLING_AGENT_INTEGRATION_TIMESTAMP_WINDOW || '').trim()
  const parsed = parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SKEW_SECONDS
  return Math.min(parsed, 3600) // hard cap at 1h
}

export function verifyIntegrationRequest(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
): IntegrationAuthResult {
  const secret = readEnvSecret()
  if (!secret) {
    return { ok: false, status: 501, error: 'integration secret not configured' }
  }
  if (!signatureHeader || !timestampHeader) {
    return { ok: false, status: 401, error: 'missing signature/timestamp headers' }
  }
  const tsNum = parseInt(timestampHeader, 10)
  if (!Number.isFinite(tsNum)) {
    return { ok: false, status: 401, error: 'invalid timestamp' }
  }
  const skew = Math.abs(Math.floor(Date.now() / 1000) - tsNum)
  if (skew > readEnvSkew()) {
    return { ok: false, status: 401, error: 'timestamp out of window' }
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex')
  // Length-mismatched buffers throw in timingSafeEqual — guard explicitly.
  const a = Buffer.from(signatureHeader, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) {
    return { ok: false, status: 401, error: 'signature length mismatch' }
  }
  if (!crypto.timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: 'signature mismatch' }
  }
  return { ok: true }
}
