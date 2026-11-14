import { PageHeader } from '@/components/admin/form'
import { KnowledgeBoard } from '@/components/admin/knowledge-board'
import { listKnowledge } from '@/lib/knowledge/table'

export const dynamic = 'force-dynamic'
export const metadata = { title: '지식 DB', robots: { index: false, follow: false } }

/** 지식 DB (어드민 전용): 공종별 고려사항(매뉴얼) + 견적을 만들며 내린 판단과 이유 + 매뉴얼 예외 기록 */
export default async function AdminKnowledgePage() {
  const entries = await listKnowledge()
  return (
    <div>
      <PageHeader title="지식 DB" description="공종별로 고려할 점과, 견적을 만들며 내린 판단의 이유를 모아 둠. 답과 예외 메모에는 누가 언제 남겼는지 기록됨." />
      <KnowledgeBoard entries={entries} />
    </div>
  )
}
