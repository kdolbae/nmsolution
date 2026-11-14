/**
 * 작업별 광고 랜딩(/services/<slug>) 내용. 화면은 components/work-landing.tsx.
 *
 * 2026-11-03 광고 방문자 분석: 출장용접 · 펌프교체 · 징크지붕 · 공장파티션 · 중량물 같은 검색이 전부
 * 일반 페이지(/services/factory)로 들어와 15~30초 만에 나갔다. 검색한 작업이 첫 화면에 바로 보이고,
 * 그 작업의 실제 현장 사진이 나오도록 작업별로 나눈다.
 *
 * - 사진은 엔엠솔루션 실제 현장 사진(public/images/gallery, public/images/leak/work-*)만 쓴다. AI 예시 이미지는 쓰지 않는다.
 * - 경력 연수 · 시공 건수 · 가격처럼 사업주가 확인하지 않은 숫자는 넣지 않는다.
 * - category 는 견적 접수(quote_requests.categories)에 그대로 남는다.
 */

export type WorkPhoto = { src: string; label: string }

export type WorkLanding = {
  slug: string
  /** 견적 접수에 남는 분류 */
  category: string
  /** 브라우저 제목 · 검색 결과 제목 */
  title: string
  /** 네이버 권고 80자 이내 */
  description: string
  keywords: string[]
  kicker: string
  /** 첫 화면 제목. 두 줄, 강조는 둘째 줄 */
  headline: [string, string]
  lead: string
  badges: string[]
  hero: WorkPhoto
  /** 사진 견적 폼 '어떤 작업인가요?' 선택지 */
  jobs: string[]
  /** 사진 견적 폼의 찍는 요령 */
  photoHint: string
  /** 사진 견적 폼 '하실 말씀' 예시 */
  messagePlaceholder: string
  /** 이런 작업 합니다 */
  scope: { title: string; description: string }[]
  photos: WorkPhoto[]
  faq: { q: string; a: string }[]
}

const AREAS = '평택 · 안성 · 천안 · 아산 · 화성 · 오산 · 용인 · 이천 · 청주 · 진천 · 음성'

const COMMON_FAQ = {
  area: {
    q: '어디까지 오시나요?',
    a: `평택 고덕에서 출발합니다. ${AREAS} 등 경기 남부 · 충청권 공장은 직접 방문합니다. 위치를 알려주시면 가능한 일정을 바로 말씀드립니다.`,
  },
  photo: {
    q: '사진만 보내도 견적이 나오나요?',
    a: '현장 사진 몇 장과 대략적인 치수, 위치를 보내주시면 작업 방법과 예상 금액대를 먼저 말씀드립니다. 사진으로 알 수 없는 부분은 어디부터 현장 확인이 필요한지 나눠서 설명드립니다.',
  },
  running: {
    q: '공장이 가동 중인데 작업할 수 있나요?',
    a: '생산 일정에 맞춰 구간을 나누거나 주말 · 야간에 작업하는 것을 협의합니다. 현장 반입 절차와 안전 기준을 먼저 확인하고 들어갑니다.',
  },
}

export const WORK_LANDINGS: WorkLanding[] = [
  {
    slug: 'welding',
    messagePlaceholder: '예) 스텐 탱크 하부 용접부 누설, 이번 주 안에',
    category: '출장 용접 · 제작',
    title: '출장 용접 · 알곤 용접 — 스텐 · 탱크 · 배관 현장 용접',
    description: '공장으로 직접 가서 용접합니다. 알곤(TIG) · 스텐 · 알루미늄 · 탱크 · 배관 용접 보수와 제작. 평택 · 경기 남부 · 충청.',
    keywords: ['출장용접', '알곤용접', '알곤용접출장', '출장용접비용', '스테인리스용접', '스텐용접', '알루미늄용접', '탱크용접', '배관용접', '평택 출장용접'],
    kicker: 'On-site Welding',
    headline: ['출장 용접,', '공장으로 가서 바로 붙입니다.'],
    lead: '알곤(TIG) · 스텐 · 알루미늄 용접부터 탱크 · 배관 용접 보수, 랙 · 작업대 제작까지. 장비를 실어 현장에서 작업하고, 떼어 오기 어려운 설비도 그 자리에서 고칩니다.',
    badges: ['알곤(TIG) · 스텐 · 알루미늄', '탱크 · 배관 용접 보수', '랙 · 작업대 · 프레임 제작', '사진으로 먼저 견적'],
    hero: { src: '/images/gallery/g-tank-weld.jpg', label: '스텐 탱크 용접 보수' },
    jobs: ['스텐 · 알곤 용접', '탱크 용접 보수', '배관 용접', '알루미늄 용접', '랙 · 작업대 제작', '기타'],
    photoHint: '용접할 부위 가까이 한 장, 설비 전체가 보이게 한 장이면 충분합니다. 재질(스텐 · 철 · 알루미늄)과 두께를 알면 같이 적어 주세요.',
    scope: [
      { title: '알곤(TIG) · 스텐 용접', description: '스텐 배관 · 탱크 · 프레임을 깨끗한 비드로 용접합니다. 식품 · 반도체 설비처럼 마감이 중요한 곳도 맡습니다.' },
      { title: '탱크 · 용기 용접 보수', description: '갈라지거나 새는 탱크와 압력 용기의 용접부를 보수하고, 노즐 · 플랜지 · 뚜껑을 새로 만들어 붙입니다.' },
      { title: '배관 현장 용접', description: '가동 중인 라인의 배관을 현장 치수에 맞춰 잘라 붙이고, 서포트 · 행거까지 함께 설치합니다.' },
      { title: '랙 · 작업대 · 프레임 제작', description: '스텐 · 철 랙, 작업대, 설비 받침 프레임을 현장 치수로 제작해 설치합니다.' },
    ],
    photos: [
      { src: '/images/gallery/g-tank-weld.jpg', label: '스텐 탱크 용접부 보수' },
      { src: '/images/gallery/g-tank-done.jpg', label: '탱크 플랜지 · 노즐 제작 설치' },
      { src: '/images/gallery/g-tank-parts.jpg', label: '스텐 탱크 몸통 · 뚜껑 제작' },
      { src: '/images/gallery/g-manifold.jpg', label: '스텐 매니폴드 배관 용접' },
      { src: '/images/gallery/g-rack.jpg', label: '스텐 랙 제작' },
      { src: '/images/gallery/g-worktable.jpg', label: '스텐 작업대 제작 · 설치' },
    ],
    faq: [
      {
        q: '작은 용접 한 군데도 와 주시나요?',
        a: '네. 다만 이동 거리와 작업 시간에 따라 금액이 달라지니, 사진과 위치를 먼저 보내주시면 출장 전에 예상 금액을 말씀드립니다. 같은 공장에 손볼 곳이 더 있으면 한 번에 묶어 드립니다.',
      },
      {
        q: '스텐 · 알루미늄도 되나요?',
        a: '알곤(TIG) 장비로 스텐과 알루미늄 용접을 합니다. 재질과 두께, 쓰는 용도(물 · 가스 · 약품 등)를 알려주시면 맞는 방법으로 작업합니다.',
      },
      COMMON_FAQ.running,
      COMMON_FAQ.area,
    ],
  },
  {
    slug: 'piping',
    messagePlaceholder: '예) 냉각수 펌프 교체, 배관 플랜지에서 물 샘',
    category: '배관 · 설비 수리',
    title: '공장 배관 · 펌프 · 설비 수리 — 스텐 배관 제작 · 교체',
    description: '공장 배관 누수 · 교체, 펌프 교체, 스텐 고압배관 · 가스 배관 · 소화 배관 제작 설치. 가동 일정에 맞춰 시공. 평택 · 경기 남부 · 충청.',
    keywords: ['공장배관', '배관수리', '배관공사', '펌프교체', '펌프수리', '설비공사업체', '기계설비공사', '스테인레스배관제작업체', '스텐배관', '고압배관', '소화배관', '압력탱크'],
    kicker: 'Piping · Pump · Utility',
    headline: ['공장 배관 · 펌프 · 설비,', '멈추기 전에 고칩니다.'],
    lead: '새는 배관 교체, 펌프 교체, 스텐 고압배관 · 가스 배관 · 소화 배관 신설까지. 현장 치수에 맞춰 직접 만들고, 라인 가동 일정에 맞춰 구간을 나눠 시공합니다.',
    badges: ['배관 누수 · 교체', '펌프 교체 · 설비 수리', '스텐 고압 · 가스 배관 제작', '가동 중 · 주말 · 야간 협의'],
    hero: { src: '/images/gallery/g-pipe-line.jpg', label: '공장 유틸리티 배관 정비' },
    jobs: ['배관 누수 · 교체', '펌프 교체 · 수리', '스텐 · 고압 배관 신설', '가스 배관', '소화 배관', '탱크 · 압력용기', '기타'],
    photoHint: '문제 있는 배관 · 펌프 가까이 한 장, 주변 배관 흐름이 보이게 한 장, 명판(모델명)이 있으면 한 장 찍어 주세요.',
    scope: [
      { title: '배관 누수 · 교체', description: '부식되거나 새는 배관을 잘라 교체하고 플랜지 · 밸브 · 서포트를 함께 정비합니다.' },
      { title: '펌프 교체 · 설비 수리', description: '펌프 · 모터 교체와 배관 연결, 밸브 · 스트레이너 · 감압밸브 같은 부속 교체를 합니다.' },
      { title: '스텐 고압배관 · 가스 배관', description: '스텐 고압배관, 공정 가스 · 공압(CDA) 배관과 매니폴드를 현장 치수에 맞춰 제작해 설치합니다.' },
      { title: '소화 · 냉각수 · 유틸리티 배관', description: '소화전 · 소화 배관 교체, 냉각수 순환 배관 신설과 보온, 배수 배관까지 맡습니다.' },
    ],
    photos: [
      { src: '/images/gallery/g-pipe-line.jpg', label: '공장 유틸리티 배관 정비' },
      { src: '/images/gallery/g-pipe-sleeve.jpg', label: '배관 신축관 · 플랜지 교체' },
      { src: '/images/gallery/g-hp-gas.jpg', label: '스텐 고압 가스 배관' },
      { src: '/images/gallery/g-manifold.jpg', label: '스텐 매니폴드 제작' },
      { src: '/images/gallery/g-hydrant.jpg', label: '옥외 소화전 · 매설 배관 교체' },
      { src: '/images/gallery/g-tank-done.jpg', label: '탱크 노즐 · 배관 연결' },
    ],
    faq: [
      {
        q: '펌프만 바꾸는 것도 되나요?',
        a: '됩니다. 같은 규격으로 바꿀지, 용량을 바꿀지는 명판 사진과 쓰는 용도를 보고 말씀드립니다. 배관 연결부와 밸브 상태도 같이 봐 드립니다.',
      },
      {
        q: '라인을 세우지 않고 배관을 바꿀 수 있나요?',
        a: '바이패스를 만들거나 구간을 나눠 짧게 끊어서 작업하는 방법을 먼저 검토합니다. 꼭 세워야 하면 셧다운 일정에 맞춰 준비해 두었다가 한 번에 바꿉니다.',
      },
      COMMON_FAQ.photo,
      COMMON_FAQ.area,
    ],
  },
  {
    slug: 'steel',
    messagePlaceholder: '예) 하역장 앞 캐노피 10m × 6m',
    category: '철골 · 캐노피 · 중량물',
    title: '철골 · 캐노피 · 트러스 제작 설치 — 공장 증축 · 중량물 양중',
    description: '철골 캐노피 · 트러스 제작, 공장 증축 골조, 철골 계단, 지게차 · 크레인 양중까지. 평택 · 경기 남부 · 충청 공장 직접 시공.',
    keywords: ['철골캐노피', '캐노피제작', '캐노피공사', '캐노피설치비용', '트러스제작', '철골계단', '철구조물공사', '공장증축', '중량물업체', '중량물양중', '반도체장비양중'],
    kicker: 'Steel · Canopy · Rigging',
    headline: ['철골 · 캐노피 · 트러스,', '제작부터 양중까지 한 번에.'],
    lead: '공장 앞 캐노피, 증축 골조, 철골 트러스와 계단을 현장 치수로 제작하고, 지게차 · 크레인으로 올려 설치합니다. 지붕 판넬 마감까지 이어서 합니다.',
    badges: ['캐노피 · 증축 골조', '트러스 · 철골 계단 제작', '중량물 양중 · 설치', '지붕 · 벽 판넬 마감까지'],
    hero: { src: '/images/gallery/g-truss-lift.jpg', label: '철골 트러스 양중 설치' },
    jobs: ['캐노피', '공장 증축 골조', '트러스 · 지붕 골조', '철골 계단', '중량물 양중 · 설치', '기타'],
    photoHint: '설치할 자리 전체가 보이게 한 장, 붙일 건물 벽 · 기초 쪽 한 장이면 됩니다. 대략적인 가로 · 세로 길이를 같이 적어 주세요.',
    scope: [
      { title: '철골 캐노피', description: '하역장 · 출입구 · 통로 캐노피를 제작해 세우고 지붕 판넬까지 덮습니다.' },
      { title: '증축 골조 · 트러스', description: '공장 증축 철골 골조와 지붕 트러스를 제작하고, 양중해 조립합니다.' },
      { title: '철골 계단 · 구조물', description: '외부 철골 계단, 점검 발판, 설비 받침 구조물을 현장에 맞춰 만듭니다.' },
      { title: '중량물 양중 · 설치', description: '지게차 · 크레인으로 골조와 장비를 올리고 정위치에 설치합니다.' },
    ],
    photos: [
      { src: '/images/gallery/g-truss-lift.jpg', label: '트러스 지게차 양중' },
      { src: '/images/gallery/g-steel-truss.jpg', label: '철골 트러스 조립' },
      { src: '/images/gallery/g-steel-frame-1.jpg', label: '옥상 증축 철골 골조' },
      { src: '/images/gallery/g-steel-canopy.jpg', label: '캐노피 철골 제작' },
      { src: '/images/gallery/g-canopy-done.jpg', label: '캐노피 지붕 마감' },
      { src: '/images/gallery/g-stair.jpg', label: '외부 철골 계단 설치' },
    ],
    faq: [
      {
        q: '캐노피 설치비용은 얼마나 드나요?',
        a: '크기, 기둥 개수, 지붕재, 기초 상태에 따라 차이가 큽니다. 설치할 자리 사진과 대략적인 크기를 보내주시면 구조와 예상 금액을 먼저 말씀드립니다.',
      },
      {
        q: '도면이 없어도 되나요?',
        a: '현장을 실측해 제작 치수를 잡습니다. 인허가나 구조 검토가 필요한 규모인지도 먼저 확인해 말씀드립니다.',
      },
      COMMON_FAQ.running,
      COMMON_FAQ.area,
    ],
  },
  {
    slug: 'panel',
    messagePlaceholder: '예) 공장 지붕 판넬 300평 교체, 비 올 때 샘',
    category: '지붕 · 벽 판넬',
    title: '공장 지붕 · 외벽 판넬 교체 · 징크 · 파티션 시공',
    description: '샌드위치 판넬 · 징크 판넬 지붕 · 외벽 교체, 공장 파티션 · 칸막이, 누수 보수. 평택 · 경기 남부 · 충청 공장 직접 시공.',
    keywords: ['샌드위치판넬시공', '판넬시공', '공장판넬공사', '지붕판넬공사', '징크판넬', '징크지붕', '그라스울판넬', '공장외벽판넬', '공장파티션', '공장칸막이', '조립식창고'],
    kicker: 'Panel · Roof · Partition',
    headline: ['공장 지붕 · 벽 판넬,', '골조부터 마감까지 직접.'],
    lead: '샌드위치 · 징크 · 그라스울 판넬 지붕과 외벽 교체, 공장 안 파티션 · 칸막이, 이음부 누수 보수까지. 판넬만 덮는 게 아니라 아래 골조와 물길부터 봅니다.',
    badges: ['지붕 · 외벽 판넬 교체', '징크 · 그라스울 판넬', '공장 파티션 · 칸막이', '이음부 누수 보수'],
    hero: { src: '/images/gallery/g-panel-hall.jpg', label: '공장 통로 판넬 · 지붕 시공' },
    jobs: ['지붕 판넬 교체', '외벽 판넬 교체', '징크 판넬', '파티션 · 칸막이', '판넬 누수 보수', '기타'],
    photoHint: '바꿀 지붕 · 벽 전체가 보이게 한 장, 상한 부분 가까이 한 장이면 됩니다. 대략적인 면적이나 길이를 알면 같이 적어 주세요.',
    scope: [
      { title: '지붕 판넬 교체', description: '노후 지붕 판넬을 걷어내고 새 판넬과 후레싱, 물받이까지 다시 시공합니다.' },
      { title: '외벽 판넬 · 징크', description: '외벽 샌드위치 판넬 교체와 징크 판넬 마감, 창호 주변 마감을 합니다.' },
      { title: '파티션 · 칸막이', description: '공장 안 작업 구역 · 창고 · 사무 공간을 판넬 파티션으로 나눕니다.' },
      { title: '이음부 누수 보수', description: '비 올 때 새는 판넬 이음부 · 후레싱 · 볼트 자리를 찾아 막습니다.' },
    ],
    photos: [
      { src: '/images/gallery/g-panel-hall.jpg', label: '공장 통로 지붕 · 벽 판넬' },
      { src: '/images/gallery/g-panel-window.jpg', label: '외벽 판넬 · 창호 마감' },
      { src: '/images/leak/work-roof-frame.webp', label: '지붕 골조 · 판넬 시공' },
      { src: '/images/gallery/g-canopy-done.jpg', label: '캐노피 지붕 판넬 마감' },
    ],
    faq: [
      {
        q: '판넬 가격만 따로 알 수 있나요?',
        a: '판넬 값은 두께 · 심재 · 색상과 그날 시세에 따라 달라집니다. 시공 면적과 현장 사진을 보내주시면 자재와 시공을 나눈 항목별 견적으로 말씀드립니다.',
      },
      {
        q: '지붕 위에 덧씌우는 것도 되나요?',
        a: '골조와 기존 판넬 상태에 따라 덧씌우기가 나은 경우도 있고 걷어내야 하는 경우도 있습니다. 사진을 보고 두 방법의 장단점과 금액을 같이 말씀드립니다.',
      },
      COMMON_FAQ.running,
      COMMON_FAQ.area,
    ],
  },
  {
    slug: 'equipment',
    messagePlaceholder: '예) 압력탱크 이전 설치, 배관 재연결까지',
    category: '장비 이전 · 셋업 · 설비 수리',
    title: '공장 장비 이전 · 셋업 · 압력탱크 · 펌프 설비 수리',
    description: '생산 장비 이전 설치 · 셋업, 압력탱크 · 저장탱크 제작 수리, 펌프 · 유틸리티 설비 수리. 배관 재연결까지 한 번에. 평택 · 경기 남부 · 충청.',
    keywords: ['장비이전', '장비이전설치', '반도체장비셋업', '반도체장비셋업회사', '장비셋업', '압력탱크', '압력탱크제작', '압력탱크제작전문업체', '고압탱크', '저장탱크제작', '펌프수리', '설비수리', '산업용건조로'],
    kicker: 'Equipment · Tank · Utility',
    headline: ['장비 이전 · 탱크 · 펌프,', '옮기고 연결까지 한 번에.'],
    lead: '생산 장비를 옮겨 다시 앉히고, 압력탱크 · 저장탱크를 만들거나 고치고, 펌프와 유틸리티 배관을 다시 연결합니다. 양중 · 용접 · 배관을 따로 부르지 않아도 됩니다.',
    badges: ['장비 이전 · 재설치 · 셋업', '압력탱크 · 저장탱크 제작 · 수리', '펌프 · 유틸리티 설비 수리', '양중 · 용접 · 배관 한 번에'],
    hero: { src: '/images/gallery/g-tank-done.jpg', label: '탱크 플랜지 · 노즐 제작 설치' },
    jobs: ['장비 이전 · 재설치', '장비 셋업 · 유틸리티 연결', '압력탱크 · 저장탱크', '펌프 · 설비 수리', '건조로 · 대형 설비', '기타'],
    photoHint: '옮기거나 고칠 장비 전체가 보이게 한 장, 명판(모델명 · 용량) 한 장, 연결된 배관 · 전기 쪽 한 장 찍어 주세요.',
    scope: [
      { title: '장비 이전 · 재설치', description: '라인 변경이나 공장 이전 때 생산 장비를 분리해 옮기고, 새 자리에 앉혀 수평 · 고정까지 맞춥니다.' },
      { title: '장비 셋업 · 유틸리티 연결', description: '장비에 들어가는 공압(CDA) · 냉각수 · 가스 · 배수 배관을 새로 빼고 연결합니다.' },
      { title: '압력탱크 · 저장탱크', description: '스텐 압력탱크 · 저장탱크를 제작하거나, 새는 용접부 · 노즐 · 플랜지를 보수합니다.' },
      { title: '펌프 · 설비 수리', description: '펌프 · 모터 교체와 밸브 · 스트레이너 · 감압밸브 같은 설비 부속 교체를 합니다.' },
    ],
    photos: [
      { src: '/images/gallery/g-tank-done.jpg', label: '탱크 플랜지 · 노즐 제작 설치' },
      { src: '/images/gallery/g-tank-parts.jpg', label: '스텐 탱크 몸통 · 뚜껑 제작' },
      { src: '/images/gallery/g-tank-weld.jpg', label: '탱크 용접부 보수' },
      { src: '/images/gallery/g-hp-gas.jpg', label: '장비 가스 공급 배관' },
      { src: '/images/gallery/g-manifold.jpg', label: '스텐 매니폴드 제작' },
      { src: '/images/gallery/g-truss-lift.jpg', label: '지게차 양중 · 설치' },
    ],
    faq: [
      {
        q: '장비 이전은 어디까지 해 주나요?',
        a: '분리, 양중 · 운반, 새 자리 설치와 고정, 배관 재연결까지 합니다. 전기 · 제어 쪽이나 제조사 셋업이 따로 필요한 부분은 어디까지가 저희 몫인지 미리 나눠 말씀드립니다.',
      },
      {
        q: '압력탱크 제작은 어떤 정보가 필요한가요?',
        a: '용량, 사용 압력, 내용물(물 · 공기 · 약품 등), 설치 자리 사진을 보내주세요. 기존 탱크를 바꾸는 경우 명판 사진이 있으면 가장 빠릅니다.',
      },
      COMMON_FAQ.running,
      COMMON_FAQ.area,
    ],
  },
  {
    // 2026-11-14 사업주: 정부 과제 수행에 필요한 시설 · 설비를 플랜트 설비 설계부터 함께 해보자는 취지로.
    // 수행 실적 · 건수는 사업주 확인 전이라 쓰지 않는다. 사진은 현장 사진만(plant/*.webp 는 AI 예시라 제외).
    slug: 'rnd',
    messagePlaceholder: '예) 내년 실증과제용 파일럿 설비, 사업계획서에 넣을 견적과 개략 도면이 필요합니다',
    category: '정부과제 · R&D 실증 설비',
    title: '정부과제 · R&D 실증 설비 — 파일럿 플랜트 설계 · 제작 · 설치',
    description: '정부 R&D 과제 · 실증사업에 필요한 시험설비 · 파일럿 플랜트를 설계부터 제작 · 설치 · 시운전까지 함께 합니다. 사업비 산정용 견적 · 사양서도.',
    keywords: ['정부과제설비', '국책과제설비', 'R&D설비', '실증설비', '실증플랜트', '파일럿플랜트', '파일럿설비', '시험설비제작', '연구설비제작', '플랜트설비설계', '테스트베드구축'],
    kicker: 'R&D · Pilot Plant',
    headline: ['정부과제 설비,', '설계부터 같이 해보겠습니다.'],
    lead: '과제는 선정됐는데 설비를 어디서부터 만들어야 할지 막막하신가요? 시험설비 · 파일럿 플랜트 · 실증 설비를 구상 단계부터 함께 검토하고, 설계 · 제작 · 설치 · 시운전까지 한 팀이 맡습니다.',
    badges: ['구상 · 사양 검토부터 함께', '설비 · 배관 · 구조 설계', '제작 · 설치 · 시운전', '사업비 산정용 견적 · 사양서'],
    hero: { src: '/images/gallery/g-manifold.jpg', label: '스텐 매니폴드 제작' },
    jobs: ['과제 기획 · 사양 검토', '시험설비 · 파일럿 설비 제작', '실증 설비 설치 · 유틸리티 연결', '사업비 산정용 견적', '기타'],
    photoHint: '설비가 들어갈 자리 사진, 공정 흐름도나 손으로 그린 구상도가 있으면 같이 보내 주세요. 과제명 · 일정이 정해져 있으면 함께 적어 주세요.',
    scope: [
      { title: '과제 기획 단계 사양 검토', description: '공정 조건, 처리 용량, 유틸리티를 같이 놓고 실제로 만들 수 있는 설비 사양을 정리합니다. 사업계획서에 넣을 견적서와 개략 사양서도 함께 만듭니다.' },
      { title: '설비 · 배관 · 구조 설계', description: '시험 조건과 설치 공간에 맞춰 설비 배치, 배관, 받침 구조를 설계합니다. 시공을 아는 팀이 그려 바로 만들 수 있는 도면입니다.' },
      { title: '시험설비 · 파일럿 플랜트 제작', description: '탱크 · 반응조 · 매니폴드 · 프레임 · 배관을 제작하고 현장에 설치합니다. 실험 결과에 따라 바뀌는 부분은 수정 · 보완합니다.' },
      { title: '유틸리티 연결 · 시운전', description: '공압 · 냉각수 · 가스 · 배수 배관을 연결하고 시운전까지 함께 봅니다. 결과보고에 쓸 설치 사진 · 도면도 정리해 드립니다.' },
    ],
    photos: [
      { src: '/images/gallery/g-manifold.jpg', label: '스텐 매니폴드 제작' },
      { src: '/images/gallery/g-tank-parts.jpg', label: '스텐 탱크 몸통 · 뚜껑 제작' },
      { src: '/images/gallery/g-hp-gas.jpg', label: '장비 가스 공급 배관' },
      { src: '/images/gallery/g-pipe-line.jpg', label: '유틸리티 배관 정비' },
      { src: '/images/gallery/g-steel-frame-1.jpg', label: '설비 받침 철골 프레임' },
      { src: '/images/gallery/g-rack.jpg', label: '설비 랙 제작 · 설치' },
    ],
    faq: [
      {
        q: '아직 과제 신청 전인데 상담할 수 있나요?',
        a: '네. 사업계획서를 쓰는 단계에서 설비 사양과 예산을 같이 잡는 것이 가장 좋습니다. 공정 조건과 일정만 알려주시면 만들 수 있는 사양과 개략 견적을 먼저 정리해 드립니다.',
      },
      {
        q: '설계만, 또는 제작만 맡길 수도 있나요?',
        a: '가능합니다. 이미 도면이 있으면 제작 · 설치만, 연구실에서 직접 만들 계획이면 설계와 사양 검토만 맡기셔도 됩니다. 어디까지가 저희 몫인지 처음에 나눠서 정합니다.',
      },
      {
        q: '실험하다가 설비를 바꿔야 하면요?',
        a: '실증 설비는 중간에 바뀌는 일이 많습니다. 배관 경로 변경, 부품 추가, 받침 구조 보강 같은 수정 작업도 같은 팀이 이어서 합니다.',
      },
      COMMON_FAQ.area,
    ],
  },
]

export function getWorkLanding(slug: string): WorkLanding | undefined {
  return WORK_LANDINGS.find((w) => w.slug === slug)
}

/** 사진 견적 폼이 보내는 분류 중 접수에 그대로 남겨도 되는 값 */
export const WORK_CATEGORIES = WORK_LANDINGS.map((w) => w.category)
