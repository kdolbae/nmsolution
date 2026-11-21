import { pool } from '@/lib/db'
import { ensureClients } from '@/lib/clients/table'
import { SEED_QUESTIONS } from './seed'
import { KNOWLEDGE_KINDS, TOPICS, type KnowledgeEntry, type KnowledgeKind, type KnowledgeRevision, type Topic } from './shared'

/** 지식 DB 표 (lib/knowledge/shared.ts 설명 참고). 표는 첫 조회 때 생기고 질문 시드는 key 마다 한 번만 들어간다 */

let ready: Promise<void> | null = null

export function ensureKnowledge(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureClients()
      await pool.query(`CREATE TABLE IF NOT EXISTS nm_knowledge (
        id           bigint generated always as identity primary key,
        kind         text not null default 'qa',
        category     text not null default 'COMMON',
        topic        text not null default '기타',
        title        text not null,
        body         text not null default '',
        source       text not null default '',
        client_id    bigint references clients(id) on delete set null,
        asked_by     text not null default '',
        answered_by  text not null default '',
        history      jsonb not null default '[]',
        seed_key     text unique,
        created_at   timestamptz not null default now(),
        updated_at   timestamptz not null default now()
      )`)
      for (const q of SEED_QUESTIONS)
        await pool.query(
          `INSERT INTO nm_knowledge (kind, category, topic, title, source, asked_by, seed_key)
           VALUES ('qa', $1, $2, $3, $4, 'Claude', $5) ON CONFLICT (seed_key) DO NOTHING`,
          [q.category, q.topic, q.title, q.source, q.key],
        )
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

type Db = {
  id: string
  kind: string
  category: string
  topic: string
  title: string
  body: string
  source: string
  client_id: string | null
  client_name: string | null
  asked_by: string
  answered_by: string
  history: KnowledgeRevision[] | null
  created_at: Date
  updated_at: Date
}

const SELECT = `SELECT k.*, c.name AS client_name FROM nm_knowledge k LEFT JOIN clients c ON c.id = k.client_id`

const toEntry = (r: Db): KnowledgeEntry => ({
  id: Number(r.id),
  kind: (KNOWLEDGE_KINDS as readonly string[]).includes(r.kind) ? (r.kind as KnowledgeKind) : 'rule',
  category: r.category,
  topic: (TOPICS as readonly string[]).includes(r.topic) ? (r.topic as Topic) : '기타',
  title: r.title,
  body: r.body,
  source: r.source,
  clientId: r.client_id ? Number(r.client_id) : null,
  clientName: r.client_name,
  askedBy: r.asked_by,
  answeredBy: r.answered_by,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
  history: Array.isArray(r.history) ? r.history : [],
})

export async function listKnowledge(): Promise<KnowledgeEntry[]> {
  await ensureKnowledge()
  const { rows } = await pool.query<Db>(`${SELECT} ORDER BY k.category, k.id`)
  return rows.map(toEntry)
}

/** 한 업체에 남긴 매뉴얼 예외 메모 */
export async function listDeviations(clientId: number): Promise<KnowledgeEntry[]> {
  await ensureKnowledge()
  const { rows } = await pool.query<Db>(`${SELECT} WHERE k.client_id = $1 AND k.kind = 'deviation' ORDER BY k.id DESC`, [clientId])
  return rows.map(toEntry)
}

export type KnowledgeInput = {
  kind: KnowledgeKind
  category: string
  topic: Topic
  title: string
  body: string
  source: string
  clientId?: number | null
}

export async function addKnowledge(input: KnowledgeInput, by: string): Promise<number> {
  await ensureKnowledge()
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO nm_knowledge (kind, category, topic, title, body, source, client_id, asked_by, answered_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [input.kind, input.category, input.topic, input.title, input.body, input.source, input.clientId ?? null, by, input.body ? by : ''],
  )
  return Number(rows[0].id)
}

/** 답·이유를 적거나 고친다. 이전 답이 있으면 history 에 쌓는다(누가 언제 무엇이라 했는지 남김) */
export async function answerKnowledge(id: number, body: string, by: string): Promise<void> {
  await ensureKnowledge()
  await pool.query(
    `UPDATE nm_knowledge SET
       history = CASE WHEN body <> '' AND body <> $2
         THEN history || jsonb_build_array(jsonb_build_object('at', to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'by', answered_by, 'body', body))
         ELSE history END,
       body = $2, answered_by = $3, updated_at = now()
     WHERE id = $1`,
    [id, body, by],
  )
}

export async function deleteKnowledge(id: number): Promise<void> {
  await ensureKnowledge()
  await pool.query(`DELETE FROM nm_knowledge WHERE id = $1`, [id])
}
