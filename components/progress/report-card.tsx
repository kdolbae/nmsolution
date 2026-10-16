'use client'

import { useState } from 'react'
import { AlertTriangle, CalendarDays, CloudSun, HardHat, X } from 'lucide-react'
import type { Report } from '@/lib/portal/progress'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export const dateLabel = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일 (${WEEK[new Date(`${d}T00:00:00Z`).getUTCDay()]})`

function Lines({ text }: { text: string }) {
  return <div className="whitespace-pre-line text-sm leading-relaxed">{text}</div>
}

/**
 * 일일 보고 한 건 (고객이 보는 모양). 포털 타임라인과 관리자 미리보기가 같이 쓴다.
 * photoBase: 사진 주소 앞부분 (/api/portal/progress/photos 또는 /api/admin/progress/photos)
 */
export function ReportCard({ report, photoBase, taskNames }: { report: Report; photoBase: string; taskNames: Record<number, string> }) {
  const [zoom, setZoom] = useState<number | null>(null)
  const zoomed = report.photos.find((p) => p.id === zoom)

  return (
    <article className="flex flex-col gap-4 bg-background p-5 ring-1 ring-border">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h3 className="flex items-center gap-1.5 text-base font-bold">
          <CalendarDays className="size-4 text-electric" /> {dateLabel(report.date)}
        </h3>
        {report.weather && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CloudSun className="size-3.5" /> {report.weather}
          </span>
        )}
        {report.crew && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HardHat className="size-3.5" /> {report.crew}
          </span>
        )}
      </header>

      {report.summary && <Lines text={report.summary} />}

      {report.taskUpdates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {report.taskUpdates.map((u) => (
            <span key={u.taskId} className={u.progress >= 100 ? 'bg-emerald-100 px-2 py-1 text-xs text-emerald-800' : 'bg-muted px-2 py-1 text-xs'}>
              {u.name} <b className="font-mono">{u.progress >= 100 ? '완료' : `${u.progress}%`}</b>
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {report.workDone && (
          <div>
            <h4 className="mb-1 text-xs font-semibold text-muted-foreground">오늘 한 일</h4>
            <Lines text={report.workDone} />
          </div>
        )}
        {report.planNext && (
          <div>
            <h4 className="mb-1 text-xs font-semibold text-muted-foreground">다음 계획</h4>
            <Lines text={report.planNext} />
          </div>
        )}
      </div>

      {report.issues && (
        <div className="flex gap-2 border-l-2 border-orange-500 bg-orange-50 p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-600" />
          <div>
            <h4 className="mb-0.5 text-xs font-semibold text-orange-800">특이사항 · 협의 필요</h4>
            <Lines text={report.issues} />
          </div>
        </div>
      )}

      {report.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {report.photos.map((p) => (
            <figure key={p.id} className="flex flex-col gap-1">
              <button type="button" onClick={() => setZoom(p.id)} className="block aspect-[4/3] overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${photoBase}/${p.id}`} alt={p.caption || '현장 사진'} loading="lazy" className="size-full object-cover transition-transform hover:scale-105" />
              </button>
              {(p.caption || (p.taskId && taskNames[p.taskId])) && (
                <figcaption className="text-xs leading-snug">
                  {p.taskId && taskNames[p.taskId] && <span className="mr-1 font-semibold text-electric">[{taskNames[p.taskId]}]</span>}
                  {p.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {zoomed && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4" onClick={() => setZoom(null)}>
          <button type="button" className="absolute right-4 top-4 text-white" aria-label="닫기">
            <X className="size-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${photoBase}/${zoomed.id}`} alt={zoomed.caption} className="max-h-[85vh] max-w-full object-contain" />
          {zoomed.caption && <p className="max-w-2xl text-center text-sm text-white">{zoomed.caption}</p>}
        </div>
      )}
    </article>
  )
}
