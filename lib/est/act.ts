import { EstError } from './table'

/**
 * 견적 서버 액션 공용 래퍼. 운영에서는 서버 액션 오류 문구가 가려지므로 화면에 보여 줄 오류는 값으로 돌려줌
 * (app/actions/clients.ts shown() 과 같은 생각). EstError 문구는 그대로, 권한 없음은 정해진 문구, 나머지는 일반 문구.
 */
export type ActResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string }

export async function act<T extends object = object>(run: () => Promise<T | void>): Promise<ActResult<T>> {
  try {
    const out = await run()
    return { ok: true, ...((out ?? {}) as T) }
  } catch (e) {
    if (e instanceof EstError) return { ok: false, error: e.message }
    if (e instanceof Error && e.message === 'Unauthorized') return { ok: false, error: '권한이 없음' }
    console.error('[est] action', e)
    return { ok: false, error: '처리 중 오류가 남. 잠시 뒤 다시 해야 함' }
  }
}

/** 입력 정리 */
export const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
export const num = (v: unknown): number => {
  const x = Number(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(x) ? x : 0
}
export const int = (v: unknown): number => Math.round(num(v))
export const idOf = (v: unknown): number => {
  const x = Number(v)
  if (!Number.isInteger(x) || x <= 0) throw new EstError('잘못된 번호임')
  return x
}
export function jsonOf(v: unknown, label: string): unknown {
  if (typeof v !== 'string') return v
  const t = v.trim()
  if (!t) return null
  try {
    return JSON.parse(t)
  } catch {
    throw new EstError(`${label} JSON 형식이 맞지 않음`)
  }
}
