'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, MessageSquareText, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { quoteSendText, smsHref, type SendTextStyle } from '@/lib/clients/send-text'

/**
 * 견적서 발송 문자 만들기 (어드민 업체 화면, 모든 업체 공통).
 * 문안만 만들고 복사·휴대폰 문자 앱 열기까지 한다. 업체에게 직접 보내지 않는다(보내는 건 kevin).
 * 링크는 업체 페이지(접속 기록 수집 경로)만 쓴다.
 */
export function ClientSendText({
  clientName,
  contactPerson,
  phone,
  portalSlug,
  passwordSet,
  title,
  number,
}: {
  clientName: string
  contactPerson: string
  phone: string
  portalSlug: string
  passwordSet: boolean
  title: string
  number: string
}) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<SendTextStyle>('full')
  const [password, setPassword] = useState('')
  const [text, setText] = useState('')
  const [edited, setEdited] = useState(false)
  const [copied, setCopied] = useState(false)

  // 입력이 바뀌면 문안을 다시 만든다. 직접 고친 뒤에는 '다시 만들기' 전까지 그대로 둔다
  const generated = quoteSendText({ clientName, contactPerson, portalSlug, title, number, password, style })
  useEffect(() => {
    if (!edited) setText(generated)
  }, [generated, edited])

  if (!portalSlug) return null

  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // 국내 문자: 90바이트(EUC-KR 기준, 한글 2바이트) 넘으면 장문(LMS)
  const euckr = [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 127 ? 2 : 1), 0)

  return (
    <section className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">견적서 발송 문자</h2>
          <p className="text-xs text-muted-foreground">
            업체 페이지 링크(열람 기록 남는 주소)와 비밀번호로 문자 문안을 만듦. 복사하거나 휴대폰 문자 앱으로 열어 직접 보냄.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-none" onClick={() => setOpen((v) => !v)}>
          <MessageSquareText /> {open ? '닫기' : '문자 만들기'}
        </Button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">문안</span>
              <select
                value={style}
                onChange={(e) => {
                  setStyle(e.target.value as SendTextStyle)
                  setEdited(false)
                }}
                className="h-8 border border-border bg-background px-2"
              >
                <option value="full">기본 (인사·안내 포함)</option>
                <option value="short">짧게 (링크·비밀번호만)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                비밀번호 {passwordSet ? '(저장된 값은 볼 수 없어 직접 입력, 저장 안 됨)' : '(아직 비밀번호 없음, 업체 정보에서 먼저 설정)'}
              </span>
              <input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setEdited(false)
                }}
                placeholder="비우면 '별도 안내'"
                className="h-8 w-56 border border-border bg-background px-2"
                autoComplete="off"
              />
            </label>
            {!password.trim() && (
              <span className="text-xs font-medium text-orange-600">비밀번호를 넣어야 문자에 같이 들어감</span>
            )}
            {edited && (
              <Button variant="ghost" size="sm" className="rounded-none" onClick={() => setEdited(false)}>
                다시 만들기
              </Button>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setEdited(true)
            }}
            rows={style === 'short' ? 5 : 14}
            className="w-full border border-border bg-background p-3 font-mono text-sm leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button className="rounded-none" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? '복사됨' : '문자 복사'}
            </Button>
            <a
              href={smsHref(phone, text)}
              className="inline-flex h-9 items-center gap-1.5 border border-border px-3 text-sm hover:bg-muted"
              title="휴대폰에서 누르면 문자 앱이 열림 (받는 사람 = 업체 연락처)"
            >
              <Smartphone className="size-4" /> 휴대폰 문자 앱으로 열기{phone ? ` (${phone})` : ''}
            </a>
            <span className="text-xs text-muted-foreground">
              {euckr > 90 ? `장문(LMS) · ${euckr}바이트` : `단문(SMS) · ${euckr}바이트`}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
