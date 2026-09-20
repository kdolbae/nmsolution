'use client'

import { useState } from 'react'
import { Field, ListEditor, PageHeader, SaveBar, Section, StringListField } from './form'
import { resetContent, saveContent } from '@/app/actions/admin'
import type { HomeContent } from '@/lib/content/defaults'

export function HomeEditor({ initial }: { initial: HomeContent }) {
  const [c, setC] = useState<HomeContent>(initial)
  const dirty = JSON.stringify(c) !== JSON.stringify(initial)

  const set = <K extends keyof HomeContent>(k: K, patch: Partial<HomeContent[K]>) =>
    setC((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }))

  return (
    <>
      <PageHeader title="메인 페이지" description="메인(홈) 페이지의 모든 문구를 편집합니다. 줄바꿈은 그대로 반영됩니다." />

      <Section title="히어로 (첫 화면)" description="사이트 최상단 큰 제목 영역">
        <Field label="작은 영문 라벨" value={c.hero.kicker} onChange={(v) => set('hero', { kicker: v })} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="제목 1줄" value={c.hero.titleLine1} onChange={(v) => set('hero', { titleLine1: v })} />
          <Field label="강조 단어 1 (파란색)" value={c.hero.titleHighlight1} onChange={(v) => set('hero', { titleHighlight1: v })} />
          <Field label="중간 단어" value={c.hero.titleMiddle} onChange={(v) => set('hero', { titleMiddle: v })} />
          <Field label="강조 단어 2 (파란색)" value={c.hero.titleHighlight2} onChange={(v) => set('hero', { titleHighlight2: v })} />
        </div>
        <Field label="설명" multiline rows={3} value={c.hero.description} onChange={(v) => set('hero', { description: v })} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="주 버튼 문구" value={c.hero.primaryCta} onChange={(v) => set('hero', { primaryCta: v })} />
          <Field label="보조 버튼 문구" value={c.hero.secondaryCta} onChange={(v) => set('hero', { secondaryCta: v })} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">하단 지표 3개</p>
          <ListEditor
            items={c.hero.stats}
            onChange={(stats) => set('hero', { stats })}
            title={(s) => s.value}
            create={() => ({ value: '', label: '' })}
            render={(s, u) => (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr]">
                <Field label="값 (예: 24H)" value={s.value} onChange={(v) => u({ value: v })} />
                <Field label="설명" value={s.label} onChange={(v) => u({ label: v })} />
              </div>
            )}
          />
        </div>
        <StringListField
          label="하단 티커 (개보수 범위 항목)"
          hint="데스크톱 첫 화면 맨 아래 가로로 나열되는 항목"
          values={c.hero.ticker}
          onChange={(ticker) => set('hero', { ticker })}
        />
      </Section>

      <Section title="개보수 범위" description="4개 카드와 추가 작업 태그">
        <Field label="작은 영문 라벨" value={c.scope.kicker} onChange={(v) => set('scope', { kicker: v })} />
        <Field label="제목" multiline rows={2} value={c.scope.title} onChange={(v) => set('scope', { title: v })} />
        <Field label="설명" multiline rows={2} value={c.scope.description} onChange={(v) => set('scope', { description: v })} />
        <ListEditor
          items={c.scope.items}
          onChange={(items) => set('scope', { items })}
          title={(s) => s.title}
          create={() => ({ n: String(c.scope.items.length + 1).padStart(2, '0'), title: '', description: '', image: '' })}
          render={(s, u) => (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[6rem_1fr]">
                <Field label="번호" value={s.n} onChange={(v) => u({ n: v })} />
                <Field label="제목" value={s.title} onChange={(v) => u({ title: v })} />
              </div>
              <Field label="설명" multiline rows={2} value={s.description} onChange={(v) => u({ description: v })} />
              <Field label="이미지 경로 또는 URL" mono value={s.image} onChange={(v) => u({ image: v })} hint="/images/... 또는 https://..." />
            </>
          )}
        />
        <StringListField label="추가 작업 태그" values={c.scope.extras} onChange={(extras) => set('scope', { extras })} />
      </Section>

      <Section title="작업 사진" description="실제 현장 사진입니다. 공종별로 묶여 표시되며 사진마다 설명은 붙지 않습니다.">
        <Field label="작은 영문 라벨" value={c.gallery.kicker} onChange={(v) => set('gallery', { kicker: v })} />
        <Field label="제목" multiline rows={2} value={c.gallery.title} onChange={(v) => set('gallery', { title: v })} />
        <Field label="설명" multiline rows={2} value={c.gallery.description} onChange={(v) => set('gallery', { description: v })} />
        <ListEditor
          items={c.gallery.groups}
          onChange={(groups) => set('gallery', { groups })}
          title={(g) => g.label || '새 공종'}
          create={() => ({ label: '', images: [] as string[] })}
          addLabel="공종 추가"
          render={(g, u) => (
            <>
              <Field label="공종 이름" value={g.label} onChange={(v) => u({ label: v })} />
              <StringListField
                label="사진 경로"
                values={g.images}
                onChange={(images) => u({ images })}
              />
            </>
          )}
        />
      </Section>

      <Section title="진행 프로세스" description="STEP 1 – 5">
        <Field label="작은 영문 라벨" value={c.process.kicker} onChange={(v) => set('process', { kicker: v })} />
        <Field label="제목" multiline rows={3} value={c.process.title} onChange={(v) => set('process', { title: v })} />
        <Field label="설명" multiline rows={3} value={c.process.description} onChange={(v) => set('process', { description: v })} />
        <ListEditor
          items={c.process.steps}
          onChange={(steps) => set('process', { steps })}
          title={(s) => `${s.n} · ${s.title}`}
          create={() => ({ n: `STEP ${c.process.steps.length + 1}`, time: '', title: '', description: '' })}
          render={(s, u) => (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="단계 라벨" value={s.n} onChange={(v) => u({ n: v })} />
                <Field label="소요 시간" value={s.time} onChange={(v) => u({ time: v })} />
                <Field label="제목" value={s.title} onChange={(v) => u({ title: v })} />
              </div>
              <Field label="설명" multiline rows={2} value={s.description} onChange={(v) => u({ description: v })} />
            </>
          )}
        />
      </Section>

      <Section title="회사 소개 (Why NM Solution)" description="4가지 강점">
        <Field label="작은 영문 라벨" value={c.why.kicker} onChange={(v) => set('why', { kicker: v })} />
        <Field label="제목" multiline rows={2} value={c.why.title} onChange={(v) => set('why', { title: v })} />
        <Field label="설명" multiline rows={3} value={c.why.description} onChange={(v) => set('why', { description: v })} />
        <ListEditor
          items={c.why.items}
          onChange={(items) => set('why', { items })}
          title={(s) => s.ko}
          create={() => ({ en: '', ko: '', description: '' })}
          render={(s, u) => (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="영문 라벨" value={s.en} onChange={(v) => u({ en: v })} />
                <Field label="한글 제목" value={s.ko} onChange={(v) => u({ ko: v })} />
              </div>
              <Field label="설명" multiline rows={2} value={s.description} onChange={(v) => u({ description: v })} />
            </>
          )}
        />
      </Section>

      <Section title="고객문의 영역" description="맨 아래 파란 배경 문의 섹션">
        <Field label="제목" multiline rows={2} value={c.contact.title} onChange={(v) => set('contact', { title: v })} />
        <Field label="설명" value={c.contact.description} onChange={(v) => set('contact', { description: v })} />
        <Field label="운영 시간 안내" value={c.contact.hours} onChange={(v) => set('contact', { hours: v })} />
      </Section>

      <SaveBar
        dirty={dirty}
        onSave={() => saveContent('home', c as unknown as Record<string, unknown>)}
        onReset={() => resetContent('home')}
      />
    </>
  )
}
