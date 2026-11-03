'use server'

import { requireAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import {
  cancelContract,
  createContract,
  deleteDraft,
  issueContract,
  markSigned,
  normalizeParty,
  normalizeTerms,
  updateContract,
} from '@/lib/contracts/table'

/** 계약서(lib/contracts/table.ts). 오류 문구는 화면에 보여 주려고 값으로 돌려준다 */
async function shown<T>(run: () => Promise<T>): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    return { ok: true, ...(await run()) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '처리하지 못했습니다.' }
  }
}

const who = (u: { name?: string | null; email?: string | null }) => u.name?.trim() || u.email || ''

function done<T>(r: T) {
  revalidatePath('/admin/clients', 'layout')
  return r
}

export async function saveContract(clientId: number, no: number | null, versionNo: number, party: unknown, terms: unknown) {
  const user = await requireAdmin()
  return done(
    await shown(async () => {
      if (no === null) {
        const c = await createContract(clientId, versionNo, normalizeParty(party), normalizeTerms(terms), who(user))
        return { no: c.no, number: c.number }
      }
      await updateContract(clientId, no, versionNo, normalizeParty(party), normalizeTerms(terms), who(user))
      return { no }
    }),
  )
}

export async function issueContractAction(clientId: number, no: number) {
  const user = await requireAdmin()
  return done(await shown(async () => ({ number: (await issueContract(clientId, no, who(user))).number })))
}

export async function signContractAction(clientId: number, no: number, note: string) {
  const user = await requireAdmin()
  return done(await shown(async () => markSigned(clientId, no, String(note ?? '').trim(), who(user))))
}

export async function cancelContractAction(clientId: number, no: number) {
  const user = await requireAdmin()
  return done(
    await shown(async () => {
      await cancelContract(clientId, no, who(user))
      return {}
    }),
  )
}

export async function deleteContractDraft(clientId: number, no: number) {
  await requireAdmin()
  return done(
    await shown(async () => {
      await deleteDraft(clientId, no)
      return {}
    }),
  )
}
