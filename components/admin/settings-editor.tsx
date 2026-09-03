'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Field, PageHeader, SaveBar, Section } from './form'
import { saveContent } from '@/app/actions/admin'
import type { SettingsContent } from '@/lib/content/defaults'

export function SettingsEditor({ initial }: { initial: SettingsContent }) {
  const [c, setC] = useState<SettingsContent>(initial)
  const dirty = JSON.stringify(c) !== JSON.stringify(initial)

  return (
    <>
      <PageHeader title="사이트 설정" description="메뉴 노출과 연락처, 회사 정보를 관리합니다." />

      <Section title="메뉴 노출">
        <div className="flex items-center justify-between gap-6 border border-border p-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="show-projects" className="text-base font-semibold">
              시공사례 메뉴 노출
            </Label>
            <p className="text-sm text-muted-foreground">
              끄면 헤더 · 푸터 메뉴와 메인 페이지의 시공사례 섹션이 모두 숨겨집니다. 사례가 준비된 뒤 켜세요.
            </p>
          </div>
          <Switch id="show-projects" checked={c.showProjects} onCheckedChange={(v) => setC({ ...c, showProjects: v })} />
        </div>
      </Section>

      <Section title="연락처" description="사이트 전체의 전화번호 표시에 사용됩니다.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="대표전화" mono value={c.phoneMain} onChange={(v) => setC({ ...c, phoneMain: v })} />
          <Field label="휴대전화" mono value={c.phoneMobile} onChange={(v) => setC({ ...c, phoneMobile: v })} />
        </div>
        <Field label="운영 시간" value={c.hours} onChange={(v) => setC({ ...c, hours: v })} />
      </Section>

      <Section title="회사 정보" description="푸터와 회사소개 페이지에 표시됩니다.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="상호" value={c.companyName} onChange={(v) => setC({ ...c, companyName: v })} />
          <Field label="대표" value={c.ceo} onChange={(v) => setC({ ...c, ceo: v })} />
        </div>
        <Field label="주소" value={c.address} onChange={(v) => setC({ ...c, address: v })} />
      </Section>

      <SaveBar dirty={dirty} onSave={() => saveContent('settings', c as unknown as Record<string, unknown>)} />
    </>
  )
}
