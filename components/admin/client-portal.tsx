'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, KeyRound, Link2, Loader2, Pause, Play, RefreshCw, Trash2, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { addDirectPortalMember, changeMemberStatus, deleteMember, regeneratePortalCode, togglePortal } from '@/app/actions/portal'

type Member = {
  id: number
  name: string
  title: string
  phone: string
  email: string
  emailVerified: boolean
  status: 'pending' | 'approved' | 'suspended'
  createdAt: string
  /** 직접 등록한 관계자만 있다 */
  linkToken: string
}

const STATUS = {
  pending: { label: '승인 대기', cls: 'bg-orange-100 text-orange-800' },
  approved: { label: '승인', cls: 'bg-emerald-100 text-emerald-800' },
  suspended: { label: '중지', cls: 'bg-muted text-muted-foreground' },
} as const

/**
 * 업체 화면의 '협력업체 포털' 칸: 업체 코드(복사·재발급·가입 받기 켜고 끄기)와 관계자 승인·중지·삭제.
 * 업체 관계자는 /portal/signup 에서 이 코드로 가입하고, 승인되면 /portal 에서 이 업체 제안서·견적서만 본다.
 */
export function ClientPortal({
  clientId,
  code,
  open,
  members,
  mail,
}: {
  clientId: number
  code: string
  open: boolean
  members: Member[]
  /** 메일 발송이 켜져 있는지 (이메일 인증 여부 표시) */
  mail: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const waiting = members.filter((m) => m.status === 'pending').length

  const run = (id: number | null, fn: () => Promise<unknown>) => {
    setBusy(id)
    start(async () => {
      try {
        await fn()
        router.refresh()
      } finally {
        setBusy(null)
      }
    })
  }

  const copy = async () => {
    const text = `[엔엠솔루션 협력업체 포털]\n가입: ${location.origin}/portal/signup\n업체 코드: ${code}`
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="flex flex-col gap-4 bg-background p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4" strokeWidth={1.75} /> 협력업체 포털
            {waiting > 0 && <span className="bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">승인 대기 {waiting}</span>}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">업체 관계자에게 코드를 보내면 가입할 수 있고, 승인한 사람만 이 업체 제안서·견적서를 봅니다.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          가입 받기
          <Switch checked={open} disabled={pending} onCheckedChange={(v) => run(null, () => togglePortal(clientId, v))} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex h-10 items-center gap-2 border border-border px-4 font-mono text-lg font-bold tracking-widest', !open && 'opacity-40 line-through')}>
          <KeyRound className="size-4 text-muted-foreground" />
          {code || '—'}
        </span>
        <Button variant="outline" className="rounded-none" onClick={copy} disabled={!code}>
          {copied ? <Check /> : <Copy />} {copied ? '복사됨' : '안내문 복사'}
        </Button>
        <Button
          variant="outline"
          className="rounded-none"
          disabled={pending}
          onClick={() => {
            if (confirm('새 코드를 만들면 지금 코드로는 더 가입할 수 없습니다. 이미 가입한 관계자는 그대로입니다. 바꿀까요?'))
              run(null, () => regeneratePortalCode(clientId))
          }}
        >
          <RefreshCw /> 코드 재발급
        </Button>
      </div>

      <DirectAdd clientId={clientId} onDone={() => router.refresh()} />

      {members.length > 0 ? (
        <ul className="divide-y divide-border border-t border-border">
          {members.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.name}</span>
                  {m.title && <span className="text-sm text-muted-foreground">{m.title}</span>}
                  <span className={cn('px-1.5 py-0.5 text-[10px] font-semibold', STATUS[m.status].cls)}>{STATUS[m.status].label}</span>
                  {mail && !m.emailVerified && <span className="text-[10px] text-orange-700">이메일 미인증</span>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {[m.email, m.phone, `가입 ${m.createdAt.slice(0, 10)}`].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex gap-2">
                {busy === m.id && <Loader2 className="size-4 animate-spin self-center" />}
                {m.linkToken && <CopyLink url={`${typeof location === 'undefined' ? '' : location.origin}/portal/k/${m.linkToken}`} name={m.name} />}
                {m.status !== 'approved' && (
                  <Button size="sm" className="rounded-none" disabled={pending} onClick={() => run(m.id, () => changeMemberStatus(m.id, 'approved'))}>
                    <Play /> 승인
                  </Button>
                )}
                {m.status === 'approved' && (
                  <Button size="sm" variant="outline" className="rounded-none" disabled={pending} onClick={() => run(m.id, () => changeMemberStatus(m.id, 'suspended'))}>
                    <Pause /> 중지
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none text-destructive"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`${m.name} 계정을 지울까요? 다시 쓰려면 새로 가입해야 합니다.`)) run(m.id, () => deleteMember(m.id, clientId))
                  }}
                >
                  <Trash2 /> 삭제
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">아직 가입한 관계자가 없습니다.</p>
      )}
    </section>
  )
}

/** 바로가기 링크 복사 (안내 문구 포함) */
function CopyLink({ url, name }: { url: string; name: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      className="rounded-none"
      title="링크를 열고 전화번호를 넣으면 바로 제안서·견적서를 봅니다"
      onClick={async () => {
        const text = `[엔엠솔루션] ${name}님, 공사제안서·견적서 바로가기입니다.\n${url}\n전화번호를 입력하면 열립니다.`
        await navigator.clipboard.writeText(text).catch(() => {})
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
    >
      {done ? <Check /> : <Link2 />} {done ? '복사됨' : '바로가기 링크'}
    </Button>
  )
}

/** 명함 등으로 받은 관계자를 직접 등록: 바로 승인, 비밀번호는 전화번호, 바로가기 링크 생성 */
function DirectAdd({ clientId, onDone }: { clientId: number; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', title: '', phone: '', email: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  if (!open)
    return (
      <div>
        <Button variant="outline" className="rounded-none" onClick={() => setOpen(true)}>
          <UserPlus /> 담당자 직접 등록 (명함)
        </Button>
      </div>
    )
  const field = (k: keyof typeof f, label: string, type = 'text', placeholder = '') => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <input
        type={type}
        value={f[k]}
        placeholder={placeholder}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
        className="h-9 border border-input bg-background px-2 text-sm text-foreground"
      />
    </label>
  )
  return (
    <form
      className="flex flex-col gap-3 border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault()
        setMsg(null)
        start(async () => {
          const res = await addDirectPortalMember(clientId, f)
          if (!res.ok) return setMsg({ ok: false, text: res.error })
          await navigator.clipboard.writeText(res.link).catch(() => {})
          setMsg({ ok: true, text: `등록했습니다. 바로가기 링크를 복사했습니다: ${res.link}` })
          setF({ name: '', title: '', phone: '', email: '' })
          onDone()
        })
      }}
    >
      <p className="text-sm font-medium">담당자 직접 등록</p>
      <p className="text-xs text-muted-foreground">바로 승인되고, 비밀번호는 전화번호 숫자입니다. 바로가기 링크를 열고 전화번호만 넣으면 제안서·견적서를 봅니다.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        {field('name', '이름 *')}
        {field('title', '직함')}
        {field('phone', '전화번호 * (비밀번호)', 'tel', '010-0000-0000')}
        {field('email', '이메일 (없으면 비워 두기)', 'email')}
      </div>
      {msg && <p className={cn('text-xs break-all', msg.ok ? 'text-emerald-700' : 'text-destructive')}>{msg.text}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="rounded-none" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} 등록
        </Button>
        <Button type="button" variant="ghost" className="rounded-none" onClick={() => setOpen(false)}>
          닫기
        </Button>
      </div>
    </form>
  )
}
