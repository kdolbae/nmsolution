'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, FileInput, Loader2, Package, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { importMaterialsFromQuote, saveClientMaterials } from '@/app/actions/materials'
import { MATERIAL_GROUPS, fmtQty, materialsText, newMaterialId, type MaterialGroup, type MaterialItem, type MaterialList } from '@/lib/materials/shared'
import { fmtAt } from '@/components/admin/client-versions'
import { cn } from '@/lib/utils'

/**
 * 자재 리스트 (전 업체 공통, 프로젝트 단계 '적산·자재' 칸).
 * 견적 재료비 줄 가져오기 → Claude 로 부자재 보강 → 손으로 고침 → 구매처별로 묶어 복사(문자·메모) → 구매 체크.
 */
export function ClientMaterials({ clientId, clientName, initial }: { clientId: number; clientName: string; initial: MaterialList }) {
  const router = useRouter()
  const [items, setItems] = useState<MaterialItem[]>(initial.items)
  const [dirty, setDirty] = useState(false)
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [hint, setHint] = useState('')
  const [hideBought, setHideBought] = useState(false)

  const change = (next: MaterialItem[]) => {
    setItems(next)
    setDirty(true)
  }
  const update = (id: string, patch: Partial<MaterialItem>) => change(items.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const add = (group: MaterialGroup) =>
    change([...items, { id: newMaterialId(), group, name: '', spec: '', qty: 1, unit: '개', supplier: '', note: '', source: 'manual', bought: false }])
  const remove = (id: string) => change(items.filter((x) => x.id !== id))

  const save = () =>
    startTransition(async () => {
      const r = await saveClientMaterials(clientId, items)
      setMessage(r.ok ? '자재 리스트를 저장했습니다.' : r.error)
      if (r.ok) setDirty(false)
      router.refresh()
    })
  const importQuote = () => {
    if (dirty && !confirm('저장하지 않은 수정이 있습니다. 먼저 저장할까요? (취소하면 가져오기를 멈춤)')) return
    startTransition(async () => {
      if (dirty) await saveClientMaterials(clientId, items)
      const r = await importMaterialsFromQuote(clientId)
      setMessage(r.ok ? `견적서에서 ${r.added}줄 가져왔습니다.` : r.error)
      router.refresh()
      if (r.ok) window.location.reload()
    })
  }
  const suggest = async () => {
    if (busy) return
    if (dirty) {
      const r = await saveClientMaterials(clientId, items)
      if (!r.ok) return setMessage(r.error)
      setDirty(false)
    }
    setBusy(true)
    setMessage('Claude 가 견적·제안서를 보고 빠진 부자재를 찾는 중… (1~2분)')
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hint }) })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; added?: number; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || '찾지 못했습니다.')
      setMessage(`부자재 ${data.added}줄을 더했습니다. 수량·구매처를 확인하세요.`)
      window.location.reload()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '찾지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    const text = materialsText(items.filter((x) => !hideBought || !x.bought), clientName)
    try {
      await navigator.clipboard.writeText(text)
      setMessage('구매처별 리스트를 복사했습니다. 문자·메모에 붙여 넣으세요.')
    } catch {
      setMessage(text)
    }
  }

  const grouped = useMemo(() => {
    const m = new Map<MaterialGroup, MaterialItem[]>()
    for (const g of MATERIAL_GROUPS) m.set(g, [])
    for (const it of items) if (!hideBought || !it.bought) m.get(it.group)?.push(it)
    return [...m.entries()].filter(([, list]) => list.length)
  }, [items, hideBought])
  const boughtCount = items.filter((x) => x.bought).length

  return (
    <section id="materials" className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border lg:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Package className="size-4 text-muted-foreground" />
        <h2 className="text-lg font-bold tracking-tight">자재 리스트</h2>
        <span className="text-xs text-muted-foreground">
          {initial.updatedAt ? `${fmtAt(initial.updatedAt)} ${initial.updatedBy}` : '아직 없음'} · {items.length}줄, 구매 {boughtCount}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-none" onClick={importQuote} disabled={pending || busy}>
            <FileInput /> 견적서에서 가져오기
          </Button>
          <Button size="sm" variant="outline" className="rounded-none" onClick={copy} disabled={!items.length}>
            <Copy /> 구매처별 복사
          </Button>
          <Button size="sm" className="rounded-none" onClick={save} disabled={pending || !dirty}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />} 저장
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border border-border p-3 text-xs">
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Claude 에게 줄 메모 (예: 물받이는 절곡으로, 문은 기성 도어 2세트)"
          className="h-8 min-w-64 flex-1 border border-border bg-background px-2"
        />
        <Button size="sm" variant="outline" className="rounded-none" onClick={suggest} disabled={busy || pending}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Claude 로 부자재 채우기
        </Button>
        <label className="flex items-center gap-1 text-muted-foreground">
          <input type="checkbox" checked={hideBought} onChange={(e) => setHideBought(e.target.checked)} /> 구매한 것 숨기기
        </label>
      </div>

      {grouped.length === 0 && <p className="text-sm text-muted-foreground">견적서에서 가져오거나 Claude 로 채우면 여기 묶음별로 나옵니다.</p>}
      {grouped.map(([group, list]) => (
        <div key={group} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border text-left">
                <th className="w-8 py-1.5" />
                <th className="py-1.5 pr-2 font-semibold text-foreground">{group}</th>
                <th className="py-1.5 pr-2 font-medium">규격</th>
                <th className="w-20 py-1.5 pr-2 text-right font-medium">수량</th>
                <th className="w-14 py-1.5 pr-2 font-medium">단위</th>
                <th className="w-28 py-1.5 pr-2 font-medium">구매처</th>
                <th className="py-1.5 pr-2 font-medium">비고</th>
                <th className="w-8 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {list.map((it) => (
                <tr key={it.id} className={cn('border-b border-border', it.bought && 'text-muted-foreground line-through')}>
                  <td className="py-1 text-center">
                    <input type="checkbox" checked={it.bought} onChange={(e) => update(it.id, { bought: e.target.checked })} aria-label="구매 완료" />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} className="w-full min-w-32 border border-transparent bg-transparent px-1 hover:border-border focus:border-border" />
                    {it.source === 'ai' && <span className="ml-1 text-[10px] text-electric">AI</span>}
                    {it.source === 'quote' && <span className="ml-1 text-[10px] text-muted-foreground">견적</span>}
                  </td>
                  <td className="py-1 pr-2">
                    <input value={it.spec} onChange={(e) => update(it.id, { spec: e.target.value })} className="w-full min-w-28 border border-transparent bg-transparent px-1 hover:border-border focus:border-border" />
                  </td>
                  <td className="py-1 pr-2 text-right">
                    <input
                      type="number"
                      step="any"
                      value={it.qty}
                      onChange={(e) => update(it.id, { qty: Number(e.target.value) })}
                      className="w-20 border border-transparent bg-transparent px-1 text-right tabular-nums hover:border-border focus:border-border"
                      aria-label={`${it.name} 수량 ${fmtQty(it.qty)}`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={it.unit} onChange={(e) => update(it.id, { unit: e.target.value })} className="w-14 border border-transparent bg-transparent px-1 hover:border-border focus:border-border" />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={it.supplier} onChange={(e) => update(it.id, { supplier: e.target.value })} className="w-28 border border-transparent bg-transparent px-1 hover:border-border focus:border-border" />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={it.note} onChange={(e) => update(it.id, { note: e.target.value })} className="w-full min-w-40 border border-transparent bg-transparent px-1 text-xs hover:border-border focus:border-border" />
                  </td>
                  <td className="py-1 text-center">
                    <button type="button" onClick={() => remove(it.id)} className="text-destructive" aria-label="삭제">
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => add(group)} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
            <Plus className="size-3" /> {group} 줄 추가
          </button>
        </div>
      ))}
      {grouped.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {MATERIAL_GROUPS.filter((g) => !grouped.some(([x]) => x === g)).map((g) => (
            <button key={g} type="button" onClick={() => add(g)} className="inline-flex items-center gap-1 border border-border px-2 py-1 text-muted-foreground hover:bg-muted">
              <Plus className="size-3" /> {g}
            </button>
          ))}
        </div>
      )}
      {dirty && <p className="text-xs text-amber-700">저장하지 않은 수정이 있습니다.</p>}
      {message && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{message}</p>}
    </section>
  )
}
