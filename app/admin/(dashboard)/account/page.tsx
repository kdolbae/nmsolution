import { PageHeader } from '@/components/admin/form'
import { PasswordForm } from '@/components/admin/password-form'
import { getSession } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export default async function AdminAccountPage() {
  const session = await getSession()
  return (
    <>
      <PageHeader title="계정 · 비밀번호" description={`로그인 이메일: ${session?.user.email ?? '-'}`} />
      <PasswordForm />
    </>
  )
}
