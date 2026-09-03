'use client'

import { useState } from 'react'
import { Field, PageHeader, SaveBar, Section } from './form'
import { resetContent, saveContent } from '@/app/actions/admin'
import type { AboutContent } from '@/lib/content/defaults'

export function AboutEditor({ initial }: { initial: AboutContent }) {
  const [c, setC] = useState<AboutContent>(initial)
  const dirty = JSON.stringify(c) !== JSON.stringify(initial)

  return (
    <>
      <PageHeader title="회사소개" description="대표 인사말 페이지를 편집합니다." />

      <Section title="페이지 상단">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="작은 영문 라벨" value={c.kicker} onChange={(v) => setC({ ...c, kicker: v })} />
          <Field label="페이지 제목" value={c.title} onChange={(v) => setC({ ...c, title: v })} />
        </div>
      </Section>

      <Section title="대표 인사말">
        <Field label="인사말 제목" value={c.greetingTitle} onChange={(v) => setC({ ...c, greetingTitle: v })} />
        <Field
          label="인사말 본문"
          multiline
          rows={14}
          value={c.greetingBody}
          onChange={(v) => setC({ ...c, greetingBody: v })}
          hint="빈 줄(엔터 두 번)로 문단을 구분합니다."
        />
      </Section>

      <Section title="대표 정보">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="대표 이름" value={c.ceoName} onChange={(v) => setC({ ...c, ceoName: v })} />
          <Field label="직함" value={c.ceoTitle} onChange={(v) => setC({ ...c, ceoTitle: v })} />
        </div>
        <Field
          label="대표 사진 URL"
          mono
          value={c.ceoImage}
          onChange={(v) => setC({ ...c, ceoImage: v })}
          hint="비워두면 사진 자리만 표시됩니다. 세로형(4:5) 사진을 권장합니다."
        />
        {c.ceoImage && (
          <div className="relative aspect-[4/5] w-40 overflow-hidden bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.ceoImage} alt="대표 사진 미리보기" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        )}
      </Section>

      <SaveBar
        dirty={dirty}
        onSave={() => saveContent('about', c as unknown as Record<string, unknown>)}
        onReset={() => resetContent('about')}
      />
    </>
  )
}
