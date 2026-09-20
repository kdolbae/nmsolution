/**
 * 시공사례 초기 등록 스크립트.
 *
 *   DATABASE_URL=... npx tsx scripts/seed-projects.ts
 *
 * 홈의 '작업 사진' 갤러리와 달리, 공종별 상세 설명을 붙여 사례로 보여주고 싶을 때
 * 사용한다. 기본 화면은 갤러리(DB 불필요)이므로 이 스크립트는 선택 사항이다.
 * 같은 제목이 이미 있으면 건너뛰므로 여러 번 실행해도 중복되지 않는다.
 * 등록 후 관리자 → 설정에서 "시공사례 노출"을 켜면 홈에 표시된다.
 *
 * 내용(위치·기간·설명)은 실제 정보로 관리자 화면에서 수정하는 것을 전제로 한
 * 초안이다. 확인되지 않은 수치는 비워 두었다.
 */

import { db } from '../lib/db'
import { projects } from '../lib/db/schema'
import type { NewProject } from '../lib/db/schema'

const SEED: NewProject[] = [
  {
    title: '공장 캐노피 철골 증축',
    category: '철골 · 지붕',
    description:
      '기존 공장 측면에 철골 골조를 세우고 지붕 판넬을 덮어 적재·작업 공간을 확보했습니다. 가동 중인 설비 라인을 피해 구간을 나눠 진행했습니다.',
    imageUrl: '/images/gallery/g-steel-canopy.jpg',
    sortOrder: 10,
  },
  {
    title: '철골 트러스 제작 · 양중 설치',
    category: '철골 · 지붕',
    description: '현장 치수에 맞춰 트러스를 제작하고 지게차로 양중해 기둥에 접합했습니다.',
    imageUrl: '/images/gallery/g-truss-lift.jpg',
    sortOrder: 20,
  },
  {
    title: '창고 철골 골조 시공',
    category: '철골 · 지붕',
    description: '기초 앵커 세팅부터 기둥·보·트러스 조립까지 골조 전체를 세웠습니다.',
    imageUrl: '/images/gallery/g-steel-frame-1.jpg',
    sortOrder: 30,
  },
  {
    title: '적재장 캐노피 지붕 시공',
    category: '철골 · 지붕',
    description: '야외 적재장에 캐노피 골조와 지붕을 올려 우천 시 자재 손상을 막았습니다.',
    imageUrl: '/images/gallery/g-steel-canopy.jpg',
    sortOrder: 40,
  },
  {
    title: '공장 벽체 판넬 · 창호 시공',
    category: '외벽 · 벽체',
    description: '벽체 판넬을 세우고 채광창을 설치한 뒤 실링으로 마감했습니다.',
    imageUrl: '/images/gallery/g-panel-window.jpg',
    sortOrder: 50,
  },
  {
    title: '대형 공장동 지붕 · 벽체 판넬',
    category: '외벽 · 벽체',
    description: '장스팬 공장동의 지붕 판넬과 측벽 판넬을 시공하고 창호를 설치했습니다.',
    imageUrl: '/images/gallery/g-panel-hall.jpg',
    sortOrder: 60,
  },
  {
    title: '노후 배관 보수 · 슬리브 교체',
    category: '설비 · 배관',
    description:
      '누수가 발생한 배관 구간을 절단하고 보수 슬리브와 플랜지로 교체했습니다. 보온재를 되살려 마감했습니다.',
    imageUrl: '/images/gallery/g-pipe-sleeve.jpg',
    sortOrder: 70,
  },
  {
    title: '천장 배관 라인 교체',
    category: '설비 · 배관',
    description: '천장 배관 라인의 노후 구간을 절단·교체하고 행거를 재설치했습니다.',
    imageUrl: '/images/gallery/g-pipe-line.jpg',
    sortOrder: 80,
  },
  {
    title: '스텐 고압배관 제작 · 설치',
    category: '설비 · 배관',
    description:
      '고압가스 설비의 스테인리스 배관을 현장 치수로 제작해 설치했습니다. 충전 설비 가동에 맞춰 일정을 조율했습니다.',
    imageUrl: '/images/gallery/g-hp-gas.jpg',
    sortOrder: 90,
  },
  {
    title: '스텐 고압배관 매니폴드 제작',
    category: '설비 · 배관',
    description: '분기 매니폴드를 제작해 용접·연결했습니다.',
    imageUrl: '/images/gallery/g-manifold.jpg',
    sortOrder: 100,
  },
  {
    title: '스테인리스 탱크 용접 보수',
    category: '탱크 · 용접',
    description:
      '탱크 동체의 손상 부위를 절개하고 패치를 대어 용접 보수했습니다. 용접 후 표면을 정리해 마감했습니다.',
    imageUrl: '/images/gallery/g-tank-weld.jpg',
    sortOrder: 110,
  },
  {
    title: '탱크 하부 보강 용접',
    category: '탱크 · 용접',
    description: '탱크 하부 지지부와 동체 접합부를 보강 용접했습니다.',
    imageUrl: '/images/gallery/g-tank-weld.jpg',
    sortOrder: 120,
  },
  {
    title: '스텐 탱크 분해 · 재조립',
    category: '탱크 · 용접',
    description: '플랜지 헤드를 분리해 내부를 점검하고, 노즐을 새로 제작해 재조립했습니다.',
    imageUrl: '/images/gallery/g-tank-parts.jpg',
    sortOrder: 130,
  },
  {
    title: '스텐 탱크 제작 · 설치 완료',
    category: '탱크 · 용접',
    description: '동체와 플랜지 헤드를 제작·조립해 현장에 설치했습니다.',
    imageUrl: '/images/gallery/g-tank-done.jpg',
    sortOrder: 140,
  },
  {
    title: '스텐 작업대 제작',
    category: '스텐 제작',
    description: '작업 동선에 맞춰 스테인리스 작업대와 상부 선반을 제작해 반입했습니다.',
    imageUrl: '/images/gallery/g-worktable.jpg',
    sortOrder: 150,
  },
  {
    title: '스텐 3단 적재 선반 제작',
    category: '스텐 제작',
    description: '물류 동선에 맞춘 스테인리스 적재 선반을 제작했습니다.',
    imageUrl: '/images/gallery/g-rack.jpg',
    sortOrder: 160,
  },
  {
    title: '옥외 소화전 · 소방배관 교체',
    category: '기타',
    description: '포장면을 절단·굴착해 매설 배관을 교체하고 옥외 소화전을 재설치했습니다.',
    imageUrl: '/images/gallery/g-hydrant.jpg',
    sortOrder: 170,
  },
  {
    title: '공장 외부 계단 · 난간 설치',
    category: '기타',
    description: '콘크리트 계단에 맞춰 난간을 제작·설치했습니다.',
    imageUrl: '/images/gallery/g-stair.jpg',
    sortOrder: 180,
  },
]

async function main() {
  const existing = await db.select({ title: projects.title }).from(projects)
  const have = new Set(existing.map((r) => r.title))

  const toInsert = SEED.filter((p) => !have.has(p.title as string))
  if (toInsert.length === 0) {
    console.log('이미 모두 등록되어 있습니다. 추가한 항목 없음.')
    return
  }

  await db.insert(projects).values(toInsert)
  console.log(`${toInsert.length}건 등록 완료 (기존 ${existing.length}건 유지)`)
  for (const p of toInsert) console.log('  +', p.category, '/', p.title)
  console.log('\n관리자 → 설정에서 "시공사례 노출"을 켜면 홈에 표시됩니다.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
