import type { Topic } from './shared'

/**
 * 지난 견적에서 뽑은 "왜 그렇게 했는지" 질문 (2026-11-14). 답은 어드민 '지식 DB'에서 견적자가 채운다.
 * key 는 한 번만 들어가게 하는 표시라 바꾸지 않는다. 새 질문은 새 key 로 아래에 더한다.
 */
export const SEED_QUESTIONS: { key: string; category: string; topic: Topic; title: string; source: string }[] = [
  // F4 중량물
  { key: 'q-kkt-crane-pair', category: 'F4', topic: '장비 선택', title: '회전·안착은 100t + 70t 두 대, 완성품 이동은 250t 한 대로 정한 기준은? (무게 대비 톤수 여유를 얼마로 보는지)', source: '금강변압기 건조로' },
  { key: 'q-kkt-gantry', category: 'F4', topic: '장비 선택', title: '현장 갠트리(30t)를 쓰지 않고 이동식 크레인을 부르는 판단 기준은?', source: '금강변압기 건조로' },
  { key: 'q-kkt-base', category: 'F4', topic: '자재 선택', title: '안착 베이스를 H빔으로 만들고 작업 뒤 회수하는 방식으로 한 이유는? 다른 현장에서도 같은 방식인지', source: '금강변압기 건조로' },
  { key: 'q-kkt-signal', category: 'F4', topic: '인원·공정', title: '인양일에 신호수 2명·안전담당 1명을 넣는 기준은 항상 같은지, 줄이거나 늘리는 경우는?', source: '금강변압기 건조로' },
  { key: 'q-kkt-insul', category: 'F5', topic: '자재 선택', title: '건조로 보온재를 그라스울 매트 250T 에서 48K 보온판 150T(100T + 50T)로 바꾼 이유는?', source: '금강변압기 건조로 보온' },
  // F1 지붕·외벽
  { key: 'q-sinil-overroof', category: 'F1', topic: '공법', title: '기존 지붕을 걷어내지 않고 덧씌움(오버루핑)을 권하는 기준은? 교체로 가야 하는 경우는?', source: '신일공업 지붕' },
  { key: 'q-sinil-frame', category: 'F1', topic: '가격·여분율', title: '프레임(각파이프) 설치를 기본 금액에 넣지 않고 선택 항목으로 뺀 기준은?', source: '신일공업 지붕' },
  { key: 'q-seoul-panel', category: 'F1', topic: '자재 선택', title: '처마 지붕에 EPS 난연 100T 를 고른 이유는? (두께·심재를 정하는 기준)', source: '서울 상가 처마' },
  { key: 'q-seoul-chair', category: 'F1', topic: '공법', title: '건물 벽 쪽을 L자 절곡 철판(아연도 1.2t)에 앵커 @600 으로 받친 이유는? 각관 하지와 비교해 언제 이 방식을 쓰는지', source: '서울 상가 처마' },
  { key: 'q-roof-spare', category: 'F1', topic: '가격·여분율', title: '지붕 판넬·후레싱 여분(길이 여유)은 보통 몇 % 로 잡는지, 현장에 따라 달라지는 조건은?', source: '서울 상가 처마, 신일공업' },
  // F2 판넬 내장
  { key: 'q-jjy-panel', category: 'F2', topic: '자재 선택', title: '식품공장 칸막이에 준불연 EPS 50T 를 쓰는 기준은? 75T·우레탄으로 올리는 경우는?', source: '정준영 식품공장' },
  { key: 'q-jjy-order', category: 'F2', topic: '가격·여분율', title: '판넬을 벽 직선 길이 기준(47m → 47장)으로 주문할 때 여분은 어떻게 잡는지, 문·모서리는 어떻게 계산하는지', source: '정준영 식품공장' },
  { key: 'q-airrane-pur', category: 'F2', topic: '자재 선택', title: '세정액실 격벽에 준불연 우레탄 50T 를 고른 이유는?', source: '에어레인 세정액실' },
  { key: 'q-airrane-frame', category: 'F2', topic: '공법', title: '각파이프 □100×50 골조를 따로 세운 판단 기준은? (판넬 자립, 천장 매달기와 비교)', source: '에어레인 세정액실' },
  { key: 'q-adreaming-hanger', category: 'F2', topic: '공법', title: '천장 스레드로드 행거 간격을 2.2m 로 한 기준은? ("1m 당 1개" 기준과 어느 쪽이 맞는지)', source: '고양 어드리밍' },
  { key: 'q-panel-crew', category: 'F2', topic: '인원·공정', title: '판넬 시공 인원·일수는 무엇으로 정하는지 (㎡ 당 인·일, 높이, 문 개수 등)', source: '정준영, 에어레인, 어드리밍' },
  // F3 철골
  { key: 'q-seongwon-beam', category: 'F3', topic: '자재 선택', title: '10m 보를 H-300×150 으로 정한 기준은? 적재하중은 어떻게 가정하는지', source: '성원냉동기계 적치대' },
  { key: 'q-steel-trades', category: 'F3', topic: '인원·공정', title: '철골 현장에서 팀장·용접기공·조공·도장공을 나누는 기준과 인원 비율은?', source: '성원냉동기계 적치대' },
  // F6 기계설비·배관
  { key: 'q-atotech-option', category: 'F6', topic: '공법', title: '고객 요청안(제안 1)과 별도로 리턴 배관 내림(제안 2)을 권한 이유는?', source: '아토텍코리아 배관' },
  { key: 'q-desian-order', category: 'F6', topic: '공법', title: '펌프를 분해 점검 → 펌프 교체 → 패키지 교체 순으로 제안하는 기준은? 바로 교체를 권하는 경우는?', source: '데시앙플렉스 오수 펌프' },
  { key: 'q-dirty-double', category: 'F6', topic: '가격·여분율', title: '일당을 두 배로 넣는 작업의 범위는? (오수·집수정 밖에 어떤 작업이 해당되는지)', source: '데시앙플렉스 오수 펌프' },
  { key: 'q-airrane-fan', category: 'F6', topic: '장비 선택', title: '국소배기를 Ø200 덕트·시로코 송풍기로 정한 기준은? (풍량·소음·무동력 벤틸레이터와 비교)', source: '에어레인 세정액실' },
  { key: 'q-decopave-sts', category: 'F6', topic: '자재 선택', title: 'CO₂ 배관을 STS304 이음매 없는 관·TIG 용접으로 한 이유는?', source: '데코페이브 양생굴' },
  // 공통
  { key: 'q-lift-choice', category: 'F0', topic: '장비 선택', title: '고소작업대(스카이잭)·이동식 비계·사다리를 고르는 기준은? (높이·작업 일수·바닥 조건)', source: '여러 현장' },
  { key: 'q-waste-cost', category: 'F0', topic: '가격·여분율', title: '폐기물 처리비는 무엇을 기준으로 잡는지 (지금까지 10만 ~ 60만으로 차이가 큼)', source: '여러 현장' },
  { key: 'q-site-expense', category: 'F0', topic: '가격·여분율', title: '현장 경비·교통비·숙박은 거리나 지역에 따라 어떻게 달리 넣는지', source: '부천, 청주, 단양 현장' },
  { key: 'q-min-job', category: 'COMMON', topic: '가격·여분율', title: '소규모 현장의 최소 인원·최소 금액 기준은? (반나절 일도 하루로 보는지)', source: '제이에스테크, 가나티엠' },
  { key: 'q-mat-spare', category: 'COMMON', topic: '가격·여분율', title: '자재 여분율은 품목별로 얼마가 맞는지 (판넬·각관·후레싱·실리콘·피스)', source: '여러 현장' },
  { key: 'q-labor-ratio', category: 'COMMON', topic: '가격·여분율', title: '인건비를 자재비의 비율로 볼 때 공종별 비율은 얼마가 맞는지 (지난 견적: 판넬 63 ~ 113%, 지붕 70 ~ 80%, 철골 66%, 배관 116 ~ 195%)', source: '지난 견적 11건' },
]
