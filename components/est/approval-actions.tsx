'use client'

import { useState } from 'react'
import { decideApproval } from '@/app/actions/est'
import { Btn, ErrorLine, inputCls } from './ui'
import { useAct } from './use-act'

/** 결재 단계 승인/반려(반려는 이유 필수) */
export function ApprovalActions({ stepId }: { stepId: number }) {
  const { pending, error, run } = useAct()
  const [comment, setComment] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="의견(반려는 필수)" />
      <div className="flex gap-2">
        <Btn variant="accent" size="sm" disabled={pending} onClick={() => run(() => decideApproval(stepId, 'approve', comment))}>
          승인
        </Btn>
        <Btn variant="danger" size="sm" disabled={pending} onClick={() => run(() => decideApproval(stepId, 'reject', comment))}>
          반려
        </Btn>
      </div>
      <ErrorLine error={error} />
    </div>
  )
}
