import type { Quote } from './quote'

/**
 * 금강변압기 견적서(최종 A안)를 업체 관리의 첫 업체로 넣을 때 쓰는 값.
 * app/kkt/page-html.ts 의 QUOTE_HTML(A안 공종별 내역서)에서 옮겼다. 공급가액 55,253,000원 (2026-10-16 베이스 공종 3,010,000원으로 변경).
 * 2026-10-19 kevin: 250톤 1대 단독(100t·60t 삭제), 간소 베이스(H빔 10m 2본 + 양 끝 3m 빔), 완성품 이동 추가,
 * 최종 금액은 VAT 포함 70,000,000원 그대로(공종 합계 66,188,000원 + 협의 조정 → 공급가액 63,636,364원).
 */
export const KKT_CLIENT = {
  name: '주식회사 금강변압기',
  siteAddress: '경기 화성시 마도면 마도공단로1길 214',
}

export const KKT_QUOTE: Quote = {
  "number": "NMS-2610-KKT-01",
  "date": "2026-10-19",
  "title": "진공건조로 2분할체 회전·안착 및 접합부 용접 공사",
  "sections": [
    {
      "id": "s1",
      "name": "도비 작업",
      "desc": "진공건조로 2기 회전·베이스 안착(1일), 용접면 밀착(2일), 완성품 이동(1일), 작업구역 안전펜스",
      "items": [
        {
          "id": "i1",
          "kind": "노무비",
          "name": "도비 전문기공",
          "spec": "회전·안착·밀착·완성품 이동",
          "unit": "인·일",
          "qty": 21,
          "price": 300000,
          "note": "안착일 6명 + 밀착 6명·3명 + 이동일 6명 (6, 6, 3, 6)"
        },
        {
          "id": "i2",
          "kind": "노무비",
          "name": "신호수",
          "spec": "크레인 인양 신호",
          "unit": "인·일",
          "qty": 4,
          "price": 260000,
          "note": "2명 × 2일 (안착일 + 이동일)"
        },
        {
          "id": "i3",
          "kind": "노무비",
          "name": "안전담당 (관리감독자)",
          "spec": "작업 전 TBM·인양구역 통제",
          "unit": "인·일",
          "qty": 4,
          "price": 320000,
          "note": "1명 × 4일"
        },
        {
          "id": "i4",
          "kind": "장비",
          "name": "크레인",
          "spec": "250TON",
          "unit": "대·일",
          "qty": 2,
          "price": 5000000,
          "note": "안착일 1일 + 이동일 1일"
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
          "name": "밀착 장비",
          "spec": "유압잭·윈치·스키드",
          "unit": "SET",
          "qty": 1,
          "price": 2000000,
          "note": "밀착 2일"
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
          "qty": 264,
          "price": 5000,
          "note": "22매(둘레 50m + 출입문) × 12일"
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
      "name": "용접 작업",
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
          "qty": 24,
          "price": 100000,
          "note": "2대 × 12일"
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
      "id": "s3",
      "name": "베이스 작업",
      "desc": "기존 철판 조방 위 H빔 임시 베이스 설치 및 공사 후 회수, H-250×250",
      "items": [
        {
          "id": "i26",
          "kind": "재료비",
          "name": "H빔 (회수조건)",
          "spec": "H-250×250×9×14, 10m 2EA·3m 2EA",
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
          "price": 160000,
          "note": ""
        },
        {
          "id": "i28",
          "kind": "노무비",
          "name": "시공자",
          "spec": "베이스 배치·용접·회수",
          "unit": "인·일",
          "qty": 3,
          "price": 350000,
          "note": "3명 × 1일"
        }
      ],
      "flat": true
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
  "notes": "전기 수전, 배관·닥트 해체·복구, 보온, 도장, 시운전은 포함하지 않음.\n크레인 사양·배치가 바뀌어도 추가비용은 없음.\n비파괴검사(PT/UT)는 포함하지 않으며, 발주처 요구 시 별도 정산함.\n연장·야간·휴일 작업은 공정에 따라 당사가 수행하며 추가 정산하지 않음.\n기상(우천 시 용접 불가)·발주처 사유에 따른 대기는 별도 협의함.\n작업구역(약 10×15m)은 이동식 안전펜스로 통제하며, 발주처 안전관리 규정과 출입 절차를 따름.\n공사 기간: 2026.10.21 ~ 11.03, 작업일 12일 (일요일 휴무)\n결제 조건: 선수금 30%, 안착 완료 시 중도금 30%, 완성품 이동 완료 후 잔금 40%\n크레인은 250톤 1대로 안착·완성품 이동을 모두 수행함.",
  "validDays": 30,
  "adjust": {
    "label": "협의 조정",
    "amount": -2551636,
    "note": "발주처 협의 금액 반영"
  }
}


/** 2026-10-16 kevin: 베이스 작업은 재료비·운반비·노무비(3명 × 1일)만, 원가계산 제외 */
const KKT_BASE_ITEMS = KKT_QUOTE.sections.find((s) => s.name === '베이스 작업')!.items

/**
 * 이미 저장된 금강변압기 견적서·제안서를 위 값으로 고친다. 옛 베이스(H빔 9,991kg × 700원)가 남아 있을 때만
 * 바꾸므로 여러 번 돌려도 같다. 바꿀 것이 없으면 null.
 */
export const KKT_B_NOTE = 'A안(기본안) 기준 견적. B안'

/**
 * 운영 DB 에 저장된 금강변압기 견적서·제안서를 최신 결정에 맞춘다. 바뀐 것이 없으면 null.
 * - 2026-10-16 베이스 공종 3,010,000원 (재료·운반·시공자 3명 × 1일, 원가계산 제외)
 * - 2026-10-16 A안만 최종 견적: 공사명의 "(A안)", 특기사항의 B안 줄, 제안서의 B안 내용 삭제
 *   (제안서는 B안이 남아 있으면 A안 전용 공개 페이지로 다시 만든다. 이전 내용은 버전 기록에 남는다)
 * - 2026-10-19 250톤 1대 단독 최종안: 공종 내역·특기사항·협의 조정을 위 값으로, 제안서도 새 공개 페이지로
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
  let { title, notes } = quote
  if (/\s*\(A안\)$/.test(title) || notes.includes(KKT_B_NOTE)) {
    title = title.replace(/\s*\(A안\)$/, '')
    notes = notes
      .split('\n')
      .filter((l) => !l.startsWith(KKT_B_NOTE))
      .join('\n')
    done.push('견적서 B안 문구 삭제')
  }
  // 2026-10-19 kevin: 250톤 1대 단독·간소 베이스·완성품 이동, VAT 포함 70,000,000원 (100t·60t 줄이 남아 있을 때만)
  let { adjust, date } = quote
  let final250 = false
  const before250 = sections.some((s) => s.items.some((i) => i.name === '크레인' && /^(100|60)TON$/.test(i.spec)))
  if (before250) {
    for (let k = 0; k < sections.length; k++) {
      const fresh = KKT_QUOTE.sections.find((s) => s.name === sections[k].name)
      if (fresh) sections[k] = { ...fresh, items: fresh.items.map((i) => ({ ...i })) }
    }
    notes = KKT_QUOTE.notes
    adjust = KKT_QUOTE.adjust && { ...KKT_QUOTE.adjust }
    date = KKT_QUOTE.date
    final250 = true
    done.push('250톤 1대·간소 베이스·완성품 이동, VAT 포함 70,000,000원')
  }
  let html = proposalHtml.replaceAll('제관 2, 용접 1, 조공 1, 화재감시 1', '시공자 3명')
  if (html !== proposalHtml) done.push('베이스 인원 시공자 3명')
  if (final250 || html.includes('id="plan-b"') || html.includes('B안')) {
    html = freshProposal()
    done.push(final250 ? '제안서 최종안으로 교체' : '제안서 B안 삭제')
  }
  if (!done.length) return null
  return { quote: { ...quote, title, notes, sections, adjust, date }, proposalHtml: html, summary: `자동 정리: ${done.join(', ')}` }
}
