/**
 * 업체별 제출 서류 파일(인쇄용 PDF·엑셀). 관리자만 /api/admin/clients/[id]/files/[file] 로 내려받는다.
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

const FILES: Record<string, { dir: string; files: ClientFile[] }> = {
  '주식회사 금강변압기': {
    dir: 'kkt',
    files: [
      { file: 'submission.pdf', label: '제출 서류 묶음 (표지 + 작업계획서 + 견적서)', download: '공사제안서_금강변압기_표지+작업계획서+견적서.pdf', type: PDF },
      { file: 'plan.pdf', label: '작업계획서', download: '작업계획서_금강변압기_진공건조로_회전안착_용접.pdf', type: PDF },
      { file: 'quote.pdf', label: '견적서', download: '견적서_금강변압기_진공건조로_회전안착_용접.pdf', type: PDF },
    ],
  },
}

export function clientFiles(clientName: string): { dir: string; files: ClientFile[] } | null {
  return FILES[clientName] ?? null
}
