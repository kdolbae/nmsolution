import { overall, type Task } from '@/lib/portal/progress'
import { cn } from '@/lib/utils'

const md = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`

/** 전체 진행률(실제)·계획 대비·공사 기간·오늘 공정. 관리자·포털 공용 (서버 컴포넌트) */
export function ProgressSummary({ tasks, today }: { tasks: Task[]; today: string }) {
  const o = overall(tasks, today)
  if (!o) return null
  const gap = o.actual - o.planned
  const finished = o.completed === o.count
  const status = finished ? '공사 완료' : today < o.start ? '착공 전' : gap >= 0 ? '계획대로 진행 중' : gap >= -10 ? '계획보다 조금 늦음' : '계획보다 늦음'
  const tone = finished || gap >= 0 ? 'text-emerald-700' : gap >= -10 ? 'text-orange-600' : 'text-red-600'

  return (
    <section className="grid gap-px overflow-hidden bg-border ring-1 ring-border sm:grid-cols-[1.3fr_1fr_1fr]">
      <div className="flex flex-col gap-3 bg-background p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">전체 진행률</span>
          <span className={cn('text-xs font-semibold', tone)}>{status}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-5xl font-bold tracking-tight">{o.actual}</span>
          <span className="text-xl font-bold">%</span>
          <span className="ml-auto text-xs text-muted-foreground">오늘 계획 {o.planned}%</span>
        </div>
        <div className="relative h-3 bg-muted">
          <div className={cn('h-full', finished ? 'bg-emerald-600' : 'bg-electric')} style={{ width: `${o.actual}%` }} />
          <div className="absolute inset-y-[-3px] w-0.5 bg-foreground/70" style={{ left: `${o.planned}%` }} title={`오늘 계획 ${o.planned}%`} />
        </div>
      </div>
      <div className="flex flex-col justify-center gap-1 bg-background p-5">
        <span className="text-xs text-muted-foreground">공사 기간</span>
        <span className="font-mono text-lg font-bold">
          {md(o.start)} ~ {md(o.end)}
        </span>
        <span className="text-xs text-muted-foreground">
          공정 {o.count}개 중 {o.completed}개 완료
        </span>
      </div>
      <div className="flex flex-col justify-center gap-1 bg-background p-5">
        <span className="text-xs text-muted-foreground">오늘 공정</span>
        {o.today.length ? (
          o.today.map((t) => (
            <span key={t.id} className="text-sm font-semibold">
              {t.name} <span className="font-mono text-xs font-normal text-muted-foreground">{t.progress}%</span>
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">예정된 공정 없음</span>
        )}
      </div>
    </section>
  )
}
