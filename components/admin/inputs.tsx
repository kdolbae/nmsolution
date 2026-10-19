'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function NumInput({ value, onChange, className }: { value: number; onChange: (n: number) => void; className?: string }) {
  // 입력 중에는 친 글자를 그대로 두고, 칸을 벗어나면 천 단위 쉼표로 보여 준다
  const [text, setText] = useState<string | null>(null)
  return (
    <input
      inputMode="decimal"
      value={text ?? (value ? value.toLocaleString('ko-KR', { maximumFractionDigits: 3 }) : '')}
      onBlur={() => setText(null)}
      onChange={(e) => {
        setText(e.target.value)
        onChange(Number(e.target.value.replace(/[^\d.-]/g, '')) || 0)
      }}
      className={cn('h-8 w-full border border-input bg-background px-2 text-right text-sm tabular-nums', className)}
    />
  )
}

export function TextIn({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-8 w-full border border-input bg-background px-2 text-sm', className)}
    />
  )
}
