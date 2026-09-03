'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/brand'

export function AdminAuthForm({ mode }: { mode: 'sign-in' | 'setup' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isSetup = mode === 'setup'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSetup
      ? await authClient.signUp.email({ email, password, name: name || '관리자' })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      console.error('[admin-auth]', error)
      setError(isSetup ? '계정을 생성할 수 없습니다. 이미 관리자가 등록되어 있을 수 있습니다.' : '이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm bg-background p-8 ring-1 ring-border">
        <Logo className="mb-8" />
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-kicker text-electric">Admin</p>
          <h1 className="text-2xl font-bold tracking-tight">{isSetup ? '관리자 계정 만들기' : '관리자 로그인'}</h1>
          <p className="text-sm text-muted-foreground">
            {isSetup
              ? '최초 1회만 진행됩니다. 이 계정으로 사이트 내용을 편집합니다.'
              : '사이트 내용을 편집하려면 로그인하세요.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSetup && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="김성배" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSetup ? 'new-password' : 'current-password'}
            />
            {isSetup && <p className="text-xs text-muted-foreground">8자 이상</p>}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="h-11 w-full rounded-none">
            {loading ? '처리 중...' : isSetup ? '계정 만들기' : '로그인'}
          </Button>
        </form>
      </div>
    </main>
  )
}
