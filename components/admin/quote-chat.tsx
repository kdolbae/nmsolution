'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { replyInquiry } from '@/app/actions/inquiry-chat'
import type { ChatMessage } from '@/lib/inquiry-chat'

const time = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

/** 간단 문의 한 건의 대화. 관리자 답장은 손님 화면(우측 하단 박스)에 뜬다 */
export function QuoteChat({ quoteId, initial }: { quoteId: number; initial: ChatMessage[] }) {
  const [messages, setMessages] = useState(initial)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  useEffect(() => setMessages(initial), [initial])

  function send() {
    const body = text.trim()
    if (!body) return
    setError(null)
    start(async () => {
      const r = await replyInquiry(quoteId, body)
      if (r.ok && r.messages) {
        setMessages(r.messages)
        setText('')
      } else setError(r.error || '보내지 못했습니다.')
    })
  }

  return (
    <div className="flex flex-col gap-2 border border-border bg-secondary/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">손님과 대화 · 답장은 손님 화면 우측 하단 박스에 뜹니다</p>
      {messages.length > 0 && (
        <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {messages.map((m) => (
            <li key={m.id} className={cn('flex flex-col', m.sender === 'admin' ? 'items-end' : 'items-start')}>
              <span
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap px-3 py-2 text-sm',
                  m.sender === 'admin' ? 'bg-navy text-navy-foreground' : 'bg-background ring-1 ring-border',
                )}
              >
                {m.body}
              </span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                {m.sender === 'admin' ? '보냄' : '손님'} · {time(m.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          rows={2}
          placeholder="답장 쓰기 (Enter 보내기, Shift+Enter 줄바꿈)"
          className="min-h-11 flex-1 resize-y border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-electric"
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || !text.trim()}
          className="inline-flex items-center gap-1.5 bg-electric px-4 text-sm font-semibold text-electric-foreground disabled:opacity-50"
        >
          <Send className="size-4" />
          보내기
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

/** 견적 문의 화면을 열어 둔 동안 30초마다 새 문의·메시지를 다시 읽는다 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter()
  const ref = useRef(router)
  ref.current = router
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') ref.current.refresh()
    }, seconds * 1000)
    return () => clearInterval(id)
  }, [seconds])
  return null
}
