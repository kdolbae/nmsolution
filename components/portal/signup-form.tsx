'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { checkPortalCode, partnerSignUp } from '@/app/actions/portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const EMPTY = { name: '', title: '', phone: '', email: '', password: '', confirm: '' }

export function PortalSignupForm() {
  const [code, setCode] = useState('')
  const [clientName, setClientName] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [done, setDone] = useState<null | { verify: boolean }>(null)
  const [pending, start] = useTransition()

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const check = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    start(async () => {
      const res = await checkPortalCode(code)
      if (res.ok) setClientName(res.clientName)
      else setError(res.error)
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('비밀번호 확인이 맞지 않습니다.')
    start(async () => {
      const res = await partnerSignUp({ code, ...form })
      if (res.ok) setDone({ verify: res.verify })
      else setError(res.error)
    })
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 bg-secondary px-4 py-3 text-sm leading-relaxed">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-electric" />
          <span>
            {clientName} 관계자로 가입했습니다.{' '}
            {done.verify
              ? `${form.email} 로 보낸 인증 메일의 버튼을 눌러 주세요. 인증과 관리자 승인이 끝나면 로그인할 수 있습니다.`
              : '엔엠솔루션 관리자가 승인하면 로그인할 수 있습니다.'}
          </span>
        </p>
        <Link href="/portal/login" className="inline-flex h-11 items-center justify-center bg-navy text-sm font-semibold text-navy-foreground">
          로그인 화면으로
        </Link>
      </div>
    )
  }

  if (!clientName) {
    return (
      <form onSubmit={check} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">업체 코드</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-1234"
            required
            autoComplete="off"
            className="font-mono tracking-widest"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending || !code.trim()} className="h-11 rounded-none">
          {pending && <Loader2 className="animate-spin" />} 코드 확인
        </Button>
        <Link href="/portal/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
          이미 가입했다면 로그인
        </Link>
      </form>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="bg-secondary px-4 py-3 text-sm">
        <span className="font-bold">{clientName}</span> 관계자로 가입합니다.{' '}
        <button type="button" className="text-muted-foreground underline" onClick={() => setClientName('')}>
          코드 다시 넣기
        </button>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">이름 *</Label>
          <Input id="name" value={form.name} onChange={set('name')} required autoComplete="name" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">직책</Label>
          <Input id="title" value={form.title} onChange={set('title')} placeholder="설비팀 과장" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">휴대폰</Label>
        <Input id="phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="010-0000-0000" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">이메일 (로그인 아이디) *</Label>
        <Input id="email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">비밀번호 *</Label>
          <Input id="password" type="password" value={form.password} onChange={set('password')} required minLength={10} autoComplete="new-password" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm">비밀번호 확인 *</Label>
          <Input id="confirm" type="password" value={form.confirm} onChange={set('confirm')} required minLength={10} autoComplete="new-password" />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">비밀번호는 10자 이상</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="h-11 rounded-none">
        {pending && <Loader2 className="animate-spin" />} 가입하기
      </Button>
    </form>
  )
}
