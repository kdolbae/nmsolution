'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** 관리자 비밀번호 바꾸기. 바꾸면 다른 기기의 로그인은 모두 끊는다. */
export function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (next.length < 8) return setMsg({ ok: false, text: '새 비밀번호는 8자 이상으로 정해 주세요.' })
    if (next !== confirm) return setMsg({ ok: false, text: '새 비밀번호 확인이 맞지 않습니다.' })
    setPending(true)
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    })
    setPending(false)
    if (error) {
      console.error('[admin/password]', error)
      return setMsg({ ok: false, text: '현재 비밀번호가 맞지 않거나 바꾸지 못했습니다.' })
    }
    setCurrent('')
    setNext('')
    setConfirm('')
    setMsg({ ok: true, text: '비밀번호를 바꿨습니다. 다른 기기의 로그인은 끊었습니다.' })
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-5 bg-background p-6 ring-1 ring-border">
      <div className="flex flex-col gap-2">
        <Label htmlFor="pw-current">현재 비밀번호</Label>
        <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="pw-next">새 비밀번호 (8자 이상)</Label>
        <Input id="pw-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="pw-confirm">새 비밀번호 확인</Label>
        <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      {msg && <p className={msg.ok ? 'text-sm text-electric' : 'text-sm text-destructive'}>{msg.text}</p>}
      <Button type="submit" disabled={pending || !current || !next || !confirm}>
        {pending ? '바꾸는 중…' : '비밀번호 바꾸기'}
      </Button>
    </form>
  )
}
