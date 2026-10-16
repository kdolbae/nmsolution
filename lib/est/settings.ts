import { pool } from '@/lib/db'
import { ensureEst } from './table'
import { SETTING_DEFAULTS, SETTING_DEFAULT_MAP, type Settings } from './settings-defaults'

/**
 * 기준값(est_setting) 읽기. 60초 캐시(인스턴스 메모리). 저장하면 invalidateSettings().
 * DB 에 없는 키는 settings-defaults.ts 의 샘플 기본값.
 */
let cache: { at: number; value: Settings } | null = null
const TTL = 60_000

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < TTL) return cache.value
  await ensureEst()
  const { rows } = await pool.query<{ key: string; value: unknown }>(`SELECT key, value FROM est_setting`)
  const value: Settings = { ...SETTING_DEFAULT_MAP }
  for (const r of rows) value[r.key] = r.value
  cache = { at: Date.now(), value }
  return value
}

export async function getSetting<T = unknown>(key: string): Promise<T> {
  return (await getSettings())[key] as T
}

export function invalidateSettings() {
  cache = null
}

export type SettingRow = {
  key: string
  value: unknown
  label: string
  group: string
  help: string | null
  isSample: boolean
  updatedAt: string | null
  updatedBy: string | null
}

/** 설정 화면용: DB 줄 + 아직 DB 에 없는 기본값 */
export async function listSettingRows(): Promise<SettingRow[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT key, value, label, "group", help, is_sample, updated_at, updated_by FROM est_setting`)
  const byKey = new Map(rows.map((r) => [r.key as string, r]))
  const out: SettingRow[] = SETTING_DEFAULTS.map((d) => {
    const r = byKey.get(d.key)
    byKey.delete(d.key)
    return {
      key: d.key,
      value: r ? r.value : d.value,
      label: r?.label ?? d.label,
      group: r?.group ?? d.group,
      help: r?.help ?? d.help ?? null,
      isSample: r ? Boolean(r.is_sample) : true,
      updatedAt: r && !r.is_sample ? new Date(r.updated_at).toISOString() : null,
      updatedBy: r?.updated_by ?? null,
    }
  })
  for (const r of byKey.values()) {
    out.push({
      key: r.key,
      value: r.value,
      label: r.label,
      group: r.group,
      help: r.help,
      isSample: Boolean(r.is_sample),
      updatedAt: r.is_sample ? null : new Date(r.updated_at).toISOString(),
      updatedBy: r.updated_by,
    })
  }
  return out
}

export async function saveSetting(key: string, value: unknown, by: string) {
  await ensureEst()
  const d = SETTING_DEFAULTS.find((x) => x.key === key)
  await pool.query(
    `INSERT INTO est_setting (key, value, label, "group", help, is_sample, updated_at, updated_by)
     VALUES ($1, $2::jsonb, $3, $4, $5, false, now(), $6)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, is_sample = false, updated_at = now(), updated_by = EXCLUDED.updated_by`,
    [key, JSON.stringify(value), d?.label ?? key, d?.group ?? '기타', d?.help ?? null, by],
  )
  invalidateSettings()
}
