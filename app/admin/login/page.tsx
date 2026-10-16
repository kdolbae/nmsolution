import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AdminAuthForm } from '@/components/admin/auth-form'
import { Logo } from '@/components/brand'
import { needsSetup } from '@/lib/admin'
import { ADMIN_EMAIL } from '@/lib/auth-roles'
import { canEnterAdmin, getAppSession } from '@/lib/session'
import { SSO_ERRORS, localLoginEnabled, safeNext, ssoEnabled } from '@/lib/sso/config'

export const dynamic = 'force-dynamic'
export const metadata = { title: '관리자 로그인 | NM SOLUTION' }

/**
 * S16 로그인. "SBworks 로 로그인"(SSO) + LOCAL_LOGIN_ENABLED 일 때 기존 로컬 로그인(/portal/login)·최초 관리자 만들기.
 * SSO 가 꺼져 있으면 예전처럼 /portal/login 으로 보냄.
 */
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; setup?: string }> }) {
  const { error, next, setup: setupParam } = await searchParams
  const session = await getAppSession().catch(() => null)
  if (session && !error) redirect(canEnterAdmin(session) ? safeNext(next) : '/portal')

  const sso = ssoEnabled()
  const local = localLoginEnabled()
  const setup = local || !sso ? await needsSetup().catch(() => false) : false

  if (setup && (!sso || setupParam === '1')) return <AdminAuthForm mode="setup" adminEmail={ADMIN_EMAIL} />
  if (!sso) redirect('/portal/login')

  const message = error ? (SSO_ERRORS[error] ?? SSO_ERRORS.server_error) : null
  const startHref = `/api/sso/start?next=${encodeURIComponent(safeNext(next))}`

  return (
    <main className="flex min-h-svh items-center justify-center bg-secondary px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6 bg-background p-8 ring-1 ring-border">
        <div className="flex flex-col items-start gap-3">
          <Logo />
          <h1 className="text-xl font-bold tracking-tight">관리자 로그인</h1>
          <p className="text-sm text-muted-foreground">SBworks 계정으로 들어옴. 엔엠솔루션 소속이어야 함.</p>
        </div>

        {message && (
          <div role="alert" className="flex flex-col gap-1 border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <span>{message}</span>
            <a href={startHref} className="w-fit font-medium underline">
              다시 시도
            </a>
          </div>
        )}

        <a
          href={startHref}
          className="inline-flex h-11 items-center justify-center bg-navy px-4 text-sm font-semibold text-navy-foreground transition-colors hover:bg-navy/90"
        >
          SBworks 로 로그인
        </a>

        {local && (
          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
            {setup ? (
              <Link href="/admin/login?setup=1" className="text-muted-foreground hover:text-foreground">
                관리자 계정이 아직 없음 — 처음 한 번 만들기
              </Link>
            ) : (
              <Link href="/portal/login" className="text-muted-foreground hover:text-foreground">
                이메일·비밀번호로 로그인(로컬 계정·협력업체)
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
