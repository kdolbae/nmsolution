'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Copy, Eye, FileDown, FileSignature, Loader2, Plus, Printer, Stamp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { won } from '@/lib/clients/quote'
import { fmtAt } from '@/components/admin/client-versions'
import {
  cancelContractAction,
  deleteContractDraft,
  issueContractAction,
  saveContract,
  signContractAction,
} from '@/app/actions/client-contracts'

type Party = {
  type: 'corp' | 'person'
  name: string
  bizNumber: string
  corpNumber: string
  ceo: string
  address: string
  phone: string
  email: string
}
type Terms = {
  title: string
  site: string
  startDate: string
  endDate: string
  payment: string
  warranty: string
  delayRate: string
  special: string
  contractDate: string
}

export type ContractItem = {
  no: number
  number: string
  status: 'draft' | 'issued' | 'signed' | 'cancelled'
  statusLabel: string
  versionNo: number
  party: Party
  terms: Terms
  supply: number
  vat: number
  token: string | null
  missing: string[]
  /** ISO */
  createdAt: string
  issuedAt: string | null
  signedAt: string | null
  signedNote: string
  cancelledAt: string | null
}

const STATUS_CLASS: Record<ContractItem['status'], string> = {
  draft: 'bg-muted text-foreground',
  issued: 'bg-electric text-white',
  signed: 'bg-emerald-700 text-white',
  cancelled: 'bg-muted text-muted-foreground line-through',
}

/**
 * 계약서 (관리자 전용, 전 업체 공통, 2026-11-02 kevin "계약서를 생성해서 출력").
 * 작업제안서 + 견적서 vN 을 근거로 공사 도급 계약서를 만들고 인쇄·PDF 로 날인받는다.
 * 계약 주체(법인/개인)는 여기서 정한다. 발행하면 내용이 굳고 고객용 보기 링크가 열린다(열람 기록은 접속 기록에).
 * 날인한 계약서를 받으면 '날인 완료' → 근거 버전이 최신이면 견적이 '계약 확정'으로 잠긴다.
 */
export function ClientContracts({
  clientId,
  contracts,
  versions,
  defaults,
}: {
  clientId: number
  contracts: ContractItem[]
  versions: { no: number; summary: string; supply: number }[]
  defaults: { party: Party; terms: Terms; versionNo: number | null }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<{ no: number | null; versionNo: number; party: Party; terms: Terms } | null>(null)

  const startNew = () =>
    setEditing({ no: null, versionNo: defaults.versionNo ?? versions[0]?.no ?? 0, party: { ...defaults.party }, terms: { ...defaults.terms } })
  const startEdit = (c: ContractItem) => setEditing({ no: c.no, versionNo: c.versionNo, party: { ...c.party }, terms: { ...c.terms } })

  const run = <T,>(fn: () => Promise<({ ok: true } & T) | { ok: false; error: string }>, ok: (r: T) => string) =>
    startTransition(async () => {
      const r = await fn()
      setMessage(r.ok ? ok(r) : r.error)
      router.refresh()
    })

  const save = () => {
    if (!editing) return
    if (!editing.versionNo) return setMessage('근거로 쓸 견적 버전이 없습니다. 제안서·견적서를 먼저 저장하세요.')
    startTransition(async () => {
      const r = await saveContract(clientId, editing.no, editing.versionNo, editing.party, editing.terms)
      setMessage(r.ok ? '계약서를 저장했습니다. 미리보기로 확인한 뒤 발행하세요.' : r.error)
      if (r.ok) setEditing(null)
      router.refresh()
    })
  }

  const issue = (c: ContractItem) => {
    if (c.missing.length) return setMessage(`발행 전에 채울 항목: ${c.missing.join(', ')}`)
    if (!confirm(`${c.number} 계약서를 발행할까요?\n발행하면 내용이 굳어 더 고칠 수 없고(취소 후 새로 작성), 고객용 보기 링크가 열립니다.`)) return
    run(() => issueContractAction(clientId, c.no), () => `${c.number} 를 발행했습니다. 인쇄하거나 고객 링크를 보내세요.`)
  }
  const sign = (c: ContractItem) => {
    const note = prompt(`${c.number} 날인한 계약서를 받았나요?\n근거 버전 v${c.versionNo} 가 최신이면 견적이 '계약 확정'으로 잠깁니다.\n\n메모(받은 날·방법 등, 비워도 됨):`, '')
    if (note === null) return
    run(
      () => signContractAction(clientId, c.no, note),
      (r: { locked: number | null; reason?: string }) =>
        r.locked ? `날인 완료로 바꾸고 견적을 v${r.locked} 계약 확정으로 잠갔습니다.` : `날인 완료로 바꿨습니다. ${r.reason ?? ''}`,
    )
  }
  const cancel = (c: ContractItem) => {
    if (!confirm(`${c.number} 계약서를 취소할까요?\n고객 링크가 바로 닫힙니다. 기록은 남습니다.${c.status === 'signed' ? '\n견적 계약 확정 잠금은 버전 기록에서 따로 해제하세요.' : ''}`)) return
    run(() => cancelContractAction(clientId, c.no), () => `${c.number} 를 취소했습니다.`)
  }
  const remove = (c: ContractItem) => {
    if (!confirm(`작성 중인 ${c.number} 를 지울까요?`)) return
    run(() => deleteContractDraft(clientId, c.no), () => `${c.number} 를 지웠습니다.`)
  }
  const copyLink = async (c: ContractItem) => {
    if (!c.token) return
    const url = `${location.origin}/contract/${c.token}`
    await navigator.clipboard.writeText(url).catch(() => null)
    setMessage(`고객용 계약서 링크를 복사했습니다: ${url}`)
  }

  const base = `/api/admin/clients/${clientId}/contracts`
  const linkCls = 'inline-flex h-8 items-center gap-1 border border-border px-2.5 text-xs hover:bg-muted'

  return (
    <section className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
      <div className="flex flex-wrap items-center gap-2">
        <FileSignature className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">계약서</h2>
        <span className="text-xs text-muted-foreground">작업제안서 + 견적서 버전을 근거로 공사 도급 계약서를 만들어 출력·날인합니다.</span>
        <Button size="sm" className="ml-auto rounded-none" onClick={startNew} disabled={pending || !!editing || !versions.length}>
          <Plus /> 계약서 만들기
        </Button>
      </div>

      {editing && (
        <ContractForm
          value={editing}
          versions={versions}
          onChange={setEditing}
          onSave={save}
          onCancel={() => setEditing(null)}
          pending={pending}
        />
      )}

      {contracts.length === 0 && !editing && <p className="text-xs text-muted-foreground">아직 만든 계약서가 없습니다.</p>}

      <ul className="flex flex-col gap-2">
        {contracts.map((c) => (
          <li key={c.no} className="flex flex-col gap-2 border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <b>{c.number}</b>
              <span className={`px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[c.status]}`}>{c.statusLabel}</span>
              <span className="text-xs text-muted-foreground">
                {c.party.type === 'corp' ? '법인' : '개인'} · {c.party.name || '이름 없음'} · 근거 v{c.versionNo} · 공급가 {won(c.supply)}원 (VAT 포함 {won(c.supply + c.vat)}원)
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              작성 {fmtAt(c.createdAt)}
              {c.issuedAt && ` · 발행 ${fmtAt(c.issuedAt)}`}
              {c.signedAt && ` · 날인 완료 ${fmtAt(c.signedAt)}${c.signedNote ? ` (${c.signedNote})` : ''}`}
              {c.cancelledAt && ` · 취소 ${fmtAt(c.cancelledAt)}`}
              {c.status === 'draft' && c.missing.length > 0 && <span className="ml-2 text-amber-700">채울 항목: {c.missing.join(', ')}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`${base}/${c.no}`} target="_blank" rel="noreferrer" className={linkCls}>
                <Eye className="size-3.5" /> 미리보기
              </a>
              <a href={`${base}/${c.no}?print=1`} target="_blank" rel="noreferrer" className={linkCls}>
                <Printer className="size-3.5" /> 계약서 인쇄
              </a>
              <a href={`${base}/${c.no}?pdf=1`} className={linkCls}>
                <FileDown className="size-3.5" /> PDF
              </a>
              <a href={`/api/admin/clients/${clientId}/print?docs=proposal&version=${c.versionNo}`} target="_blank" rel="noreferrer" className={linkCls}>
                <Printer className="size-3.5" /> 별첨 작업제안서 v{c.versionNo} 인쇄
              </a>
              {c.status === 'draft' && (
                <>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => startEdit(c)} disabled={pending || !!editing}>
                    고치기
                  </Button>
                  <Button size="sm" className="rounded-none" onClick={() => issue(c)} disabled={pending}>
                    {pending ? <Loader2 className="animate-spin" /> : <FileSignature />} 발행
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-none" onClick={() => remove(c)} disabled={pending}>
                    <Trash2 /> 지우기
                  </Button>
                </>
              )}
              {(c.status === 'issued' || c.status === 'signed') && c.token && (
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => copyLink(c)}>
                  <Copy /> 고객 링크 복사
                </Button>
              )}
              {c.status === 'issued' && (
                <Button size="sm" className="rounded-none" onClick={() => sign(c)} disabled={pending}>
                  <Stamp /> 날인 완료
                </Button>
              )}
              {c.status !== 'draft' && c.status !== 'cancelled' && (
                <Button size="sm" variant="ghost" className="rounded-none" onClick={() => cancel(c)} disabled={pending}>
                  <Ban /> 취소
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {message && (
        <p className="text-xs" role="status">
          {message}
        </p>
      )}
    </section>
  )
}

/** 입력 칸 이름표. 컴포넌트 밖에 두어야 입력할 때마다 칸이 새로 그려지지 않는다 */
function L({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium ${wide ? 'sm:col-span-2' : ''}`}>
      {label}
      {children}
    </label>
  )
}

function ContractForm({
  value,
  versions,
  onChange,
  onSave,
  onCancel,
  pending,
}: {
  value: { no: number | null; versionNo: number; party: Party; terms: Terms }
  versions: { no: number; summary: string; supply: number }[]
  onChange: (v: { no: number | null; versionNo: number; party: Party; terms: Terms }) => void
  onSave: () => void
  onCancel: () => void
  pending: boolean
}) {
  const p = value.party
  const t = value.terms
  const setP = (k: keyof Party, v: string) => onChange({ ...value, party: { ...p, [k]: v } })
  const setT = (k: keyof Terms, v: string) => onChange({ ...value, terms: { ...t, [k]: v } })
  const field = 'h-8 w-full border border-border bg-background px-2 text-sm'
  const area = 'w-full border border-border bg-background px-2 py-1.5 text-sm'
  return (
    <div className="flex flex-col gap-3 border border-border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="근거 견적 버전">
          <select className={field} value={value.versionNo} onChange={(e) => onChange({ ...value, versionNo: Number(e.target.value) })}>
            {versions.slice(0, 40).map((v, i) => (
              <option key={v.no} value={v.no}>
                v{v.no}
                {i === 0 ? ' (최신)' : ''} · {won(v.supply)}원 {v.summary ? `· ${v.summary}` : ''}
              </option>
            ))}
          </select>
        </L>
        <L label="계약 주체">
          <div className="flex h-8 items-center gap-4 text-sm font-normal">
            <label className="flex items-center gap-1">
              <input type="radio" checked={p.type === 'corp'} onChange={() => setP('type', 'corp')} /> 법인·사업자
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={p.type === 'person'} onChange={() => setP('type', 'person')} /> 개인
            </label>
          </div>
        </L>
        <L label={p.type === 'corp' ? '상호' : '성명'}>
          <input className={field} value={p.name} onChange={(e) => setP('name', e.target.value)} />
        </L>
        {p.type === 'corp' && (
          <>
            <L label="사업자등록번호">
              <input className={field} value={p.bizNumber} onChange={(e) => setP('bizNumber', e.target.value)} />
            </L>
            <L label="대표자">
              <input className={field} value={p.ceo} onChange={(e) => setP('ceo', e.target.value)} />
            </L>
            <L label="법인등록번호 (선택)">
              <input className={field} value={p.corpNumber} onChange={(e) => setP('corpNumber', e.target.value)} />
            </L>
          </>
        )}
        <L label="주소" wide>
          <input className={field} value={p.address} onChange={(e) => setP('address', e.target.value)} />
        </L>
        <L label="연락처 (선택)">
          <input className={field} value={p.phone} onChange={(e) => setP('phone', e.target.value)} />
        </L>
        <L label="계약일 (비우면 날짜 칸을 손으로 씀)">
          <input type="date" className={field} value={t.contractDate} onChange={(e) => setT('contractDate', e.target.value)} />
        </L>
        <L label="공사명" wide>
          <input className={field} value={t.title} onChange={(e) => setT('title', e.target.value)} />
        </L>
        <L label="공사 장소" wide>
          <input className={field} value={t.site} onChange={(e) => setT('site', e.target.value)} />
        </L>
        <L label="착공일">
          <input type="date" className={field} value={t.startDate} onChange={(e) => setT('startDate', e.target.value)} />
        </L>
        <L label="준공일">
          <input type="date" className={field} value={t.endDate} onChange={(e) => setT('endDate', e.target.value)} />
        </L>
        <L label="대금 지급 조건 (한 줄에 한 항목)" wide>
          <textarea className={area} rows={3} value={t.payment} onChange={(e) => setT('payment', e.target.value)} placeholder={'예) 계약금 30%: 계약 시\n잔금 70%: 준공 검사 후 7일 이내'} />
        </L>
        <L label="하자담보책임기간 (비우면 '별도 협의')">
          <input className={field} value={t.warranty} onChange={(e) => setT('warranty', e.target.value)} placeholder="예) 준공일로부터 1년" />
        </L>
        <L label="지체상금률 (비우면 '별도 협의')">
          <input className={field} value={t.delayRate} onChange={(e) => setT('delayRate', e.target.value)} placeholder="예) 1일 계약금액의 0.1%" />
        </L>
        <L label="특약사항 (한 줄에 한 항목, 선택)" wide>
          <textarea className={area} rows={3} value={t.special} onChange={(e) => setT('special', e.target.value)} />
        </L>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="rounded-none" onClick={onSave} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null} 저장
        </Button>
        <Button size="sm" variant="ghost" className="rounded-none" onClick={onCancel} disabled={pending}>
          닫기
        </Button>
      </div>
    </div>
  )
}
