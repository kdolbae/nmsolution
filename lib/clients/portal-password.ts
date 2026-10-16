import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/** 업체용 링크 비밀번호 해시. 형식: scrypt$<salt hex>$<hash hex> */

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, key) => (e ? reject(e) : resolve(key))),
  )
}

export async function hashPortalPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('hex')}$${(await derive(password, salt)).toString('hex')}`
}

export async function verifyPortalPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [kind, saltHex, hashHex] = String(stored ?? '').split('$')
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const got = await derive(password, Buffer.from(saltHex, 'hex'))
  return got.length === expected.length && timingSafeEqual(got, expected)
}
