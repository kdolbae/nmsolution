import { redirect } from 'next/navigation'
import { getSession } from '@/lib/admin'
import { AdminSidebar } from '@/components/admin/sidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect('/admin/login')

  return (
    <div className="flex min-h-svh bg-secondary text-foreground">
      <AdminSidebar userName={session.user.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 lg:px-10 lg:py-12">{children}</div>
      </div>
    </div>
  )
}
