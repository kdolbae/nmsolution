'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { linkSignIn } from '@/app/actions/portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** 바로가기 링크 로그인: 전화번호 하나로 들어간다 (비밀번호 = 전화번호 숫자) */
export function LinkLoginForm({ token }: { token: string }) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await linkSignIn(token, phone)
      if (!res.ok) return setError(res.error)
      const { error } = await authClient.signIn.email({ email: res.email, password: res.password })
      if (error) return setError(error.status === 429 ? '시도가 너무 많습니다. 잠시 뒤 다시 해 주세요.' : '들어가지 못했습니다. 엔엠솔루션(010-2369-3691)에 문의해 주세요.')
      router.push('/portal')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">전화번호</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className="rounded-none">
        {loading ? '확인 중…' : '제안서·견적서 보기'}
      </Button>
    </form>
  )
}
