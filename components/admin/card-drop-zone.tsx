'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX = 10

/** 클립보드·끌어 놓기에서 사진 파일만 골라낸다 (이름 없는 붙여넣기 사진은 이름을 붙임) */
function imagesFrom(list: FileList | DataTransferItemList | null | undefined): File[] {
  if (!list) return []
  const out: File[] = []
  for (const entry of Array.from(list as ArrayLike<File | DataTransferItem>)) {
    const f = entry instanceof File ? entry : entry.kind === 'file' ? entry.getAsFile() : null
    if (!f || !f.type.startsWith('image/')) continue
    out.push(f.name && f.name !== 'image.png' ? f : new File([f], `명함-붙여넣기-${Date.now()}-${out.length + 1}.${f.type.split('/')[1] || 'png'}`, { type: f.type }))
  }
  return out
}

/**
 * 명함 사진 넣는 칸: 고르기 + 끌어 놓기 + 붙여넣기(Ctrl+V).
 * 붙여넣기는 이 칸이 화면에 있는 동안 페이지 어디서든 받음. 클립보드에 사진이 없으면 글 붙여넣기는 그대로 둠.
 */
export function CardDropZone({ files, onChange, label = '명함 사진' }: { files: File[]; onChange: (files: File[]) => void; label?: string }) {
  const [over, setOver] = useState(false)
  const depth = useRef(0)
  const filesRef = useRef(files)
  filesRef.current = files

  const add = (more: File[]) => {
    if (!more.length) return
    onChange([...filesRef.current, ...more].slice(0, MAX))
  }
  const addRef = useRef(add)
  addRef.current = add

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const imgs = imagesFrom(e.clipboardData?.items)
      if (!imgs.length) return
      e.preventDefault()
      addRef.current(imgs)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  return (
    <div className="flex flex-col gap-2">
      <label
        onDragEnter={(e) => {
          if (!Array.from(e.dataTransfer.types).includes('Files')) return
          e.preventDefault()
          depth.current += 1
          setOver(true)
        }}
        onDragOver={(e) => {
          if (!Array.from(e.dataTransfer.types).includes('Files')) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1)
          if (!depth.current) setOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          depth.current = 0
          setOver(false)
          add(imagesFrom(e.dataTransfer.files))
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed border-border bg-background px-4 py-5 text-center text-sm transition-colors hover:border-electric',
          over && 'border-electric bg-electric/10',
        )}
      >
        <ImagePlus className="size-5 text-muted-foreground" />
        <span className="font-medium">{label}: 끌어 놓기 · 붙여넣기(Ctrl+V) · 클릭해서 고르기</span>
        <span className="text-xs text-muted-foreground">여러 장 가능 (최대 {MAX}장). 캡처한 명함은 바로 Ctrl+V</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            add(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
      </label>
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {files.map((f, i) => (
            <div key={previews[i]} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[i]} alt={f.name} className="h-16 w-28 border border-border object-cover" />
              <button
                type="button"
                aria-label="이 사진 빼기"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <span className="text-xs text-muted-foreground">{files.length}장 넣음</span>
        </div>
      )}
    </div>
  )
}
