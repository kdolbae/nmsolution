'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, quoteRequests, siteContent } from '@/lib/db/schema'
import { CONTENT_DEFAULTS, PROJECT_CATEGORIES, type ContentKey } from '@/lib/content/defaults'
import { QUOTE_STATUSES } from '@/lib/quote'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

function revalidateAll() {
  revalidatePath('/', 'layout')
}

// ---------- 페이지 콘텐츠 ----------

export async function saveContent(key: ContentKey, data: Record<string, unknown>) {
  await requireAdmin()
  if (!(key in CONTENT_DEFAULTS)) throw new Error('Invalid content key')

  await db
    .insert(siteContent)
    .values({ key, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteContent.key, set: { data, updatedAt: new Date() } })

  revalidateAll()
  return { ok: true as const }
}

export async function resetContent(key: ContentKey) {
  await requireAdmin()
  await db.delete(siteContent).where(eq(siteContent.key, key))
  revalidateAll()
  return { ok: true as const }
}

// ---------- 시공사례 ----------

export type ProjectInput = {
  title: string
  category: string
  location: string
  year: string
  duration: string
  description: string
  imageUrl: string
  published: boolean
  sortOrder: number
}

function sanitizeProject(input: ProjectInput): ProjectInput {
  const title = input.title?.trim()
  if (!title) throw new Error('제목을 입력해 주세요.')
  const category = (PROJECT_CATEGORIES as readonly string[]).includes(input.category) ? input.category : '기타'
  return {
    title: title.slice(0, 200),
    category,
    location: (input.location ?? '').trim().slice(0, 100),
    year: (input.year ?? '').trim().slice(0, 20),
    duration: (input.duration ?? '').trim().slice(0, 60),
    description: (input.description ?? '').trim().slice(0, 4000),
    imageUrl: (input.imageUrl ?? '').trim().slice(0, 2000),
    published: Boolean(input.published),
    sortOrder: Number.isFinite(input.sortOrder) ? Math.trunc(input.sortOrder) : 0,
  }
}

export async function createProject(input: ProjectInput) {
  await requireAdmin()
  const values = sanitizeProject(input)
  const [row] = await db.insert(projects).values(values).returning({ id: projects.id })
  revalidateAll()
  return { ok: true as const, id: row.id }
}

export async function updateProject(id: number, input: ProjectInput) {
  await requireAdmin()
  const values = sanitizeProject(input)
  await db.update(projects).set({ ...values, updatedAt: new Date() }).where(eq(projects.id, id))
  revalidateAll()
  return { ok: true as const }
}

export async function deleteProject(id: number) {
  await requireAdmin()
  await db.delete(projects).where(eq(projects.id, id))
  revalidateAll()
  return { ok: true as const }
}

export async function toggleProjectPublished(id: number, published: boolean) {
  await requireAdmin()
  await db.update(projects).set({ published, updatedAt: new Date() }).where(eq(projects.id, id))
  revalidateAll()
  return { ok: true as const }
}

// ---------- 견적 문의 ----------

export async function updateQuoteStatus(id: number, status: string) {
  await requireAdmin()
  if (!(QUOTE_STATUSES as readonly { value: string }[]).some((s) => s.value === status)) {
    throw new Error('Invalid status')
  }
  await db.update(quoteRequests).set({ status, updatedAt: new Date() }).where(eq(quoteRequests.id, id))
  revalidatePath('/admin/quotes')
  return { ok: true as const }
}

export async function updateQuoteMemo(id: number, memo: string) {
  await requireAdmin()
  await db
    .update(quoteRequests)
    .set({ memo: (memo ?? '').slice(0, 4000), updatedAt: new Date() })
    .where(eq(quoteRequests.id, id))
  revalidatePath('/admin/quotes')
  return { ok: true as const }
}

export async function deleteQuote(id: number) {
  await requireAdmin()
  await db.delete(quoteRequests).where(eq(quoteRequests.id, id))
  revalidatePath('/admin/quotes')
  return { ok: true as const }
}
