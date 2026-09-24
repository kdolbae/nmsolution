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
    kicker: 'Factory Renovation Specialist',
    titleLine1: '공장의 모든 수리,',
    titleHighlight1: '빠르게',
    titleMiddle: '그리고',
    titleHighlight2: '정확하게.',
    description:
      '철골 · 지붕 · 벽체부터 배관 수리, 탱크 용접, 장비 수리, 그리고 반도체 공장의 크린룸 · 방음 · 공압 · 냉각수 배관까지. 공장에서 생기는 문제는 무엇이든 맡겨 주세요. 상황마다 업체를 따로 찾을 필요 없이, 진단부터 마감까지 모두 진행해 드립니다.',
    primaryCta: '빠른 견적 받기',
    secondaryCta: '개보수 범위 보기',
    stats: [
      { value: '24H', label: '문의 당일 회신 · 현장 방문 일정 조율' },
      { value: 'ZERO', label: '불필요한 가동 중단 — 구간별 시공' },
      { value: 'ONE STOP', label: '건축부터 설비 · 장비까지 전 공종 시공 가능' },
    ],
    ticker: ['반도체 설비', '크린룸 · 방음', '공압 · 냉각수', '철골 · 지붕', '벽체 · 판넬', '탱크 · 용접', '스텐 제작'],
  },
  scope: {
    kicker: 'Scope of Work',
    title: '공장 안에서 생기는 문제는\n전부 저희 일입니다.',
    description:
      '철골 · 지붕 · 벽체 같은 건축 공사부터 고압 배관 수리, 탱크 용접 보수, 스텐 제작, 생산 장비 수리, 방음 · 흡음, 크린룸까지. 지붕 한 구간의 누수도, 공장 전체 리뉴얼도 한 곳에서 끝냅니다.',
    items: [
      {
        n: '01',
        title: '철골 · 지붕 · 벽체',
        description:
          '철골 트러스 제작과 양중, 캐노피·증축 골조, 노후 판넬·누수 지붕 보수, 외벽 마감과 실링. 건물의 골격부터 외피까지 직접 시공합니다.',
        image: '/images/project-roof.png',
      },
      {
        n: '02',
        title: '배관 · 탱크 · 용접',
        description:
          '공압·배관 설비 신설과 노후 배관 수리, 스텐 고압배관 제작, 탱크 용접 보수. 압력 손실과 누수는 증상만 막지 않고 원인부터 찾습니다.',
        image: '/images/industrial.png',
      },
      {
        n: '03',
        title: '바닥 · 단열 · 도장',
        description:
          '에폭시·우레탄 바닥과 라인 마킹, 내부 단열 보강, 외벽·철골 도장. 하중과 동선, 온도와 결로를 같이 잡습니다.',
        image: '/images/factory-floor.png',
      },
      {
        n: '04',
        title: '크린룸 · 방음 · 흡음',
        description:
          '크린룸 구축과 보수, 방음·흡음 판넬 시공. 청정도와 소음 기준을 먼저 확인하고 라인을 세우는 시간을 최소로 잡습니다.',
        image: '/images/insulation.png',
      },
    ],
    extras: [
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
  title: '공장 개보수를 중심으로,\n공간의 문제를 함께 해결합니다.',
  description:
    '엔엠솔루션의 핵심은 공장 개보수입니다. 반도체 공장의 크린룸·공압·냉각수·배관설비까지 맡고, 현장에서 축적한 기술을 바탕으로 누수 복구, 단열·곰팡이, 코팅 솔루션과 제품·교육 사업을 함께 운영합니다.',
  items: [
    {
      slug: 'factory',
      name: '공장 개보수',
      en: 'Factory Renovation',
      summary: '철골·지붕·벽체부터 배관·탱크 용접, 반도체 공장 크린룸·공압·냉각수까지 모두 가능합니다.',
      description:
        '공장에서 생기는 수리는 범위를 나누지 않습니다. 철골 트러스 제작과 캐노피 증축, 지붕·외벽 판넬 교체, 바닥 재시공 같은 건축 공사부터 공압·배관 설비, 스텐 고압배관, 탱크 용접 보수, 생산 장비 수리, 방음·흡음, 크린룸 구축까지 함께 진행합니다. 반도체와 협력사 공장의 크린룸, 공압(CDA)·공정 냉각수(PCW)·유틸리티 배관도 맡습니다. 생산 일정에 맞춰 구간을 나눠 시공하고, 현장 진단 후 항목별로 명확한 견적을 제시합니다.',
      image: '/images/hero-factory.png',
      points: [
        '철골 트러스 제작 · 양중 · 캐노피 증축',
        '지붕 · 외벽 판넬 교체 및 누수 보수',
        '에폭시 · 우레탄 바닥 · 내부 단열',
        '공압설비 · 배관설비 · 배관 수리',
        '스텐 고압배관 제작 · 탱크 용접 보수',
        '생산 장비 정비 · 방음 · 흡음 · 크린룸',
        '반도체 공장 크린룸 · 공압(CDA) · 냉각수(PCW) 배관',
        '가동 중 · 주말 · 야간 시공 협의',
      ],
      targets: ['반도체 · 협력사 공장', '제조 · 물류 · 식품공장', '창고 · 공장 부속 사무동', '노후 판넬 건축물'],
      areasTitle: '반도체 공장 설비도,\n모두 맡겨 주세요.',
      areasDescription:
        '반도체와 협력사 공장은 청정도, 진동, 온도, 유틸리티 공급 중 하나만 흔들려도 라인이 멈춥니다. 공장 개보수부터 크린룸, 방음, 공압, 냉각수, 배관설비까지 모두 시공 가능하니 문제마다 업체를 따로 찾지 않으셔도 됩니다. 가동 중인 라인은 셧다운 일정에 맞춰 구간별로 진행하고, 현장 반입 절차와 안전 기준을 먼저 확인한 뒤 들어갑니다.',
      areasImage: '/images/semiconductor/cleanroom-corridor.webp',
      areas: [
        {
          title: '반도체 공장 개보수',
          description: '생산동·유틸리티동의 철골, 지붕, 벽체, 바닥 보수와 레이아웃 변경. 라인 일정에 맞춰 구간별로 진행합니다.',
          image: '/images/semiconductor/renovation.webp',
        },
        {
          title: '크린룸',
          description: '크린룸 판넬과 파티션, 출입부, 천장 구축과 보수. 요구 청정도와 기류를 먼저 확인하고 시공합니다.',
          image: '/images/semiconductor/cleanroom-bay.webp',
        },
        {
          title: '방음 · 흡음',
          description: '컴프레서·칠러·배기 설비 주변 소음을 줄이는 방음벽, 흡음 판넬, 설비 방음 커버를 시공합니다.',
          image: '/images/semiconductor/acoustic.webp',
        },
        {
          title: '공압 설비',
          description: 'CDA(압축공기) 메인 배관과 분기 배관 신설·증설, 드롭 배관과 레귤레이터, 압력 손실·누기 보수.',
          image: '/images/semiconductor/pneumatic.webp',
        },
        {
          title: '냉각수 배관',
          description: '공정 냉각수(PCW)·냉각탑 순환 배관 신설과 교체, 보온, 누수 보수. 가동 중 라인은 셧다운 일정에 맞춥니다.',
          image: '/images/semiconductor/cooling-water.webp',
        },
        {
          title: '배관설비',
          description: '스텐 고압배관, 유틸리티·배수 배관 제작과 설치, 서포트·랙 제작까지 현장 치수에 맞춰 직접 만듭니다.',
          image: '/images/semiconductor/piping.webp',
        },
      ],
    },
    {
      slug: 'recovery',
      name: '누수 피해복구',
      en: 'Leak Damage Recovery',
      summary: '누수 원인 해결부터 마감 복구까지 한 번에.',
      description:
        '아파트·상가·공장 등에서 발생한 누수 피해를 원인 진단부터 마감 복구까지 한 팀이 책임집니다. 보험 처리에 필요한 사진·내역 정리도 함께 도와드립니다.',
      image: '/images/recovery-after.png',
      points: ['누수 원인 진단 및 차단', '천장 · 벽체 · 바닥 복구', '도배 · 도장 · 마루 마감', '보험 처리용 자료 정리'],
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
    '공장은 멈추는 순간부터 비용입니다. 저희가 하는 일은 그 시간을 줄이는 일입니다.\n\n엔엠솔루션은 경기도 평택 고덕에서 공장 개보수와 피해복구를 합니다. 철골·지붕·벽체 같은 건축 공사부터 배관·공압 설비, 탱크 용접과 스텐 제작, 방음·흡음·크린룸, 장비 수리까지 모두 직접 시공합니다. 문제가 생길 때마다 업체를 따로 찾지 않으셔도 되도록 하기 위해서입니다.\n\n현장은 저마다 사정이 다릅니다. 도면대로 되지 않는 곳, 가동을 멈출 수 없는 라인, 주말 안에 끝내야 하는 보수. 그런 조건을 먼저 듣고 방법을 맞춥니다.\n\n문의 주시면 당일 회신드리겠습니다. 제가 직접 받는 번호는 010-2369-3691입니다.',
  ceoName: '김성배',
  ceoTitle: '엔엠솔루션 대표',
  ceoImage: '/images/ceo.webp',
}

export const DEFAULT_SETTINGS: SettingsContent = {
  showProjects: false,
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
