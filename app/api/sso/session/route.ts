import { NextResponse } from 'next/server'
import { getAppSessionFrom } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** 현재 세션 요약(상단바 전환기용) */
export async function GET(req: Request) {
  const s = await getAppSessionFrom(req.headers)
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(
    {
      via: s.via,
      name: s.name,
      email: s.email,
      est_role: s.estRole,
      tenant: s.sso?.tenant ?? null,
      memberships: s.sso?.memberships ?? [],
      hq: s.sso?.hq ?? false,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
