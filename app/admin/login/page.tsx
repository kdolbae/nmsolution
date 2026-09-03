import { redirect } from 'next/navigation'
import { AdminAuthForm } from '@/components/admin/auth-form'
import { getSession, needsSetup } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const metadata = { title: '관리자 로그인 | NM SOLUTION' }

export default async function AdminLoginPage() {
  const session = await getSession()
  if (session?.user) redirect('/admin')
  const setup = await needsSetup()
  return <AdminAuthForm mode={setup ? 'setup' : 'sign-in'} />
}
