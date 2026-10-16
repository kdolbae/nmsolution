'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { LogoImage } from '@/components/brand'
import { authClient } from '@/lib/auth-client'

/** 포털 위쪽 막대. 사이트 메뉴 없이 업체명·이름·로그아웃만 */
export function PortalHeader({ clientName, userName }: { clientName: string; userName: string }) {
  const router = useRouter()
  const signOut = async () => {
    await authClient.signOut()
    router.push('/portal/login')
    router.refresh()
  }
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <LogoImage className="h-7" />
        <span className="hidden h-5 w-px bg-border sm:block" />
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{clientName}</span>
        <span className="hidden text-sm text-muted-foreground sm:block">{userName}님</span>
        <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="size-4" /> 로그아웃
        </button>
      </div>
    </header>
  )
}
