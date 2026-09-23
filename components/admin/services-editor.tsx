'use client'

import { useState } from 'react'
import { Field, ListEditor, PageHeader, SaveBar, Section, StringListField } from './form'
import { resetContent, saveContent } from '@/app/actions/admin'
import type { ServicesContent } from '@/lib/content/defaults'

export function ServicesEditor({ initial }: { initial: ServicesContent }) {
  const [c, setC] = useState<ServicesContent>(initial)
  const dirty = JSON.stringify(c) !== JSON.stringify(initial)

  return (
    <>
      <PageHeader
        title="사업소개"
        description="사업소개 목록 페이지와 각 사업의 상세 페이지 내용을 편집합니다. 첫 번째 항목이 핵심 사업(크게 표시)으로 노출됩니다."
      />

      <Section title="목록 페이지 상단">
        <Field label="작은 영문 라벨" value={c.kicker} onChange={(v) => setC({ ...c, kicker: v })} />
        <Field label="제목" multiline rows={2} value={c.title} onChange={(v) => setC({ ...c, title: v })} />
        <Field label="설명" multiline rows={3} value={c.description} onChange={(v) => setC({ ...c, description: v })} />
      </Section>

      <Section title="사업 분야" description="slug는 상세 페이지 주소(/services/slug)에 사용됩니다. 영문 소문자로만 입력하세요.">
        <ListEditor
          items={c.items}
          onChange={(items) => setC({ ...c, items })}
          title={(s) => s.name}
          addLabel="사업 분야 추가"
          create={() => ({ slug: '', name: '', en: '', summary: '', description: '', image: '', points: [], targets: [] })}
          render={(s, u) => (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="이름 (한글)" value={s.name} onChange={(v) => u({ name: v })} />
                <Field label="영문 이름" value={s.en} onChange={(v) => u({ en: v })} />
                <Field
                  label="slug (주소)"
                  mono
                  value={s.slug}
                  onChange={(v) => u({ slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                />
              </div>
              <Field label="한 줄 요약" value={s.summary} onChange={(v) => u({ summary: v })} />
              <Field label="상세 설명" multiline rows={4} value={s.description} onChange={(v) => u({ description: v })} />
              <Field label="대표 이미지 경로 또는 URL" mono value={s.image} onChange={(v) => u({ image: v })} />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <StringListField label="주요 작업" values={s.points} onChange={(points) => u({ points })} />
                <StringListField label="대상 고객" values={s.targets} onChange={(targets) => u({ targets })} />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">세부 분야 (사진 카드)</p>
                <p className="text-xs text-muted-foreground">상세 페이지 아래에 사진과 함께 표시됩니다. 비워두면 표시되지 않습니다.</p>
                <ListEditor
                  items={s.areas ?? []}
                  onChange={(areas) => u({ areas })}
                  title={(a) => a.title}
                  addLabel="세부 분야 추가"
                  create={() => ({ title: '', description: '', image: '' })}
                  render={(a, ua) => (
                    <>
                      <Field label="제목" value={a.title} onChange={(v) => ua({ title: v })} />
                      <Field label="설명" multiline rows={2} value={a.description} onChange={(v) => ua({ description: v })} />
                      <Field label="이미지 경로 또는 URL" mono value={a.image} onChange={(v) => ua({ image: v })} />
                    </>
                  )}
                />
              </div>
            </>
          )}
        />
      </Section>

      <SaveBar
        dirty={dirty}
        onSave={() => saveContent('services', c as unknown as Record<string, unknown>)}
        onReset={() => resetContent('services')}
      />
    </>
  )
}
