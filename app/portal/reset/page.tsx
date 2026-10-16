import { AuthShell } from '@/components/portal/auth-shell'
import { ResetForm } from '@/components/portal/password-forms'

export const metadata = { title: '비밀번호 다시 정하기' }

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams
  return (
    <AuthShell title="비밀번호 다시 정하기">
      <ResetForm token={token ?? ''} invalid={!!error || !token} />
    </AuthShell>
  )
}
