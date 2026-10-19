'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ActResult } from '@/lib/est/act'

/** 서버 액션 실행 + 오류 문구 + 성공 시 화면 새로고침 */
export function useAct() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  function run<T extends object>(fn: () => Promise<ActResult<T>>, after?: (r: { ok: true } & T) => void) {
    start(async () => {
      setError(null)
      try {
        const r = await fn()
        if (!r.ok) {
          setError(r.error)
          return
        }
        after?.(r)
        router.refresh()
      } catch {
        setError('처리 중 오류가 남. 잠시 뒤 다시 해야 함')
      }
    })
  }
  return { pending, error, setError, run }
}
