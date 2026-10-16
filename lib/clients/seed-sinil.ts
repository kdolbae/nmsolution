import { DEFAULT_RATES, emptyItem, newId, type ItemKind, type Quote } from './quote'

/**
 * 신일공업 안성 일죽 공장 지붕 교체 견적 (2026-10-16 등록).
 * 업체 정보는 사람인·NICE·신일공업 홈페이지에서 모은 내부 자료라 메모에만 둔다.
 * 견적서는 공종·품명만 있는 빈 틀이다. 물량·단가는 현장 확인 뒤 채운다.
 */
export const SINIL_SEED_KEY = 'sinil-roof-2610'

export const SINIL_CLIENT = {
  name: '신일공업(주)',
  // 전체 번호를 아직 받지 못함 (NICE 공개분 107-81-1****). 받으면 업체 정보에서 넣는다
  bizNumber: '',
  contactPerson: '',
  phone: '02-2671-2702',
  email: 'sinilkorea@yahoo.com',
  siteAddress: '경기도 안성시 일죽면 주래본죽로 374 (산북리)',
  memo: `[조사 자료 · 내부용] 2026-10-16 사람인·NICE평가정보·신일공업 홈페이지(sinil.com) 기준
- 상호: 신일공업(주) / SINIL INDUSTRY CORPORATION
- 대표: 김순일
- 설립: 1974-11-01 · 중소기업 · 사원 14명(국민연금 기준) · 매출 약 172.8억원(NICE)
- 업종: 고무패킹류 제조업(C22191). 열수축 제품(SIC·BOKT 등 전력케이블 부속) 제조·도소매·무역, 부동산 임대
- 본사: 서울 영등포구 선유동1로 32 신일빌딩 5층 (07261) · 전화 02-2671-2702 · 팩스 02-2671-2700 · sinilkorea@yahoo.com
- 현장(안성공장): 경기 안성시 일죽면 주래본죽로 374 (17528). 지번은 미확인, 같은 길 398-17이 산북리라 산북리로 표기함
- 기타: 연혁상 용인공장(용인시 유방동 503-7) 있음, 현재 운영 여부 미확인
- 사업자등록번호: 107-81-1**** (NICE 일부 공개). 전체 번호는 업체에 받아 '사업자등록번호' 칸에 넣어야 함
- 공사: 공장 지붕 교체. 물량·단가는 현장 확인 질문지 답을 받은 뒤 채움`,
}

function item(kind: ItemKind, name: string, unit: string) {
  return { ...emptyItem(kind), name, unit, qty: 0 }
}

export function sinilQuote(date: string): Quote {
  return {
    number: `NM-${date.slice(2, 4)}${date.slice(5, 7)}-02`,
    date,
    title: '안성 일죽공장 지붕 교체 공사',
    sections: [
      {
        id: newId('s'),
        name: '가설·안전시설',
        desc: '',
        items: [item('안전시설', '안전난간·생명줄 설치', '식'), item('안전시설', '채광판 상부 안전망', '식'), item('재료비', '하부 설비 보양', '식')],
      },
      {
        id: newId('s'),
        name: '기존 지붕 철거',
        desc: '',
        items: [item('노무비', '기존 지붕재 철거', '㎡'), item('운반비', '철거재 운반·처리', '식')],
      },
      {
        id: newId('s'),
        name: '지붕재 설치',
        desc: '',
        items: [item('재료비', '지붕재', '㎡'), item('노무비', '지붕재 설치', '㎡'), item('재료비', '후레싱·마감재', '식')],
      },
      {
        id: newId('s'),
        name: '부대공사',
        desc: '',
        items: [item('재료비', '물받이·홈통', 'm'), item('재료비', '채광판', '장')],
      },
      {
        id: newId('s'),
        name: '장비',
        desc: '',
        items: [item('장비', '자재 양중 장비', '일')],
      },
    ],
    costCalc: true,
    rates: { ...DEFAULT_RATES },
    truncate: true,
    notes: '공사 기간: 협의\n결제 조건: 협의',
    validDays: 30,
    recipientFields: 'biz',
  }
}

/** 기본 제안서(홈페이지 내용)의 빈칸 중 공사명만 채운다 */
export function sinilProposal(html: string): string {
  return html
    .replace('[제안 공사명과 한 줄 요약을 적어 주세요.]', '안성 일죽공장 지붕 교체 공사 제안')
    .replace('[공사명]', '안성 일죽공장 지붕 교체 공사')
}
