import { notFound } from 'next/navigation'
import { AuthShell } from '@/components/portal/auth-shell'
import { ForgotForm } from '@/components/portal/password-forms'
import { mailEnabled } from '@/lib/mail'

export const dynamic = 'force-dynamic'
export const metadata = { title: '비밀번호 찾기' }

export default function ForgotPage() {
  if (!mailEnabled()) notFound()
  return (
    <AuthShell title="비밀번호 찾기" description="가입한 이메일로 비밀번호를 다시 정하는 링크를 보내 드립니다.">
      <ForgotForm />
    </AuthShell>
  )
}
