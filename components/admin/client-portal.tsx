'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, KeyRound, Loader2, Pause, Play, RefreshCw, RotateCcw, Trash2, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import {
  changeMemberStatus,
  createPortalAccounts,
  deleteMember,
  regeneratePortalCode,
  resetMemberPasswordToPhone,
  togglePortal,
  type AccountInput,
  type AccountResult,
} from '@/app/actions/portal'

type Member = {
  id: number
  name: string
  title: string
  phone: string
  email: string
  emailVerified: boolean
  status: 'pending' | 'approved' | 'suspended'
  createdAt: string
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
              <div className="flex flex-wrap gap-2">
                {busy === m.id && <Loader2 className="size-4 animate-spin self-center" />}
                {m.status === 'approved' && <LoginGuideButton email={m.email} />}
                {m.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none"
                    disabled={pending}
                    title="비밀번호를 등록된 휴대폰 번호(숫자만)로 되돌림"
                    onClick={() => {
                      if (!confirm(`${m.name} 비밀번호를 휴대폰 번호(${m.phone.replace(/\D/g, '')})로 되돌릴까요? 지금 로그인은 끊깁니다.`)) return
                      run(m.id, async () => {
                        const r = await resetMemberPasswordToPhone(m.id)
                        alert(r.ok ? '비밀번호를 휴대폰 번호로 되돌렸습니다.' : r.error)
                      })
                    }}
                  >
                    <RotateCcw /> 비밀번호 초기화
                  </Button>
                )}
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

      <AccountCreator clientId={clientId} onDone={() => router.refresh()} />
    </section>
  )
}

/** 한 줄 = 한 사람. 칸 순서는 상관없이 이메일(@)·휴대폰(숫자)을 알아보고, 남은 칸은 이름 · 직책 순서로 본다 */
export function parsePeople(text: string): AccountInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/[,\t|]+/).map((x) => x.trim()).filter(Boolean))
    .filter((cells) => cells.length > 0)
    .map((cells) => {
      const email = cells.find((c) => c.includes('@')) ?? ''
      const phone = cells.find((c) => /^0\d{1,2}[\s.-]?\d{3,4}[\s.-]?\d{4}$/.test(c)) ?? ''
      const rest = cells.filter((c) => c !== email && c !== phone)
      return { name: rest[0] ?? '', title: rest.slice(1).join(' '), phone, email }
    })
}

function LoginGuideButton({ email }: { email: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    const text = `[엔엠솔루션 협력업체 포털]\n접속: ${location.origin}/portal/login\n아이디: ${email}\n비밀번호: 휴대폰 번호 숫자만 (하이픈 없이)`
    await navigator.clipboard.writeText(text).catch(() => {})
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }
  return (
    <Button size="sm" variant="outline" className="rounded-none" onClick={copy} title="이 사람에게 보낼 로그인 안내문 복사">
      {done ? <Check /> : <Copy />} {done ? '복사됨' : '로그인 안내'}
    </Button>
  )
}

/** 업체 관계자 계정 바로 만들기: 아이디 = 이메일, 비밀번호 = 휴대폰 번호 숫자만, 바로 승인 */
function AccountCreator({ clientId, onDone }: { clientId: number; onDone: () => void }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState<AccountResult[]>([])
  const [pending, start] = useTransition()
  const people = parsePeople(text)

  const submit = () => {
    if (!people.length) return
    start(async () => {
      const r = await createPortalAccounts(clientId, people)
      setResults(r)
      if (r.every((x) => x.ok)) setText('')
      onDone()
    })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4" strokeWidth={1.75} /> 관계자 계정 바로 만들기
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          한 줄에 한 사람씩 이름, 직책, 휴대폰, 이메일을 쉼표로 적습니다. 아이디는 이메일, 비밀번호는 휴대폰 번호 숫자만이며, 만들면 바로 승인됩니다.
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={'홍길동, 공무팀 과장, 010-1234-5678, hong@example.com'}
        className="rounded-none font-mono text-sm"
      />
      {people.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs">
          {people.map((p, i) => {
            const pw = p.phone.replace(/\D/g, '')
            const bad = !p.name || !p.email.includes('@') || !/^0\d{9,10}$/.test(pw)
            return (
              <li key={i} className={cn('flex flex-wrap gap-x-3', bad && 'text-destructive')}>
                <span className="font-semibold">{p.name || '이름 없음'}</span>
                {p.title && <span>{p.title}</span>}
                <span>아이디 {p.email || '없음'}</span>
                <span>비밀번호 {pw || '없음'}</span>
              </li>
            )
          })}
        </ul>
      )}
      {results.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs">
          {results.map((r, i) => (
            <li key={i} className={r.ok ? 'text-emerald-700' : 'text-destructive'}>
              {r.email}: {r.ok ? '만들었습니다.' : r.error}
            </li>
          ))}
        </ul>
      )}
      <Button className="self-start rounded-none" disabled={pending || !people.length} onClick={submit}>
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} {people.length ? `${people.length}명 계정 만들기` : '계정 만들기'}
      </Button>
    </div>
  )
}
