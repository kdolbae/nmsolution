import { PageHeader, Section } from '@/components/admin/form'
import { PasswordForm } from '@/components/admin/password-form'
import { getAppSession } from '@/lib/session'
import { EST_ROLE_LABEL } from '@/lib/est/perm'
import { ssoIssuer } from '@/lib/sso/config'

export const dynamic = 'force-dynamic'

export default async function AdminAccountPage() {
  const session = await getAppSession()
  if (session?.via === 'sso') {
    return (
      <>
        <PageHeader title="내 계정" description={`로그인 이메일: ${session.email}`} />
        <Section title="SBworks 로 로그인한 계정" description="비밀번호·역할은 SBworks 에서 관리함. 역할을 바꾸면 다음 로그인 때 반영됨.">
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">이름</dt>
            <dd>{session.name}</dd>
            <dt className="text-muted-foreground">사업부</dt>
            <dd>{session.sso?.tenant?.name ?? '-'}</dd>
            <dt className="text-muted-foreground">SBworks 역할</dt>
            <dd>{session.sso?.roleName ?? '-'}</dd>
            <dt className="text-muted-foreground">견적 역할</dt>
            <dd>{session.estRole ? EST_ROLE_LABEL[session.estRole] : '-'}</dd>
          </dl>
          <a href={ssoIssuer()} className="w-fit text-sm font-medium text-electric hover:underline">
            SBworks 열기
          </a>
        </Section>
      </>
    )
  }
  return (
    <>
      <PageHeader title="계정 · 비밀번호" description={`로그인 이메일: ${session?.email ?? '-'}`} />
      <PasswordForm />
    </>
  )
}
