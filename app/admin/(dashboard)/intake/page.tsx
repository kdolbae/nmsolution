import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { newIntake } from '@/app/actions/intake'
import { listIntakes } from '@/lib/intake/table'
import { calcQuote, won } from '@/lib/clients/quote'

export const dynamic = 'force-dynamic'

export default async function IntakeListPage() {
  const intakes = await listIntakes()
  return (
    <>
      <PageHeader title="AI 견적 접수" description="현장 사진·자료와 설명을 올리면 공사 유형과 방향을 잡고, 견적에 필요한 질문을 주고받은 뒤 제안서·견적서 초안을 만듭니다.">
        <form action={newIntake}>
          <Button type="submit" className="rounded-none">
            <Plus /> 새 접수
          </Button>
        </form>
      </PageHeader>
      {intakes.length === 0 ? (
        <p className="border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted-foreground">아직 접수가 없습니다. 새 접수를 눌러 시작하세요.</p>
      ) : (
        <ul className="divide-y divide-border bg-background ring-1 ring-border">
          {intakes.map((i) => {
            const stage = i.draft ? '초안 있음' : i.analysis ? (i.analysis.ready ? '질문 끝' : `질문 ${i.analysis.questions.length}개 남음`) : '자료 입력 중'
            return (
              <li key={i.id}>
                <Link href={`/admin/intake/${i.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-muted/40">
                  <span className="font-medium">{i.title || `접수 #${i.id}`}</span>
                  <span className="text-xs text-muted-foreground">{i.analysis?.types.map((t) => t.name).join(' · ')}</span>
                  <span className="ml-auto text-xs text-muted-foreground">자료 {i.files}건 · {stage}</span>
                  {i.draft && <span className="tabular-nums">{won(calcQuote(i.draft.quote).supply)}원</span>}
                  <span className="text-xs text-muted-foreground">{i.updatedAt.toISOString().slice(0, 10)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
