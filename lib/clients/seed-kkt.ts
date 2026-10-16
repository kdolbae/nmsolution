import { discountForGrand, type Quote, type QuoteSection } from './quote'

/**
 * 금강변압기 견적서(최종 A안)를 업체 관리의 첫 업체로 넣을 때 쓰는 값.
 * 처음엔 /kkt 공개 페이지의 견적 내역에서 옮겼고, 지금은 공개 페이지 견적(kkt-public-quote.ts)도 이 값으로 만든다.
 * 2026-10-16 kevin: 4개 공정(베이스·인양·사상용접·전체 인양) 공정 합계 65,368,000원, 가격 조정(NEGO) 1,731,636원,
 * 공급가액 63,636,364원 + 부가세 6,363,636원 = 합계 70,000,000원.
 */
export const KKT_CLIENT = {
  name: '주식회사 금강변압기',
  siteAddress: '경기 화성시 마도면 마도공단로1길 214',
}

export const KKT_QUOTE: Quote = {
  "number": "NMS-2610-KKT-01",
  "date": "2026-10-12",
  "title": "진공건조로 2분할체 회전·안착 및 접합부 용접 공사",
  "sections": [
    {
      "id": "s3",
      "name": "베이스 작업",
      "desc": "사다리형 일체 임시 베이스 제작·설치 및 공사 후 회수, H-250×250",
      "items": [
        {
          "id": "i26",
          "kind": "재료비",
          "name": "H빔 (회수조건)",
          "spec": "H-250×250×9×14, 10m 2EA·5m 2EA (총 30m)",
          "unit": "식",
          "qty": 1,
          "price": 1800000,
          "note": "공사 후 회수 조건"
        },
        {
          "id": "i27",
          "kind": "운반비",
          "name": "H빔 운반",
          "spec": "반입·회수",
          "unit": "식",
          "qty": 1,
          "price": 167000,
          "note": ""
        },
        {
          "id": "i28",
          "kind": "노무비",
          "name": "시공자",
          "spec": "베이스 제작·설치",
          "unit": "인·일",
          "qty": 4,
          "price": 260000,
          "note": "4명 × 1일"
        }
      ],
      "noInsurance": true
    },
    {
      "id": "s1",
      "name": "인양 작업",
      "desc": "진공건조로 2기 회전·베이스 안착(1일), 용접면 밀착 이동(2일), 작업구역 안전펜스",
      "items": [
        {
          "id": "i1",
          "kind": "노무비",
          "name": "도비 전문기공",
          "spec": "회전·안착·밀착 이동",
          "unit": "인·일",
          "qty": 15,
          "price": 300000,
          "note": "안착일 6명 + 밀착 이동 6명·3명 (6, 6, 3)"
        },
        {
          "id": "i2",
          "kind": "노무비",
          "name": "신호수",
          "spec": "크레인 인양 신호",
          "unit": "인·일",
          "qty": 2,
          "price": 260000,
          "note": "2명 × 1일 (안착일)"
        },
        {
          "id": "i3",
          "kind": "노무비",
          "name": "안전담당 (관리감독자)",
          "spec": "작업 전 TBM·인양구역 통제",
          "unit": "인·일",
          "qty": 3,
          "price": 320000,
          "note": "1명 × 3일"
        },
        {
          "id": "i4",
          "kind": "장비",
          "name": "크레인",
          "spec": "100TON",
          "unit": "대·일",
          "qty": 1,
          "price": 2400000,
          "note": "안착일 1일. 현장 상황에 따라 200TON 1대(호이스트 30t 보조)로 대체 가능, 견적 금액 안에서 처리"
        },
        {
          "id": "i5",
          "kind": "장비",
          "name": "크레인",
          "spec": "60TON",
          "unit": "대·일",
          "qty": 1,
          "price": 1700000,
          "note": "안착일 1일. 200TON 1대로 대체 시 이 줄 포함, 추가비용 없음"
        },
        {
          "id": "i6",
          "kind": "장비",
          "name": "아웃리거 받침 철판",
          "spec": "1,500×1,500×25t, 8매",
          "unit": "식",
          "qty": 1,
          "price": 640000,
          "note": "아스팔트 지반 보호"
        },
        {
          "id": "i7",
          "kind": "장비",
          "name": "밀착 이동 장비",
          "spec": "유압잭·윈치·스키드",
          "unit": "SET",
          "qty": 1,
          "price": 2000000,
          "note": "밀착 이동 2일"
        },
        {
          "id": "i8",
          "kind": "장비",
          "name": "공구사용손료",
          "spec": "도비 전문장비·줄걸이구",
          "unit": "SET",
          "qty": 1,
          "price": 3000000,
          "note": ""
        },
        {
          "id": "i9",
          "kind": "재료비",
          "name": "소모품·잡자재",
          "spec": "목재 받침·와이어 보호대 등",
          "unit": "식",
          "qty": 1,
          "price": 1000000,
          "note": ""
        },
        {
          "id": "i10",
          "kind": "안전시설",
          "name": "안전펜스 임대",
          "spec": "이동식 메쉬펜스 H1.8×W2.4m",
          "unit": "매·일",
          "qty": 242,
          "price": 5000,
          "note": "22매(둘레 50m + 출입문) × 11일"
        },
        {
          "id": "i11",
          "kind": "노무비",
          "name": "펜스 설치·해체",
          "spec": "설치 인건비",
          "unit": "인·일",
          "qty": 2,
          "price": 250000,
          "note": "설치 2명 × 0.5일 + 해체 2명 × 0.5일"
        },
        {
          "id": "i12",
          "kind": "안전시설",
          "name": "펜스 운반",
          "spec": "1톤 화물 왕복",
          "unit": "회",
          "qty": 2,
          "price": 260000,
          "note": "반입 1 + 반출 1"
        },
        {
          "id": "i13",
          "kind": "재료비",
          "name": "출입통제 안전장비",
          "spec": "",
          "unit": "식",
          "qty": 1,
          "price": 380000,
          "note": ""
        },
        {
          "id": "i14",
          "kind": "경비",
          "name": "경비",
          "spec": "간식·음료·교통비 등",
          "unit": "식",
          "qty": 1,
          "price": 600000,
          "note": ""
        }
      ]
    },
    {
      "id": "s2",
      "name": "사상·용접 작업",
      "desc": "접합면 사상(2일) 및 접합부 CO2 용접(3일)",
      "items": [
        {
          "id": "i15",
          "kind": "노무비",
          "name": "용접사",
          "spec": "CO2 용접 (접합부)",
          "unit": "인·일",
          "qty": 9,
          "price": 500000,
          "note": "3명 × 3일"
        },
        {
          "id": "i16",
          "kind": "노무비",
          "name": "고급기술자",
          "spec": "제관사 수준 (취부·치수 관리)",
          "unit": "인·일",
          "qty": 6,
          "price": 350000,
          "note": "2명 × 3일"
        },
        {
          "id": "i17",
          "kind": "노무비",
          "name": "사상 기술자",
          "spec": "접합면 그라인딩",
          "unit": "인·일",
          "qty": 4,
          "price": 300000,
          "note": "2명 × 2일"
        },
        {
          "id": "i18",
          "kind": "노무비",
          "name": "조공",
          "spec": "사상·용접 보조",
          "unit": "인·일",
          "qty": 4,
          "price": 200000,
          "note": "2명 × 2일"
        },
        {
          "id": "i19",
          "kind": "노무비",
          "name": "화재감시자",
          "spec": "용접·사상 화기작업 전담",
          "unit": "인·일",
          "qty": 5,
          "price": 250000,
          "note": "1명 × 5일 (사상 2 + 용접 3)"
        },
        {
          "id": "i20",
          "kind": "장비",
          "name": "CO2 용접기 대여",
          "spec": "500A급",
          "unit": "대·일",
          "qty": 9,
          "price": 400000,
          "note": "3대 × 3일"
        },
        {
          "id": "i21",
          "kind": "장비",
          "name": "그라인더·환기·조명",
          "spec": "송풍기, 투광등 포함",
          "unit": "SET",
          "qty": 1,
          "price": 800000,
          "note": ""
        },
        {
          "id": "i22",
          "kind": "재료비",
          "name": "용접 소모품",
          "spec": "CO2 가스·와이어·디스크·케이블·잡자재",
          "unit": "식",
          "qty": 1,
          "price": 3680000,
          "note": ""
        },
        {
          "id": "i23",
          "kind": "장비",
          "name": "작업발판 장비 임대",
          "spec": "",
          "unit": "식",
          "qty": 1,
          "price": 1000000,
          "note": ""
        },
        {
          "id": "i24",
          "kind": "장비",
          "name": "가스절단기 임대",
          "spec": "산소·LPG, 2대 공정기간 상시",
          "unit": "대·일",
          "qty": 22,
          "price": 100000,
          "note": "2대 × 11일"
        },
        {
          "id": "i25",
          "kind": "경비",
          "name": "경비",
          "spec": "식대·교통비·부대 잡비",
          "unit": "식",
          "qty": 1,
          "price": 1400000,
          "note": "용접 9 + 고급기술자 6 + 사상 4 + 조공 4 + 화재감시 5"
        }
      ]
    },
    {
      "id": "s4",
      "name": "전체 인양 작업",
      "desc": "진공건조로 전체 인양 (250TON 크레인, 1일)",
      "overheadOnly": true,
      "items": [
        {
          "id": "i29",
          "kind": "장비",
          "name": "크레인",
          "spec": "250TON",
          "unit": "대·일",
          "qty": 1,
          "price": 5500000,
          "note": "전체 인양 1일"
        },
        {
          "id": "i30",
          "kind": "장비",
          "name": "인양 부대장비",
          "spec": "줄걸이구·샤클·인양 보조장비",
          "unit": "식",
          "qty": 1,
          "price": 2000000,
          "note": ""
        },
        {
          "id": "i31",
          "kind": "노무비",
          "name": "도비 전문기공",
          "spec": "전체 인양",
          "unit": "인·일",
          "qty": 6,
          "price": 300000,
          "note": "6명 × 1일"
        }
      ]
    }
  ],
  "costCalc": true,
  "rates": {
    "injury": 3.56,
    "employment": 1.15,
    "safety": 3.11,
    "overhead": 5,
    "profit": 15
  },
  "truncate": true,
  "discount": 1731636,
  "discountLabel": "가격 조정 (NEGO)",
  "notes": "전기 수전, 배관·닥트 해체·복구, 보온, 도장, 시운전은 포함하지 않음.\n인양 작업 크레인은 100TON·60TON 2대 기준이며, 현장 상황에 따라 상위 크레인 1대(200TON, 호이스트 30t 보조 조건)로 작업할 수 있음. 이 경우에도 본 견적 금액 안에서 처리하며 추가비용은 없음.\n비파괴검사(PT/UT)는 포함하지 않으며, 발주처 요구 시 별도 정산함.\n연장·야간·휴일 작업은 공정에 따라 당사가 수행하며 추가 정산하지 않음.\n기상(우천 시 용접 불가)·발주처 사유에 따른 대기는 별도 협의함.\n작업구역(약 10×15m)은 이동식 안전펜스로 통제하며, 발주처 안전관리 규정과 출입 절차를 따름.\n공사 기간: 2026.10.21 ~ 11.02, 작업일 11일 (일요일 휴무)\n결제 조건: 선수금 30%, 용접을 위한 인양(도비) 작업 완료 시 30%, 모든 접합 작업 완료 후 30%, 전체 인양 작업 완료 후 10%",
  "validDays": 30
}

/** 2026-10-16 kevin: 베이스 작업은 재료비·운반비·노무비(시공자 × 1일)만, 원가계산 제외 */
const KKT_BASE_ITEMS = KKT_QUOTE.sections.find((s) => s.name === '베이스 작업')!.items

/** 2026-10-16 kevin: 견적 순서는 베이스 → 인양 → 사상·용접 → 전체 인양, 부가세 포함 최종 7천만 원 */
export const KKT_ORDER = ['베이스 작업', '인양 작업', '사상·용접 작업', '전체 인양 작업']
export const KKT_GRAND = 70_000_000
/** 2026-10-16 kevin: 크레인 2대 대신 200TON 1대(호이스트 30t 보조)로 할 수도 있고, 견적 금액 안에서 처리 */
const KKT_PAY_NEW = '결제 조건: 선수금 30%, 용접을 위한 인양(도비) 작업 완료 시 30%, 모든 접합 작업 완료 후 30%, 전체 인양 작업 완료 후 10%'
const KKT_CRANE_ITEM_NOTES: Record<string, string> = { '100TON': '안착일 1일. 현장 상황에 따라 200TON 1대(호이스트 30t 보조)로 대체 가능, 견적 금액 안에서 처리', '60TON': '안착일 1일. 200TON 1대로 대체 시 이 줄 포함, 추가비용 없음' }
const KKT_STATS: [string, string][] = [
    [
      "<div class=\"l\">대상물 합계 (38t + 48t)</div>",
      "<div class=\"l\">대상물 합계 (38t + 48t) · 최대 단일 인양 48t</div>"
    ],
    [
      "<div class=\"l\">이동식 크레인 (1일)</div>",
      "<div class=\"l\">이동식 크레인 1일 (계획)<br><b style=\"color:var(--orange)\">현장 여건에 따라 200t 1대로 상향 가능</b></div>"
    ],
    [
      "<div class=\"v\">600<small>mm</small></div><div class=\"l\">밀착 이동 후 접합 용접</div>",
      "<div class=\"v\">약 30<small>m 이상</small></div><div class=\"l\">총 용접 연장 (접합부 둘레 20m + 보강 빔·날개)</div>"
    ]
  ]
const KKT_CRANE_OLD = '크레인 사양·배치가 바뀌어도 추가비용은 없음.'
export const KKT_CRANE_NOTE =
  '인양 작업 크레인은 100TON·60TON 2대 기준이며, 현장 상황에 따라 상위 크레인 1대(200TON, 호이스트 30t 보조 조건)로 작업할 수 있음. 이 경우에도 본 견적 금액 안에서 처리하며 추가비용은 없음.'
const KKT_FULL_LIFT = KKT_QUOTE.sections.find((s) => s.name === '전체 인양 작업')!

/**
 * 2026-10-16 kevin: 베이스 작업도 일반관리비·이윤을 넣되 공정 금액 3,360,000원은 그대로.
 * H빔 10m 2EA·5m 2EA(총 30m) 1,800,000원, 운반 167,000원, 시공자 4명 × 260,000원.
 */
function newBase(s: QuoteSection): QuoteSection {
  const seed = KKT_QUOTE.sections.find((x) => x.name === '베이스 작업')!
  return { ...s, flat: false, overheadOnly: false, noInsurance: true, items: seed.items.map((i) => ({ ...i })) }
}

const isOldBase = (s: QuoteSection) =>
  s.name === '베이스 작업' && s.items.some((i) => i.name === 'H빔 (회수조건)' && i.spec.includes('0.6m 30EA'))

/** 3개 공종(도비·용접·베이스) 견적을 4개 공정으로 바꾼다. 이미 바뀌었으면 null */
function toFourStages(sections: QuoteSection[]): QuoteSection[] | null {
  if (sections.some((s) => s.name === '전체 인양 작업') || !sections.some((s) => s.name === '도비 작업')) return null
  const renamed = sections.map((s) => {
    if (s.name === '도비 작업') return { ...s, name: '인양 작업' }
    if (s.name === '용접 작업') return { ...s, name: '사상·용접 작업' }
    if (s.name === '베이스 작업') return newBase(s)
    return s
  })
  renamed.push({ ...KKT_FULL_LIFT, items: KKT_FULL_LIFT.items.map((i) => ({ ...i })) })
  const rank = (s: QuoteSection) => {
    const r = KKT_ORDER.indexOf(s.name)
    return r < 0 ? KKT_ORDER.length : r
  }
  return renamed.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map((x) => x.s)
}

/**
 * 이미 저장된 금강변압기 견적서·제안서를 위 값으로 고친다. 옛 베이스(H빔 9,991kg × 700원)가 남아 있을 때만
 * 바꾸므로 여러 번 돌려도 같다. 바꿀 것이 없으면 null.
 */
export const KKT_B_NOTE = 'A안(기본안) 기준 견적. B안'

/**
 * 운영 DB 에 저장된 금강변압기 견적서·제안서를 최신 결정에 맞춘다. 바뀐 것이 없으면 null.
 * - 2026-10-16 베이스 공종 3,010,000원 (재료·운반·시공자 3명 × 1일, 원가계산 제외)
 * - 2026-10-16 4개 공정(베이스·인양·사상용접·전체 인양), 가격 조정(NEGO)으로 부가세 포함 70,000,000원
 * - 2026-10-16 특기사항: 크레인 2대 대신 200TON 1대(호이스트 30t 보조)로도 작업, 견적 금액 안에서 처리
 * - 2026-10-16 A안만 최종 견적: 공사명의 "(A안)", 특기사항의 B안 줄, 제안서의 B안 내용 삭제
 *   (제안서는 B안이 남아 있으면 A안 전용 공개 페이지로 다시 만든다. 이전 내용은 버전 기록에 남는다)
 */
export function upgradeKkt(
  quote: Quote,
  proposalHtml: string,
  freshProposal: () => string,
): { quote: Quote; proposalHtml: string; summary: string } | null {
  const done: string[] = []
  const sections = quote.sections.map((s) => {
    const old = s.items.some((i) => i.name === 'H빔 (회수조건)' && i.qty === 9991)
    if (s.name !== '베이스 작업' || !old) return s
    done.push('베이스 공종 3,010,000원')
    return { ...s, flat: true, items: KKT_BASE_ITEMS.map((i) => ({ ...i })) }
  })
  let next = sections
  let discount = quote.discount
  let baseFixed = false
  const four0 = toFourStages(sections)
  const four = (four0 ?? sections).some(isOldBase)
    ? (four0 ?? sections).map((s) => {
        if (!isOldBase(s)) return s
        baseFixed = true
        return newBase(s)
      })
    : four0
  if (four) {
    next = four
    discount = discountForGrand({ ...quote, sections: four }, KKT_GRAND) ?? 0
    done.push('4개 공정(전체 인양 추가)·가격 조정으로 합계 70,000,000원')
    if (baseFixed) done.push('베이스 작업 일반관리비·이윤 포함(금액 동일)')
  }
  let { title, notes } = quote
  if (/\s*\(A안\)$/.test(title) || notes.includes(KKT_B_NOTE)) {
    title = title.replace(/\s*\(A안\)$/, '')
    notes = notes
      .split('\n')
      .filter((l) => !l.startsWith(KKT_B_NOTE))
      .join('\n')
    done.push('견적서 B안 문구 삭제')
  }
  // 2026-10-16 kevin: 결제 조건 30/30/30/10, 크레인 줄 비고에도 200TON 대체 안내
  const payLines = notes.split('\n')
  const pi = payLines.findIndex((l) => l.startsWith('결제 조건:'))
  if (pi >= 0 && payLines[pi] !== KKT_PAY_NEW) {
    payLines[pi] = KKT_PAY_NEW
    notes = payLines.join('\n')
    done.push('결제 조건 30/30/30/10')
  }
  let craneNoted = false
  next = next.map((s) => ({
    ...s,
    items: s.items.map((i) => {
      const n = KKT_CRANE_ITEM_NOTES[i.spec]
      if (s.name !== '인양 작업' || i.name !== '크레인' || !n || i.note !== '안착일 1일') return i
      craneNoted = true
      return { ...i, note: n }
    }),
  }))
  if (craneNoted) done.push('크레인 비고 200TON 대체 안내')
  if (notes.includes(KKT_CRANE_OLD)) {
    notes = notes.replace(KKT_CRANE_OLD, KKT_CRANE_NOTE)
    done.push('특기사항 200TON 크레인 1대 대체 안내')
  }
  let html = proposalHtml.replaceAll('제관 2, 용접 1, 조공 1, 화재감시 1', '시공자 3명')

  if (html !== proposalHtml) done.push('베이스 인원 시공자 3명')
  // 2026-10-16 kevin: 상단 카드에 최대 인양 무게, 200t 상향 가능, 총 용접 연장(600mm 대신)
  const statsBefore = html
  for (const [from, to] of KKT_STATS) html = html.replace(from, to)
  if (html !== statsBefore) done.push('제안서 상단 카드(크레인 상향·용접 연장)')
  // 2026-10-16 kevin: 베이스 시공자 4명
  const crewBefore = html
  html = html.replaceAll('시공자 3명', '시공자 4명')
  if (html !== crewBefore) done.push('베이스 인원 시공자 4명')
  if (html.includes('id="plan-b"') || html.includes('B안')) {
    html = freshProposal()
    done.push('제안서 B안 삭제')
  }
  if (!done.length) return null
  return { quote: { ...quote, title, notes, sections: next, discount }, proposalHtml: html, summary: `자동 정리: ${done.join(', ')}` }
}
