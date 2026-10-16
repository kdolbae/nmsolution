/**
 * 판 하나 → 고객용 문서 모양(CustomerDoc). DB 읽기만 하고 걸러내기는 lib/est/print.ts toCustomerDoc 이 함.
 */
import { getEstimateDetail, getProject, kstToday } from './data'
import { toRateSet } from './compute'
import { toCustomerDoc, type CustomerDoc } from './print'
import { getSettings } from './settings'
import { sStr } from './settings-defaults'

export async function customerDocFor(estimateId: number): Promise<{ doc: CustomerDoc; projectId: number; status: string } | null> {
  const d = await getEstimateDetail(estimateId)
  if (!d) return null
  const p = await getProject(d.estimate.projectId)
  if (!p) return null
  const settings = await getSettings()
  const e = d.estimate
  const approved = e.status === 'approved' || e.status === 'submitted'
  const today = kstToday()
  const validDays = e.settingsSnap?.validDays ?? 30
  const validUntil = e.validUntil ?? new Date(Date.parse(today) + validDays * 86400000).toISOString().slice(0, 10)
  const doc = toCustomerDoc({
    title: p.title,
    customerNumber: e.customerNumber ?? `${p.number}-${e.label || `v${e.versionNo}`}`,
    date: e.submittedAt ? e.submittedAt.slice(0, 10) : today,
    validUntil,
    validDays,
    recipient: { name: p.client?.name ?? '', bizNumber: p.client?.bizNumber, siteAddress: p.siteAddress || p.client?.siteAddress },
    sections: d.sections.map((s) => ({ name: s.name, description: s.description, calcMode: s.calcMode, isOption: s.isOption, lines: s.lines })),
    rateSet: toRateSet(e.rateSnap),
    notesCustomer: e.notesCustomer,
    confirmText: sStr(settings, 'doc.confirm_needed_text'),
    approved,
  })
  return { doc, projectId: p.id, status: e.status }
}
