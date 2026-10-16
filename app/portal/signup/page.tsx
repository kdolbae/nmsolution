import { AuthShell } from '@/components/portal/auth-shell'
import { PortalSignupForm } from '@/components/portal/signup-form'

export const metadata = { title: '관계자 가입' }

export default function PortalSignupPage() {
  return (
    <AuthShell title="업체 관계자 가입" description="엔엠솔루션에서 받은 업체 코드를 넣으면 그 업체 관계자로 가입됩니다. 가입 후 관리자 승인이 끝나면 이용할 수 있습니다.">
      <PortalSignupForm />
    </AuthShell>
  )
}
