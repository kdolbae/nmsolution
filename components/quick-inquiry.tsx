'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bell, BellRing, Camera, Check, Clock, Loader2, Phone, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/track'
import { loadAttribution } from '@/lib/attribution'
import { reportConversion } from '@/lib/tracking'
import { QUICK_AREAS, QUICK_MAX_PHOTOS, QUICK_REPLY_NOTE, QUICK_WORKS } from '@/lib/quick-inquiry'
import { shrink } from '@/components/photo-quote-form'
import { needsHomeScreen, pushSupported, subscribePush } from '@/lib/push-client'

export type QuickStep = 'work' | 'area' | 'contact' | 'chat'

type Msg = { id: number; sender: 'customer' | 'admin'; body: string; created_at: string }
/** 접수한 문의의 대화 열쇠. 이 브라우저에만 둔다 (60일) */
type StoredChat = { token: string; work: string; area: string; at: number; seen: number; push?: boolean }
const CHAT_KEY = 'nm-quick-chat'
const CHAT_DAYS = 60

export function loadChat(): StoredChat | null {
  try {
    const c = JSON.parse(window.localStorage.getItem(CHAT_KEY) || 'null') as StoredChat | null
    if (!c?.token || Date.now() - c.at > CHAT_DAYS * 86400_000) return null
    return c
  } catch {
    return null
  }
}

function saveChat(c: StoredChat | null) {
  try {
    if (c) window.localStorage.setItem(CHAT_KEY, JSON.stringify(c))
    else window.localStorage.removeItem(CHAT_KEY)
  } catch {
    /* 저장소를 못 쓰면 이번 화면에서만 대화한다 */
  }
}

/**
 * 접수한 문의가 있으면 관리자 답장을 확인한다. 안 읽은 답장 수를 돌려준다.
 * 박스가 닫혀 있어도(모바일 시트 등) 알 수 있게 1분마다 본다.
 */
export function useChatUnread(intervalSec = 60): number {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    let stop = false
    async function check() {
      const c = loadChat()
      if (!c || document.visibilityState !== 'visible') return
      try {
        const r = await fetch(`/api/quick-inquiry/chat?t=${encodeURIComponent(c.token)}`, { cache: 'no-store' })
        const j = (await r.json()) as { ok: boolean; messages?: Msg[] }
        if (!stop && j.ok) setUnread((j.messages ?? []).filter((m) => m.sender === 'admin' && m.id > (loadChat()?.seen ?? 0)).length)
      } catch {}
    }
    void check()
    const id = setInterval(check, intervalSec * 1000)
    const onSeen = () => setUnread(0)
    window.addEventListener('nm-chat-seen', onSeen)
    return () => {
      stop = true
      clearInterval(id)
      window.removeEventListener('nm-chat-seen', onSeen)
    }
  }, [intervalSec])
  return unread
}

type Photo = { id: string; blob: Blob; url: string }

const CHIP =
  'inline-flex min-h-10 items-center justify-center border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:border-electric hover:text-electric'

/** 질문 말풍선. 실시간 상담원처럼 보이지 않게 회사 이름으로만 말한다 */
function Ask({ children }: { children: React.ReactNode }) {
  return <p className="w-fit max-w-[90%] bg-secondary px-3.5 py-2.5 text-sm font-semibold text-navy">{children}</p>
}

/** 손님이 고른 답 */
function Answer({ children, onEdit }: { children: React.ReactNode; onEdit?: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="ml-auto w-fit max-w-[90%] bg-navy px-3.5 py-2 text-sm font-medium text-navy-foreground"
      aria-label={onEdit ? '답 고치기' : undefined}
    >
      {children}
    </button>
  )
}

/**
 * 우측 하단 간단 문의: 어떤 작업 → 위치(시·군) → 연락처(사진 선택) 세 번의 문답.
 * 실시간 채팅이 아니므로 회신 시간 안내를 맨 위에 항상 띄운다.
 */
export function QuickInquiry({
  phoneMobile,
  from,
  onStep,
}: {
  phoneMobile: string
  /** 어느 자리의 박스인지 (floating · mobile_sheet) */
  from: string
  onStep?: (step: QuickStep) => void
}) {
  const [step, setStepRaw] = useState<QuickStep>('work')
  const [work, setWork] = useState('')
  const [area, setArea] = useState('')
  const [typing, setTyping] = useState('')
  const [phone, setPhone] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const trapRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<Photo[]>([])
  photosRef.current = photos

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  // 전에 남긴 문의가 있으면 바로 대화 화면으로
  const [chat, setChat] = useState<StoredChat | null>(null)
  useEffect(() => {
    const c = loadChat()
    if (c) {
      setChat(c)
      setWork(c.work)
      setArea(c.area)
      setStepRaw('chat')
      onStep?.('chat')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setStep(s: QuickStep) {
    setStepRaw(s)
    setError(null)
    onStep?.(s)
    if (s === 'contact') setTimeout(() => phoneRef.current?.focus(), 50)
  }

  function pickWork(w: string) {
    setWork(w)
    track('quick_inquiry', { step: 'work', value: w, from })
    setStep('area')
  }

  function pickArea(a: string) {
    const v = a.trim()
    if (!v) return
    setArea(v)
    track('quick_inquiry', { step: 'area', value: v, from })
    setStep('contact')
  }

  async function addPhotos(list: FileList | null) {
    if (!list?.length) return
    setError(null)
    setBusy(true)
    const room = QUICK_MAX_PHOTOS - photos.length
    const next: Photo[] = []
    for (const f of Array.from(list).slice(0, Math.max(0, room))) {
      const blob = await shrink(f)
      if (blob) next.push({ id: `${Date.now()}-${Math.random()}`, blob, url: URL.createObjectURL(blob) })
    }
    setPhotos((prev) => [...prev, ...next])
    setBusy(false)
    if (list.length > room) setError(`사진은 ${QUICK_MAX_PHOTOS}장까지 보낼 수 있습니다.`)
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id)
      if (p) URL.revokeObjectURL(p.url)
      return prev.filter((x) => x.id !== id)
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pending || busy) return
    const digits = phone.replace(/[^0-9]/g, '')
    if (digits.length < 9) {
      setError('연락받으실 번호를 적어 주세요. 예: 010-1234-5678')
      phoneRef.current?.focus()
      return
    }
    const fd = new FormData()
    fd.set('work', work)
    fd.set('area', area)
    fd.set('phone', phone)
    fd.set('website', trapRef.current?.value ?? '')
    fd.set('attribution', JSON.stringify(loadAttribution()))
    photos.forEach((p, i) => fd.append('photos', p.blob, `photo-${i + 1}.jpg`))
    setPending(true)
    setError(null)
    try {
      const r = await fetch('/api/quick-inquiry', { method: 'POST', body: fd })
      const res = (await r.json().catch(() => null)) as { ok: boolean; error?: string; token?: string } | null
      if (res?.ok) {
        track('quote_submitted', { categories: work, from: `quick_${from}`, photos: photos.length })
        reportConversion('quote', { categories: work, from: `quick_${from}` })
        if (res.token) {
          const c = { token: res.token, work, area, at: Date.now(), seen: 0 }
          saveChat(c)
          setChat(c)
        }
        setStep('chat')
      } else setError(res?.error || '접수 중 문제가 발생했습니다. 전화나 카카오톡으로 연락해 주세요.')
    } catch {
      setError('인터넷 연결을 확인해 주세요. 계속 안 되면 전화로 연락해 주세요.')
    } finally {
      setPending(false)
    }
  }

  const back = step === 'area' ? 'work' : step === 'contact' ? 'area' : null

  return (
    <div className="flex flex-col">
      <p className="flex items-center gap-2 border-b border-border bg-electric/5 px-5 py-2.5 text-xs font-medium text-navy">
        <Clock className="size-3.5 shrink-0 text-electric" strokeWidth={2} />
        {QUICK_REPLY_NOTE}
      </p>

      {step === 'chat' ? (
        <ChatView
          phoneMobile={phoneMobile}
          work={work}
          area={area}
          chat={chat}
          onReset={() => {
            saveChat(null)
            setChat(null)
            setWork('')
            setArea('')
            setPhone('')
            setPhotos([])
            setStep('work')
          }}
        />
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 px-5 py-4" noValidate>
          <div className="hidden" aria-hidden>
            <input ref={trapRef} name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <Ask>어떤 작업이세요?</Ask>
          {step === 'work' ? (
            <div className="flex flex-wrap gap-2">
              {QUICK_WORKS.map((w) => (
                <button key={w} type="button" onClick={() => pickWork(w)} className={CHIP}>
                  {w}
                </button>
              ))}
            </div>
          ) : (
            <Answer onEdit={() => setStep('work')}>{work}</Answer>
          )}

          {(step === 'area' || step === 'contact') && (
            <>
              <Ask>위치는요? (시·군)</Ask>
              {step === 'area' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AREAS.map((a) => (
                      <button key={a} type="button" onClick={() => pickArea(a)} className={CHIP}>
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      value={typing}
                      onChange={(e) => setTyping(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          pickArea(typing)
                        }
                      }}
                      placeholder="다른 지역 (예: 당진시)"
                      aria-label="다른 지역 직접 입력"
                      className="h-10 min-w-0 flex-1 border border-r-0 border-border bg-background px-3 text-base outline-none focus-visible:border-electric sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => pickArea(typing)}
                      disabled={!typing.trim()}
                      className="h-10 bg-navy px-3 text-sm font-semibold text-navy-foreground disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                </div>
              ) : (
                <Answer onEdit={() => setStep('area')}>{area}</Answer>
              )}
            </>
          )}

          {step === 'contact' && (
            <>
              <Ask>연락처만 남겨 주세요</Ask>
              <input
                ref={phoneRef}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="010-1234-5678"
                aria-label="연락처"
                className="h-12 w-full border border-border bg-background px-4 font-mono text-base outline-none focus-visible:border-electric focus-visible:ring-2 focus-visible:ring-electric/30"
              />

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  void addPhotos(e.target.files)
                  e.target.value = ''
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                {photos.map((p, i) => (
                  <span key={p.id} className="relative size-14 overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`보낼 사진 ${i + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      aria-label={`사진 ${i + 1} 빼기`}
                      className="absolute right-0 top-0 flex size-6 items-center justify-center bg-navy/85 text-navy-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {busy && (
                  <span className="flex size-14 items-center justify-center bg-muted text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                  </span>
                )}
                {photos.length < QUICK_MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="inline-flex h-10 items-center gap-1.5 border border-dashed border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    <Camera className="size-4" strokeWidth={1.75} />
                    현장 사진 (선택)
                  </button>
                )}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">사진이 있으면 견적이 빨라집니다. 견적 확인에만 씁니다.</p>
            </>
          )}

          {error && (
            <p role="alert" className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            {back && (
              <button
                type="button"
                onClick={() => setStep(back)}
                className="inline-flex h-11 items-center gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                이전
              </button>
            )}
            {step === 'contact' && (
              <button
                type="submit"
                disabled={pending || busy}
                className="group ml-auto inline-flex h-11 flex-1 items-center justify-center gap-2 bg-electric px-4 text-sm font-semibold text-electric-foreground transition-colors hover:bg-navy disabled:opacity-50"
              >
                {pending ? (
                  <>
                    보내는 중 <Loader2 className="size-4 animate-spin" />
                  </>
                ) : (
                  <>
                    문의 남기기 <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

const hhmm = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

/** 접수 뒤 대화. 관리자 답장은 15초마다 확인하고, 손님은 추가로 말을 남길 수 있다 */
function ChatView({
  phoneMobile,
  work,
  area,
  chat,
  onReset,
}: {
  phoneMobile: string
  work: string
  area: string
  chat: StoredChat | null
  onReset: () => void
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [push, setPush] = useState<'hidden' | 'ios' | 'off' | 'on'>('hidden')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chat) return
    let stop = false
    async function load() {
      if (document.visibilityState !== 'visible') return
      // PC 패널은 모바일에서도 숨긴 채(display:none) 붙어 있다. 실제로 보이는 쪽만 읽음 처리한다
      const shown = !!listRef.current && listRef.current.offsetParent !== null
      try {
        const r = await fetch(`/api/quick-inquiry/chat?t=${encodeURIComponent(chat!.token)}${shown ? '&read=1' : ''}`, { cache: 'no-store' })
        if (r.status === 404) return onReset()
        const j = (await r.json()) as { ok: boolean; messages?: Msg[] }
        if (!stop && j.ok && j.messages) {
          setMessages(j.messages)
          const last = j.messages.filter((m) => m.sender === 'admin').at(-1)?.id ?? 0
          if (shown && last > (loadChat()?.seen ?? 0)) {
            saveChat({ ...(loadChat() ?? chat!), seen: last })
            window.dispatchEvent(new Event('nm-chat-seen'))
          }
        }
      } catch {}
    }
    void load()
    const id = setInterval(load, 15_000)
    return () => {
      stop = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.token])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  useEffect(() => {
    if (!chat) return
    if (needsHomeScreen()) return setPush('hidden')
    if (!pushSupported()) return setPush('hidden')
    setPush(chat.push && Notification.permission === 'granted' ? 'on' : 'off')
  }, [chat])

  async function send() {
    const body = text.trim()
    if (!body || !chat || sending) return
    setSending(true)
    setError(null)
    try {
      const r = await fetch('/api/quick-inquiry/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: chat.token, body }),
      })
      const j = (await r.json()) as { ok: boolean; messages?: Msg[]; error?: string }
      if (j.ok) {
        setText('')
        if (j.messages) setMessages(j.messages)
        track('quick_inquiry', { step: 'message' })
      } else setError(j.error || '보내지 못했습니다.')
    } catch {
      setError('인터넷 연결을 확인해 주세요.')
    } finally {
      setSending(false)
    }
  }

  async function enablePush() {
    if (!chat) return
    const r = await subscribePush()
    if (!r.ok) return setError(r.error)
    const res = await fetch('/api/quick-inquiry/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ t: chat.token, sub: r.sub }),
    })
    if (res.ok) {
      saveChat({ ...(loadChat() ?? chat), push: true })
      setPush('on')
    }
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center bg-electric text-electric-foreground">
          <Check className="size-4" strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="font-bold tracking-tight">담당자가 확인 후 연락드립니다.</p>
          <p className="text-xs text-muted-foreground">
            {work} · {area} 문의 접수됨. 답장은 여기와 전화로 드립니다.
          </p>
        </div>
      </div>

      <div ref={listRef} className="flex max-h-60 flex-col gap-2 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex flex-col', m.sender === 'customer' ? 'items-end' : 'items-start')}>
            <span
              className={cn(
                'max-w-[88%] whitespace-pre-wrap px-3 py-2 text-sm',
                m.sender === 'customer' ? 'bg-navy text-navy-foreground' : 'bg-secondary font-medium text-navy',
              )}
            >
              {m.body}
            </span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              {m.sender === 'admin' ? '엔엠솔루션 · ' : ''}
              {hhmm(m.created_at)}
            </span>
          </div>
        ))}
      </div>

      {chat && (
        <div className="flex">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void send()
              }
            }}
            rows={1}
            placeholder="더 남기실 말씀 (예: 탱크 2톤, 이번 주 방문 희망)"
            aria-label="메시지"
            className="min-h-11 min-w-0 flex-1 resize-none border border-r-0 border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:border-electric sm:text-sm"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !text.trim()}
            aria-label="보내기"
            className="flex w-11 items-center justify-center bg-electric text-electric-foreground disabled:opacity-40"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {push === 'off' && (
          <button type="button" onClick={() => void enablePush()} className="inline-flex items-center gap-1.5 font-semibold text-electric">
            <Bell className="size-3.5" />
            답장 오면 휴대폰 알림 받기
          </button>
        )}
        {push === 'on' && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <BellRing className="size-3.5" />
            답장 알림 켜짐
          </span>
        )}
        <a href={`tel:${phoneMobile}`} className="inline-flex items-center gap-1.5 font-semibold text-navy hover:text-electric">
          <Phone className="size-3.5" strokeWidth={1.75} />
          급하시면 {phoneMobile}
        </a>
        <button type="button" onClick={onReset} className="text-muted-foreground underline">
          새 문의하기
        </button>
      </div>
    </div>
  )
}
