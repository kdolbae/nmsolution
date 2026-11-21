'use client'

import { useEffect, useState } from 'react'
import { previewToken } from '@/lib/preview'

/** 미리보기 화면 맨 위 띠 + 폼 제출 막기(견적 문의 수가 바뀌지 않게). 미리보기가 아니면 아무것도 그리지 않는다. */
export function PreviewBand() {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    const tk = previewToken()
    if (tk === null) return
    setText(tk ? '미리보기 – 집계 안 됨' : '확인 안 된 미리보기 – 집계 안 됨')
    if (tk)
      fetch(`https://sbworks.bond/api/public/preview?tk=${encodeURIComponent(tk)}`)
        .then((r) => r.json())
        .then((j: { ok?: boolean }) => {
          if (!j?.ok) setText('확인 안 된 미리보기 – 집계 안 됨')
        })
        .catch(() => {})
    const block = (e: Event) => {
      e.preventDefault()
      e.stopImmediatePropagation()
      setText('미리보기라 보내지 않았어요')
    }
    window.addEventListener('submit', block, true)
    return () => window.removeEventListener('submit', block, true)
  }, [])
  if (!text) return null
  return (
    <div
      role="status"
      style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 2147483647, pointerEvents: 'none', background: '#0D2440', color: '#F2C319', font: '700 12px/26px system-ui, sans-serif', textAlign: 'center' }}
    >
      {text}
    </div>
  )
}
