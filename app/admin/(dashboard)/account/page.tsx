import { PageHeader } from '@/components/admin/form'
import { PasswordForm } from '@/components/admin/password-form'
import { getSession } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export default async function AdminAccountPage() {
  const session = await getSession()
  if (session?.via === 'sbworks') {
    return (
      <PageHeader
        title="계정 · 비밀번호"
        description={`sbworks.bond 관리 웹 계정(${session.user.name})으로 들어왔습니다. 비밀번호는 관리 웹에서 바꿉니다.`}
      />
    )
  }
  return (
    <>
      <PageHeader title="계정 · 비밀번호" description={`로그인 이메일: ${session?.user.email ?? '-'}`} />
      <PasswordForm />
    </>
  )
}
