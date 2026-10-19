'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CircleAlert, Copy, Plus, Printer, RotateCcw, Send, ShieldCheck, Trash2, Undo2 } from 'lucide-react'
import {
  addLine,
  addSection,
  deleteManualLine,
  duplicateEstimate,
  fixConfirmText,
  removeLine,
  reopenRejected,
  restoreLine,
  runCheck,
  submitForApproval,
  updateEstimateMeta,
  updateLine,
  updateSection,
} from '@/app/actions/est'
import { Badge, Btn, ErrorLine, FieldRow, inputCls, Money, selectCls, textareaCls, thCls, tdCls, won } from './ui'
import { useAct } from './use-act'
import { cn } from '@/lib/utils'

export type EdLine = {
  id: number
  itemCode: string | null
  kind: string
  name: string
  spec: string
  unit: string
  qty: number
  unitPrice: number
  amount: number
  grade: string
  origin: string
  ruleType: string | null
  qtyOverridden: boolean
  basisText: string
  internalMemo: string
  confirmNeeded: boolean
  removed: boolean
  removedReason: string | null
  removedNote: string | null
  actual: { min: number; typ: number; max: number } | null
  actualSource: string | null
}
export type EdSection = { id: number; name: string; description: string; calcMode: string; isOption: boolean; total: number; lines: EdLine[] }
export type EdItem = { code: string; kind: string; name: string; spec: string; unit: string; price: number }
export type EdCheck = { code: string; severity: string; message: string; lineId?: string }
export type EdPanel = {
  supply: number
  vat: number
  total: number
  options: number
  breakdown: { label: string; amount: number }[]
  cost: { min: number; typ: number; max: number; insurance: number; manager: number } | null
  profit: { view: 'none' | 'pct' | 'amount'; typ?: number; min?: number; max?: number; marginPct?: number; minPct?: number; maxPct?: number }
  manager: { visits: number; customerAmount: number; lineName: string }
  incentive: number | null
  minMargin: number
}

const GRADE: Record<string, { label: string; tone: 'navy' | 'neutral' | 'accent' | 'warn' | 'muted' | 'ok' }> = {
  required: { label: '필수', tone: 'navy' },
  basic: { label: '기본', tone: 'neutral' },
  conditional: { label: '조건부', tone: 'accent' },
  rule: { label: '규칙', tone: 'warn' },
  manual: { label: '수기', tone: 'muted' },
  manager: { label: '담당자', tone: 'ok' },
}
const REASONS: Record<string, string> = { not_applicable: '해당 없음', client_provides: '발주처 제공', separate_contract: '별도 계약', other: '기타' }
const STATUS: Record<string, string> = {
  draft: '작성 중',
  discussion: '토의 중',
  checking: '검사 통과',
  approving: '결재 중',
  approved: '승인',
  rejected: '반려',
  submitted: '제출',
  superseded: '대체됨',
  void: '무효',
}
const KINDS = ['자재', '용역', '장비', '노무', '경비']

/** S6 견적 편집기: 왼쪽 공정·줄 표, 오른쪽 실시간 패널(§6.1). 저장할 때마다 서버가 다시 계산·검사 */
export function Editor({
  projectId,
  estimate,
  versions,
  sections,
  items,
  panel,
  checks,
  canSeeCost,
  locked,
}: {
  projectId: number
  estimate: { id: number; label: string; versionNo: number; status: string; managerVisits: number; notesCustomer: string; customerNumber: string | null }
  versions: { id: number; label: string; versionNo: number; status: string }[]
  sections: EdSection[]
  items: EdItem[]
  panel: EdPanel
  checks: EdCheck[]
  canSeeCost: boolean
  locked: boolean
}) {
  const router = useRouter()
  const { pending, error, run } = useAct()
  const [msg, setMsg] = useState<string | null>(null)
  const errors = checks.filter((c) => c.severity === 'error')
  const warns = checks.filter((c) => c.severity !== 'error')
  const byLine = useMemo(() => {
    const m = new Map<string, EdCheck[]>()
    for (const c of checks) if (c.lineId) m.set(c.lineId, [...(m.get(c.lineId) ?? []), c])
    return m
  }, [checks])

  return (
    <div className="flex flex-col gap-4">
      {/* 상단: 판 전환·복제·검사·결재·인쇄 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {versions.map((v) => (
            <Link
              key={v.id}
              href={`/admin/est/${projectId}/v/${v.id}`}
              className={cn('border px-3 py-1.5 text-sm', v.id === estimate.id ? 'border-navy bg-navy text-navy-foreground' : 'border-border bg-background hover:bg-secondary')}
            >
              {v.label || `v${v.versionNo}`} <span className="text-xs opacity-70">{STATUS[v.status] ?? v.status}</span>
            </Link>
          ))}
          <Link href={`/admin/est/${projectId}/v/new`} className="border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            + 새 판
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            size="sm"
            disabled={pending}
            onClick={() => {
              const label = prompt('새 판 이름표(예: B안)', '')
              if (label === null) return
              run(() => duplicateEstimate(estimate.id, label), (r) => router.push(`/admin/est/${projectId}/v/${(r as { id: number }).id}`))
            }}
          >
            <Copy className="size-3.5" />
            복제
          </Btn>
          {!locked && estimate.status !== 'rejected' && (
            <>
              <Btn size="sm" disabled={pending} onClick={() => run(() => runCheck(estimate.id), (r) => setMsg(`검사: 오류 ${(r as { errors: number }).errors} · 경고 ${(r as { warnings: number }).warnings}`))}>
                <ShieldCheck className="size-3.5" />
                자동 검사
              </Btn>
              <Btn size="sm" variant="accent" disabled={pending || errors.length > 0} onClick={() => confirm('결재를 올릴까요? 올리면 이 판은 잠김') && run(() => submitForApproval(estimate.id), (r) => setMsg((r as { approved: boolean }).approved ? '바로 승인됨' : '결재를 올림'))}>
                <Send className="size-3.5" />
                결재 올리기
              </Btn>
            </>
          )}
          {estimate.status === 'rejected' && (
            <Btn size="sm" variant="primary" disabled={pending} onClick={() => run(() => reopenRejected(estimate.id))}>
              <RotateCcw className="size-3.5" />
              수정 시작
            </Btn>
          )}
          <Link href={`/admin/est/${projectId}/v/${estimate.id}/print`} className="inline-flex h-8 items-center gap-1.5 border border-border bg-background px-2.5 text-xs font-medium hover:bg-secondary">
            <Printer className="size-3.5" />
            인쇄 미리보기
          </Link>
        </div>
      </div>
      {locked && <p className="border border-border bg-background px-3 py-2 text-sm text-muted-foreground">{estimate.status === 'approving' ? '결재 중이라 고칠 수 없음.' : '승인·제출된 판이라 고칠 수 없음. 고치려면 복제해서 새 판을 만들어야 함.'}</p>}
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <ErrorLine error={error} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <MetaBox estimate={estimate} locked={locked} />
          {sections.map((s) => (
            <SectionBox key={s.id} estimateId={estimate.id} section={s} items={items} canSeeCost={canSeeCost} locked={locked} byLine={byLine} />
          ))}
          {!locked && <AddSection estimateId={estimate.id} />}
        </div>
        <Panel panel={panel} errors={errors} warns={warns} canSeeCost={canSeeCost} estimateId={estimate.id} locked={locked} />
      </div>
    </div>
  )
}

function MetaBox({ estimate, locked }: { estimate: { id: number; label: string; managerVisits: number; notesCustomer: string; customerNumber: string | null }; locked: boolean }) {
  const { pending, error, run } = useAct()
  const [v, setV] = useState({ label: estimate.label, managerVisits: String(estimate.managerVisits), notesCustomer: estimate.notesCustomer })
  const dirty = v.label !== estimate.label || Number(v.managerVisits) !== estimate.managerVisits || v.notesCustomer !== estimate.notesCustomer
  return (
    <section className="grid gap-3 bg-background p-4 ring-1 ring-border sm:grid-cols-[8rem_8rem_1fr]">
      <FieldRow label="이름표">
        <input className={inputCls} value={v.label} disabled={locked} onChange={(e) => setV({ ...v, label: e.target.value })} />
      </FieldRow>
      <FieldRow label="담당자 방문 수">
        <input className={inputCls} inputMode="numeric" value={v.managerVisits} disabled={locked} onChange={(e) => setV({ ...v, managerVisits: e.target.value.replace(/\D/g, '') })} />
      </FieldRow>
      <FieldRow label="특기사항(고객 견적서)">
        <textarea className={textareaCls} rows={2} value={v.notesCustomer} disabled={locked} onChange={(e) => setV({ ...v, notesCustomer: e.target.value })} />
      </FieldRow>
      {!locked && dirty && (
        <div className="flex items-center gap-2 sm:col-span-3">
          <Btn size="sm" variant="primary" disabled={pending} onClick={() => run(() => updateEstimateMeta(estimate.id, { label: v.label, managerVisits: Number(v.managerVisits) || 0, notesCustomer: v.notesCustomer }))}>
            저장
          </Btn>
          <ErrorLine error={error} />
        </div>
      )}
      {estimate.customerNumber && <p className="text-xs text-muted-foreground sm:col-span-3">고객 번호 {estimate.customerNumber}</p>}
    </section>
  )
}

function SectionBox({ estimateId, section, items, canSeeCost, locked, byLine }: { estimateId: number; section: EdSection; items: EdItem[]; canSeeCost: boolean; locked: boolean; byLine: Map<string, EdCheck[]> }) {
  const { pending, error, run } = useAct()
  const [name, setName] = useState(section.name)
  return (
    <section className={cn('bg-background ring-1', section.isOption ? 'ring-electric/40' : 'ring-border')}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <input
          className={cn(inputCls, 'h-9 w-auto min-w-40 flex-1 font-semibold')}
          value={name}
          disabled={locked}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== section.name && run(() => updateSection(section.id, { name }))}
        />
        {section.isOption && <Badge tone="accent">선택 항목(합계 밖)</Badge>}
        {!locked && (
          <>
            <select className={cn(selectCls, 'h-9 w-auto')} value={section.calcMode} onChange={(e) => run(() => updateSection(section.id, { calcMode: e.target.value }))} disabled={pending} aria-label="계산 방식">
              <option value="full">원가계산(전부)</option>
              <option value="margin">관리비·이윤만</option>
              <option value="overhead">관리비만</option>
              <option value="none">요율 없음</option>
            </select>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={section.isOption} onChange={(e) => run(() => updateSection(section.id, { isOption: e.target.checked }))} disabled={pending} />
              선택 항목
            </label>
          </>
        )}
        <span className="ml-auto text-sm">
          공정 계 <Money value={section.total} />
        </span>
      </div>
      <ErrorLine error={error} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={thCls}>비목</th>
              <th className={thCls}>품명·규격</th>
              <th className={thCls}>단위</th>
              <th className={thCls + ' text-right'}>수량</th>
              <th className={thCls + ' text-right'}>단가</th>
              <th className={thCls + ' text-right'}>금액</th>
              {canSeeCost && <th className={thCls + ' text-right'}>실단가 typ</th>}
              <th className={thCls}>등급</th>
              <th className={thCls}>근거</th>
              <th className={thCls} />
            </tr>
          </thead>
          <tbody>
            {section.lines.map((l) => (
              <LineRow key={l.id} line={l} canSeeCost={canSeeCost} locked={locked} checks={byLine.get(String(l.id)) ?? []} />
            ))}
          </tbody>
        </table>
      </div>
      {!locked && <AddLine estimateId={estimateId} sectionId={section.id} items={items} />}
    </section>
  )
}

function LineRow({ line: l, canSeeCost, locked, checks }: { line: EdLine; canSeeCost: boolean; locked: boolean; checks: EdCheck[] }) {
  const { pending, error, run } = useAct()
  const [open, setOpen] = useState<'edit' | 'remove' | null>(null)
  const [f, setF] = useState({ name: l.name, spec: l.spec, unit: l.unit, qty: String(l.qty), unitPrice: String(l.unitPrice), basisText: l.basisText, internalMemo: l.internalMemo, confirmNeeded: l.confirmNeeded, overrideReason: '' })
  const [rm, setRm] = useState({ reason: 'not_applicable', note: '' })
  const g = GRADE[l.grade] ?? GRADE.manual
  const isAuto = l.ruleType === 'auto_expense'
  const qtyChanged = Number(f.qty) !== l.qty
  const ruleQty = !!l.ruleType && l.ruleType !== 'fixed'
  const colSpan = canSeeCost ? 10 : 9
  const err = checks.find((c) => c.severity === 'error')

  return (
    <>
      <tr className={cn(l.removed && 'text-muted-foreground line-through decoration-muted-foreground/60', err && !l.removed && 'bg-destructive/5')}>
        <td className={tdCls + ' whitespace-nowrap text-xs'}>{l.kind}</td>
        <td className={tdCls}>
          <span className="font-medium">{l.name}</span>
          {l.spec && <span className="block text-xs text-muted-foreground">{l.spec}</span>}
          {l.confirmNeeded && <Badge tone="warn" className="mt-1">확인 필요</Badge>}
          {checks.map((c, i) => (
            <span key={i} className={cn('mt-1 block text-xs no-underline', c.severity === 'error' ? 'text-destructive' : 'text-[color:var(--sb-warn)]')}>
              {c.message}
            </span>
          ))}
        </td>
        <td className={tdCls + ' text-xs'}>{l.unit}</td>
        <td className={tdCls + ' text-right font-mono tabular-nums'}>
          {l.qty.toLocaleString('ko-KR', { maximumFractionDigits: 3 })}
          {l.qtyOverridden && <span className="block text-[10px] text-[color:var(--sb-warn)]">덧씌움</span>}
        </td>
        <td className={tdCls + ' text-right font-mono tabular-nums'}>{won(l.unitPrice)}</td>
        <td className={tdCls + ' text-right font-mono tabular-nums'}>{won(l.removed ? 0 : l.qty * l.unitPrice)}</td>
        {canSeeCost && (
          <td className={tdCls + ' text-right font-mono text-xs tabular-nums'} title={l.actualSource ?? '실단가 없음(견적단가로 계산)'}>
            {l.actual ? won(l.actual.typ) : <span className="text-muted-foreground">-</span>}
          </td>
        )}
        <td className={tdCls}>
          <Badge tone={g.tone}>{isAuto ? '경비 자동' : g.label}</Badge>
        </td>
        <td className={tdCls + ' max-w-56 text-xs text-muted-foreground'}>
          {l.removed ? `삭제: ${REASONS[l.removedReason ?? ''] ?? ''}${l.removedNote ? ` · ${l.removedNote}` : ''}` : l.basisText}
        </td>
        <td className={tdCls + ' whitespace-nowrap text-right'}>
          {!locked &&
            (l.removed ? (
              <Btn size="sm" variant="ghost" disabled={pending} onClick={() => run(() => restoreLine(l.id))}>
                <Undo2 className="size-3.5" />
                복구
              </Btn>
            ) : (
              <span className="inline-flex gap-1">
                <Btn size="sm" variant="ghost" onClick={() => setOpen(open === 'edit' ? null : 'edit')}>
                  고치기
                </Btn>
                {l.grade !== 'required' && l.grade !== 'manager' && (
                  <Btn size="sm" variant="ghost" aria-label="삭제" onClick={() => setOpen(open === 'remove' ? null : 'remove')}>
                    <Trash2 className="size-3.5" />
                  </Btn>
                )}
              </span>
            ))}
        </td>
      </tr>
      {open === 'edit' && !locked && (
        <tr>
          <td colSpan={colSpan} className="border-b border-border bg-secondary/60 p-3">
            <div className="grid gap-2 sm:grid-cols-6">
              <FieldRow label="품명" className="sm:col-span-2">
                <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </FieldRow>
              <FieldRow label="규격" className="sm:col-span-2">
                <input className={inputCls} value={f.spec} onChange={(e) => setF({ ...f, spec: e.target.value })} />
              </FieldRow>
              <FieldRow label="단위">
                <input className={inputCls} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
              </FieldRow>
              <FieldRow label={l.grade === 'manager' ? '수량(방문 수로)' : '수량'}>
                <input className={inputCls} inputMode="decimal" disabled={l.grade === 'manager'} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value.replace(/[^\d.]/g, '') })} />
              </FieldRow>
              <FieldRow label="단가(원)">
                <input className={inputCls} inputMode="numeric" value={f.unitPrice} onChange={(e) => setF({ ...f, unitPrice: e.target.value.replace(/\D/g, '') })} />
              </FieldRow>
              {ruleQty && qtyChanged && (
                <FieldRow label="수량 덧씌움 이유(필수)" className="sm:col-span-5">
                  <input className={inputCls} value={f.overrideReason} onChange={(e) => setF({ ...f, overrideReason: e.target.value })} placeholder="산식 수량과 다른 이유" />
                </FieldRow>
              )}
              <FieldRow label="근거문구(고객 산출근거, ~함)" className="sm:col-span-3">
                <textarea className={textareaCls} rows={2} value={f.basisText} onChange={(e) => setF({ ...f, basisText: e.target.value })} />
              </FieldRow>
              <FieldRow label="줄 메모(내부, 고객 서류에 안 나감)" className="sm:col-span-3">
                <textarea className={textareaCls} rows={2} value={f.internalMemo} onChange={(e) => setF({ ...f, internalMemo: e.target.value })} />
              </FieldRow>
              <label className="flex items-center gap-2 text-sm sm:col-span-3">
                <input type="checkbox" checked={f.confirmNeeded} onChange={(e) => setF({ ...f, confirmNeeded: e.target.checked })} />
                확인 필요(고객 비고에 협의 후 확정)
              </label>
              <div className="flex items-center justify-end gap-2 sm:col-span-3">
                <Btn size="sm" variant="ghost" onClick={() => setOpen(null)}>
                  닫기
                </Btn>
                <Btn
                  size="sm"
                  variant="primary"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        updateLine(l.id, {
                          name: f.name,
                          spec: f.spec,
                          unit: f.unit,
                          ...(l.grade === 'manager' || !qtyChanged ? {} : { qty: Number(f.qty) || 0, overrideReason: f.overrideReason }),
                          unitPrice: Number(f.unitPrice) || 0,
                          basisText: f.basisText,
                          internalMemo: f.internalMemo,
                          confirmNeeded: f.confirmNeeded,
                        }),
                      () => setOpen(null),
                    )
                  }
                >
                  줄 저장
                </Btn>
              </div>
            </div>
            <ErrorLine error={error} />
          </td>
        </tr>
      )}
      {open === 'remove' && !locked && (
        <tr>
          <td colSpan={colSpan} className="border-b border-border bg-secondary/60 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <FieldRow label="삭제 이유(필수)">
                <select className={selectCls} value={rm.reason} onChange={(e) => setRm({ ...rm, reason: e.target.value })}>
                  {Object.entries(REASONS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="메모" className="flex-1">
                <input className={inputCls} value={rm.note} onChange={(e) => setRm({ ...rm, note: e.target.value })} placeholder={rm.reason === 'other' ? '기타 이유(필수)' : '선택'} />
              </FieldRow>
              <Btn variant="danger" disabled={pending} onClick={() => run(() => removeLine(l.id, rm.reason, rm.note), () => setOpen(null))}>
                삭제 표시
              </Btn>
              {l.grade === 'manual' && (
                <Btn variant="ghost" disabled={pending} onClick={() => confirm('수기 줄을 완전히 지울까요?') && run(() => deleteManualLine(l.id))}>
                  완전 삭제
                </Btn>
              )}
            </div>
            <ErrorLine error={error} />
          </td>
        </tr>
      )}
    </>
  )
}

function AddLine({ estimateId, sectionId, items }: { estimateId: number; sectionId: number; items: EdItem[] }) {
  const { pending, error, run } = useAct()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [manual, setManual] = useState({ kind: '자재', name: '', spec: '', unit: '식', qty: '1', unitPrice: '' })
  const found = q.trim() ? items.filter((i) => `${i.code} ${i.name} ${i.spec}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : []
  if (!open)
    return (
      <div className="p-3">
        <Btn size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" />줄 추가
        </Btn>
      </div>
    )
  return (
    <div className="flex flex-col gap-3 border-t border-border p-3">
      <FieldRow label="품목 찾기(마스터)">
        <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="코드·품명" />
      </FieldRow>
      {found.length > 0 && (
        <ul className="flex flex-col border border-border">
          {found.map((i) => (
            <li key={i.code}>
              <button type="button" disabled={pending} onClick={() => run(() => addLine(estimateId, sectionId, { itemCode: i.code, qty: 1 }), () => setQ(''))} className="flex w-full items-center justify-between gap-2 border-b border-border px-2 py-2 text-left text-sm last:border-0 hover:bg-secondary">
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{i.code}</span> {i.name} <span className="text-xs text-muted-foreground">{i.spec}</span>
                </span>
                <span className="font-mono text-xs">
                  {won(i.price)}/{i.unit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">또는 완전 수기</p>
      <div className="grid gap-2 sm:grid-cols-6">
        <select className={selectCls} value={manual.kind} onChange={(e) => setManual({ ...manual, kind: e.target.value })} aria-label="비목">
          {KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <input className={inputCls + ' sm:col-span-2'} placeholder="품명" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
        <input className={inputCls} placeholder="단위" value={manual.unit} onChange={(e) => setManual({ ...manual, unit: e.target.value })} />
        <input className={inputCls} placeholder="수량" inputMode="decimal" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value.replace(/[^\d.]/g, '') })} />
        <input className={inputCls} placeholder="단가" inputMode="numeric" value={manual.unitPrice} onChange={(e) => setManual({ ...manual, unitPrice: e.target.value.replace(/\D/g, '') })} />
      </div>
      <div className="flex gap-2">
        <Btn
          size="sm"
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(
              () => addLine(estimateId, sectionId, { kind: manual.kind, name: manual.name, spec: manual.spec, unit: manual.unit, qty: Number(manual.qty) || 0, unitPrice: Number(manual.unitPrice) || 0 }),
              () => setManual({ kind: manual.kind, name: '', spec: '', unit: '식', qty: '1', unitPrice: '' }),
            )
          }
        >
          수기 줄 추가
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => setOpen(false)}>
          닫기
        </Btn>
      </div>
      <ErrorLine error={error} />
    </div>
  )
}

function AddSection({ estimateId }: { estimateId: number }) {
  const { pending, error, run } = useAct()
  const [name, setName] = useState('')
  const [opt, setOpt] = useState(false)
  return (
    <div className="flex flex-col gap-2 border border-dashed border-border p-3 sm:flex-row sm:items-center">
      <input className={inputCls} placeholder="새 공정 이름" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="flex shrink-0 items-center gap-1 text-xs">
        <input type="checkbox" checked={opt} onChange={(e) => setOpt(e.target.checked)} />
        선택 항목
      </label>
      <Btn size="sm" disabled={pending} onClick={() => run(() => addSection(estimateId, name, opt), () => setName(''))}>
        공정 추가
      </Btn>
      <ErrorLine error={error} />
    </div>
  )
}

function Panel({ panel, errors, warns, canSeeCost, estimateId, locked }: { panel: EdPanel; errors: EdCheck[]; warns: EdCheck[]; canSeeCost: boolean; estimateId: number; locked: boolean }) {
  const { pending, run } = useAct()
  const p = panel.profit
  const range = panel.cost && panel.cost.max > panel.cost.min ? panel.cost : null
  const pos = (v: number) => (range ? Math.max(0, Math.min(100, ((v - range.min) / (range.max - range.min)) * 100)) : 50)
  const low = p.marginPct !== undefined && p.marginPct < panel.minMargin
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-[calc(var(--sb-topbar-h)+1rem)] xl:self-start">
      <section className="flex flex-col gap-2 bg-background p-4 ring-1 ring-border">
        <Row label="공급가" value={panel.supply} strong />
        <Row label="VAT" value={panel.vat} />
        <Row label="합계" value={panel.total} strong />
        {panel.options > 0 && <Row label="선택 항목(별도)" value={panel.options} />}
      </section>
      <section className="flex flex-col gap-1 bg-background p-4 text-sm ring-1 ring-border">
        <h3 className="mb-1 text-xs font-semibold text-muted-foreground">원가계산 내역</h3>
        {panel.breakdown.map((b) => (
          <Row key={b.label} label={b.label} value={b.amount} />
        ))}
      </section>
      {p.view !== 'none' && (
        <section className="flex flex-col gap-2 bg-background p-4 ring-1 ring-border">
          <h3 className="text-xs font-semibold text-muted-foreground">예상이익</h3>
          <span className={cn('font-mono text-xl font-semibold tabular-nums', low && 'text-destructive')}>
            {p.view === 'amount' && p.typ !== undefined ? `${won(p.typ)}원 · ` : ''}
            {p.marginPct}%
          </span>
          {p.view === 'amount' && p.minPct !== undefined && (
            <span className="text-xs text-muted-foreground">
              범위 {p.minPct}% ~ {p.maxPct}%
            </span>
          )}
          {low && <span className="text-xs text-destructive">최소 이익률 {panel.minMargin}% 미만</span>}
          {canSeeCost && panel.cost && (
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-xs text-muted-foreground">예상원가 min · typ · max</span>
              <div className="relative h-2 bg-secondary">
                <span className="absolute inset-y-0 bg-navy/30" style={{ left: 0, right: 0 }} />
                <span className="absolute -top-1 h-4 w-0.5 bg-navy" style={{ left: `${pos(panel.cost.typ)}%` }} />
              </div>
              <span className="flex justify-between font-mono text-[11px] tabular-nums">
                <span>{won(panel.cost.min)}</span>
                <span className="font-semibold">{won(panel.cost.typ)}</span>
                <span>{won(panel.cost.max)}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                보험료 {won(panel.cost.insurance)} · 담당자 원가 {won(panel.cost.manager)} 포함
              </span>
            </div>
          )}
        </section>
      )}
      <section className="flex flex-col gap-1 bg-background p-4 text-sm ring-1 ring-border">
        <h3 className="text-xs font-semibold text-muted-foreground">담당자</h3>
        <span>
          {panel.manager.lineName} × {panel.manager.visits}회 = <Money value={panel.manager.customerAmount} />
        </span>
        {panel.incentive !== null && (
          <span className="text-xs text-muted-foreground">
            인센티브 예상 <Money value={panel.incentive} />
          </span>
        )}
      </section>
      <section className="flex flex-col gap-2 bg-background p-4 ring-1 ring-border">
        <h3 className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          자동 검사
          <span className="flex gap-1">
            <Badge tone={errors.length ? 'danger' : 'ok'}>오류 {errors.length}</Badge>
            <Badge tone={warns.length ? 'warn' : 'muted'}>경고 {warns.length}</Badge>
          </span>
        </h3>
        <ul className="flex flex-col gap-1.5 text-xs">
          {[...errors, ...warns].map((c, i) => (
            <li key={i} className={cn('flex gap-1.5', c.severity === 'error' ? 'text-destructive' : 'text-[color:var(--sb-warn)]')}>
              {c.severity === 'error' ? <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
              <span>{c.message}</span>
            </li>
          ))}
          {!errors.length && !warns.length && <li className="text-muted-foreground">문제 없음</li>}
        </ul>
        {!locked && errors.some((c) => c.code === 'CONFIRM_TEXT') && (
          <Btn size="sm" disabled={pending} onClick={() => run(() => fixConfirmText(estimateId))}>
            확인 필요 표기 자동 보정
          </Btn>
        )}
      </section>
    </aside>
  )
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <span className={cn('flex items-baseline justify-between gap-3', strong && 'font-semibold')}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <Money value={value} className={strong ? 'text-base' : 'text-sm'} />
    </span>
  )
}
