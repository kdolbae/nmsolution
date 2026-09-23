'use client'

import { useState, useTransition } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * 아침 자동 수집을 기다리지 않고 지금 상황판을 갱신합니다.
 * 실제 수집은 별도 워크플로가 하고 1~2분 걸립니다.
 */
export function AdsRefreshButton() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')
  const [failed, setFailed] = useState(false)

  const refresh = () => {
    setMsg('')
    start(async () => {
      try {
        const res = await fetch('/api/ads-refresh', { method: 'POST' })
        const body = (await res.json()) as { ok?: boolean; message?: string }
        setFailed(!body.ok)
        setMsg(body.message || (body.ok ? '갱신을 시작했습니다.' : '갱신을 시작하지 못했습니다.'))
      } catch {
        setFailed(true)
        setMsg('갱신 요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        지금 업데이트
      </Button>
      {msg && <p className={failed ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{msg}</p>}
    </div>
  )
}
