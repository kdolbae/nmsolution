/**
 * 견적 역할·보기 권한 (순수 함수). 서버 액션의 실제 막기는 lib/session.ts requireEst 가 함.
 * 기획서 §8 권한 표.
 */
import { sArr, sObj, type Settings } from './settings-defaults'

export const EST_ROLES = ['writer', 'reviewer', 'ceo'] as const
export type EstRole = (typeof EST_ROLES)[number]

export const EST_ROLE_LABEL: Record<EstRole, string> = { writer: '작성자', reviewer: '검토자', ceo: '대표' }

const RANK: Record<EstRole, number> = { writer: 1, reviewer: 2, ceo: 3 }

export function isEstRole(v: unknown): v is EstRole {
  return v === 'writer' || v === 'reviewer' || v === 'ceo'
}

/** role 이 min 이상인지 */
export function atLeast(role: EstRole | null | undefined, min: EstRole): boolean {
  return !!role && RANK[role] >= RANK[min]
}

export type ProfitView = 'none' | 'pct' | 'amount'

/** 이익을 얼마나 보여 줄지(profit.visible) */
export function profitView(role: EstRole | null | undefined, s: Settings): ProfitView {
  if (!role) return 'none'
  const v = sObj<Record<string, string>>(s, 'profit.visible')[role]
  return v === 'amount' || v === 'pct' || v === 'none' ? v : role === 'writer' ? 'pct' : 'amount'
}

/** 실단가·원가 열을 볼 수 있는지(cost.visible_roles) */
export function canSeeCost(role: EstRole | null | undefined, s: Settings): boolean {
  return !!role && sArr(s, 'cost.visible_roles').includes(role)
}

/**
 * SBworks 역할 코드 → 견적 역할(sso.role_map). tenant.manage 권한이 있으면 ceo.
 * 표에 null(또는 'none')로 적힌 역할은 들어올 수 없음(null 반환). 표에 없는 역할은 writer.
 */
export function estRoleFor(roleCode: string, perms: string[], roleMap: Record<string, unknown>): EstRole | null {
  if (perms.includes('tenant.manage')) return 'ceo'
  if (Object.prototype.hasOwnProperty.call(roleMap, roleCode)) {
    const v = roleMap[roleCode]
    return isEstRole(v) ? v : null
  }
  return 'writer'
}
