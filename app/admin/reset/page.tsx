'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/brand'

/**
 * 관리자 계정 초기화 화면. Vercel 환경변수 ADMIN_RESET_TOKEN 값을 넣으면 기존 관리자 계정을 지운다.
 * 그다음 /admin/login 에서 새 관리자 계정을 만든다. (app/api/admin/reset/route.ts 참고)
 */
export default function AdminResetPage() {
  const [token, setToken] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const r = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (r.status === 404) {
        setError('초기화 기능이 꺼져 있습니다. Vercel 환경변수 ADMIN_RESET_TOKEN(24자 이상)을 넣고 다시 배포해 주세요.')
        return
      }
      const res = (await r.json().catch(() => null)) as { ok: boolean; error?: string } | null
      if (res?.ok) setDone(true)
      else setError(res?.error || '초기화하지 못했습니다.')
    } catch {
      setError('인터넷 연결을 확인해 주세요.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-secondary px-5 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8 bg-background p-8 ring-1 ring-border">
        <Logo />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">관리자 계정 초기화</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            비밀번호를 잊었을 때 씁니다. 기존 관리자 계정을 지우고, 로그인 화면에서 새로 만듭니다. 사이트 내용 · 시공사례 ·
            견적 문의는 그대로 남습니다.
          </p>
        </div>
        {done ? (
          <div className="flex flex-col gap-4">
            <p className="border border-electric bg-electric/5 p-4 text-sm">초기화했습니다. 이제 새 관리자 계정을 만드세요.</p>
            <Link
              href="/admin/login"
              className="inline-flex h-11 items-center justify-center bg-electric px-5 text-sm font-semibold text-electric-foreground transition-colors hover:bg-navy"
            >
              관리자 계정 만들기
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reset-token">초기화 코드</Label>
              <Input
                id="reset-token"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Vercel 환경변수 ADMIN_RESET_TOKEN 에 넣은 값</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending || !token}>
              {pending ? '초기화 중…' : '관리자 계정 초기화'}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
