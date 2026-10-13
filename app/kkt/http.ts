import { KKT_COOKIE } from '@/lib/kkt-access'

// /kkt 와 /kkt/quote 가 같이 쓰는 응답 헤더·쿠키 읽기

export const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
}

export function cookieValue(req: Request): string | undefined {
  const raw = req.headers.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === KKT_COOKIE) return v.join('=')
  }
  return undefined
}
