'use client'

import { useEffect, useRef, useState } from 'react'
import { IdCard, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PoParty } from '@/lib/orders/doc'
import type { PartyCard } from '@/lib/orders/party-cards'

/** 긴 변 1600px JPEG 로 줄임(서버 한도 4MB, 휴대폰 사진 대비) */
async function shrink(file: File): Promise<Blob> {
  try {
    const img = await createImageBitmap(file)
    const k = Math.min(1, 1600 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k)
    c.height = Math.round(img.height * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise((ok) => c.toBlob((b) => ok(b ?? file), 'image/jpeg', 0.88))
  } catch {
    return file
  }
}

/**
 * 발주 업체 명함. 사진을 올리면 이름·직함·전화번호를 읽어 담당자·담당 연락처에 바로 저장함.
 * 올리기 전에 ensureId 로 지금 고치던 업체 정보를 먼저 저장함(새 업체면 여기서 만들어짐).
 */
export function OrderPartyCards({ id, ensureId, onParty }: { id: number | null; ensureId: () => Promise<number | null>; onParty: (p: PoParty) => void }) {
  const [cards, setCards] = useState<PartyCard[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/orders/parties/${id}/cards`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { cards: [] }))
      .then((d) => setCards(d.cards ?? []))
      .catch(() => null)
  }, [id])

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setMsg('')
    try {
      // 고치던 업체 정보부터 저장(새 업체면 여기서 만들어짐)
      const pid = await ensureId()
      if (!pid) throw new Error('상호를 먼저 넣어 주세요.')
      for (const f of Array.from(files)) {
        setMsg(`명함 읽는 중… (${f.name})`)
        const body = new FormData()
        body.append('card', await shrink(f), 'card.jpg')
        const r = await fetch(`/api/admin/orders/parties/${pid}/cards`, { method: 'POST', body })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || `명함 읽기 실패 (${r.status})`)
        setCards(d.cards ?? [])
        if (d.party) onParty(d.party)
        const c = d.contact
        setMsg(`저장함: ${[c?.name, c?.title].filter(Boolean).join(' ')} ${c?.mobile || c?.phone || ''}`.trim())
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '명함을 읽지 못했음.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const del = async (cid: number) => {
    if (!id || !confirm('이 명함 사진을 지웁니다. 업체 정보(담당자 칸)는 그대로 둡니다.')) return
    const r = await fetch(`/api/admin/orders/parties/${id}/cards/${cid}`, { method: 'DELETE' })
    if (r.ok) setCards((await r.json()).cards ?? [])
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">명함</span>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        <Button size="xs" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <IdCard />} 명함 사진 올리기
        </Button>
        <span className="text-xs text-muted-foreground">이름·직함·전화번호를 읽어 담당자 칸에 바로 저장함</span>
      </div>
      {msg && <p className="mt-1 text-xs text-muted-foreground">{msg}</p>}
      {cards.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {cards.map((c) => (
            <div key={c.id} className="flex w-64 items-start gap-2 border p-2 text-xs">
              {c.hasImage && id ? (
                <a href={`/api/admin/orders/parties/${id}/cards/${c.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/admin/orders/parties/${id}/cards/${c.id}`} alt="명함" className="h-14 w-24 border object-cover" />
                </a>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{[c.contact?.name, c.contact?.title].filter(Boolean).join(' ') || '(이름 없음)'}</div>
                {c.contact?.department && <div className="text-muted-foreground">{c.contact.department}</div>}
                {(c.contact?.mobile || c.contact?.phone) && <div>{[c.contact?.mobile, c.contact?.phone].filter(Boolean).join(' · ')}</div>}
                {c.contact?.email && <div className="truncate text-muted-foreground">{c.contact.email}</div>}
              </div>
              <button type="button" className="p-0.5 text-muted-foreground hover:text-destructive" onClick={() => del(c.id)} aria-label="명함 삭제">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
