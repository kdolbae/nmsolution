'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, updateProject, type ProjectInput } from '@/app/actions/est'
import { Btn, ErrorLine, FieldRow, inputCls, selectCls, textareaCls } from './ui'
import { useAct } from './use-act'
import { cn } from '@/lib/utils'

type Opt = { id: number; name: string }
type ClassOpt = { id: number; level: number; parentId: number | null; name: string }
type User = { id: string; name: string; email: string }
type QuoteReq = { id: number; name: string; company: string; location: string; message: string; createdAt: string }

const CLIENT_TYPES: Record<string, string> = { company: '기업', public: '공공', insurer: '보험사', individual: '개인', gc: '원청(종합건설)', other: '기타' }

export type ProjectFormValue = ProjectInput & { siteSummary?: string; managerVisitsPlanned?: number }

/** S2 접수 / 개요 고치기 공용 폼 */
export function ProjectForm({
  mode,
  projectId,
  initial,
  users,
  classes,
  clients,
  quoteRequests = [],
  me,
}: {
  mode: 'create' | 'edit'
  projectId?: number
  initial?: Partial<ProjectFormValue>
  users: User[]
  classes: ClassOpt[]
  clients: Opt[]
  quoteRequests?: QuoteReq[]
  me: string
}) {
  const router = useRouter()
  const { pending, error, run } = useAct()
  const [v, setV] = useState<ProjectFormValue>({
    title: '',
    clientId: null,
    newClientName: '',
    clientType: 'company',
    siteAddress: '',
    inquiryText: '',
    quoteRequestId: null,
    class1Id: null,
    class2Id: null,
    managerIds: [me],
    writerId: me,
    siteSummary: '',
    managerVisitsPlanned: 1,
    ...initial,
  })
  const [clientMode, setClientMode] = useState<'pick' | 'new'>(initial?.clientId || mode === 'edit' ? 'pick' : 'pick')
  const [q, setQ] = useState('')
  const set = <K extends keyof ProjectFormValue>(k: K, val: ProjectFormValue[K]) => setV((x) => ({ ...x, [k]: val }))
  const class1 = classes.filter((c) => c.level === 1)
  const class2 = classes.filter((c) => c.level === 2 && c.parentId === v.class1Id)
  const reqs = useMemo(() => {
    const t = q.trim()
    return t ? quoteRequests.filter((r) => [r.name, r.company, r.location, r.message].some((x) => x?.includes(t))) : quoteRequests
  }, [q, quoteRequests])

  const pickRequest = (r: QuoteReq) => {
    const c = clients.find((x) => x.name === r.company)
    setV((x) => ({
      ...x,
      quoteRequestId: r.id,
      title: x.title || `${r.company || r.name} ${r.location}`.trim(),
      siteAddress: x.siteAddress || r.location,
      inquiryText: r.message,
      clientId: c?.id ?? null,
      newClientName: c ? '' : r.company || r.name,
    }))
    setClientMode(c ? 'pick' : 'new')
  }

  const submit = () => {
    const input: ProjectFormValue = { ...v, clientId: clientMode === 'pick' ? v.clientId : null, newClientName: clientMode === 'new' ? v.newClientName : '' }
    if (mode === 'create') run(() => createProject(input), (r) => router.push(`/admin/est/${(r as { id: number }).id}`))
    else run(() => updateProject(projectId!, input))
  }

  const toggleManager = (id: string) => set('managerIds', v.managerIds.includes(id) ? v.managerIds.filter((x) => x !== id) : [...v.managerIds, id])

  return (
    <div className="flex flex-col gap-5">
      {mode === 'create' && quoteRequests.length > 0 && (
        <div className="flex flex-col gap-2 bg-background p-4 ring-1 ring-border">
          <span className="text-sm font-semibold">홈페이지 문의에서 가져오기(선택)</span>
          <input className={inputCls} placeholder="이름·회사·지역·내용으로 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="flex max-h-56 flex-col overflow-y-auto">
            {reqs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => pickRequest(r)}
                  className={cn('flex w-full flex-col items-start gap-0.5 border-b border-border px-2 py-2 text-left text-sm hover:bg-secondary', v.quoteRequestId === r.id && 'bg-electric/10')}
                >
                  <span className="font-medium">
                    {r.company || r.name} · {r.location}
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{r.message}</span>
                </button>
              </li>
            ))}
            {!reqs.length && <li className="px-2 py-3 text-xs text-muted-foreground">맞는 문의 없음</li>}
          </ul>
        </div>
      )}

      <div className="grid gap-4 bg-background p-4 ring-1 ring-border lg:grid-cols-2 lg:p-6">
        <FieldRow label="제목" className="lg:col-span-2">
          <input className={inputCls} value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="예: 변압기 이동·안착" />
        </FieldRow>
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">발주처</span>
          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input type="radio" checked={clientMode === 'pick'} onChange={() => setClientMode('pick')} /> 등록된 업체
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={clientMode === 'new'} onChange={() => setClientMode('new')} /> 새 업체
            </label>
          </div>
          {clientMode === 'pick' ? (
            <select className={selectCls} value={v.clientId ?? ''} onChange={(e) => set('clientId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">(고르지 않음)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input className={inputCls} value={v.newClientName ?? ''} onChange={(e) => set('newClientName', e.target.value)} placeholder="업체명(업체 관리에 새로 등록됨)" />
          )}
        </div>
        <FieldRow label="발주처 유형">
          <select className={selectCls} value={v.clientType} onChange={(e) => set('clientType', e.target.value)}>
            {Object.entries(CLIENT_TYPES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="현장 주소" className="lg:col-span-2">
          <input className={inputCls} value={v.siteAddress} onChange={(e) => set('siteAddress', e.target.value)} />
        </FieldRow>
        <FieldRow label="대분류(사업)">
          <select className={selectCls} value={v.class1Id ?? ''} onChange={(e) => setV((x) => ({ ...x, class1Id: e.target.value ? Number(e.target.value) : null, class2Id: null }))}>
            <option value="">(고르지 않음)</option>
            {class1.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="소분류(작업 유형)" hint="자동 초안 템플릿·체크리스트 질문이 이걸로 정해짐">
          <select className={selectCls} value={v.class2Id ?? ''} onChange={(e) => set('class2Id', e.target.value ? Number(e.target.value) : null)} disabled={!v.class1Id}>
            <option value="">(고르지 않음)</option>
            {class2.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="문의 내용" className="lg:col-span-2">
          <textarea className={textareaCls} rows={4} value={v.inquiryText} onChange={(e) => set('inquiryText', e.target.value)} />
        </FieldRow>
        {mode === 'edit' && (
          <>
            <FieldRow label="현장 요약(내부)" className="lg:col-span-2">
              <textarea className={textareaCls} rows={3} value={v.siteSummary ?? ''} onChange={(e) => set('siteSummary', e.target.value)} />
            </FieldRow>
            <FieldRow label="담당자 방문 예정 수" hint="새 판 자동 초안의 기본 방문 수">
              <input className={inputCls} inputMode="numeric" value={v.managerVisitsPlanned ?? 0} onChange={(e) => set('managerVisitsPlanned', Number(e.target.value.replace(/\D/g, '')) || 0)} />
            </FieldRow>
          </>
        )}
        <div className="flex flex-col gap-1.5 text-sm lg:col-span-2">
          <span className="font-medium">담당자(필수, 여러 명)</span>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => (
              <label key={u.id} className={cn('flex cursor-pointer items-center gap-1.5 border px-2.5 py-1.5 text-sm', v.managerIds.includes(u.id) ? 'border-electric bg-electric/10' : 'border-border')}>
                <input type="checkbox" checked={v.managerIds.includes(u.id)} onChange={() => toggleManager(u.id)} />
                {u.name || u.email}
              </label>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">첫 번째로 고른 사람이 주 담당자. 담당자가 없으면 결재를 올릴 수 없음</span>
        </div>
        <FieldRow label="작성자">
          <select className={selectCls} value={v.writerId ?? ''} onChange={(e) => set('writerId', e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </select>
        </FieldRow>
      </div>

      <ErrorLine error={error} />
      <div className="flex justify-end">
        <Btn variant="accent" size="lg" onClick={submit} disabled={pending}>
          {mode === 'create' ? '저장하고 번호 받기' : '개요 저장'}
        </Btn>
      </div>
    </div>
  )
}
