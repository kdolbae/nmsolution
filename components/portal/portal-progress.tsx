import { CalendarRange, NotebookPen } from 'lucide-react'
import type { Report, Task } from '@/lib/portal/progress'
import { Gantt } from '@/components/progress/gantt'
import { ProgressSummary } from '@/components/progress/progress-summary'
import { ReportCard } from '@/components/progress/report-card'

/** 협력업체 포털 '공정 현황': 전체 진행률 → 공정표 → 날짜별 현장 보고(사진) */
export function PortalProgress({ tasks, reports, today }: { tasks: Task[]; reports: Report[]; today: string }) {
  const taskNames = Object.fromEntries(tasks.map((t) => [t.id, t.name]))
  if (!tasks.length && !reports.length)
    return (
      <div className="bg-background p-8 text-sm text-muted-foreground ring-1 ring-border">
        공정표와 현장 보고가 아직 올라오지 않았습니다. 착공하면 이곳에서 매일 진행 상황과 현장 사진을 보실 수 있습니다.
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      <ProgressSummary tasks={tasks} today={today} />
      {tasks.length > 0 && (
        <section className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarRange className="size-4" strokeWidth={1.75} /> 공정표
          </h2>
          <Gantt tasks={tasks} today={today} />
          <p className="text-[11px] text-muted-foreground">막대 = 계획 기간, 진한 부분 = 진행률, 빨간 선 = 오늘. 일요일은 회색.</p>
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <NotebookPen className="size-4" strokeWidth={1.75} /> 현장 보고 {reports.length > 0 && <span className="text-muted-foreground">{reports.length}건</span>}
        </h2>
        {reports.length ? (
          reports.map((r) => <ReportCard key={r.id} report={r} photoBase="/api/portal/progress/photos" taskNames={taskNames} />)
        ) : (
          <p className="text-sm text-muted-foreground">아직 올라온 현장 보고가 없습니다.</p>
        )}
      </section>
    </div>
  )
}
