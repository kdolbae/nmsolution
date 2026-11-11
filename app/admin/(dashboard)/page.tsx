import { redirect } from 'next/navigation'

/** 대시보드는 없앴다(엔엠 어드민 삭제 계획, kevin 2026-11-10). 남은 메뉴는 업체 관리뿐이라 그리로 보낸다 */
export default function AdminHome() {
  redirect('/admin/clients')
}
