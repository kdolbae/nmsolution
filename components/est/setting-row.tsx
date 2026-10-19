'use client'

import { useState } from 'react'
import { saveEstSetting } from '@/app/actions/est-admin'
import { Btn, ErrorLine, inputCls, SampleBadge, textareaCls } from './ui'
import { useAct } from './use-act'

type Row = { key: string; value: unknown; label: string; help: string | null; isSample: boolean; updatedAt: string | null; updatedBy: string | null }

const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/** S14 설정 한 줄. 타입별 입력, 저장하면 "샘플" 표식이 사라짐 */
export function SettingRow({ row }: { row: Row }) {
  const { pending, error, run } = useAct()
  const v = row.value
  const kind = typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'bool' : typeof v === 'string' ? 'text' : isStrArray(v) ? 'list' : 'json'
  const init = kind === 'list' ? (v as string[]).join(', ') : kind === 'json' ? JSON.stringify(v, null, 2) : kind === 'bool' ? String(v) : String(v ?? '')
  const [text, setText] = useState(init)
  const dirty = text !== init
  const toJson = (): string => {
    if (kind === 'number') return String(Number(text.replace(/,/g, '')))
    if (kind === 'bool') return text === 'true' ? 'true' : 'false'
    if (kind === 'text') return JSON.stringify(text)
    if (kind === 'list') return JSON.stringify(text.split(',').map((x) => x.trim()).filter(Boolean))
    return text
  }
  return (
    <div className="grid gap-2 border-b border-border py-3 last:border-0 lg:grid-cols-[16rem_1fr_auto] lg:items-start">
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-2 text-sm font-medium">
          {row.label} {row.isSample && <SampleBadge />}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{row.key}</span>
      </div>
      <div className="flex flex-col gap-1">
        {kind === 'bool' ? (
          <label className="flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={text === 'true'} onChange={(e) => setText(String(e.target.checked))} />
            {text === 'true' ? '켬' : '끔'}
          </label>
        ) : kind === 'json' ? (
          <textarea className={textareaCls + ' font-mono text-xs'} rows={Math.min(8, init.split('\n').length + 1)} value={text} onChange={(e) => setText(e.target.value)} />
        ) : (
          <input className={inputCls + (kind === 'number' ? ' font-mono' : '')} inputMode={kind === 'number' ? 'decimal' : undefined} value={text} onChange={(e) => setText(e.target.value)} />
        )}
        {row.help && <span className="text-xs text-muted-foreground">{row.help}</span>}
        {kind === 'list' && <span className="text-xs text-muted-foreground">쉼표로 나눔</span>}
        {row.updatedAt && (
          <span className="text-[11px] text-muted-foreground">
            저장 {new Date(row.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · {row.updatedBy}
          </span>
        )}
        <ErrorLine error={error} />
      </div>
      <Btn size="sm" variant="primary" disabled={!dirty || pending} onClick={() => run(() => saveEstSetting(row.key, toJson()))}>
        저장
      </Btn>
    </div>
  )
}
