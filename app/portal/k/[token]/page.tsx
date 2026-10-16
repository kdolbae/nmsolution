import { notFound, redirect } from 'next/navigation'
import { AuthShell } from '@/components/portal/auth-shell'
import { LinkLoginForm } from '@/components/portal/link-login-form'
import { getSession, isAdmin } from '@/lib/admin'
import { findLinkMember } from '@/lib/portal/members'

export const dynamic = 'force-dynamic'
export const metadata = { title: '바로가기', robots: { index: false, follow: false } }

/** 관리자가 직접 등록한 관계자의 바로가기 링크: 전화번호만 넣으면 그 업체 제안서·견적서(/portal)로 들어간다 */
export default async function PortalLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const member = await findLinkMember(token)
  if (!member) notFound()
  const session = await getSession()
  if (session?.user) redirect(isAdmin(session.user) ? '/admin' : '/portal')
  return (
    <AuthShell
      title={`${member.clientName} 공사제안서`}
      description={`${member.name}${member.title ? ` ${member.title}` : ''}님, 전화번호를 입력하면 제안서와 견적서를 볼 수 있습니다.`}
    >
      <LinkLoginForm token={token} />
    </AuthShell>
  )
}
