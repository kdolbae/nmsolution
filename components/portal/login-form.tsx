'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PortalLoginForm({ notice, canReset }: { notice: string; canReset: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState(notice)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const signIn = (pw: string) => authClient.signIn.email({ email: email.trim(), password: pw, callbackURL: '/portal/login?verified=1' })
    let { data, error } = await signIn(password)
    // 관리자가 만든 계정은 비밀번호가 휴대폰 번호 숫자만이다. 010-1234-5678 처럼 넣었으면 숫자만으로 한 번 더 해 본다
    const digits = password.replace(/\D/g, '')
    if (error?.status === 401 && digits !== password && /^[\d\s.-]+$/.test(password) && /^0\d{9,10}$/.test(digits)) {
      ;({ data, error } = await signIn(digits))
    }
    setLoading(false)
    if (error) {
      if (error.status === 403 || error.code === 'EMAIL_NOT_VERIFIED') {
        setInfo('이메일 인증이 아직 안 됐습니다. 인증 메일을 다시 보냈으니 메일함을 확인해 주세요.')
      } else if (error.status === 429) {
        setError('시도가 너무 많습니다. 잠시 뒤 다시 해 주세요.')
      } else {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      }
      return
    }
    const admin = (data?.user as { role?: string } | undefined)?.role === 'admin'
    router.push(admin ? '/admin' : '/portal')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {info && <p className="bg-secondary px-3 py-2 text-sm">{info}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className="h-11 w-full rounded-none">
        {loading ? '확인 중...' : '로그인'}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Link href="/portal/signup" className="font-semibold text-electric hover:underline">
          업체 코드로 가입하기
        </Link>
        {canReset ? (
          <Link href="/portal/forgot" className="text-muted-foreground hover:text-foreground">
            비밀번호 찾기
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">비밀번호 분실 시 엔엠솔루션에 문의</span>
        )}
      </div>
    </form>
  )
}
