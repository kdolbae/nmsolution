import { redirect } from 'next/navigation'
import { AdminAuthForm } from '@/components/admin/auth-form'
import { getSession, isAdmin, needsSetup } from '@/lib/admin'
import { ADMIN_EMAIL } from '@/lib/auth-roles'

export const dynamic = 'force-dynamic'
export const metadata = { title: '관리자 로그인 | NM SOLUTION' }

export default async function AdminLoginPage() {
  const session = await getSession()
  if (session?.user) redirect(isAdmin(session.user) ? '/admin' : '/portal')
  // 로그인은 협력업체와 같은 화면(/portal/login)에서 한다. 여기서는 관리자 계정이 없을 때 처음 만드는 것만 한다
  if (!(await needsSetup())) redirect('/portal/login')
  return <AdminAuthForm mode="setup" adminEmail={ADMIN_EMAIL} />
}
