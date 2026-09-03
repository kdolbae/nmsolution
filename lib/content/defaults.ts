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
}

export const DEFAULT_HOME: HomeContent = {
  hero: {
    kicker: 'Factory Renovation Specialist',
    titleLine1: '공장 개보수,',
    titleHighlight1: '빠르게',
    titleMiddle: '그리고',
    titleHighlight2: '정확하게.',
    description:
      '가동을 멈추는 시간은 최소로, 결과는 오래가도록. 문의 당일 회신, 현장 진단 후 명확한 견적, 공정에 맞춘 구간별 시공까지 — 고객의 현장이 원하는 방식으로 일합니다.',
    primaryCta: '빠른 견적 받기',
    secondaryCta: '개보수 범위 보기',
    stats: [
      { value: '24H', label: '문의 당일 회신 · 현장 방문 일정 조율' },
      { value: 'ZERO', label: '불필요한 가동 중단 — 구간별 시공' },
      { value: 'ONE TEAM', label: '진단부터 마감까지 한 팀이 책임' },
    ],
    ticker: ['지붕 · 판넬', '외벽', '바닥', '단열', '도장', '설비 · 배관'],
  },
  scope: {
    kicker: 'Scope of Work',
    title: '공장에서 생기는 문제,\n범위와 상관없이 해결합니다.',
    description: '지붕 한 구간의 누수부터 공장 전체 리뉴얼까지. 현장을 보고 필요한 만큼만 정확하게 제안합니다.',
    items: [
      {
        n: '01',
        title: '지붕 · 판넬',
        description: '노후 판넬 교체, 누수 지붕 보수, 채광창·환기구 정비. 생산 라인 위에서 가장 먼저 문제가 생기는 곳입니다.',
        image: '/images/project-roof.png',
      },
      {
        n: '02',
        title: '외벽',
        description: '샌드위치 판넬 교체 및 보강, 외벽 도장, 실링 보수로 단열과 외관을 동시에 회복합니다.',
        image: '/images/factory-wall.png',
      },
      {
        n: '03',
        title: '바닥',
        description: '에폭시·우레탄 바닥 시공, 균열 보수, 라인 마킹. 지게차 동선과 공정 하중을 고려해 설계합니다.',
        image: '/images/factory-floor.png',
      },
      {
        n: '04',
        title: '단열 · 내부',
        description: '내부 단열 보강, 천장·벽체 마감, 사무공간 개보수. 작업 환경과 에너지 비용을 함께 개선합니다.',
        image: '/images/industrial.png',
      },
    ],
    extras: ['도장', '설비 · 배관', '전기 · 조명', '방수', '캐노피 · 증축', '사무실 인테리어'],
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
  why: {
    kicker: 'Why NM Solution',
    title: '공장 개보수 업체,\n이렇게 일할 수도 있습니다.',
    description:
      '엔엠솔루션은 평택 고덕을 기반으로 경기·충청권 공장을 직접 방문합니다. 오래된 관행 대신, 고객이 이해하고 납득하는 방식으로 진행합니다.',
    items: [
      { en: 'FAST', ko: '신속하게', description: '문의 당일 회신, 빠른 현장 방문. 공장이 기다리는 시간을 최소화합니다.' },
      { en: 'PROFESSIONAL', ko: '전문적으로', description: '지붕·외벽·바닥·단열 각 공정의 기준을 알고, 원인부터 확인하고 시공합니다.' },
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
    '엔엠솔루션의 핵심은 공장 개보수입니다. 여기에 현장에서 축적한 기술을 바탕으로 누수 복구, 단열·곰팡이, 코팅 솔루션과 제품·교육 사업을 함께 운영합니다.',
  items: [
    {
      slug: 'factory',
      name: '공장 개보수',
      en: 'Factory Renovation',
      summary: '지붕·판넬·외벽·바닥·단열까지, 가동을 고려한 구간별 시공.',
      description:
        '노후 공장의 지붕과 외벽 판넬 교체, 바닥 재시공, 내부 단열 보강 등 공장 건축물 전반의 개보수를 진행합니다. 생산 일정에 맞춰 구간을 나눠 시공하고, 현장 진단 후 항목별로 명확한 견적을 제시합니다.',
      image: '/images/hero-factory.png',
      points: ['지붕 · 판넬 교체 및 보수', '외벽 판넬 보강 · 도장', '에폭시 · 우레탄 바닥', '내부 단열 · 천장 · 벽체 마감', '가동 중 · 주말 · 야간 시공 협의'],
      targets: ['제조 · 물류 · 식품공장', '창고 · 공장 부속 사무동', '노후 판넬 건축물'],
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
    '내용은 관리자 페이지에서 입력하실 수 있습니다.\n\n여러 문단으로 작성하시면 자동으로 단락이 구분됩니다.',
  ceoName: '김성배',
  ceoTitle: '엔엠솔루션 대표',
  ceoImage: '',
}

export const DEFAULT_SETTINGS: SettingsContent = {
  showProjects: false,
  companyName: '엔엠솔루션 (NM SOLUTION)',
  ceo: '김성배',
  address: '경기도 평택시 고덕동 도시지원로 121 지식공장아이타워 906호',
  phoneMain: '1800-5901',
  phoneMobile: '010-2369-3691',
  hours: '평일 09:00 – 18:00',
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

export const PROJECT_CATEGORIES = ['지붕 · 판넬', '외벽', '바닥', '단열 · 내부', '기타'] as const
