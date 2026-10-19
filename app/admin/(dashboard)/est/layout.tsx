import { redirect } from 'next/navigation'
import { canEnterAdmin, getAppSession } from '@/lib/session'
import { getSettings } from '@/lib/est/settings'
import { sObj } from '@/lib/est/settings-defaults'
import { Empty } from '@/components/est/ui'

export const dynamic = 'force-dynamic'

/** 견적·공사 모듈 가드: 견적 역할이 있어야 하고, 설정 menu.modules.est 가 꺼져 있으면 닫힘 */
export default async function EstLayout({ children }: { children: React.ReactNode }) {
  const s = await getAppSession()
  if (!s || !canEnterAdmin(s) || !s.estRole) redirect('/admin/login')
  const modules = sObj<Record<string, boolean>>(await getSettings().catch(() => ({})), 'menu.modules')
  if (modules.est === false) {
    // 대표는 기준 설정에서 다시 켤 수 있어야 하므로 막지 않고 알림만
    if (s.estRole !== 'ceo') return <Empty>견적·공사 메뉴가 꺼져 있음. 대표가 기준 설정(menu.modules)에서 켤 수 있음.</Empty>
    return (
      <>
        <p className="mb-4 border border-border bg-background px-3 py-2 text-xs text-muted-foreground">견적·공사 메뉴가 꺼져 있음(대표만 보임). 기준 설정 → 화면 → menu.modules 에서 켤 수 있음.</p>
        {children}
      </>
    )
  }
  return <>{children}</>
}
