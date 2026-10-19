'use client'

import { useState } from 'react'
import { moveStage, setResult } from '@/app/actions/est'
import { startExec } from '@/app/actions/est-exec'
import type { Stage } from '@/lib/est/data'
import { Btn, ErrorLine, inputCls, selectCls } from './ui'
import { useAct } from './use-act'

const NEXT: Partial<Record<string, { to: Stage; label: string }>> = {
  P1: { to: 'P2', label: '현장 확인으로' },
  P2: { to: 'P3', label: '초안 단계로' },
  P3: { to: 'P5', label: '검사·결재 단계로' },
  P5: { to: 'P6', label: '제출 단계로' },
  EXEC: { to: 'SETTLE', label: '정산 단계로' },
}

/** 단계 넘기기·결과 입력(§7.1 가드는 서버가 확인) */
export function StageControl({ projectId, stage }: { projectId: number; stage: string }) {
  const { pending, error, run } = useAct()
  const [warn, setWarn] = useState<string[]>([])
  const [result, setRes] = useState<'won' | 'lost' | 'hold'>('won')
  const [reason, setReason] = useState('')
  const [resume, setResume] = useState<Stage>('P3')
  const next = NEXT[stage]
  const done = stage === 'CLOSED' || stage === 'LOST'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {next && (
          <Btn variant="primary" disabled={pending} onClick={() => run(() => moveStage(projectId, next.to), (r) => setWarn((r as { warnings: string[] }).warnings ?? []))}>
            {next.label}
          </Btn>
        )}
        {stage === 'WON' && (
          <Btn variant="primary" disabled={pending} onClick={() => run(() => startExec(projectId))}>
            실행 시작
          </Btn>
        )}
        {stage === 'HOLD' && (
          <span className="flex items-center gap-2">
            <select className={selectCls + ' w-36'} value={resume} onChange={(e) => setResume(e.target.value as Stage)}>
              {(['P1', 'P2', 'P3', 'P5', 'P6'] as Stage[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Btn variant="primary" disabled={pending} onClick={() => run(() => moveStage(projectId, resume))}>
              보류 풀기
            </Btn>
          </span>
        )}
      </div>
      {!done && stage !== 'EXEC' && stage !== 'SETTLE' && stage !== 'WON' && (
        <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
          <select className={selectCls + ' sm:w-36'} value={result} onChange={(e) => setRes(e.target.value as typeof result)}>
            <option value="won">수주</option>
            <option value="lost">실패</option>
            <option value="hold">보류</option>
          </select>
          <input className={inputCls} placeholder={result === 'won' ? '메모(선택)' : '이유(필수)'} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Btn disabled={pending} onClick={() => run(() => setResult(projectId, result, reason), () => setReason(''))}>
            결과 입력
          </Btn>
        </div>
      )}
      {warn.length > 0 && <p className="text-xs text-[color:var(--sb-warn)]">{warn.join(' · ')}</p>}
      <ErrorLine error={error} />
    </div>
  )
}
