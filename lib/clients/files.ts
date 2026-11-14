/**
 * 업체별 제출 서류 파일(인쇄용 PDF·엑셀·도면). 관리자는 /api/admin/clients/[id]/files/[file], 업체는 업체 페이지 ?file=<file>(접속 기록 'file')로 내려받는다.
 * 파일은 private/client-files/<dir>/ 에 두고(공개 폴더 아님), next.config.mjs outputFileTracingIncludes 로 함께 배포한다.
 * 원본은 /mnt/project-files/kkt-base/ (견적 스레드에서 생성).
 */

export type ClientFile = {
  /** private/client-files/<dir>/ 안의 파일 이름 */
  file: string
  /** 화면에 보이는 이름 */
  label: string
  /** 내려받을 때 파일 이름 */
  download: string
  type: string
}

const PDF = 'application/pdf'
const DXF = 'application/dxf'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const FILES: Record<string, { dir: string; files: ClientFile[] }> = {
  '주식회사 금강변압기': {
    dir: 'kkt',
    files: [
      { file: 'submission.pdf', label: '제출 서류 묶음 (표지 + 작업계획서 + 견적서)', download: '공사제안서_금강변압기_표지+작업계획서+견적서.pdf', type: PDF },
      { file: 'plan.pdf', label: '작업계획서', download: '작업계획서_금강변압기_진공건조로_회전안착_용접_이동_보온.pdf', type: PDF },
      { file: 'quote.pdf', label: '견적서', download: '견적서_금강변압기_진공건조로_회전안착_용접_이동_보온.pdf', type: PDF },
    ],
  },
  // 업체 페이지 안 'CO₂ 배관 설계(초안)' 내려받기(nm-solution.co.kr/decopave?file=…). 원본 /mnt/project-files/decopave/design/
  '(주)데코페이브': {
    dir: 'decopave',
    files: [
      { file: 'co2-design-v2.pdf', label: 'CO₂ 배관 설계도 (PDF)', download: '데코페이브_CO2배관_설계도_v2.pdf', type: PDF },
      { file: 'co2-design-v2.dxf', label: 'CO₂ 배관 설계도 (DXF, 캐드)', download: '데코페이브_CO2배관_설계도_v2.dxf', type: DXF },
      { file: 'co2-design-v2.xlsx', label: '설계 유량·자재 리스트·PLC 입출력 (엑셀)', download: '데코페이브_CO2_설계유량_자재리스트_v2.xlsx', type: XLSX },
    ],
  },
}

export function clientFiles(clientName: string): { dir: string; files: ClientFile[] } | null {
  return FILES[clientName] ?? null
}
