import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function b64url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export function hmac(secret: string, data: string): string {
  return b64url(createHmac('sha256', secret).update(data).digest())
}

/** 길이가 달라도 안전한 비교 */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function randomHex(bytes = 16): string {
  return randomBytes(bytes).toString('hex')
}
