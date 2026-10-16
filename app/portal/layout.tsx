import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: '협력업체 포털', template: '%s | 엔엠솔루션 협력업체 포털' },
  robots: { index: false, follow: false },
}

/** 협력업체 포털. 사이트 메뉴·관리자 도구 없이 이 화면만 보인다 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-secondary text-foreground">{children}</div>
}
