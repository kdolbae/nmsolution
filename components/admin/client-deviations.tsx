'use client'

import { AddForm, EntryCard } from '@/components/admin/knowledge-board'
import type { KnowledgeEntry } from '@/lib/knowledge/shared'

/**
 * 업체 화면 '매뉴얼과 다르게 한 점' (어드민 전용, 전 업체 공통, kevin 2026-11-14).
 * 회사 기준과 다르게 견적을 작성했을 때 누가·무엇을·왜 그랬는지 남긴다. 지식 DB(/admin/knowledge)의 '매뉴얼 예외'에 모인다.
 * hints 는 지금 견적에서 기준과 다른 것으로 보이는 점(자재 인상률, 영업이익 등)이다.
 */
export function ClientDeviations({ clientId, source, entries, hints }: { clientId: number; source: string; entries: KnowledgeEntry[]; hints: string[] }) {
  return (
    <section className="flex flex-col gap-3 bg-secondary/40 p-5 ring-1 ring-border">
      <div>
        <h2 className="text-base font-bold">매뉴얼과 다르게 한 점</h2>
        <p className="text-sm text-muted-foreground">
          회사 기준과 다르게 넣은 것이 있으면 무엇을 왜 그렇게 했는지 남김. 로그인한 이름과 날짜가 같이 기록되고{' '}
          <a href="/admin/knowledge" className="underline">
            지식 DB
          </a>
          에 모임. 고객 화면에는 나오지 않음.
        </p>
      </div>
      {hints.length > 0 && (
        <ul className="list-disc space-y-0.5 border border-orange-300 bg-orange-50 py-2 pl-7 pr-3 text-sm text-orange-800">
          {hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
          <li className="list-none text-xs">의도한 것이면 아래에 이유를 남김.</li>
        </ul>
      )}
      <AddForm fixed={{ kind: 'deviation', clientId, source }} />
      {entries.map((e) => (
        <EntryCard key={e.id} entry={e} />
      ))}
    </section>
  )
}
