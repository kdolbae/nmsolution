import { cn } from '@/lib/utils'

type GanttTask = { id: number; name: string; crew?: string; start: string; end: string; progress: number }

const DAY = 86_400_000
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`)
const fmt = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 공정표(간트). 막대 전체 = 계획 기간, 진한 부분 = 진행률, 빨간 세로선 = 오늘.
 * 관리자·포털이 같이 쓴다. 좁은 화면에서는 옆으로 밀어 본다.
 */
export function Gantt({ tasks, today }: { tasks: GanttTask[]; today: string }) {
  if (!tasks.length) return null
  const start = tasks.reduce((a, t) => (t.start < a ? t.start : a), tasks[0].start)
  const end = tasks.reduce((a, t) => (t.end > a ? t.end : a), tasks[0].end)
  const days = Math.round((ms(end) - ms(start)) / DAY) + 1
  const pct = (d: string, plus = 0) => ((Math.round((ms(d) - ms(start)) / DAY) + plus) / days) * 100
  const ticks = Array.from({ length: days }, (_, i) => new Date(ms(start) + i * DAY).toISOString().slice(0, 10))
  const step = days <= 16 ? 1 : days <= 45 ? 7 : 14
  const showToday = today >= start && today <= end

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 130 + days * 42 }}>
        <div className="grid grid-cols-[minmax(130px,220px)_1fr] border-b border-border text-[11px] text-muted-foreground">
          <div className="sticky left-0 z-10 bg-background py-2 pr-3 font-medium">공정</div>
          <div className="relative h-8">
            {ticks.map((d, i) =>
              i % step === 0 ? (
                <span
                  key={d}
                  className={cn('absolute top-1 -translate-x-0 whitespace-nowrap font-mono', new Date(ms(d)).getUTCDay() === 0 && 'text-red-500')}
                  style={{ left: `${pct(d)}%` }}
                >
                  {fmt(d)}
                  {step === 1 && <span className="block text-[10px] opacity-70">{WEEK[new Date(ms(d)).getUTCDay()]}</span>}
                </span>
              ) : null,
            )}
          </div>
        </div>
        <div className="relative">
          {tasks.map((t) => {
            const done = t.progress >= 100
            const late = !done && today > t.end
            return (
              <div key={t.id} className="grid grid-cols-[minmax(130px,220px)_1fr] items-center border-b border-border/60 last:border-0">
                <div className="sticky left-0 z-10 min-w-0 bg-background py-2.5 pr-3">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className={cn('font-mono text-[11px]', done ? 'text-emerald-700' : late ? 'text-red-600' : 'text-muted-foreground')}>
                    {fmt(t.start)}
                    {t.end !== t.start && `~${fmt(t.end)}`} · {done ? '완료' : late ? `지연 ${t.progress}%` : `${t.progress}%`}
                  </div>
                </div>
                <div className="relative h-11">
                  {ticks.map((d) =>
                    new Date(ms(d)).getUTCDay() === 0 ? (
                      <div key={d} className="absolute inset-y-0 bg-muted/60" style={{ left: `${pct(d)}%`, width: `${100 / days}%` }} />
                    ) : null,
                  )}
                  <div
                    className={cn('absolute top-3 h-5 overflow-hidden', done ? 'bg-emerald-100' : late ? 'bg-red-100' : 'bg-electric/15')}
                    style={{ left: `${pct(t.start)}%`, width: `${pct(t.end, 1) - pct(t.start)}%` }}
                    title={`${t.name} ${t.start}~${t.end} ${t.progress}%`}
                  >
                    <div className={cn('h-full', done ? 'bg-emerald-600' : late ? 'bg-red-500' : 'bg-electric')} style={{ width: `${t.progress}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
          {showToday && (
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 grid grid-cols-[minmax(130px,220px)_1fr]">
              <div />
              <div className="relative">
                <div className="absolute inset-y-0 w-0.5 bg-red-500" style={{ left: `${pct(today, 0.5)}%` }}>
                  <span className="absolute -top-0 left-1 bg-red-500 px-1 text-[10px] font-bold text-white">오늘</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
