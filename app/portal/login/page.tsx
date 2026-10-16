import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/portal/auth-shell'
import { PortalLoginForm } from '@/components/portal/login-form'
import { getSession, isAdmin } from '@/lib/admin'
import { mailEnabled } from '@/lib/mail'

export const dynamic = 'force-dynamic'
export const metadata = { title: '로그인' }

/** 관리자·협력업체 공용 로그인. 로그인하면 관리자는 /admin, 협력업체는 /portal 로 간다 */
export default async function PortalLoginPage({ searchParams }: { searchParams: Promise<{ verified?: string; reset?: string }> }) {
  const session = await getSession()
  if (session?.user) redirect(isAdmin(session.user) ? '/admin' : '/portal')
  const { verified, reset } = await searchParams
  return (
    <AuthShell title="로그인" description="엔엠솔루션 협력업체 포털입니다. 아이디는 이메일입니다. 엔엠솔루션이 만들어 드린 계정은 비밀번호가 휴대폰 번호(숫자만)입니다.">
      <PortalLoginForm
        notice={verified ? '이메일 인증이 끝났습니다. 관리자 승인 후 이용할 수 있습니다.' : reset ? '비밀번호를 바꿨습니다. 새 비밀번호로 로그인하세요.' : ''}
        canReset={mailEnabled()}
      />
    </AuthShell>
  )
}
