'use client'

import { useState, useTransition } from 'react'
import { syncBoardHistory, type SyncResult } from '@/app/admin/(dashboard)/stats/actions'

/** 지난 방문·문의 기록을 나노마스터 상황판으로 한 번에 보내는 단추. 여러 번 눌러도 중복되지 않는다. */
export function BoardSyncButton() {
  const [pending, start] = useTransition()
  const [res, setRes] = useState<SyncResult | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setRes(await syncBoardHistory()))}
        className="bg-background px-3 py-2 text-sm font-medium ring-1 ring-border hover:bg-secondary disabled:opacity-60"
      >
        {pending ? '보내는 중…' : '지난 기록 보내기'}
      </button>
      {res && (
        <span className={res.ok ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}>
          {res.ok ? `방문 기록 ${res.events.toLocaleString('ko-KR')}줄 · 문의 ${res.inquiries}건을 보냈습니다.` : res.error}
        </span>
      )}
    </div>
  )
}
