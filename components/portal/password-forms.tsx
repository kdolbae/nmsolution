'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await authClient.requestPasswordReset({ email, redirectTo: '/portal/reset' })
    setLoading(false)
    setSent(true)
  }

  if (sent)
    return (
      <div className="flex flex-col gap-4">
        <p className="bg-secondary px-4 py-3 text-sm">가입된 이메일이면 재설정 링크를 보냈습니다. 메일함을 확인해 주세요.</p>
        <Link href="/portal/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
          로그인 화면으로
        </Link>
      </div>
    )

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <Button type="submit" disabled={loading} className="h-11 rounded-none">
        {loading ? '보내는 중...' : '재설정 링크 받기'}
      </Button>
    </form>
  )
}

export function ResetForm({ token, invalid }: { token: string; invalid: boolean }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(invalid ? '링크가 만료되었거나 잘못되었습니다. 비밀번호 찾기를 다시 해 주세요.' : '')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 10) return setError('비밀번호는 10자 이상으로 정해 주세요.')
    if (password !== confirm) return setError('비밀번호 확인이 맞지 않습니다.')
    setLoading(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)
    if (error) return setError('링크가 만료되었거나 잘못되었습니다. 비밀번호 찾기를 다시 해 주세요.')
    router.push('/portal/login?reset=1')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">새 비밀번호 (10자 이상)</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" disabled={invalid} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">새 비밀번호 확인</Label>
        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" disabled={invalid} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading || invalid} className="h-11 rounded-none">
        {loading ? '저장 중...' : '비밀번호 바꾸기'}
      </Button>
    </form>
  )
}
