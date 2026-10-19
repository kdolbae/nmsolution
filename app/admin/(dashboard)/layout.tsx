import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/sidebar'
import { TopBar } from '@/components/admin/top-bar'
import { canEnterAdmin, getAppSession, isSiteAdmin } from '@/lib/session'
import { pendingApprovalCount } from '@/lib/est/data'
import { getSettings } from '@/lib/est/settings'
import { sObj } from '@/lib/est/settings-defaults'
import { EST_ROLE_LABEL } from '@/lib/est/perm'
import { ssoIssuer } from '@/lib/sso/config'

export const dynamic = 'force-dynamic'

const HOME_TENANT = { slug: 'nmsolution', name: '엔엠솔루션' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession()
  if (!session) redirect('/admin/login')
  // 협력업체 계정은 관리자 화면 대신 자기 업체 포털로
  if (!canEnterAdmin(session)) redirect(session.via === 'sso' ? '/admin/login?error=no_role' : '/portal')

  // 결재 배지·메뉴 모듈은 DB 가 잠시 안 돼도 화면은 열리게
  const [pending, settings] = await Promise.all([
    pendingApprovalCount(session.estRole, session.userId).catch(() => 0),
    getSettings().catch(() => ({}) as Record<string, unknown>),
  ])
  const modules = sObj<Record<string, boolean>>(settings, 'menu.modules')
  const roleLabel = session.role === 'admin' ? '관리자' : session.estRole ? EST_ROLE_LABEL[session.estRole] : '직원'
  const current = session.sso?.tenant ? { slug: session.sso.tenant.slug, name: session.sso.tenant.name } : HOME_TENANT
  const memberships = (session.sso?.memberships ?? []).map((m) => ({ tenantId: m.tenant_id, slug: m.slug, name: m.name, roleCode: m.role_code, appUrl: m.app_url }))

  return (
    <div className="flex min-h-svh flex-col bg-secondary text-foreground">
      <TopBar
        current={current}
        memberships={memberships}
        hq={!!session.sso?.hq}
        sbworksUrl={ssoIssuer()}
        userName={session.name || session.email}
        roleLabel={roleLabel}
        via={session.via}
        pending={pending}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
        <AdminSidebar userName={session.name || session.email} via={session.via} siteAdmin={isSiteAdmin(session)} modules={modules} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-10 lg:py-10">{children}</div>
        </div>
      </div>
    </div>
  )
}
