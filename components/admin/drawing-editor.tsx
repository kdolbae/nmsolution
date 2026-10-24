'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Eye, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteDrawingAction, updateDrawingMetaAction } from '@/app/actions/drawings'

type Props = {
  drawing: { id: number; title: string; clientId: number | null; clientSlug: string | null; showOnPortal: boolean }
  clients: Array<{ id: number; name: string; slug: string | null }>
}

/**
 * 배관 도면 한 장: 위에는 이름·업체·업체 페이지 표시, 아래는 3D 편집 화면(public/drawing-board/board.html).
 * 3D 화면은 고칠 때마다 저절로 저장되고, 업체 페이지는 같은 도면을 보기 전용으로 보여 준다.
 */
export function DrawingEditor({ drawing, clients }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(drawing.title)
  const [clientId, setClientId] = useState(drawing.clientId ? String(drawing.clientId) : '')
  const [show, setShow] = useState(drawing.showOnPortal)
  const [msg, setMsg] = useState('')
  const [pending, startTransition] = useTransition()
  const slug = clients.find((c) => String(c.id) === clientId)?.slug ?? null
  const board = `/drawing-board/board.html?id=${drawing.id}`

  const save = (meta: Parameters<typeof updateDrawingMetaAction>[1], note: string) =>
    startTransition(async () => {
      await updateDrawingMetaAction(drawing.id, meta)
      setMsg(note)
      router.refresh()
    })

  const remove = () =>
    startTransition(async () => {
      await deleteDrawingAction(drawing.id)
      router.push('/admin/drawings')
    })
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/drawings" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> 배관 도면 목록
      </Link>
      <div className="flex flex-col gap-3 bg-background p-4 ring-1 ring-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
            도면 이름
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() !== drawing.title && save({ title }, '이름 저장함')}
              className="h-9 border border-input bg-background px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium sm:w-56">
            업체
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                save({ clientId: e.target.value ? Number(e.target.value) : null }, '업체 바꿈')
              }}
              className="h-9 border border-input bg-background px-2 text-sm"
            >
              <option value="">업체 없음 (내부용)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={show}
              disabled={!clientId}
              onChange={(e) => {
                setShow(e.target.checked)
                save({ showOnPortal: e.target.checked }, e.target.checked ? '업체 페이지에 표시함' : '업체 페이지에서 내림')
              }}
            />
            업체 페이지에 보기 전용으로 표시
          </label>
          {!clientId && <span className="text-xs text-muted-foreground">업체를 고르면 켤 수 있음</span>}
          {clientId && !slug && <span className="text-xs text-muted-foreground">이 업체는 업체 페이지 주소가 아직 없음 (업체 관리에서 정함)</span>}
          {show && slug && (
            <>
              <a href={`/${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border border-border px-2.5 py-1 hover:bg-secondary">
                <ExternalLink className="size-4" /> 업체 페이지 /{slug}
              </a>
              <a
                href={`/drawing-board/board.html?mode=view&id=${drawing.id}&slug=${slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 border border-border px-2.5 py-1 hover:bg-secondary"
              >
                <Eye className="size-4" /> 업체가 보는 3D 미리보기
              </a>
            </>
          )}
          <a href={board} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border border-border px-2.5 py-1 hover:bg-secondary">
            <ExternalLink className="size-4" /> 전체 화면으로 편집
          </a>
          <span className="flex-1" />
          {pending && <Loader2 className="size-4 animate-spin" />}
          {msg && !pending && <span className="text-xs text-muted-foreground">{msg}</span>}
          {confirmDel ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-xs text-destructive">이 도면과 버전 기록을 모두 지움</span>
              <Button size="sm" variant="destructive" className="rounded-none" onClick={remove}>
                삭제
              </Button>
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => setConfirmDel(false)}>
                취소
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="ghost" className="rounded-none text-destructive" onClick={() => setConfirmDel(true)}>
              <Trash2 /> 도면 삭제
            </Button>
          )}
        </div>
      </div>
      <iframe src={board} title={`${drawing.title} 3D 편집`} className="h-[calc(100svh-15rem)] min-h-[560px] w-full bg-background ring-1 ring-border" />
    </div>
  )
}
