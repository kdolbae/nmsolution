'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { recordSubmission } from '@/app/actions/est'
import { Btn, ErrorLine, FieldRow, inputCls, selectCls, btnCls } from './ui'
import { useAct } from './use-act'
import { cn } from '@/lib/utils'

const DOCS = [
  { key: 'quote', label: '견적서' },
  { key: 'detail', label: '내역서' },
  { key: 'basis', label: '산출근거' },
] as const
const CHANNELS: Record<string, string> = { print: '인쇄', pdf: 'PDF', email: '메일', kakao: '카카오톡', portal: '포털', other: '기타' }

/** S9 고객 출력: 3종 탭 미리보기 + 인쇄 + 제출 기록(승인 판만) */
export function PrintView({ estimateId, approved, defaultRecipient }: { estimateId: number; approved: boolean; defaultRecipient: string }) {
  const [doc, setDoc] = useState<(typeof DOCS)[number]['key']>('quote')
  const { pending, error, run } = useAct()
  const [f, setF] = useState({ channel: 'print', recipient: defaultRecipient, note: '' })
  const [done, setDone] = useState(false)
  const src = (docs: string) => `/api/admin/est/print/${estimateId}?docs=${docs}`
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex">
          {DOCS.map((d) => (
            <button key={d.key} type="button" onClick={() => setDoc(d.key)} className={cn('border px-3 py-1.5 text-sm', doc === d.key ? 'border-navy bg-navy text-navy-foreground' : 'border-border bg-background')}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <a href={src(doc)} target="_blank" rel="noopener" className={btnCls('outline', 'sm')}>
            <Printer className="size-3.5" />이 문서 인쇄
          </a>
          <a href={src('quote,detail,basis')} target="_blank" rel="noopener" className={btnCls('primary', 'sm')}>
            <Printer className="size-3.5" />3종 한 번에 인쇄
          </a>
        </div>
      </div>
      <iframe title="고객 출력 미리보기" src={src(doc)} className="h-[75svh] w-full bg-background ring-1 ring-border" />
      <section className="flex flex-col gap-3 bg-background p-4 ring-1 ring-border">
        <h2 className="text-base font-bold">제출 기록 남기기</h2>
        {!approved && <p className="text-sm text-muted-foreground">승인된 판만 제출 기록을 남길 수 있음(지금은 검토용 미리보기).</p>}
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr_1fr]">
          <FieldRow label="채널">
            <select className={selectCls} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} disabled={!approved}>
              {Object.entries(CHANNELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="수신자">
            <input className={inputCls} value={f.recipient} onChange={(e) => setF({ ...f, recipient: e.target.value })} disabled={!approved} />
          </FieldRow>
          <FieldRow label="메모">
            <input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} disabled={!approved} />
          </FieldRow>
        </div>
        <ErrorLine error={error} />
        {done && <p className="text-sm text-[color:var(--sb-ok)]">제출 기록을 남김. 견적 대장에 올라감.</p>}
        <Btn variant="accent" className="w-fit" disabled={!approved || pending} onClick={() => run(() => recordSubmission(estimateId, f), () => setDone(true))}>
          제출 기록 남기기
        </Btn>
      </section>
    </div>
  )
}
