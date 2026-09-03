'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ImageOff, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from './form'
import { createProject, deleteProject, toggleProjectPublished, updateProject, type ProjectInput } from '@/app/actions/admin'
import { PROJECT_CATEGORIES } from '@/lib/content/defaults'
import type { Project } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

const EMPTY: ProjectInput = {
  title: '',
  category: PROJECT_CATEGORIES[0],
  location: '',
  year: String(new Date().getFullYear()),
  duration: '',
  description: '',
  imageUrl: '',
  published: true,
  sortOrder: 0,
}

export function ProjectsManager({ projects, showProjects }: { projects: Project[]; showProjects: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<{ id: number | null; data: ProjectInput } | null>(null)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    start(async () => {
      setError(null)
      try {
        await fn()
        router.refresh()
        after?.()
      } catch (e) {
        setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
      }
    })

  const openNew = () => setEditing({ id: null, data: { ...EMPTY, sortOrder: projects.length } })
  const openEdit = (p: Project) =>
    setEditing({
      id: p.id,
      data: {
        title: p.title,
        category: p.category,
        location: p.location,
        year: p.year,
        duration: p.duration,
        description: p.description,
        imageUrl: p.imageUrl,
        published: p.published,
        sortOrder: p.sortOrder,
      },
    })

  const save = () => {
    if (!editing) return
    run(
      () => (editing.id === null ? createProject(editing.data) : updateProject(editing.id, editing.data)),
      () => setEditing(null),
    )
  }

  return (
    <>
      <PageHeader title="시공사례" description="사례를 등록하고 공개 여부를 관리합니다. 정렬 순서가 작을수록 먼저 표시됩니다.">
        <Button type="button" className="h-10 rounded-none" onClick={openNew}>
          <Plus className="size-4" />
          사례 추가
        </Button>
      </PageHeader>

      {!showProjects && (
        <p className="mb-6 flex flex-wrap items-center gap-2 border border-electric/40 bg-electric/5 px-4 py-3 text-sm">
          <EyeOff className="size-4 text-electric" />
          시공사례 메뉴가 현재 <strong>숨김</strong> 상태입니다. 사례가 준비되면
          <Link href="/admin/settings" className="font-semibold underline underline-offset-4">
            사이트 설정
          </Link>
          에서 노출을 켜세요.
        </p>
      )}

      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-border bg-background px-6 py-20 text-center">
          <ImageOff className="size-8 text-muted-foreground" strokeWidth={1.25} />
          <p className="text-sm text-muted-foreground">등록된 시공사례가 없습니다.</p>
          <Button type="button" variant="outline" className="rounded-none" onClick={openNew}>
            첫 사례 등록하기
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-px bg-border">
          {projects.map((p) => (
            <li key={p.id} className={cn('grid grid-cols-[6rem_1fr_auto] items-center gap-4 bg-background p-3', !p.published && 'opacity-60')}>
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ImageOff className="size-4" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-secondary px-2 py-0.5 text-xs font-medium">{p.category}</span>
                  {!p.published && <span className="text-xs text-muted-foreground">비공개</span>}
                </div>
                <p className="truncate font-semibold">{p.title}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {[p.location, p.year, p.duration].filter(Boolean).join(' · ')} · 순서 {p.sortOrder}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn
                  label={p.published ? '숨기기' : '공개하기'}
                  onClick={() => run(() => toggleProjectPublished(p.id, !p.published))}
                >
                  {p.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </IconBtn>
                <IconBtn label="편집" onClick={() => openEdit(p)}>
                  <Pencil className="size-4" />
                </IconBtn>
                <IconBtn
                  label="삭제"
                  onClick={() => {
                    if (confirm(`"${p.title}" 사례를 삭제할까요?`)) run(() => deleteProject(p.id))
                  }}
                >
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/40" role="dialog" aria-modal="true" aria-labelledby="project-editor-title">
          <button type="button" className="flex-1" aria-label="닫기" onClick={() => setEditing(null)} />
          <div className="flex h-full w-full max-w-lg flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 id="project-editor-title" className="text-lg font-bold tracking-tight">
                {editing.id === null ? '사례 추가' : '사례 편집'}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="닫기" className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
              <F id="p-title" label="제목 *">
                <Input
                  id="p-title"
                  value={editing.data.title}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, title: e.target.value } })}
                  className="rounded-none"
                  placeholder="식품공장 지붕 판넬 전면 교체"
                />
              </F>
              <F id="p-category" label="분류">
                <Select
                  value={editing.data.category}
                  onValueChange={(v) => setEditing({ ...editing, data: { ...editing.data, category: v ?? PROJECT_CATEGORIES[0] } })}
                >
                  <SelectTrigger id="p-category" className="rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <div className="grid grid-cols-2 gap-4">
                <F id="p-location" label="위치">
                  <Input
                    id="p-location"
                    value={editing.data.location}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, location: e.target.value } })}
                    className="rounded-none"
                    placeholder="경기 화성"
                  />
                </F>
                <F id="p-year" label="연도">
                  <Input
                    id="p-year"
                    value={editing.data.year}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, year: e.target.value } })}
                    className="rounded-none"
                  />
                </F>
              </div>
              <F id="p-duration" label="소요 기간 / 조건" hint="예: 가동 중 · 12일, 주말 · 3회, 긴급 · 2일">
                <Input
                  id="p-duration"
                  value={editing.data.duration}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, duration: e.target.value } })}
                  className="rounded-none"
                />
              </F>
              <F id="p-description" label="설명">
                <Textarea
                  id="p-description"
                  rows={4}
                  value={editing.data.description}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, description: e.target.value } })}
                  className="rounded-none"
                />
              </F>
              <F id="p-image" label="이미지 URL" hint="/images/... 또는 https://... 이미지 주소">
                <Input
                  id="p-image"
                  value={editing.data.imageUrl}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, imageUrl: e.target.value } })}
                  className="rounded-none font-mono text-xs"
                />
                {editing.data.imageUrl && (
                  <div className="relative mt-2 aspect-[4/3] w-48 overflow-hidden bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editing.data.imageUrl} alt="미리보기" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                )}
              </F>
              <div className="grid grid-cols-2 gap-4">
                <F id="p-sort" label="정렬 순서" hint="작을수록 먼저">
                  <Input
                    id="p-sort"
                    type="number"
                    value={editing.data.sortOrder}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, sortOrder: Number(e.target.value) } })}
                    className="rounded-none font-mono"
                  />
                </F>
                <F id="p-published" label="공개">
                  <div className="flex h-9 items-center">
                    <Switch
                      id="p-published"
                      checked={editing.data.published}
                      onCheckedChange={(v) => setEditing({ ...editing, data: { ...editing.data, published: v } })}
                    />
                  </div>
                </F>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="ghost" className="rounded-none" onClick={() => setEditing(null)} disabled={pending}>
                취소
              </Button>
              <Button type="button" className="h-10 rounded-none px-6" onClick={save} disabled={pending || !editing.data.title.trim()}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function F({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
    </button>
  )
}
