import { discountForGrand, type Quote, type QuoteSection } from './quote'

/**
 * 금강변압기 견적서(최종 A안)를 업체 관리의 첫 업체로 넣을 때 쓰는 값.
 * 처음엔 /kkt 공개 페이지의 견적 내역에서 옮겼고, 지금은 공개 페이지 견적(kkt-public-quote.ts)도 이 값으로 만든다.
 * 2026-10-16 kevin: 4개 공정(베이스·인양·사상용접·전체 인양) 공정 합계 65,368,000원, 가격 조정(NEGO) 1,731,636원,
 * 공급가액 63,636,364원 + 부가세 6,363,636원 = 합계 70,000,000원.
 * 2026-10-19 kevin: 베이스는 기존 조방 위 H빔 10m 2본 + 양 끝 3m 빔, 완성품 이동 추가, 합계 70,000,000원은 그대로.
 * 회전·안착은 100TON·70TON 2대, 완성품 전체 인양만 250TON 1대.
 */
export const KKT_CLIENT = {
  name: '주식회사 금강변압기',
  siteAddress: '경기 화성시 마도면 마도공단로1길 214',
  /** 업체용 링크 nm-solution.co.kr/kkt (예전 /금강변압기 링크도 proxy.ts 가 여기로 넘김) */
  portalSlug: 'kkt',
}

/** 2026-10-30 kevin: 금강변압기도 다른 업체와 같은 업체 페이지(링크 복사·미리보기·발송본·PDF)로. 한 번만 돈다 */
export const KKT_PORTAL_KEY = 'kkt-portal-1030-v1'
/** 2026-11-02 kevin: 슬라이딩 도어(6×6m, 두께 0.4m, 약 20t) 미네랄울 보온 공종 추가 */
export const KKT_DOOR_KEY = 'kkt-door-insul-1102-v4'
/** 2026-11-02 kevin: 10-30 견적 뒤 중간 안 버전을 지우고 300T 안을 다음 번호로 (table.ts) */
export const KKT_PRUNE_KEY = 'kkt-prune-1102'
/** 2026-11-02 kevin "우선 올려줘": 300T 견적을 고객 화면에 노출(고정 해제) */
export const KKT_PUBLISH_KEY = 'kkt-publish-300t-1102'
/** 2026-11-02 kevin "우천 가설천막 작업 제외했어": 천막 공종·특기사항 줄·보온 제안의 천막 문구를 뺀다 (table.ts) */
export const KKT_NO_TARP_KEY = 'kkt-no-tarp-1102'
export const KKT_TARP_ARTICLE = "<article><h3>우천 대비 가설 천막</h3><ol><li>보온 시작 전 시스템 비계 상부에 파이프 틀을 조립하고 방수 천막을 침</li><li>비계 측면도 천막으로 가려 보온재가 젖지 않게 유지</li><li>보온·커버 마감이 끝난 뒤 천막과 틀 철거</li></ol><span class=\"spec\">방수 천막(타포린) + 파이프 틀</span></article>\n"
export const KKT_TARP_INTRO = ["아래 순서로 시공하며, 작업 기간에는 가설 천막으로 비를 막음.</p>", "아래 순서로 시공함.</p>"] as const
export const KKT_PRUNE_SUMMARY = '10-30 견적 정정: 본체 보온 미네랄울 300T + 50T 그라스울 패널, 슬라이딩 도어 보온 300T + 함석 커버, 공기 27일'

/**
 * 2026-10-30 kevin(고객 급요청): 작업계획서는 다시 정비할 때까지 내리고, 업체 페이지에는 견적서만 보인다.
 * 업체 페이지 틀(제안서 탭 HTML). <!--NM:QUOTE-SUMMARY-->·<!--NM:QUOTE--> 는 portalPageHtml 이 채운다.
 */
export const KKT_QUOTE_ONLY_PAGE = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive"><title>주식회사 금강변압기 견적서 | 엔엠솔루션</title>
<style>body{margin:0;background:#f4f6f9;color:#1d2430;font-family:Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif}
main{max-width:900px;margin:0 auto;padding:24px 16px 96px}
h1{font-size:22px;font-weight:700;color:#0f2a44;margin:0 0 4px;letter-spacing:-.02em}main>p{margin:0 0 16px;color:#5d6878;font-size:14px}
.qsum{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.qcard{background:#fff;border:1px solid #dde3ea;padding:14px 16px}.qcard.main{border-color:#0f2a44}
.qcard .l{font-size:13px;color:#5d6878}.qcard .v{font-size:24px;font-weight:700;color:#0f2a44;margin:2px 0;font-variant-numeric:tabular-nums}.qcard .s{font-size:12.5px;color:#5d6878}
.quote-sheet{background:#fff;border:1px solid #dde3ea;padding:28px 24px;margin-top:16px;overflow-x:auto}
@media print{body{background:#fff}main{padding:0}.quote-sheet{border:0;padding:0;margin:0}}
.plan{background:#fff;border:1px solid #dde3ea;padding:22px 24px;margin-top:16px}
.plan h2{font-size:17px;font-weight:700;color:#0f2a44;margin:0 0 6px}.plan>p{margin:0 0 14px;color:#5d6878;font-size:14px}
.plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.plan article{border:1px solid #e3e8ee;border-left:3px solid #0f2a44;padding:12px 14px}
.plan h3{font-size:15px;font-weight:700;color:#0f2a44;margin:0 0 8px}.plan ol{margin:0;padding-left:20px;font-size:14px;line-height:1.7}
.plan .spec{display:inline-block;margin-top:8px;font-size:12.5px;color:#5d6878}
@media print{.plan{border:0;padding:0 0 12px}}</style>
</head><body><main><h1>주식회사 금강변압기 견적서</h1><p>엔엠솔루션이 제출하는 견적서임. 오른쪽 아래 버튼으로 PDF를 내려받을 수 있음.</p>
<!--NM:QUOTE-SUMMARY-->
<section class="plan" id="insul-plan"><h2>보온 작업 제안</h2><p>진공건조로 본체와 슬라이딩 도어의 보온을 아래 순서로 시공함.</p>
<div class="plan-grid">
<article><h3>본체 보온</h3><ol><li>시스템 비계 설치 후 본체 외면 정리, 보온핀 설치</li><li>본체 내부 보온재 300T 시공 (미네랄울 100T 3겹, 이음부 엇갈림 시공, 하부 면 포함)</li><li>50T 그라스울 패널로 외곽 마감 (하부 포함), 이음부 실링·모서리 후레싱</li></ol><span class="spec">미네랄울 300T + 그라스울 패널 50T, 하부 포함</span></article>
<article><h3>슬라이딩 도어 보온</h3><ol><li>기존 커버 철거·반출</li><li>미네랄울 300T 두께로 덮어 시공 (장핀 고정)</li><li>함석 커버 씌우고 이음부·모서리 마감</li></ol><span class="spec">미네랄울 300T + 함석 커버</span></article>
</div></section>
<!--NM:QUOTE-->
</main></body></html>`

/**
 * 2026-10-19 최종안(합계 70,000,000원). 고객 페이지(/kkt)의 견적은 발송본이 없을 때 이것을 보여 준다.
 * 아래 자동 정리 단계들도 이 값을 기준으로 옛 저장본을 고친다.
 */
export const KKT_QUOTE_1019: Quote = {
  "number": "NMS-2610-KKT-01",
  "date": "2026-10-19",
  "title": "진공건조로 2분할체 회전·안착 및 접합부 용접 공사",
  "sections": [
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
          "price": 167000,
          "note": ""
        },
        {
          "id": "i28",
          "kind": "노무비",
          "name": "시공자",
          "spec": "베이스 배치·용접·회수",
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
      "desc": "진공건조로 2기 회전·베이스 안착(1일, 100TON·70TON 2대), 용접면 밀착 이동(2일), 작업구역 안전펜스",
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
          "note": "안착일 1일"
        },
        {
          "id": "i5",
          "kind": "장비",
          "name": "크레인",
          "spec": "70TON",
          "unit": "대·일",
          "qty": 1,
          "price": 1700000,
          "note": "안착일 1일"
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
      "desc": "완성품 전체 인양·최종 이동 장소 안착 (250TON 크레인, 1일)",
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
  "notes": "전기 수전, 배관·닥트 해체·복구, 보온, 도장, 시운전은 포함하지 않음.\n인양 작업(회전·안착) 크레인은 100TON·70TON 2대, 전체 인양(완성품 이동)은 250TON 1대로 수행함.\n비파괴검사(PT/UT)는 포함하지 않으며, 발주처 요구 시 별도 정산함.\n연장·야간·휴일 작업은 공정에 따라 당사가 수행하며 추가 정산하지 않음.\n기상(우천 시 용접 불가)·발주처 사유에 따른 대기는 별도 협의함.\n작업구역(약 10×15m)은 이동식 안전펜스로 통제하며, 발주처 안전관리 규정과 출입 절차를 따름.\n공사 기간: 2026.10.21 ~ 11.03, 작업일 12일 (일요일 휴무)\n결제 조건: 선수금 30%, 용접을 위한 인양(도비) 작업 완료 시 30%, 모든 접합 작업 완료 후 30%, 전체 인양 작업 완료 후 10%",
  "validDays": 30
}


/** 2026-10-16 kevin: 베이스 작업은 재료비·운반비·노무비(시공자 × 1일)만, 원가계산 제외 */
const KKT_BASE_ITEMS = KKT_QUOTE_1019.sections.find((s) => s.name === '베이스 작업')!.items


/**
 * 2026-10-30 kevin: 공종을 인양·용접·부속품 용접·전체 인양·보온 5개로 나누고 견적을 키움(7천만 원 고정 해제, 가격 조정 없음).
 * - 인양: 인양 준비(후크 걸이·인양 가이드 제작, 용접사 2·고급기능공 2 × 2일)와 임시 베이스를 넣음
 * - 부속품 용접: 운반 시 절단된 부속품 약 6개소 수리·재장착, 용접사 2·배관공 2 × 2일
 * - 용접: 작업발판은 접합부 둘레 시스템 비계 210㎡ × 18,500(방염 시트 포함, kevin: 비싸게)
 * - 크레인: 인양(회전·안착) 200TON 3,700,000 + 100TON 2,300,000, 전체 인양 250TON 6,000,000 (kevin)
 * - PT 비계(이동식) 임대: 부속품 용접 2세트 × 2일, 보온 2세트 × 6일, 세트·일 58,000 (kevin)
 * - 보온: 미네랄울 100T + 아연도 골함석 케이싱, 외곽 6 × 6 × 9m(내경 5 × 5 × 8m + H500 빔) 하부 제외 약 234㎡, 8명 × 6일·시스템 비계 (kevin: 보온 약 1,500만 원 상향)
 * - 공종마다 간접노무비(직접노무비 × 15%), 일반관리비 8%
 */
export const KKT_QUOTE: Quote = {
  "number": "NMS-2610-KKT-01",
  "date": "2026-10-30",
  "title": "진공건조로 2분할체 회전·안착, 접합부 용접, 이동 및 보온 공사",
  "sections": [
    {
      "id": "s1",
      "name": "인양 작업",
      "desc": "인양 준비(후크 걸이·인양 가이드 제작, 2일), 임시 베이스 설치·회수, 진공건조로 2기 회전·베이스 안착(1일, 200TON·100TON 2대), 용접면 밀착 이동(2일), 작업구역 안전펜스",
      "items": [
        {
          "id": "i1",
          "kind": "노무비",
          "name": "용접사",
          "spec": "인양 준비: 후크 걸이(인양 러그)·인양 가이드 제작·용접",
          "unit": "인·일",
          "qty": 4,
          "price": 500000,
          "note": "2명 × 2일"
        },
        {
          "id": "i2",
          "kind": "노무비",
          "name": "고급기능공",
          "spec": "인양 준비: 러그·가이드 제작·취부",
          "unit": "인·일",
          "qty": 4,
          "price": 350000,
          "note": "2명 × 2일"
        },
        {
          "id": "i3",
          "kind": "노무비",
          "name": "베이스 시공자",
          "spec": "베이스 배치·용접·회수",
          "unit": "인·일",
          "qty": 4,
          "price": 260000,
          "note": "4명 × 1일"
        },
        {
          "id": "i4",
          "kind": "노무비",
          "name": "도비 전문기공",
          "spec": "회전·안착·밀착 이동",
          "unit": "인·일",
          "qty": 15,
          "price": 300000,
          "note": "안착일 6명 + 밀착 이동 6명·3명 (6, 6, 3)"
        },
        {
          "id": "i5",
          "kind": "노무비",
          "name": "신호수",
          "spec": "크레인 인양 신호",
          "unit": "인·일",
          "qty": 2,
          "price": 260000,
          "note": "2명 × 1일 (안착일)"
        },
        {
          "id": "i6",
          "kind": "노무비",
          "name": "안전담당 (관리감독자)",
          "spec": "작업 전 TBM·인양구역 통제",
          "unit": "인·일",
          "qty": 3,
          "price": 320000,
          "note": "1명 × 3일"
        },
        {
          "id": "i7",
          "kind": "노무비",
          "name": "펜스 설치·해체",
          "spec": "설치 인건비",
          "unit": "인·일",
          "qty": 2,
          "price": 250000,
          "note": "설치 2명 × 0.5일 + 해체 2명 × 0.5일"
        },
        {
          "id": "i8",
          "kind": "노무비",
          "name": "간접노무비",
          "spec": "현장 관리 인력 (직접노무비 10,920,000 × 15%)",
          "unit": "식",
          "qty": 1,
          "price": 1638000,
          "note": "현장 관리자"
        },
        {
          "id": "i9",
          "kind": "재료비",
          "name": "인양 러그·가이드 강재",
          "spec": "철판·형강, 절단·가공 포함",
          "unit": "kg",
          "qty": 640,
          "price": 1300,
          "note": "후크 걸이·인양 가이드"
        },
        {
          "id": "i10",
          "kind": "재료비",
          "name": "인양 준비 용접 소모품",
          "spec": "CO2 가스·와이어·디스크",
          "unit": "식",
          "qty": 1,
          "price": 380000,
          "note": ""
        },
        {
          "id": "i11",
          "kind": "재료비",
          "name": "H빔 (회수조건)",
          "spec": "H-250×250×9×14, 10m 2EA·3m 2EA",
          "unit": "식",
          "qty": 1,
          "price": 1800000,
          "note": "공사 후 회수 조건"
        },
        {
          "id": "i12",
          "kind": "운반비",
          "name": "H빔 운반",
          "spec": "반입·회수",
          "unit": "식",
          "qty": 1,
          "price": 167000,
          "note": ""
        },
        {
          "id": "i13",
          "kind": "장비",
          "name": "크레인",
          "spec": "200TON",
          "unit": "대·일",
          "qty": 1,
          "price": 3700000,
          "note": "안착일 1일"
        },
        {
          "id": "i14",
          "kind": "장비",
          "name": "크레인",
          "spec": "100TON",
          "unit": "대·일",
          "qty": 1,
          "price": 2300000,
          "note": "안착일 1일"
        },
        {
          "id": "i15",
          "kind": "장비",
          "name": "아웃리거 받침 철판",
          "spec": "1,500×1,500×25t, 8매",
          "unit": "식",
          "qty": 1,
          "price": 640000,
          "note": "아스팔트 지반 보호"
        },
        {
          "id": "i16",
          "kind": "장비",
          "name": "밀착 이동 장비",
          "spec": "유압잭·윈치·스키드",
          "unit": "SET",
          "qty": 1,
          "price": 2000000,
          "note": "밀착 이동 2일"
        },
        {
          "id": "i17",
          "kind": "장비",
          "name": "공구사용손료",
          "spec": "도비 전문장비·줄걸이구",
          "unit": "SET",
          "qty": 1,
          "price": 3000000,
          "note": ""
        },
        {
          "id": "i18",
          "kind": "재료비",
          "name": "소모품·잡자재",
          "spec": "목재 받침·와이어 보호대 등",
          "unit": "식",
          "qty": 1,
          "price": 1000000,
          "note": ""
        },
        {
          "id": "i19",
          "kind": "안전시설",
          "name": "안전펜스 임대",
          "spec": "이동식 메쉬펜스 H1.8×W2.4m",
          "unit": "매·일",
          "qty": 242,
          "price": 5000,
          "note": "22매(둘레 50m + 출입문) × 11일"
        },
        {
          "id": "i20",
          "kind": "안전시설",
          "name": "펜스 운반",
          "spec": "1톤 화물 왕복",
          "unit": "회",
          "qty": 2,
          "price": 260000,
          "note": "반입 1 + 반출 1"
        },
        {
          "id": "i21",
          "kind": "재료비",
          "name": "출입통제 안전장비",
          "spec": "",
          "unit": "식",
          "qty": 1,
          "price": 380000,
          "note": ""
        },
        {
          "id": "i22",
          "kind": "경비",
          "name": "경비",
          "spec": "간식·음료·교통비 등",
          "unit": "식",
          "qty": 1,
          "price": 1000000,
          "note": "회전·안착·밀착 이동 + 인양 준비 8인·일 × 50,000"
        }
      ]
    },
    {
      "id": "s2",
      "name": "용접 작업",
      "desc": "접합면 사상(2일) 및 접합부 CO2 용접(3일)",
      "items": [
        {
          "id": "i1",
          "kind": "노무비",
          "name": "용접사",
          "spec": "CO2 용접 (접합부)",
          "unit": "인·일",
          "qty": 9,
          "price": 500000,
          "note": "3명 × 3일"
        },
        {
          "id": "i2",
          "kind": "노무비",
          "name": "고급기술자",
          "spec": "제관사 수준 (취부·치수 관리)",
          "unit": "인·일",
          "qty": 6,
          "price": 350000,
          "note": "2명 × 3일"
        },
        {
          "id": "i3",
          "kind": "노무비",
          "name": "사상 기술자",
          "spec": "접합면 그라인딩",
          "unit": "인·일",
          "qty": 4,
          "price": 300000,
          "note": "2명 × 2일"
        },
        {
          "id": "i4",
          "kind": "노무비",
          "name": "조공",
          "spec": "사상·용접 보조",
          "unit": "인·일",
          "qty": 4,
          "price": 200000,
          "note": "2명 × 2일"
        },
        {
          "id": "i5",
          "kind": "노무비",
          "name": "화재감시자",
          "spec": "용접·사상 화기작업 전담",
          "unit": "인·일",
          "qty": 5,
          "price": 250000,
          "note": "1명 × 5일 (사상 2 + 용접 3)"
        },
        {
          "id": "i6",
          "kind": "노무비",
          "name": "간접노무비",
          "spec": "현장 관리 인력 (직접노무비 9,850,000 × 15%)",
          "unit": "식",
          "qty": 1,
          "price": 1477500,
          "note": "현장 관리자"
        },
        {
          "id": "i7",
          "kind": "장비",
          "name": "CO2 용접기 대여",
          "spec": "500A급",
          "unit": "대·일",
          "qty": 9,
          "price": 400000,
          "note": "3대 × 3일"
        },
        {
          "id": "i8",
          "kind": "장비",
          "name": "그라인더·환기·조명",
          "spec": "송풍기, 투광등 포함",
          "unit": "SET",
          "qty": 1,
          "price": 800000,
          "note": ""
        },
        {
          "id": "i9",
          "kind": "재료비",
          "name": "용접 소모품",
          "spec": "CO2 가스·와이어·디스크·케이블·잡자재",
          "unit": "식",
          "qty": 1,
          "price": 3680000,
          "note": ""
        },
        {
          "id": "i10",
          "kind": "장비",
          "name": "시스템 비계",
          "spec": "접합부 둘레 설치·해체 및 임대, 방염 시트 포함 (둘레 약 30m × 높이 7m)",
          "unit": "㎡",
          "qty": 210,
          "price": 18500,
          "note": "사상·용접 5일"
        },
        {
          "id": "i11",
          "kind": "장비",
          "name": "가스절단기 임대",
          "spec": "산소·LPG, 2대 공정기간 상시",
          "unit": "대·일",
          "qty": 22,
          "price": 100000,
          "note": "2대 × 11일"
        },
        {
          "id": "i12",
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
      "name": "부속품 용접 작업",
      "desc": "운반 시 절단된 건조로 부속품 수리·재장착 (약 6개소, 2일)",
      "items": [
        {
          "id": "i1",
          "kind": "노무비",
          "name": "용접사",
          "spec": "절단 부속품 수리·재장착 용접",
          "unit": "인·일",
          "qty": 4,
          "price": 500000,
          "note": "2명 × 2일"
        },
        {
          "id": "i2",
          "kind": "노무비",
          "name": "플랜트배관공",
          "spec": "부속 배관·브래킷 맞춤·조립",
          "unit": "인·일",
          "qty": 4,
          "price": 400000,
          "note": "2명 × 2일"
        },
        {
          "id": "i3",
          "kind": "노무비",
          "name": "화재감시자",
          "spec": "용접 화기작업 전담",
          "unit": "인·일",
          "qty": 2,
          "price": 250000,
          "note": "1명 × 2일"
        },
        {
          "id": "i4",
          "kind": "노무비",
          "name": "간접노무비",
          "spec": "현장 관리 인력 (직접노무비 4,100,000 × 15%)",
          "unit": "식",
          "qty": 1,
          "price": 615000,
          "note": "현장 관리자"
        },
        {
          "id": "i5",
          "kind": "재료비",
          "name": "부속품 보수 자재",
          "spec": "배관 연결재·플랜지·브래킷·볼트류",
          "unit": "개소",
          "qty": 6,
          "price": 230000,
          "note": "약 6개소"
        },
        {
          "id": "i6",
          "kind": "재료비",
          "name": "용접 소모품",
          "spec": "CO2 가스·와이어·디스크·잡자재",
          "unit": "식",
          "qty": 1,
          "price": 520000,
          "note": ""
        },
        {
          "id": "i7",
          "kind": "장비",
          "name": "CO2 용접기 대여",
          "spec": "500A급",
          "unit": "대·일",
          "qty": 4,
          "price": 400000,
          "note": "2대 × 2일"
        },
        {
          "id": "i9",
          "kind": "장비",
          "name": "PT 비계 임대",
          "spec": "이동식 PT 아시바 (바퀴·안전난간 포함)",
          "unit": "세트·일",
          "qty": 4,
          "price": 58000,
          "note": "2세트 × 2일"
        },
        {
          "id": "i8",
          "kind": "경비",
          "name": "경비",
          "spec": "식대·교통비·부대 잡비",
          "unit": "식",
          "qty": 1,
          "price": 500000,
          "note": "10인·일 × 50,000"
        }
      ]
    },
    {
      "id": "s4",
      "name": "전체 인양 작업",
      "desc": "완성품 전체 인양·최종 이동 장소 안착 (250TON 크레인, 1일)",
      "items": [
        {
          "id": "i1",
          "kind": "노무비",
          "name": "도비 전문기공",
          "spec": "전체 인양",
          "unit": "인·일",
          "qty": 6,
          "price": 300000,
          "note": "6명 × 1일"
        },
        {
          "id": "i2",
          "kind": "노무비",
          "name": "간접노무비",
          "spec": "현장 관리 인력 (직접노무비 1,800,000 × 15%)",
          "unit": "식",
          "qty": 1,
          "price": 270000,
          "note": "현장 관리자"
        },
        {
          "id": "i3",
          "kind": "장비",
          "name": "크레인",
          "spec": "250TON",
          "unit": "대·일",
          "qty": 1,
          "price": 6000000,
          "note": "전체 인양 1일"
        },
        {
          "id": "i4",
          "kind": "장비",
          "name": "인양 부대장비",
          "spec": "줄걸이구·샤클·인양 보조장비",
          "unit": "식",
          "qty": 1,
          "price": 2000000,
          "note": ""
        }
      ],
      "overheadOnly": true
    },
    {
      "id": "s5",
      "name": "보온 작업",
      "desc": "건조로 본체 보온: 내부(5 × 5 × 8m) 미네랄울 300T(100T 3겹) 시공 후 외곽(6 × 6 × 8.5m) 50T 그라스울 패널 마감, 하부 포함 (3일)",
      "items": [
        {
          "id": "i1",
          "kind": "노무비",
          "name": "보온공",
          "spec": "미네랄울 3겹 부착·그라스울 패널 시공 (고급기능공)",
          "unit": "인·일",
          "qty": 9,
          "price": 350000,
          "note": "3명 × 3일"
        },
        {
          "id": "i2",
          "kind": "노무비",
          "name": "보온 보조",
          "spec": "자재 재단·운반·핀 작업 (중급기능공)",
          "unit": "인·일",
          "qty": 9,
          "price": 280000,
          "note": "3명 × 3일"
        },
        {
          "id": "i12",
          "kind": "노무비",
          "name": "용접사",
          "spec": "패널 지지 틀(각관) 본체 H빔 용접",
          "unit": "인·일",
          "qty": 4,
          "price": 500000,
          "note": "2명 × 2일"
        },
        {
          "id": "i15",
          "kind": "노무비",
          "name": "안전담당 (관리감독자)",
          "spec": "고소작업·비계 상부 작업 통제, 작업 전 TBM",
          "unit": "인·일",
          "qty": 3,
          "price": 320000,
          "note": "1명 × 3일"
        },
        {
          "id": "i16",
          "kind": "노무비",
          "name": "화재감시자",
          "spec": "패널 틀 용접 중 화기작업 감시",
          "unit": "인·일",
          "qty": 2,
          "price": 250000,
          "note": "1명 × 2일"
        },
        {
          "id": "i3",
          "kind": "노무비",
          "name": "간접노무비",
          "spec": "현장 관리 인력 (직접노무비 9,130,000 × 15%)",
          "unit": "식",
          "qty": 1,
          "price": 1369500,
          "note": "현장 관리자"
        },
        {
          "id": "i4",
          "kind": "재료비",
          "name": "미네랄울 보온판",
          "spec": "100K 100T (3겹 시공으로 300T)",
          "unit": "㎡",
          "qty": 706,
          "price": 20000,
          "note": "내부 보온면 약 210㎡(하부 포함) × 3겹 + 재단·할증 12%"
        },
        {
          "id": "i5",
          "kind": "재료비",
          "name": "그라스울 패널",
          "spec": "50T 불연 샌드위치 패널 (외판 0.5t 컬러강판)",
          "unit": "㎡",
          "qty": 312,
          "price": 23500,
          "note": "외곽 약 276㎡(하부 포함) + 겹침·할증 13%"
        },
        {
          "id": "i13",
          "kind": "재료비",
          "name": "패널 지지 틀",
          "spec": "각관 □50×50×2.3t, 앵커·브래킷 포함",
          "unit": "m",
          "qty": 460,
          "price": 5200,
          "note": "패널 고정 틀 (300T 두께 띄움, 하부 포함)"
        },
        {
          "id": "i6",
          "kind": "재료비",
          "name": "보온 부자재",
          "spec": "장핀(350mm)·와셔·리벳·밴드·알루미늄 테이프·실링",
          "unit": "식",
          "qty": 1,
          "price": 2000000,
          "note": "300T 고정용 장핀 ㎡당 6개 이상"
        },
        {
          "id": "i7",
          "kind": "재료비",
          "name": "패널 부자재",
          "spec": "코너·조이너·후레싱·피스·실리콘",
          "unit": "식",
          "qty": 1,
          "price": 1500000,
          "note": ""
        },
        {
          "id": "i14",
          "kind": "재료비",
          "name": "용접 소모품",
          "spec": "CO2 가스·와이어·디스크",
          "unit": "식",
          "qty": 1,
          "price": 400000,
          "note": ""
        },
        {
          "id": "i17",
          "kind": "재료비",
          "name": "안전장구",
          "spec": "그네식 안전대·안전모·방진 마스크(1급)·보안경·분진 보호복·내절단 장갑",
          "unit": "식",
          "qty": 1,
          "price": 1500000,
          "note": "작업 인원 9명분, 보호복·마스크 소모품 포함"
        },
        {
          "id": "i18",
          "kind": "재료비",
          "name": "분진·보양재",
          "spec": "작업 구역 보양 비닐·방진망·집진 청소",
          "unit": "식",
          "qty": 1,
          "price": 500000,
          "note": "광물섬유 분진 관리"
        },
        {
          "id": "i8",
          "kind": "장비",
          "name": "시스템 비계",
          "spec": "설치·해체 및 임대 (둘레 약 36m × 높이 7m, 작업발판·안전난간 포함)",
          "unit": "㎡",
          "qty": 252,
          "price": 15000,
          "note": "3일"
        },
        {
          "id": "i11",
          "kind": "장비",
          "name": "PT 비계 임대",
          "spec": "이동식 PT 아시바 (바퀴·안전난간 포함), 모서리·상부·하부 마감용",
          "unit": "세트·일",
          "qty": 6,
          "price": 58000,
          "note": "2세트 × 3일"
        },
        {
          "id": "i19",
          "kind": "장비",
          "name": "자재 양중",
          "spec": "지게차 (보온판·패널 하역·양중)",
          "unit": "대·일",
          "qty": 2,
          "price": 350000,
          "note": "자재 반입일 2일"
        },
        {
          "id": "i9",
          "kind": "운반비",
          "name": "보온 자재 운반",
          "spec": "5톤 화물",
          "unit": "회",
          "qty": 3,
          "price": 450000,
          "note": "보온판 1회 + 패널·각관 1회 + 비계 1회"
        },
        {
          "id": "i20",
          "kind": "운반비",
          "name": "폐자재 처리",
          "spec": "재단 잔재·포장재 반출·처리",
          "unit": "식",
          "qty": 1,
          "price": 600000,
          "note": ""
        },
        {
          "id": "i10",
          "kind": "경비",
          "name": "경비",
          "spec": "식대·교통비·부대 잡비",
          "unit": "식",
          "qty": 1,
          "price": 1350000,
          "note": "27인·일 × 50,000"
        }
      ]
    },
    {
      "id": "s6",
      "name": "슬라이딩 도어 보온 작업",
      "desc": "슬라이딩 도어(6 × 6m, 약 20t) 기존 커버 철거 후 미네랄울 300T(100T 3겹) 보온, 함석 커버 마감 (한쪽 면·옆면 약 46㎡, 4일)",
      "items": [
        {
          "id": "i1",
          "kind": "노무비",
          "name": "보온공",
          "spec": "기존 커버 철거, 미네랄울 부착·함석 커버 시공 (고급기능공)",
          "unit": "인·일",
          "qty": 12,
          "price": 350000,
          "note": "3명 × 4일"
        },
        {
          "id": "i2",
          "kind": "노무비",
          "name": "보온 보조",
          "spec": "철거·자재 재단·운반·핀 작업 (중급기능공)",
          "unit": "인·일",
          "qty": 12,
          "price": 280000,
          "note": "3명 × 4일"
        },
        {
          "id": "i12",
          "kind": "노무비",
          "name": "안전담당 (관리감독자)",
          "spec": "고소작업·철거 작업 통제, 작업 전 TBM",
          "unit": "인·일",
          "qty": 4,
          "price": 320000,
          "note": "1명 × 4일"
        },
        {
          "id": "i3",
          "kind": "노무비",
          "name": "간접노무비",
          "spec": "현장 관리 인력 (직접노무비 8,840,000 × 15%)",
          "unit": "식",
          "qty": 1,
          "price": 1326000,
          "note": "현장 관리자"
        },
        {
          "id": "i4",
          "kind": "재료비",
          "name": "미네랄울 보온판",
          "spec": "100K 100T (3겹 시공으로 300T)",
          "unit": "㎡",
          "qty": 134,
          "price": 26000,
          "note": "전면 36㎡ × 3겹 + 옆면 9.6㎡, 재단·할증 14%"
        },
        {
          "id": "i5",
          "kind": "재료비",
          "name": "함석 커버",
          "spec": "아연도 골판 0.5t",
          "unit": "㎡",
          "qty": 53,
          "price": 19800,
          "note": "한쪽 면·옆면 약 46㎡ + 겹침·할증 15%"
        },
        {
          "id": "i6",
          "kind": "재료비",
          "name": "보온 부자재",
          "spec": "장핀(350mm)·와셔·리벳·밴드·알루미늄 테이프·실링",
          "unit": "식",
          "qty": 1,
          "price": 550000,
          "note": "300T 고정용 장핀 ㎡당 6개 이상"
        },
        {
          "id": "i7",
          "kind": "재료비",
          "name": "모서리 마감재",
          "spec": "후레싱·앵글 (도어 둘레 24m)",
          "unit": "식",
          "qty": 1,
          "price": 320000,
          "note": ""
        },
        {
          "id": "i21",
          "kind": "재료비",
          "name": "안전장구",
          "spec": "그네식 안전대·안전모·방진 마스크(1급)·보안경·분진 보호복·장갑",
          "unit": "식",
          "qty": 1,
          "price": 500000,
          "note": "작업 인원 7명분, 소모품 포함"
        },
        {
          "id": "i8",
          "kind": "장비",
          "name": "시스템 비계",
          "spec": "설치·해체 및 임대 (도어 전면 폭 6m × 높이 7m, 안전난간 포함)",
          "unit": "㎡",
          "qty": 42,
          "price": 16000,
          "note": "4일"
        },
        {
          "id": "i9",
          "kind": "운반비",
          "name": "기존 커버 철거 반출",
          "spec": "철거 커버·폐자재 반출·처리",
          "unit": "식",
          "qty": 1,
          "price": 450000,
          "note": ""
        },
        {
          "id": "i10",
          "kind": "운반비",
          "name": "보온 자재 운반",
          "spec": "1톤 화물",
          "unit": "회",
          "qty": 2,
          "price": 260000,
          "note": "자재 반입 2회"
        },
        {
          "id": "i11",
          "kind": "경비",
          "name": "경비",
          "spec": "식대·교통비·부대 잡비",
          "unit": "식",
          "qty": 1,
          "price": 1400000,
          "note": "28인·일 × 50,000"
        }
      ]
    }
  ],
  "costCalc": true,
  "rates": {
    "injury": 3.56,
    "employment": 1.15,
    "safety": 3.11,
    "overhead": 8,
    "profit": 15
  },
  "truncate": true,
  "discount": 13010000,
  "discountLabel": "가격 조정 (NEGO)",
  "notes": "전기 수전, 도장, 시운전은 포함하지 않음. 배관·닥트는 운반 시 절단된 부속품(약 6개소) 수리·재장착만 포함함.\n인양 작업(회전·안착) 크레인은 200TON·100TON 2대, 전체 인양(완성품 이동)은 250TON 1대로 수행함.\n보온은 건조로 본체 내부 5 × 5 × 8m 하부 포함 약 210㎡에 미네랄울 300T, 외곽 6 × 6 × 8.5m 하부 포함 약 276㎡에 50T 그라스울 패널 마감 기준이며, 실측 면적에 따라 정산함.\n슬라이딩 도어 보온은 기존 커버 철거 후 미네랄울 300T(100T 3겹) + 함석 커버이며, 한쪽 면·옆면 약 46㎡ 기준으로 실측 면적에 따라 정산함.\n비파괴검사(PT/UT)는 포함하지 않으며, 발주처 요구 시 별도 정산함.\n연장·야간·휴일 작업은 공정에 따라 당사가 수행하며 추가 정산하지 않음.\n기상(우천 시 용접 불가)·발주처 사유에 따른 대기는 별도 협의함.\n작업구역(약 10×15m)은 이동식 안전펜스로 통제하며, 발주처 안전관리 규정과 출입 절차를 따름.\n공사 기간: 착공 후 작업일 21일 (일요일 휴무, 착공일은 발주처와 협의)\n결제 조건: 선수금 30%, 용접을 위한 인양(도비) 작업 완료 시 30%, 모든 접합 작업 완료 후 30%, 전체 인양·보온 작업 완료 후 10%",
  "validDays": 30
}

/** 2026-10-16 kevin: 견적 순서는 베이스 → 인양 → 사상·용접 → 전체 인양, 부가세 포함 최종 7천만 원 */
export const KKT_ORDER = ['베이스 작업', '인양 작업', '사상·용접 작업', '전체 인양 작업']
export const KKT_GRAND = 70_000_000
/** 2026-10-16 kevin: 크레인 2대 대신 200TON 1대(호이스트 30t 보조)로 할 수도 있고, 견적 금액 안에서 처리 */
/** 2026-10-30 마지막 10%는 전체 인양·보온 작업 완료 후 */
const KKT_PAY_NEW = '결제 조건: 선수금 30%, 용접을 위한 인양(도비) 작업 완료 시 30%, 모든 접합 작업 완료 후 30%, 전체 인양·보온 작업 완료 후 10%'
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
const KKT_250_SECTIONS = ['베이스 작업', '인양 작업', '전체 인양 작업']
const KKT_NOTE_LINES = KKT_QUOTE_1019.notes.split('\n')
/** [바꿀 줄의 시작 문구들, 새 줄] */
const KKT_250_NOTES: [string[], string][] = [
  [['인양 작업 크레인은', '크레인은 250TON'], KKT_NOTE_LINES.find((l) => l.startsWith('인양 작업(회전·안착) 크레인은'))!],
  [['공사 기간:'], KKT_NOTE_LINES.find((l) => l.startsWith('공사 기간:'))!],
]
const KKT_FULL_LIFT = KKT_QUOTE_1019.sections.find((s) => s.name === '전체 인양 작업')!

/**
 * 2026-10-16 kevin: 베이스 작업도 일반관리비·이윤을 넣되 공정 금액 3,360,000원은 그대로.
 * H빔 10m 2EA·5m 2EA(총 30m) 1,800,000원, 운반 167,000원, 시공자 4명 × 260,000원.
 */
function newBase(s: QuoteSection): QuoteSection {
  const seed = KKT_QUOTE_1019.sections.find((x) => x.name === '베이스 작업')!
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
/**
 * 2026-11-02 kevin: 본체 보온을 내부 400T + 50T 그라스울 패널로 재산출, 슬라이딩 도어 보온·우천 대비 가설 천막 공종 추가.
 * 같은 날 kevin "그라스울로 해보자"(PR #134) 뒤 두께 비교를 보고 "300t 견적으로 정정": 본체·도어 모두 미네랄울 100K 100T 3겹(300T, 26,000/㎡),
 * 본체 3+3명 × 10일, 도어 2+2명 × 3일, 공기 27일. 우천 대비 가설 천막은 kevin이 어드민에서 제외함(kkt-no-tarp-1102).
 * 옛 견적(10-30 100T + 골함석 보온, 도어·천막 없음)에만 적용하고, 이미 반영된 견적은 null.
 */
export const KKT_BODY_SECTION = KKT_QUOTE.sections.find((s) => s.name === '보온 작업')!
export const KKT_DOOR_SECTION = KKT_QUOTE.sections.find((s) => s.name === '슬라이딩 도어 보온 작업')!
export const KKT_BODY_NOTE = '보온은 건조로 본체 내부 5 × 5 × 8m 하부 포함 약 210㎡에 미네랄울 300T, 외곽 6 × 6 × 8.5m 하부 포함 약 276㎡에 50T 그라스울 패널 마감 기준이며, 실측 면적에 따라 정산함.'
export const KKT_DOOR_NOTE = '슬라이딩 도어 보온은 기존 커버 철거 후 미네랄울 300T(100T 3겹) + 함석 커버이며, 한쪽 면·옆면 약 46㎡ 기준으로 실측 면적에 따라 정산함.'
const KKT_PERIOD_NEW = '공사 기간: 착공 후 작업일 21일 (일요일 휴무, 착공일은 발주처와 협의)'
/** 견적 전용 페이지의 보온 제안이 이 문구가 아니면(앞선 400T 안) 새 페이지로 바꾼다 */
export const KKT_PLAN_MARK = '본체 내부 보온재 300T 시공 (미네랄울 100T 3겹'
/**
 * 2026-11-02 kevin: 본체 보온은 실제 치수(내부 5 × 5 × 8m 미네랄울 300T, 외곽 6 × 6 × 8.5m 그라스울 패널 50T)로 하부까지 포함,
 * 슬라이딩 도어는 인건비를 넉넉히(3+3명 × 4일), 인양·용접·부속품 용접·전체 인양은 그대로 두고 부가세 포함 1억 8천 초반(181,500,000)으로 NEGO.
 * 본체 3+3명 × 3일, 공기 21일. 견적 전용 페이지의 본체 보온 카드에 하부 포함 문구.
 */
/** 2026-11-02 kevin "작업계획서까지 업데이트": 작업계획서(200t+100t, 부속품, 보온·도어, 21일)를 정비해 업체 페이지에 다시 올림 (lib/clients/kkt-plan-page.ts) */
export const KKT_PLAN_KEY = 'kkt-plan-1102'
export const KKT_PLAN_SUMMARY = '작업계획서 정비(회전·안착 200t + 100t, 부속품 수리, 본체·도어 보온, 21일)해 업체 페이지에 다시 올림'
export const KKT_INSUL_BOTTOM_KEY = 'kkt-insul-bottom-1102'
export const KKT_GRAND_TARGET = 181_500_000
export const KKT_INSUL_BOTTOM_HTML: [string, string] = [
  '<li>본체 내부 보온재 300T 시공 (미네랄울 100T 3겹, 이음부 엇갈림 시공)</li><li>50T 그라스울 패널로 마감, 이음부 실링·모서리 후레싱</li></ol><span class="spec">미네랄울 300T + 그라스울 패널 50T</span>',
  '<li>본체 내부 보온재 300T 시공 (미네랄울 100T 3겹, 이음부 엇갈림 시공, 하부 면 포함)</li><li>50T 그라스울 패널로 외곽 마감 (하부 포함), 이음부 실링·모서리 후레싱</li></ol><span class="spec">미네랄울 300T + 그라스울 패널 50T, 하부 포함</span>',
]
export const KKT_INSUL_BOTTOM_SUMMARY = '본체 보온 실제 치수·하부 포함(미네랄울 300T + 그라스울 패널 50T), 슬라이딩 도어 3+3명 × 4일, 공기 21일, 부가세 포함 181,500,000원으로 가격 조정'
export const KKT_DOOR_SUMMARY = '본체 보온 내부 미네랄울 300T + 50T 그라스울 패널 재산출, 슬라이딩 도어 보온(커버 철거, 300T + 함석 커버) 공종 추가, 공기 27일, 업체 페이지에 보온 작업 제안'
const copySection = (s: QuoteSection): QuoteSection => ({ ...s, items: s.items.map((i) => ({ ...i })) })
export function addKktDoor(quote: Quote): Quote | null {
  let { notes, sections } = quote
  let changed = false
  const setNote = (startsWith: string, line: string, after?: string) => {
    const lines = notes.split('\n')
    const k = lines.findIndex((l) => l.startsWith(startsWith))
    if (k >= 0 && lines[k] === line) return
    if (k >= 0) lines[k] = line
    else {
      const j = after ? lines.findIndex((l) => l.startsWith(after)) : -1
      lines.splice(j >= 0 ? j + 1 : lines.length, 0, line)
    }
    notes = lines.join('\n')
    changed = true
  }
  // 세 공종은 이 안과 다르면(옛 100T 보온, 없음, 앞선 초안) 이 안으로 맞춘다. 시드에서 한 번만 돌린다
  for (const def of [KKT_BODY_SECTION, KKT_DOOR_SECTION]) {
    const cur = sections.find((s) => s.name === def.name)
    if (cur && JSON.stringify(cur) === JSON.stringify(def)) continue
    sections = cur ? sections.map((s) => (s === cur ? copySection(def) : s)) : [...sections, copySection(def)]
    changed = true
  }
  setNote('보온은 ', KKT_BODY_NOTE)
  setNote('슬라이딩 도어 보온은', KKT_DOOR_NOTE, '보온은 ')
  setNote('공사 기간:', KKT_PERIOD_NEW)
  return changed ? { ...quote, notes, sections } : null
}

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
      if (!s.items.some((x) => x.spec === '60TON')) return i
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
  // 2026-10-19 kevin: 회전·안착은 100TON·70TON 2대, 완성품 이동만 250TON(인양 작업 크레인이 60TON 또는 250TON일 때만),
  // 베이스 3m 빔, 합계 70,000,000원 유지
  let { date } = quote
  const lift = next.find((s) => s.name === '인양 작업')
  if (lift?.items.some((i) => i.name === '크레인' && (i.spec === '60TON' || i.spec === '250TON'))) {
    next = next.map((s) => {
      if (!KKT_250_SECTIONS.includes(s.name)) return s
      const seed = KKT_QUOTE_1019.sections.find((x) => x.name === s.name)!
      return { ...s, desc: seed.desc, items: seed.items.map((i) => ({ ...i })) }
    })
    const lines = notes.split('\n')
    for (const [heads, line] of KKT_250_NOTES) {
      const k = lines.findIndex((l) => heads.some((h) => l.startsWith(h)))
      if (k >= 0) lines[k] = line
    }
    notes = lines.join('\n')
    date = KKT_QUOTE_1019.date
    discount = discountForGrand({ ...quote, sections: next }, KKT_GRAND) ?? discount
    html = freshProposal()
    done.push('회전·안착 크레인 100TON·70TON, 완성품 이동 250TON·베이스 3m 빔(합계 70,000,000원 유지), 제안서 최종안으로 교체')
  }
  // 2026-10-30 kevin: 5개 공종(인양·용접·부속품 용접·전체 인양·보온)으로 다시 짬. 옛 4개 공정(베이스 작업 따로)일 때만
  let { rates, discountLabel } = quote
  if (next.some((s) => s.name === '베이스 작업') && !next.some((s) => s.name === '보온 작업')) {
    next = KKT_QUOTE.sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }))
    title = KKT_QUOTE.title
    notes = KKT_QUOTE.notes
    date = KKT_QUOTE.date
    discount = KKT_QUOTE.discount
    rates = KKT_QUOTE.rates
    discountLabel = KKT_QUOTE.discountLabel
    done.push('5개 공종(인양·용접·부속품 용접·전체 인양·보온), 인양 준비·부속품 수리·보온 추가, 간접노무비 15%·일반관리비 8%')
  }
  if (!done.length) return null
  return {
    quote: { ...quote, title, notes, date, sections: next, discount, rates, discountLabel },
    proposalHtml: html,
    summary: `자동 정리: ${done.join(', ')}`,
  }
}
