'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Calculator, Plus, Loader2, ImagePlus, X } from 'lucide-react'
import { uploadCards } from '@/components/admin/client-intel'
import { Section, Field } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { createClient } from '@/app/actions/clients'
import { won } from '@/lib/clients/quote'

type Item = {
  id: number
  name: string
  contactPerson: string
  phone: string
  supply: number
  quoteNumber: string
  updatedAt: string
  /** 최종본으로 확정한 버전 */
  finalizedVersion: number | null
  /** 협력업체 포털 가입 승인 대기 인원 */
  waiting: number
}

const EMPTY = { name: '', bizNumber: '', portalSlug: '', portalLogin: '', contactPerson: '', phone: '', email: '', siteAddress: '', memo: '' }

export function ClientsList({ clients }: { clients: Item[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(clients.length === 0)
  const [form, setForm] = useState(EMPTY)
  const [copyFrom, setCopyFrom] = useState<string>('')
  const [cardFiles, setCardFiles] = useState<File[]>([])
  const [cardText, setCardText] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    setError('')
    startTransition(async () => {
      try {
        const res = await createClient(form, copyFrom ? Number(copyFrom) : null)
        // 업체를 만들면 명함을 읽고 업체 조사(내부자료)를 바로 시작한다. 실패해도 업체 화면에서 다시 할 수 있다
        await uploadCards(res.id, cardFiles, { cardText, research: true }).catch((e) => console.error('[clients] 명함·조사 시작 실패', e))
        router.push(`/admin/clients/${res.id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : '저장하지 못했습니다.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {adding ? (
        <Section
          title="업체 추가"
          description="업체명과 명함을 넣고 만들면 명함을 읽어 담당자·직함을 저장하고, 웹에서 업체를 조사해 내부용 업체 프로필(주업종·주 고객사·재무상태 등)을 만듭니다. 제안서는 홈페이지 내용으로 기본본이 만들어집니다."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="업체명 *" value={form.name} onChange={set('name')} placeholder="주식회사 ○○○" />
            <Field label="사업자등록번호" value={form.bizNumber} onChange={set('bizNumber')} placeholder="000-00-00000" />
            <Field label="담당자" value={form.contactPerson} onChange={set('contactPerson')} />
            <Field label="연락처" value={form.phone} onChange={set('phone')} />
            <Field label="현장 주소" value={form.siteAddress} onChange={set('siteAddress')} />
          </div>
          <div className="flex flex-col gap-3 bg-secondary/40 p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <ImagePlus className="size-4" />
              <span className="font-medium">명함 사진 (여러 장 가능)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setCardFiles((f) => [...f, ...Array.from(e.target.files ?? [])].slice(0, 10))}
              />
              {cardFiles.length > 0 && <span className="text-muted-foreground">{cardFiles.length}장 고름</span>}
              {cardFiles.length > 0 && (
                <button type="button" onClick={() => setCardFiles([])} className="text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </label>
            <Field label="명함 글 (사진 대신 붙여 넣어도 됨)" value={cardText} onChange={setCardText} multiline rows={3} />
            <p className="text-xs text-muted-foreground">조사 내용과 명함은 내부자료로만 저장되고 업체 링크·견적서에는 나오지 않습니다.</p>
          </div>
          {clients.length > 0 && (
            <label className="flex flex-col gap-2 text-sm font-medium">
              제안서·견적서 시작
              <select
                value={copyFrom}
                onChange={(e) => setCopyFrom(e.target.value)}
                className="h-9 border border-input bg-background px-2 text-sm"
              >
                <option value="">홈페이지 내용으로 새로 만들기</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} 것 복사
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={pending || !form.name.trim()} className="rounded-none">
              {pending && <Loader2 className="animate-spin" />}
              업체 만들기
            </Button>
            {clients.length > 0 && (
              <Button variant="outline" className="rounded-none" onClick={() => setAdding(false)}>
                취소
              </Button>
            )}
          </div>
        </Section>
      ) : (
        <div>
          <Button className="rounded-none" onClick={() => setAdding(true)}>
            <Plus /> 업체 추가
          </Button>
        </div>
      )}

      {clients.length > 0 && (
        <ul className="divide-y divide-border bg-background ring-1 ring-border">
          {clients.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <Link href={`/admin/clients/${c.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-base font-bold hover:text-electric">{c.name}</span>
                  {c.finalizedVersion && (
                    <span className="shrink-0 bg-navy px-1.5 py-0.5 text-[10px] font-semibold text-white">최종본 v{c.finalizedVersion}</span>
                  )}
                  {c.waiting > 0 && (
                    <span className="shrink-0 bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">관계자 승인 대기 {c.waiting}</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {[c.contactPerson, c.phone, `견적 ${c.quoteNumber}`, `수정 ${c.updatedAt.slice(0, 10)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </Link>
              <div className="font-mono text-sm tabular-nums sm:w-36 sm:text-right">
                {c.supply ? `${won(c.supply)}원` : <span className="text-muted-foreground">견적 없음</span>}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/clients/${c.id}?tab=proposal`}
                  className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-sm hover:bg-secondary"
                >
                  <FileText className="size-4" strokeWidth={1.75} /> 제안서
                </Link>
                <Link
                  href={`/admin/clients/${c.id}?tab=quote`}
                  className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-sm hover:bg-secondary"
                >
                  <Calculator className="size-4" strokeWidth={1.75} /> 견적서
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
