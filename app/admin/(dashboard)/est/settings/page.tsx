import { PageHeader } from '@/components/admin/form'
import { SettingRow } from '@/components/est/setting-row'
import { Card, Empty } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import { listSettingRows } from '@/lib/est/settings'
import { SETTING_GROUPS } from '@/lib/est/settings-defaults'

export const dynamic = 'force-dynamic'
export const metadata = { title: '기준 설정 | NM SOLUTION 관리자' }

/** S14 기준 설정(대표). 모든 기준값은 여기서 고침. "샘플" = 아직 실제 값으로 저장한 적 없음 */
export default async function EstSettings() {
  const s = await estPageSession()
  if (s?.estRole !== 'ceo') return <Empty>기준 설정은 대표만 고칠 수 있음</Empty>
  const rows = await listSettingRows()
  const groups = [...SETTING_GROUPS, ...new Set(rows.map((r) => r.group).filter((g) => !(SETTING_GROUPS as readonly string[]).includes(g)))]
  return (
    <>
      <PageHeader title="기준 설정" description="담당자 단가·인센티브·결재 기준·이익률·문서 문구 등. 저장하면 새로 만드는 판부터 적용(이미 만든 판은 만들 때 값 그대로)" />
      <div className="flex flex-col gap-5">
        {groups.map((g) => {
          const list = rows.filter((r) => r.group === g)
          if (!list.length) return null
          return (
            <Card key={g} title={g}>
              {list.map((r) => (
                <SettingRow key={r.key} row={r} />
              ))}
            </Card>
          )
        })}
      </div>
    </>
  )
}
