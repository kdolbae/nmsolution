'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Camera, Check, ImagePlus, Loader2, Phone, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/track'

const FIELD =
  'h-12 w-full rounded-none border border-border bg-background px-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-electric focus-visible:ring-2 focus-visible:ring-electric/30'

/** lib/quote-photos.ts 의 MAX_PHOTOS 와 같게 */
const MAX_PHOTOS = 5
const LONG_EDGE = 1600
const QUALITY = 0.75

export const LEAK_SYMPTOMS = [
  '천장 얼룩 · 물 떨어짐',
  '벽 · 바닥이 젖음',
  '아랫집에서 연락 옴',
  '수도요금이 많이 나옴',
  '공장 지붕 · 판넬 누수',
  '잘 모르겠음',
] as const

type Photo = { id: string; blob: Blob; url: string }

/**
 * 휴대폰 사진(보통 3~10MB)을 긴 변 1600px JPEG 로 줄인다. 한 장 수백 KB 가 된다.
 * 브라우저가 못 여는 형식(일부 HEIC 등)이면 작은 JPG · PNG 만 그대로 보낸다.
 */
async function shrink(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const scale = Math.min(1, LONG_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (blob) return blob
    throw new Error('toBlob')
  } catch {
    if (/^image\/(jpeg|png)$/.test(file.type) && file.size <= 1_800_000) return file
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function PhotoQuoteForm({
  phoneMobile,
  from = 'leak_photo',
}: {
  phoneMobile: string
  /** 전환 집계용. 어느 페이지의 폼인지 */
  from?: string
}) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [symptom, setSymptom] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const albumRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<Photo[]>([])
  photosRef.current = photos

  // 미리보기 주소 정리
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  async function add(list: FileList | null) {
    if (!list?.length) return
    setError(null)
    setBusy(true)
    const room = MAX_PHOTOS - photos.length
    const picked = Array.from(list).slice(0, Math.max(0, room))
    const next: Photo[] = []
    let skipped = 0
    for (const f of picked) {
      const blob = await shrink(f)
      if (!blob) {
        skipped++
        continue
      }
      next.push({ id: `${Date.now()}-${Math.random()}`, blob, url: URL.createObjectURL(blob) })
    }
    setPhotos((prev) => [...prev, ...next])
    setBusy(false)
    if (list.length > room) setError(`사진은 ${MAX_PHOTOS}장까지 보낼 수 있습니다.`)
    else if (skipped) setError('열 수 없는 사진이 있어 뺐습니다. 카메라로 다시 찍거나 다른 사진을 골라 주세요.')
    if (next.length) track('photo_added', { from, count: next.length })
  }

  function remove(id: string) {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id)
      if (p) URL.revokeObjectURL(p.url)
      return prev.filter((x) => x.id !== id)
    })
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending || busy) return
    setError(null)
    const form = new FormData(e.currentTarget)
    const fd = new FormData()
    for (const k of ['name', 'phone', 'location', 'message', 'website']) fd.set(k, String(form.get(k) ?? ''))
    fd.set('symptom', symptom)
    fd.set('from', from)
    photos.forEach((p, i) => fd.append('photos', p.blob, `photo-${i + 1}.jpg`))

    setPending(true)
    try {
      const r = await fetch('/api/quote-photo', { method: 'POST', body: fd })
      const res = (await r.json().catch(() => null)) as { ok: boolean; error?: string } | null
      if (res?.ok) {
        setDone(photos.length)
        track('quote_submitted', { categories: '누수 · 피해복구', from, photos: photos.length })
      } else {
        setError(res?.error || '접수 중 문제가 발생했습니다. 전화나 카카오톡으로 사진을 보내 주세요.')
      }
    } catch {
      setError('인터넷 연결을 확인해 주세요. 계속 안 되면 전화나 카카오톡으로 사진을 보내 주세요.')
    } finally {
      setPending(false)
    }
  }

  if (done !== null) {
    return (
      <div className="flex flex-col items-start gap-4 border border-electric bg-electric/5 p-8">
        <span className="flex size-10 items-center justify-center bg-electric text-electric-foreground">
          <Check className="size-5" strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-xl font-bold tracking-tight">접수되었습니다.</p>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {done > 0 ? `사진 ${done}장을 받았습니다. ` : ''}
            사진을 보고 연락드려, 출장 전에 예상 견적부터 말씀드리겠습니다. 평일 09:00 – 18:00 접수 건은 당일
            회신드립니다.
          </p>
        </div>
        <a
          href={`sms:${phoneMobile}`}
          className="inline-flex h-12 items-center gap-3 border border-foreground/20 px-6 text-sm font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
        >
          <Phone className="size-4" strokeWidth={1.75} />
          사진 더 보내기 · {phoneMobile}
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {/* 봇 트랩 — 사람에게는 보이지 않는다 */}
      <div className="hidden" aria-hidden>
        <label htmlFor="p-website">홈페이지</label>
        <input id="p-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* 1. 사진 */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <span className="font-mono text-xs text-electric">01</span>
          증상 사진 <span className="font-normal text-muted-foreground">(최대 {MAX_PHOTOS}장)</span>
        </legend>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void add(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={albumRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void add(e.target.files)
            e.target.value = ''
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={busy || photos.length >= MAX_PHOTOS}
            className="inline-flex min-h-14 items-center justify-center gap-2 bg-navy px-4 text-sm font-semibold text-navy-foreground transition-colors hover:bg-electric disabled:opacity-50"
          >
            <Camera className="size-5" strokeWidth={1.75} />
            지금 찍기
          </button>
          <button
            type="button"
            onClick={() => albumRef.current?.click()}
            disabled={busy || photos.length >= MAX_PHOTOS}
            className="inline-flex min-h-14 items-center justify-center gap-2 border border-border px-4 text-sm font-semibold transition-colors hover:border-foreground disabled:opacity-50"
          >
            <ImagePlus className="size-5" strokeWidth={1.75} />
            앨범에서 고르기
          </button>
        </div>

        {(photos.length > 0 || busy) && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {photos.map((p, i) => (
              <li key={p.id} className="relative aspect-square overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`보낼 사진 ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={`사진 ${i + 1} 빼기`}
                  className="absolute right-0 top-0 flex size-9 items-center justify-center bg-navy/85 text-navy-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
            {busy && (
              <li className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </li>
            )}
          </ul>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          젖은 곳 가까이 한 장, 방(공간) 전체가 보이게 한 장, 위층 · 배관 · 지붕 쪽 한 장이면 충분합니다.
        </p>
      </fieldset>

      {/* 2. 증상 */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <span className="font-mono text-xs text-electric">02</span>
          어떤 증상인가요?
        </legend>
        <div className="flex flex-wrap gap-2">
          {LEAK_SYMPTOMS.map((s) => {
            const on = symptom === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSymptom(on ? '' : s)}
                aria-pressed={on}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 border px-4 py-2.5 text-sm transition-colors',
                  on ? 'border-electric bg-electric text-electric-foreground' : 'border-border text-foreground/80 hover:border-foreground',
                )}
              >
                {on && <Check className="size-3.5" strokeWidth={2.5} />}
                {s}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* 3. 연락처 */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <span className="font-mono text-xs text-electric">03</span>
          견적 받으실 연락처
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="p-phone" className="text-sm">
              연락처 <span className="text-electric">*</span>
            </label>
            <input
              id="p-phone"
              name="phone"
              required
              inputMode="tel"
              autoComplete="tel"
              className={cn(FIELD, 'font-mono')}
              placeholder="010-1234-5678"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="p-location" className="text-sm">
              현장 위치
            </label>
            <input id="p-location" name="location" className={FIELD} placeholder="안성시 공도읍" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="p-name" className="text-sm">
              성함 <span className="text-muted-foreground">(선택)</span>
            </label>
            <input id="p-name" name="name" autoComplete="name" className={FIELD} placeholder="홍길동" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="p-message" className="text-sm">
              한 줄 설명 <span className="text-muted-foreground">(선택)</span>
            </label>
            <input id="p-message" name="message" className={FIELD} placeholder="예) 욕실 위 천장, 3일 전부터" />
          </div>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="flex items-start gap-2 border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={pending || busy}
          className="group inline-flex h-14 items-center justify-center gap-3 bg-electric px-7 text-base font-semibold text-electric-foreground transition-colors hover:bg-navy disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? (
            <>
              보내는 중
              <Loader2 className="size-4 animate-spin" />
            </>
          ) : (
            <>
              {photos.length ? `사진 ${photos.length}장 보내고 견적 받기` : '견적 요청 보내기'}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          보내주신 사진은 견적 확인에만 쓰고 외부에 공개하지 않습니다. 평일 09:00 – 18:00 접수 건은 당일 회신드립니다.
        </p>
      </div>
    </form>
  )
}
