'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { getContent } from '@/lib/content/get'
import { createIntake, getIntake, listFiles, removeFile, removeIntake, setCaption, updateIntake } from '@/lib/intake/table'
import { intakeProposalHtml } from '@/lib/intake/proposal'
import { getClient, insertClient, updateProposal, updateQuote, type ClientInfo } from '@/lib/clients/table'
import { emptyQuote } from '@/lib/clients/quote'

function who(user: { name?: string | null; email?: string | null }) {
  return user.name?.trim() || user.email || ''
}

export async function newIntake() {
  const user = await requireAdmin()
  const id = await createIntake(who(user))
  redirect(`/admin/intake/${id}`)
}

export async function saveIntakeText(id: number, title: string, description: string) {
  await requireAdmin()
  await updateIntake(id, { title: String(title).trim().slice(0, 200), description: String(description).slice(0, 20000) })
  return { ok: true as const }
}

export async function saveIntakeCaption(fileId: number, caption: string) {
  await requireAdmin()
  await setCaption(fileId, String(caption).slice(0, 500))
  return { ok: true as const }
}

export async function deleteIntakeFile(fileId: number) {
  await requireAdmin()
  await removeFile(fileId)
  return { ok: true as const }
}

export async function deleteIntake(id: number) {
  await requireAdmin()
  await removeIntake(id)
  revalidatePath('/admin/intake')
  redirect('/admin/intake')
}

/** 대화·분석·초안을 지우고 자료만 남긴다 */
export async function resetIntakeAi(id: number) {
  await requireAdmin()
  await updateIntake(id, { analysis: null, messages: [], draft: null })
  return { ok: true as const }
}

/**
 * 초안을 업체 관리의 제안서·견적서로 넣는다. 기존 업체를 고르면 그 업체의 제안서·견적서를 덮어쓰고(버전 기록 남음),
 * 새 업체면 등록한다. 견적번호·날짜는 새로 매긴다.
 */
export async function applyIntakeDraft(id: number, target: { clientId: number } | { newClient: ClientInfo }) {
  const user = await requireAdmin()
  const intake = await getIntake(id)
  if (!intake?.draft) throw new Error('먼저 제안서·견적서 초안을 만들어 주세요.')
  const files = await listFiles(id)
  const settings = await getContent('settings')
  const by = who(user)
  const fresh = emptyQuote()
  const quote = { ...intake.draft.quote, number: fresh.number, date: fresh.date }
  let clientId: number
  if ('clientId' in target) {
    const client = await getClient(target.clientId)
    if (!client) throw new Error('업체를 찾을 수 없습니다.')
    const html = intakeProposalHtml(intake.draft.proposal, client, files, settings)
    await updateProposal(client.id, html, by, 'AI 접수 제안서로 바꿈')
    await updateQuote(client.id, quote, by)
    clientId = client.id
  } else {
    const info: ClientInfo = {
      name: String(target.newClient.name ?? '').trim().slice(0, 200),
      bizNumber: '',
      contactPerson: String(target.newClient.contactPerson ?? '').trim().slice(0, 200),
      phone: String(target.newClient.phone ?? '').trim().slice(0, 60),
      email: '',
      siteAddress: String(target.newClient.siteAddress ?? '').trim().slice(0, 300),
      memo: `AI 견적 접수 #${id} 에서 등록`,
      portalSlug: '',
      portalLogin: '',
    }
    if (!info.name) throw new Error('업체명을 입력해 주세요.')
    const html = intakeProposalHtml(intake.draft.proposal, info, files, settings)
    clientId = await insertClient(info, html, quote, by)
  }
  await updateIntake(id, { clientId })
  revalidatePath('/admin/clients', 'layout')
  revalidatePath('/admin/intake')
  return { ok: true as const, clientId }
}
