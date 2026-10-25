/**
 * 사이트의 편집 가능한 콘텐츠 타입과 기본값.
 * DB(site_content)에 저장된 값이 없으면 이 기본값이 사용됩니다.
 */

export type HomeContent = {
  hero: {
    kicker: string
    titleLine1: string
    titleHighlight1: string
    titleMiddle: string
    titleHighlight2: string
    description: string
    primaryCta: string
    secondaryCta: string
    stats: { value: string; label: string }[]
    ticker: string[]
  }
  scope: {
    kicker: string
    title: string
    description: string
    items: { n: string; title: string; description: string; image: string }[]
    extras: string[]
  }
  process: {
    kicker: string
    title: string
    description: string
    steps: { n: string; time: string; title: string; description: string }[]
  }
  /** 실제 현장 사진. 설명 없이 어떤 작업을 하는지만 보여준다. */
  gallery: {
    kicker: string
    title: string
    description: string
    groups: { label: string; images: string[] }[]
  }
  why: {
    kicker: string
    title: string
    description: string
    items: { en: string; ko: string; description: string }[]
  }
  contact: {
    title: string
    description: string
    hours: string
  }
}

export type ServiceItem = {
  slug: string
  name: string
  en: string
  summary: string
  description: string
  image: string
  points: string[]
  targets: string[]
  /** 사진 카드로 보여줄 세부 분야. 비어 있으면 섹션이 나오지 않는다. */
  areas?: ServiceArea[]
  /** 세부 분야 묶음의 제목·설명·대표 이미지 (공장 개보수는 메인 페이지 개보수 범위에도 나온다) */
  areasTitle?: string
  areasDescription?: string
  areasImage?: string
  /** 현장 기록: 실제 사진과 짧은 영상(드론 항공, 작업 계획 애니메이션). 비어 있으면 섹션이 나오지 않는다. */
  media?: ServiceMedia[]
}

export type ServiceMedia = {
  /** 'video' 는 Cloudflare R2 공개 주소의 mp4 (소리 없음, 자동 반복) */
  kind: 'photo' | 'video'
  src: string
  /** 영상의 첫 화면 */
  poster?: string
  title: string
  caption: string
}

export type ServiceArea = {
  title: string
  description: string
  image: string
}

export type ServicesContent = {
  kicker: string
  title: string
  description: string
  items: ServiceItem[]
}

export type AboutContent = {
  kicker: string
  title: string
  greetingTitle: string
  greetingBody: string
  ceoName: string
  ceoTitle: string
  ceoImage: string
}

export type SettingsContent = {
  showProjects: boolean
  /** 메인의 '작업 사진'(현장 사진) 섹션과 메뉴 노출 */
  showGallery: boolean
  companyName: string
  ceo: string
  address: string
  phoneMain: string
  phoneMobile: string
  hours: string
  /** 카카오톡 채널(비즈채널) 주소. 채널 홈을 넣으면 1:1 상담 주소로 자동 변환된다. */
  kakaoUrl: string
}

export const DEFAULT_HOME: HomeContent = {
  hero: {
    kicker: 'Industrial Turnkey Partner',
    titleLine1: '산업시설 공사,',
    titleHighlight1: '빠르게',
    titleMiddle: '그리고',
    titleHighlight2: '정확하게.',
    description:
      '공장 개축 · 증축, 생산 장비 · 중량물 이전 설치, 신설 배관, 고압배관 · 탱크 용접, 반도체 공장의 크린룸 · CDA · PCW 배관까지. 규모 있는 공사일수록 업체를 나누지 않고 한 팀이 턴키로 맡습니다. 진단부터 마감까지, 필요하면 정기 관리 계약까지.',
    primaryCta: '빠른 견적 받기',
    secondaryCta: '개보수 범위 보기',
    stats: [
      { value: '24H', label: '문의 당일 회신 · 현장 방문 일정 조율' },
      { value: 'ZERO', label: '불필요한 가동 중단 — 구간별 시공' },
      { value: 'ONE STOP', label: '건축부터 설비 · 장비까지 전 공종 시공 가능' },
    ],
    ticker: ['개축 · 증축', '장비 이전 설치', '신설 배관', '고압배관 · 탱크 용접', '반도체 설비', '크린룸 · CDA · PCW', '철골 · 지붕', '정기 관리 계약'],
  },
  scope: {
    kicker: 'Scope of Work',
    title: '규모 있는 공사부터,\n한 팀이 턴키로 끝냅니다.',
    description:
      '공장 개축 · 증축, 장비 · 중량물 이전 설치, 신설 배관과 공압설비, 스텐 고압배관 · 탱크 용접, 반도체 공장 설비까지. 여러 공종이 얽히는 공사일수록 업체를 나누지 않습니다. 물론 지붕 · 판넬 · 에폭시 같은 마감 공사도 같은 팀이 이어서 합니다.',
    items: [
      {
        n: '01',
        title: '개축 · 증축 · 철골',
        description:
          '철골 트러스 제작과 양중, 캐노피·증축 골조, 노후 공장 개축과 레이아웃 변경. 건물의 골격부터 외피까지 직접 시공합니다.',
        image: '/images/gallery/g-truss-lift.jpg',
      },
      {
        n: '02',
        title: '장비 · 중량물 이전 설치',
        description:
          '수십 톤 챔버·탱크의 회전 안착, 생산 장비 해체·이송·재설치, 레벨·앵커 고정과 배관·전기 재연결. 크레인 계획부터 시운전까지 한 팀이 맡습니다.',
        image: '/images/factory/heavy-chamber-wide.jpg',
      },
      {
        n: '03',
        title: '신설 배관 · 고압배관 · 용접',
        description:
          '공압·유틸리티 배관 신설과 이설, 스텐 고압배관 제작, 탱크·챔버 용접 보수. 압력 손실과 누수는 증상만 막지 않고 원인부터 찾습니다.',
        image: '/images/factory/heavy-weld-seam.jpg',
      },
      {
        n: '04',
        title: '반도체 설비 · 크린룸 · 마감',
        description:
          '크린룸 구축과 보수, CDA·PCW 배관, 방음·흡음. 큰 공사 뒤 지붕·판넬·에폭시 바닥 같은 마감까지 같은 팀이 이어서 끝냅니다.',
        image: '/images/semiconductor/cleanroom-bay.webp',
      },
    ],
    extras: [
      '공장 개축 · 증축',
      '장비 · 중량물 이전 설치',
      '신설 배관',
      '철골 트러스 제작',
      '지붕 · 판넬',
      '외벽 · 벽체',
      '캐노피 · 증축',
      '에폭시 · 우레탄 바닥',
      '내부 단열',
      '방음 · 흡음',
      '크린룸',
      '반도체 공장 설비',
      '공압설비',
      '냉각수 배관',
      '배관설비',
      '배관 수리',
      '스텐 고압배관',
      '탱크 용접 보수',
      '스텐 제작 · 용접',
      '소화전 · 소방배관',
      '계단 · 난간',
      '장비 수리',
      '도장',
      '방수',
      '전기 · 조명',
    ],
  },
  process: {
    kicker: 'How We Work',
    title: '빨라야 할 때는 빠르게,\n정확해야 할 때는\n한 번 더 확인합니다.',
    description:
      '공장의 시간은 곧 비용입니다. 불필요한 대기 없이 움직이되, 진단과 견적은 대충 넘기지 않습니다. 고객이 어디까지 진행됐는지 항상 알 수 있게 소통합니다.',
    steps: [
      { n: 'STEP 1', time: '당일', title: '문의 · 회신', description: '전화, 카카오톡, 견적 폼 어디로든. 접수 당일 담당자가 직접 회신합니다.' },
      { n: 'STEP 2', time: '1 – 2일', title: '현장 진단', description: '도면과 사진만으로 판단하지 않습니다. 현장을 보고 원인과 범위를 함께 확인합니다.' },
      { n: 'STEP 3', time: '진단 후 48H', title: '견적 · 일정 확정', description: '작업 범위, 자재, 기간, 비용을 항목별로 정리해 드립니다. 애매한 표현은 남기지 않습니다.' },
      { n: 'STEP 4', time: '공정 맞춤', title: '구간별 시공', description: '생산 일정에 맞춰 구간을 나눠 진행합니다. 가동 중 시공, 주말·야간 시공도 협의 가능합니다.' },
      { n: 'STEP 5', time: '완료 후', title: '점검 · 사후관리', description: '완료 후 함께 점검하고, 시공 부위별 관리 포인트를 정리해 전달합니다.' },
    ],
  },
  gallery: {
    kicker: 'Our Work',
    title: '저희가 하는 일입니다.',
    description: '',
    groups: [
      {
        label: '철골 · 지붕',
        images: [
          '/images/gallery/g-steel-frame-1.jpg',
          '/images/gallery/g-steel-truss.jpg',
          '/images/gallery/g-steel-canopy.jpg',
        ],
      },
      {
        label: '벽체 · 판넬',
        images: [
          '/images/gallery/g-panel-window.jpg',
          '/images/gallery/g-panel-hall.jpg',
          '/images/gallery/g-canopy-done.jpg',
        ],
      },
      {
        label: '배관 · 공압',
        images: [
          '/images/gallery/g-pipe-sleeve.jpg',
          '/images/gallery/g-pipe-line.jpg',
          '/images/gallery/g-hp-gas.jpg',
        ],
      },
      {
        label: '탱크 · 용접',
        images: [
          '/images/gallery/g-tank-weld.jpg',
          '/images/gallery/g-tank-done.jpg',
          '/images/gallery/g-tank-parts.jpg',
        ],
      },
      {
        label: '스텐 제작',
        images: [
          '/images/gallery/g-manifold.jpg',
          '/images/gallery/g-worktable.jpg',
          '/images/gallery/g-rack.jpg',
        ],
      },
      {
        label: '소방 · 부대설비',
        images: [
          '/images/gallery/g-hydrant.jpg',
          '/images/gallery/g-stair.jpg',
          '/images/gallery/g-truss-lift.jpg',
        ],
      },
    ],
  },
  why: {
    kicker: 'Why NM Solution',
    title: '공장 개보수 업체,\n이렇게 일할 수도 있습니다.',
    description:
      '엔엠솔루션은 평택 고덕을 기반으로 경기·충청권 공장을 직접 방문합니다. 오래된 관행 대신, 고객이 이해하고 납득하는 방식으로 진행합니다.',
    items: [
      { en: 'FAST', ko: '신속하게', description: '문의 당일 회신, 빠른 현장 방문. 공장이 기다리는 시간을 최소화합니다.' },
      { en: 'PROFESSIONAL', ko: '전문적으로', description: '철골·배관·용접 각 공정의 기준을 알고, 증상이 아니라 원인부터 확인하고 시공합니다.' },
      { en: 'FRESH', ko: '젊은 감각으로', description: '사진·영상 기반 진행 공유, 명확한 견적서, 깔끔한 마감. 일하는 방식이 다릅니다.' },
      { en: 'CUSTOMER FIRST', ko: '고객 니즈에 충실하게', description: '우리가 하고 싶은 시공이 아니라, 현장에 필요한 시공을 제안합니다.' },
    ],
  },
  contact: {
    title: '공장 상황을 알려주세요.\n오늘 안에 답변드립니다.',
    description: '문제 부위 사진 몇 장이면 충분합니다. 나머지는 현장에서 확인합니다.',
    hours: '평일 09:00 – 18:00 · 긴급 누수 상담 가능',
  },
}

export const DEFAULT_SERVICES: ServicesContent = {
  kicker: 'Business Areas',
  title: '산업시설 공사를\n한 팀이 턴키로 맡습니다.',
  description:
    '엔엠솔루션의 핵심은 공장 개보수입니다. 개축·증축, 장비·중량물 이전 설치, 신설 배관, 고압배관·탱크 용접, 반도체 공장 설비까지 진단부터 마감까지 한 팀이 진행하고, 정기 관리 계약으로 이어 갑니다.',
  items: [
    {
      slug: 'factory',
      name: '공장 개보수',
      en: 'Industrial Turnkey',
      summary: '개축·증축, 장비 이전 설치, 신설 배관, 고압배관·탱크 용접까지. 산업시설 공사를 한 팀이 턴키로 맡습니다.',
      description:
        '엔엠솔루션은 산업시설 턴키 전문 회사입니다. 공장 개축·증축과 철골 트러스·캐노피 같은 규모 있는 공사, 생산 장비의 이전·설치, 공압·유틸리티 배관 신설, 스텐 고압배관 제작과 탱크 용접 보수, 반도체 공장의 크린룸·CDA·PCW 배관까지 진단부터 마감까지 한 팀이 진행합니다. 지붕·외벽 판넬, 에폭시 바닥, 방음 같은 마감 공사도 같은 팀이 이어서 합니다. 생산 일정에 맞춰 구간을 나눠 시공하고, 현장 진단 후 항목별로 명확한 견적을 제시합니다. 공장 시설을 통째로 맡기는 정기 관리 계약도 가능합니다.',
      image: '/images/factory/heavy-chamber-wide.jpg',
      points: [
        '공장 개축 · 증축 · 철골 트러스 제작 · 양중 · 캐노피',
        '생산 장비 · 중량물 이전 설치 · 회전 안착 · 재설치',
        '공압설비 · 유틸리티 배관 신설 · 이설 · 배관 수리',
        '스텐 고압배관 제작 · 탱크 · 챔버 용접 보수',
        '반도체 공장 크린룸 · 공압(CDA) · 냉각수(PCW) 배관',
        '지붕 · 외벽 판넬 교체 및 누수 보수',
        '에폭시 · 우레탄 바닥 · 내부 단열 · 방음 · 흡음',
        '가동 중 · 주말 · 야간 시공 협의 · 정기 관리 계약',
      ],
      targets: ['반도체 · 협력사 공장', '제조 · 물류 · 식품공장', '변압기 · 중공업 공장', '창고 · 공장 부속 사무동'],
      areasTitle: '규모 있는 공사부터,\n한 팀이 턴키로.',
      areasDescription:
        '개축·증축과 장비 이전, 신설 배관처럼 여러 공종이 얽히는 공사일수록 업체를 나누면 일정과 책임이 흩어집니다. 엔엠솔루션은 철골·용접·배관·설비를 한 팀이 맡아 진단, 견적, 시공, 마감까지 이어서 진행합니다. 아래는 실제 현장 사진입니다.',
      areasImage: '/images/factory/heavy-crane-yard.jpg',
      areas: [
        {
          title: '개축 · 증축 · 철골',
          description: '철골 트러스 제작과 양중, 캐노피·증축 골조, 노후 공장 개축. 생산동 레이아웃 변경까지 라인 일정에 맞춰 구간별로 진행합니다.',
          image: '/images/gallery/g-truss-lift.jpg',
        },
        {
          title: '장비 · 중량물 이전 설치',
          description: '진공건조로 챔버 같은 수십 톤 중량물의 회전 안착, 생산 장비 해체·이송·재설치, 레벨·앵커 고정과 배관·전기 재연결, 시운전까지.',
          image: '/images/factory/heavy-chamber-wide.jpg',
        },
        {
          title: '신설 배관 · 공압설비',
          description: 'CDA(압축공기)·유틸리티·배수 배관 신설과 증설, 설비 이전에 따른 배관 이설, 누수·파손 배관 수리. 서포트·랙까지 현장 치수에 맞춰 직접 제작합니다.',
          image: '/images/gallery/g-pipe-line.jpg',
        },
        {
          title: '고압배관 · 탱크 · 챔버 용접',
          description: '스텐 고압배관 제작, 탱크·챔버의 균열·누설부 용접 보수와 보강 프레임 제작. 용접부는 사진으로 전후를 남겨 드립니다.',
          image: '/images/factory/heavy-weld-seam.jpg',
        },
        {
          title: '반도체 공장 크린룸 · CDA · PCW',
          description: '크린룸 판넬·파티션·천장 구축과 보수, 공압(CDA) 메인·분기 배관, 공정 냉각수(PCW) 순환 배관 신설·교체. 셧다운 일정에 맞춥니다.',
          image: '/images/semiconductor/cleanroom-bay.webp',
        },
        {
          title: '지붕 · 판넬 · 바닥 · 방음',
          description: '지붕·외벽 판넬 교체와 누수 보수, 에폭시·우레탄 바닥, 컴프레서·칠러 주변 방음·흡음. 큰 공사 뒤 마감까지 같은 팀이 끝냅니다.',
          image: '/images/gallery/g-panel-hall.jpg',
        },
      ],
      // 영상은 R2 버킷 nm-solution-media/factory/ (lib/clients/media.ts 와 같은 버킷). 원본은 kevin PC 금강변압기·신일공업 자료.
      media: [
        {
          kind: 'video',
          src: 'https://pub-12315d6f651148cc9ed45ee6ffcc1d6b.r2.dev/factory/plan-aerial.mp4',
          poster: 'https://pub-12315d6f651148cc9ed45ee6ffcc1d6b.r2.dev/factory/plan-aerial.jpg',
          title: '항공 촬영 기반 중량물 이전 계획',
          caption: '현장을 드론으로 찍고 그 위에 크레인 위치, 양중 순서, 이동 경로를 그려 발주처와 먼저 합의합니다.',
        },
        {
          kind: 'video',
          src: 'https://pub-12315d6f651148cc9ed45ee6ffcc1d6b.r2.dev/factory/plan-lift.mp4',
          poster: 'https://pub-12315d6f651148cc9ed45ee6ffcc1d6b.r2.dev/factory/plan-lift.jpg',
          title: '수십 톤 챔버 양중 · 회전 안착 시뮬레이션',
          caption: '100톤·60톤 크레인 2대로 챔버를 들어 올려 180° 회전해 안착시키는 과정을 3D 로 미리 검토합니다.',
        },
        {
          kind: 'photo',
          src: '/images/factory/heavy-chamber-wide.jpg',
          title: '진공건조로 챔버 · 현장 실측',
          caption: '겐트리 크레인 아래에서 챔버 치수와 무게 중심, 용접 보수 범위를 실측했습니다.',
        },
        {
          kind: 'photo',
          src: '/images/factory/heavy-weld-seam.jpg',
          title: '챔버 모서리 용접부 점검',
          caption: '기존 용접선의 균열·부식 부위를 확인하고 재용접·보강 범위를 정합니다.',
        },
        {
          kind: 'video',
          src: 'https://pub-12315d6f651148cc9ed45ee6ffcc1d6b.r2.dev/factory/chamber-rotate.mp4',
          poster: 'https://pub-12315d6f651148cc9ed45ee6ffcc1d6b.r2.dev/factory/chamber-rotate.jpg',
          title: '챔버 회전 안착 · 용접면 개념도',
          caption: '어느 면을 바닥으로 놓고 어디를 용접할지, 현장 사진을 바탕으로 자세를 미리 정합니다.',
        },
        {
          kind: 'photo',
          src: '/images/factory/heavy-chamber-top.jpg',
          title: '상부 보강 프레임 제작',
          caption: '회전 중 변형을 막기 위해 개구부에 H형강 보강 프레임을 먼저 용접합니다.',
        },
        {
          kind: 'video',
          src: 'https://pub-12315d6f651148cc9ed45ee6ffcc1d6b.r2.dev/factory/roof-aerial.mp4',
          poster: 'https://pub-12315d6f651148cc9ed45ee6ffcc1d6b.r2.dev/factory/roof-aerial.jpg',
          title: '공장 지붕 교체 전 드론 점검',
          caption: '올라가지 않고도 지붕 전면의 부식과 이음부 상태를 항공 영상으로 확인하고 교체 범위를 잡습니다.',
        },
        {
          kind: 'photo',
          src: '/images/gallery/g-truss-lift.jpg',
          title: '철골 트러스 양중',
          caption: '공장 증축 골조. 제작한 트러스를 현장에서 들어 올려 조립합니다.',
        },
        {
          kind: 'photo',
          src: '/images/gallery/g-tank-weld.jpg',
          title: '스텐 탱크 용접',
          caption: '스텐 탱크·배관 제작과 용접 보수.',
        },
      ],
    },
    {
      slug: 'recovery',
      name: '누수 피해복구',
      en: 'Leak Damage Recovery',
      summary: '주택·공장 누수, 원인부터 막고 천장·벽·바닥 복구까지.',
      description:
        '윗집 배관, 욕실 방수, 공장 지붕 판넬까지. 물이 들어오는 곳을 먼저 찾아 막고, 젖은 천장·벽·바닥을 원래대로 되돌립니다. 보험 청구에 필요한 사진·원인 소견·공사 내역서도 정리해 드립니다.',
      image: '/images/recovery-before.png',
      points: ['누수 원인 위치 확인 및 차단', '천장 · 벽체 · 바닥 복구', '공장 지붕 판넬 · 홈통 · 실링 보수', '보험 청구용 사진 · 내역서 정리'],
      targets: ['아파트 · 빌라', '상가 · 사무실', '공장 · 창고'],
    },
    {
      slug: 'insulation',
      name: '단열 · 결로 · 곰팡이',
      en: 'Insulation & Mold',
      summary: '곰팡이를 지우는 것보다 다시 생기지 않게 하는 것이 중요합니다.',
      description:
        '결로와 곰팡이는 대부분 단열 취약 부위에서 반복됩니다. 표면만 처리하지 않고 원인이 되는 단열 구간을 보강해 재발을 막습니다.',
      image: '/images/mold-after.png',
      points: ['결로 · 곰팡이 원인 진단', '내단열 보강 시공', '방습 · 항균 마감', '환기 개선 제안'],
      targets: ['아파트 외벽면 세대', '반지하 · 필로티 상부', '공장 사무공간'],
    },
    {
      slug: 'coating',
      name: '나노 · UV 코팅',
      en: 'Nano & UV Coating',
      summary: '표면을 보호하고, 관리 시간을 줄입니다.',
      description:
        '타일·석재·마루·유리 등 표면에 나노 코팅과 UV 코팅을 시공합니다. 오염과 스크래치에 강해지고 청소와 유지관리가 쉬워집니다.',
      image: '/images/coating.png',
      points: ['욕실 · 주방 타일 나노코팅', '마루 · 원목 UV 코팅', '석재 · 유리 발수 코팅', '상업공간 바닥 보호'],
      targets: ['주거 공간', '상가 · 카페 · 매장', '공장 사무동'],
    },
    {
      slug: 'products',
      name: '코팅제 판매',
      en: 'Coating Products',
      summary: '현장에서 검증된 코팅제를 직접 공급합니다.',
      description:
        '엔엠솔루션이 시공에 사용하는 나노·UV 코팅제와 부자재를 시공업체 및 일반 고객에게 판매합니다. 용도별 사용법 안내를 함께 제공합니다.',
      image: '/images/products.png',
      points: ['나노 코팅제', 'UV 코팅제 · 경화 장비', '프라이머 · 부자재', '용도별 사용 가이드'],
      targets: ['시공업체', '인테리어 업체', '일반 고객'],
    },
    {
      slug: 'academy',
      name: '시공 교육',
      en: 'Academy',
      summary: '현장 기술을 체계적으로 전달합니다.',
      description:
        '코팅 시공, 누수 복구, 단열 시공 등 현장 기술을 실습 중심으로 교육합니다. 창업 준비자와 기존 시공업체의 기술 확장을 지원합니다.',
      image: '/images/academy.png',
      points: ['나노 · UV 코팅 실습 과정', '누수 진단 · 복구 과정', '단열 시공 과정', '창업 · 영업 노하우 공유'],
      targets: ['시공 창업 준비자', '기존 시공업체', '인테리어 종사자'],
    },
  ],
}

export const DEFAULT_ABOUT: AboutContent = {
  kicker: 'About NM Solution',
  title: '대표 인사',
  greetingTitle: '안녕하십니까, 엔엠솔루션 대표 김성배입니다.',
  greetingBody:
    '저희는 수년간 플랜트 설비, HVAC(공조설비), 철골 및 인테리어 분야에서 축적한 현장 경험을 바탕으로 산업시설과 주거시설에 필요한 유지보수, 개축 및 종합 메인터넌스 서비스를 제공하고 있습니다.\n\n저희 회사가 중요하게 생각하는 가치는 **‘SIMPLE + ORDER’**입니다.\n\n고객과의 소통은 명확하고 간결해야 하며, 고객의 오더는 반드시 완수해야 할 과업으로 받아들여야 한다는 뜻입니다. 불필요한 절차나 이견으로 시간을 지체하지 않고, 고객이 원하는 바를 정확히 파악하여 결과에 그대로 반영하겠습니다.\n\n복잡한 일도 심플하게, 많은 일도 체계적으로 처리하겠습니다. 점검부터 보수, 개선, 시공까지 전 과정을 일관되게 관리하여 고객이 여러 업체를 직접 조율해야 하는 번거로움 없이 필요한 결과를 얻을 수 있도록 하겠습니다.\n\n이 원칙은 대표뿐만 아니라 모든 임직원이 공유하는 업무 기준입니다. 고객의 요구를 가볍게 여기지 않고, 맡겨진 일은 반드시 해내야 하는 책임으로 받아들이겠습니다.\n\n고객은 필요한 것을 분명하게 말씀해 주시면 됩니다.\n어떻게 실현할 것인지는 저희가 고민하고, 끝까지 책임지겠습니다.\n\n감사합니다.',
  ceoName: '김성배',
  ceoTitle: '엔엠솔루션 대표',
  ceoImage: '/images/ceo-portrait-v2.webp',
}

export const DEFAULT_SETTINGS: SettingsContent = {
  showProjects: false,
  showGallery: false,
  companyName: '엔엠솔루션 (NM SOLUTION)',
  ceo: '김성배',
  address: '경기도 평택시 고덕동 도시지원로 121 지식공장아이타워 906호',
  phoneMain: '1800-5901',
  phoneMobile: '010-2369-3691',
  hours: '평일 09:00 – 18:00',
  kakaoUrl: 'https://pf.kakao.com/_xoxbjJX',
}

export const CONTENT_DEFAULTS = {
  home: DEFAULT_HOME,
  services: DEFAULT_SERVICES,
  about: DEFAULT_ABOUT,
  settings: DEFAULT_SETTINGS,
} as const

export type ContentKey = keyof typeof CONTENT_DEFAULTS
export type ContentMap = {
  home: HomeContent
  services: ServicesContent
  about: AboutContent
  settings: SettingsContent
}

export const PROJECT_CATEGORIES = [
  '철골 · 지붕',
  '외벽 · 벽체',
  '바닥',
  '단열 · 내부',
  '설비 · 배관',
  '탱크 · 용접',
  '스텐 제작',
  '장비 수리',
  '방음 · 크린룸',
  '기타',
] as const
