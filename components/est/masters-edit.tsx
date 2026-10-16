'use client'

import { useState } from 'react'
import { addActualCost, addItemPrice, addLaborRate, deleteActualCost, saveItem, saveRateSet, saveRule, setUserEstRole, type ItemInput } from '@/app/actions/est-admin'
import { Btn, ErrorLine, FieldRow, inputCls, selectCls, textareaCls } from './ui'
import { useAct } from './use-act'

const KINDS = ['자재', '용역', '장비', '노무', '경비']
const QTY = { fixed: '고정 {qty}', area_factor: '면적×계수 {question,factor,round}', people_days: '인원×일수 {people_q|people, days_q|days}', rule: '규칙 {rule_code}', answer: '답 그대로 {question}', answer_mul: '답×계수 {question,factor}', visits: '담당자 방문 수' }
const LABOR: Record<string, string> = { our_staff: '우리 직원', daily: '일용', partner: '협력사' }

export type ItemEditRow = Omit<ItemInput, 'price'> & { price: number }

/** 품목 고치기·추가(대표) */
export function ItemForm({ item, onDone }: { item?: ItemEditRow; onDone?: () => void }) {
  const { pending, error, run } = useAct()
  const isNew = !item
  const [v, setV] = useState<Omit<ItemInput, 'price'> & { price: string }>({
    code: item?.code ?? '',
    kind: item?.kind ?? '자재',
    name: item?.name ?? '',
    spec: item?.spec ?? '',
    unit: item?.unit ?? '식',
    qtyRuleType: item?.qtyRuleType ?? 'fixed',
    qtyRule: item?.qtyRule ?? '{"qty":1}',
    basisText: item?.basisText ?? '',
    internalMemo: item?.internalMemo ?? '',
    laborClass: item?.laborClass ?? '',
    isActive: item?.isActive ?? true,
    price: item ? String(item.price) : '',
  })
  const priceChanged = isNew || Number(v.price) !== item?.price
  return (
    <div className="grid gap-2 bg-secondary/60 p-3 sm:grid-cols-6">
      <FieldRow label="코드">
        <input className={inputCls} value={v.code} disabled={!isNew} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} />
      </FieldRow>
      <FieldRow label="비목">
        <select className={selectCls} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
          {KINDS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label="품명" className="sm:col-span-2">
        <input className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </FieldRow>
      <FieldRow label="규격">
        <input className={inputCls} value={v.spec} onChange={(e) => setV({ ...v, spec: e.target.value })} />
      </FieldRow>
      <FieldRow label="단위">
        <input className={inputCls} value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} />
      </FieldRow>
      <FieldRow label="수량 산식" className="sm:col-span-2">
        <select className={selectCls} value={v.qtyRuleType} onChange={(e) => setV({ ...v, qtyRuleType: e.target.value })}>
          {Object.entries(QTY).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label="산식 값(JSON)" className="sm:col-span-2">
        <input className={inputCls + ' font-mono text-xs'} value={v.qtyRule} onChange={(e) => setV({ ...v, qtyRule: e.target.value })} />
      </FieldRow>
      <FieldRow label="노무 구분">
        <select className={selectCls} value={v.laborClass} onChange={(e) => setV({ ...v, laborClass: e.target.value })}>
          <option value="">-</option>
          {Object.entries(LABOR).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label={isNew ? '견적단가(원)' : '견적단가(바꾸면 오늘부터 새 줄)'}>
        <input className={inputCls + ' font-mono'} inputMode="numeric" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value.replace(/\D/g, '') })} />
      </FieldRow>
      <FieldRow label="근거문구(고객 산출근거, ~함)" className="sm:col-span-3">
        <textarea className={textareaCls} rows={2} value={v.basisText} onChange={(e) => setV({ ...v, basisText: e.target.value })} />
      </FieldRow>
      <FieldRow label="내부 메모" className="sm:col-span-3">
        <textarea className={textareaCls} rows={2} value={v.internalMemo} onChange={(e) => setV({ ...v, internalMemo: e.target.value })} />
      </FieldRow>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} />
        사용
      </label>
      <div className="flex items-center gap-2 sm:col-span-5 sm:justify-end">
        <ErrorLine error={error} />
        {onDone && (
          <Btn size="sm" variant="ghost" onClick={onDone}>
            닫기
          </Btn>
        )}
        <Btn size="sm" variant="primary" disabled={pending} onClick={() => run(() => saveItem({ ...v, price: priceChanged && v.price !== '' ? Number(v.price) : null }, isNew), () => onDone?.())}>
          {isNew ? '품목 추가' : '저장'}
        </Btn>
      </div>
    </div>
  )
}

export function ItemRowEdit({ item }: { item: ItemEditRow }) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <Btn size="sm" variant="ghost" onClick={() => setOpen(true)}>
        고치기
      </Btn>
    )
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="품목 고치기">
      <div className="w-full max-w-4xl bg-background p-4 ring-1 ring-border">
        <ItemForm item={item} onDone={() => setOpen(false)} />
      </div>
    </div>
  )
}

export function PriceForm({ itemCode, today }: { itemCode: string; today: string }) {
  const { pending, error, run } = useAct()
  const [v, setV] = useState({ price: '', effectiveFrom: today, note: '' })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className={inputCls + ' w-32 font-mono'} placeholder="단가" inputMode="numeric" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value.replace(/\D/g, '') })} />
      <input type="date" className={inputCls + ' w-40'} value={v.effectiveFrom} onChange={(e) => setV({ ...v, effectiveFrom: e.target.value })} aria-label="적용일" />
      <input className={inputCls + ' w-48'} placeholder="메모" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
      <Btn size="sm" disabled={pending} onClick={() => run(() => addItemPrice(itemCode, Number(v.price) || 0, v.effectiveFrom, v.note), () => setV({ ...v, price: '', note: '' }))}>
        단가 이력 추가
      </Btn>
      <ErrorLine error={error} />
    </div>
  )
}

export function RateSetForm({ rs }: { rs?: { id: number; code: string; name: string; mode: string; rates: Record<string, number>; truncateUnit: number; expensePerCrewDay: number; isActive: boolean } }) {
  const { pending, error, run } = useAct()
  const [v, setV] = useState({
    code: rs?.code ?? '',
    name: rs?.name ?? '',
    mode: rs?.mode ?? 'full',
    rates: Object.fromEntries(Object.entries(rs?.rates ?? {}).map(([k, x]) => [k, String(x)])) as Record<string, string>,
    truncateUnit: String(rs?.truncateUnit ?? 1000),
    expensePerCrewDay: String(rs?.expensePerCrewDay ?? 50000),
    isActive: rs?.isActive ?? true,
  })
  const keys = v.mode === 'full' ? { injury: '산재보험(노무비 %)', employment: '고용보험(노무비 %)', safety: '산안비((재+노) %)', overhead: '일반관리비 %', profit: '이윤 %' } : { misc: '공과잡비 %', profit: '이윤 %' }
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <FieldRow label="코드">
        <input className={inputCls} value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} />
      </FieldRow>
      <FieldRow label="이름">
        <input className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </FieldRow>
      <FieldRow label="방식">
        <select className={selectCls} value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })}>
          <option value="full">원가계산(건설)</option>
          <option value="simple">간이(공과잡비+이윤)</option>
        </select>
      </FieldRow>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} />
        사용
      </label>
      {Object.entries(keys).map(([k, l]) => (
        <FieldRow key={k} label={l}>
          <input className={inputCls + ' font-mono'} inputMode="decimal" value={v.rates[k] ?? ''} onChange={(e) => setV({ ...v, rates: { ...v.rates, [k]: e.target.value.replace(/[^\d.]/g, '') } })} />
        </FieldRow>
      ))}
      <FieldRow label="절사 단위(원)">
        <input className={inputCls + ' font-mono'} inputMode="numeric" value={v.truncateUnit} onChange={(e) => setV({ ...v, truncateUnit: e.target.value.replace(/\D/g, '') })} />
      </FieldRow>
      <FieldRow label="경비 자동(인·일당 원)">
        <input className={inputCls + ' font-mono'} inputMode="numeric" value={v.expensePerCrewDay} onChange={(e) => setV({ ...v, expensePerCrewDay: e.target.value.replace(/\D/g, '') })} />
      </FieldRow>
      <div className="flex items-end gap-2 sm:col-span-4">
        <Btn
          size="sm"
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(() =>
              saveRateSet({
                id: rs?.id ?? null,
                code: v.code,
                name: v.name,
                mode: v.mode,
                rates: Object.fromEntries(Object.entries(v.rates).map(([k, x]) => [k, Number(x) || 0])),
                truncateUnit: Number(v.truncateUnit) || 0,
                expensePerCrewDay: Number(v.expensePerCrewDay) || 0,
                isActive: v.isActive,
              }),
            )
          }
        >
          {rs ? '요율 저장' : '요율 세트 추가'}
        </Btn>
        <span className="text-xs text-muted-foreground">이미 만든 판은 만들 때 복사한 요율로 계산되어 바뀌지 않음</span>
        <ErrorLine error={error} />
      </div>
    </div>
  )
}

export function RuleForm({ rule, class1 }: { rule?: { id: number; code: string; class1Id: number | null; name: string; condition: unknown; action: unknown; message: string | null; severity: string; isActive: boolean; sortOrder: number }; class1: { id: number; name: string }[] }) {
  const { pending, error, run } = useAct()
  const [v, setV] = useState({
    code: rule?.code ?? '',
    class1Id: rule?.class1Id ? String(rule.class1Id) : '',
    name: rule?.name ?? '',
    condition: rule ? JSON.stringify(rule.condition) : '{"question":"","op":"truthy"}',
    action: rule ? JSON.stringify(rule.action) : '{"add_item":"","qty":{"type":"answer","question":""}}',
    message: rule?.message ?? '',
    severity: rule?.severity ?? 'error',
    isActive: rule?.isActive ?? true,
    sortOrder: String(rule?.sortOrder ?? 0),
  })
  return (
    <div className="grid gap-2 sm:grid-cols-6">
      <FieldRow label="코드">
        <input className={inputCls} value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} />
      </FieldRow>
      <FieldRow label="대분류">
        <select className={selectCls} value={v.class1Id} onChange={(e) => setV({ ...v, class1Id: e.target.value })}>
          <option value="">전 사업 공통</option>
          {class1.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label="이름" className="sm:col-span-2">
        <input className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </FieldRow>
      <FieldRow label="심각도">
        <select className={selectCls} value={v.severity} onChange={(e) => setV({ ...v, severity: e.target.value })}>
          <option value="error">오류(결재 막음)</option>
          <option value="warn">경고</option>
        </select>
      </FieldRow>
      <FieldRow label="순서">
        <input className={inputCls} inputMode="numeric" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: e.target.value.replace(/\D/g, '') })} />
      </FieldRow>
      <FieldRow label="조건(JSON)" className="sm:col-span-3" hint='예: {"question":"hot_work","op":"truthy"} · 묶음 {"all":[…]}'>
        <textarea className={textareaCls + ' font-mono text-xs'} rows={2} value={v.condition} onChange={(e) => setV({ ...v, condition: e.target.value })} />
      </FieldRow>
      <FieldRow label="동작(JSON)" className="sm:col-span-3" hint='예: {"add_item":"LAB-FIREWATCH","qty":{"type":"answer","question":"hot_work_days"}}'>
        <textarea className={textareaCls + ' font-mono text-xs'} rows={2} value={v.action} onChange={(e) => setV({ ...v, action: e.target.value })} />
      </FieldRow>
      <FieldRow label="검사 문구" className="sm:col-span-5">
        <input className={inputCls} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
      </FieldRow>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} />
        사용
      </label>
      <div className="flex items-center gap-2 sm:col-span-6">
        <Btn
          size="sm"
          variant="primary"
          disabled={pending}
          onClick={() => run(() => saveRule({ id: rule?.id ?? null, code: v.code, class1Id: v.class1Id ? Number(v.class1Id) : null, name: v.name, condition: v.condition, action: v.action, message: v.message, severity: v.severity, isActive: v.isActive, sortOrder: Number(v.sortOrder) || 0 }))}
        >
          {rule ? '규칙 저장' : '규칙 추가'}
        </Btn>
        <ErrorLine error={error} />
      </div>
    </div>
  )
}

export function ActualForm({ items, today }: { items: { code: string; name: string }[]; today: string }) {
  const { pending, error, run } = useAct()
  const [v, setV] = useState({ itemCode: items[0]?.code ?? '', source: 'manual', unitPrice: '', vendor: '', observedOn: today, note: '' })
  return (
    <div className="grid gap-2 sm:grid-cols-6">
      <select className={selectCls + ' sm:col-span-2'} value={v.itemCode} onChange={(e) => setV({ ...v, itemCode: e.target.value })} aria-label="품목">
        {items.map((i) => (
          <option key={i.code} value={i.code}>
            {i.code} · {i.name}
          </option>
        ))}
      </select>
      <select className={selectCls} value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })} aria-label="출처">
        {Object.entries({ purchase: '구매', rental: '임차', subcontract_quote: '외주 견적', subcontract_contract: '외주 계약', labor: '노무', expense: '경비', manual: '직접 입력' }).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <input className={inputCls + ' font-mono'} placeholder="실단가" inputMode="numeric" value={v.unitPrice} onChange={(e) => setV({ ...v, unitPrice: e.target.value.replace(/\D/g, '') })} />
      <input className={inputCls} placeholder="업체" value={v.vendor} onChange={(e) => setV({ ...v, vendor: e.target.value })} />
      <input type="date" className={inputCls} value={v.observedOn} onChange={(e) => setV({ ...v, observedOn: e.target.value })} aria-label="관측일" />
      <input className={inputCls + ' sm:col-span-5'} placeholder="메모" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
      <Btn disabled={pending} onClick={() => run(() => addActualCost({ ...v, unitPrice: Number(v.unitPrice) || 0 }), () => setV({ ...v, unitPrice: '', vendor: '', note: '' }))}>
        관측 추가
      </Btn>
      <div className="sm:col-span-6">
        <ErrorLine error={error} />
      </div>
    </div>
  )
}

export function DeleteActual({ id }: { id: number }) {
  const { pending, run } = useAct()
  return (
    <button type="button" disabled={pending} className="text-xs text-muted-foreground hover:text-destructive" onClick={() => confirm('이 관측을 지울까요?') && run(() => deleteActualCost(id))}>
      지우기
    </button>
  )
}

export function LaborForm({ items, today }: { items: { code: string; name: string }[]; today: string }) {
  const { pending, error, run } = useAct()
  const [v, setV] = useState({ laborClass: 'daily', itemCode: '', dayRate: '', overtimeFactor: '1.5', nightFactor: '1.5', effectiveFrom: today, note: '' })
  return (
    <div className="grid gap-2 sm:grid-cols-7">
      <select className={selectCls} value={v.laborClass} onChange={(e) => setV({ ...v, laborClass: e.target.value })} aria-label="구분">
        {Object.entries(LABOR).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <select className={selectCls + ' sm:col-span-2'} value={v.itemCode} onChange={(e) => setV({ ...v, itemCode: e.target.value })} aria-label="품목">
        <option value="">(구분 기본값)</option>
        {items.map((i) => (
          <option key={i.code} value={i.code}>
            {i.name}
          </option>
        ))}
      </select>
      <input className={inputCls + ' font-mono'} placeholder="1일 단가" inputMode="numeric" value={v.dayRate} onChange={(e) => setV({ ...v, dayRate: e.target.value.replace(/\D/g, '') })} />
      <input className={inputCls + ' font-mono'} placeholder="연장 배수" inputMode="decimal" value={v.overtimeFactor} onChange={(e) => setV({ ...v, overtimeFactor: e.target.value.replace(/[^\d.]/g, '') })} />
      <input type="date" className={inputCls} value={v.effectiveFrom} onChange={(e) => setV({ ...v, effectiveFrom: e.target.value })} aria-label="적용일" />
      <Btn disabled={pending} onClick={() => run(() => addLaborRate({ ...v, dayRate: Number(v.dayRate) || 0, overtimeFactor: Number(v.overtimeFactor) || 1.5, nightFactor: Number(v.nightFactor) || 1.5 }), () => setV({ ...v, dayRate: '' }))}>
        노무 실단가 추가
      </Btn>
      <div className="sm:col-span-7">
        <ErrorLine error={error} />
      </div>
    </div>
  )
}

export function RoleSelect({ userId, role, sso }: { userId: string; role: string | null; sso: boolean }) {
  const { pending, error, run } = useAct()
  return (
    <span className="flex flex-col gap-1">
      <select className={selectCls + ' h-8 w-32'} value={role ?? ''} disabled={pending} onChange={(e) => run(() => setUserEstRole(userId, e.target.value || null))} aria-label="견적 역할">
        <option value="">없음</option>
        <option value="writer">작성자</option>
        <option value="reviewer">검토자</option>
        <option value="ceo">대표</option>
      </select>
      {sso && <span className="text-[11px] text-muted-foreground">SBworks 로그인 사용자는 다음 로그인 때 SBworks 역할로 다시 맞춰짐. SBworks 에서 역할을 바꿔야 함</span>}
      <ErrorLine error={error} />
    </span>
  )
}
