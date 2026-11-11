import { redirect } from 'next/navigation'
import { getSession, isAdmin } from '@/lib/admin'
import { AdminSidebar } from '@/components/admin/sidebar'

export const dynamic = 'force-dynamic'

// 아이폰 웹 푸시는 '홈 화면에 추가'한 앱에서만 된다. 관리자 화면만 앱처럼 열리게 한다 (components/admin/admin-push.tsx)
export const metadata = {
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'NM 관리자', statusBarStyle: 'default' as const },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect('/admin/login')
  // 협력업체 계정은 관리자 화면 대신 자기 업체 포털로
  if (!isAdmin(session.user)) redirect('/portal')

  return (
    <div className="flex min-h-svh flex-col bg-secondary text-foreground lg:flex-row">
      <AdminSidebar userName={session.user.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 lg:px-10 lg:py-12">{children}</div>
      </div>
    </div>
  )
}
