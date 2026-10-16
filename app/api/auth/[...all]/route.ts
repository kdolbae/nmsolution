import { auth } from '@/lib/auth'
import { ensureUserRole } from '@/lib/auth-roles'
import { toNextJsHandler } from 'better-auth/next-js'

const handler = toNextJsHandler(auth)

// user 표의 role 칸이 있어야 Better Auth 가 계정을 읽을 수 있다 (lib/auth-roles.ts)
export async function GET(req: Request) {
  await ensureUserRole()
  return handler.GET(req)
}

export async function POST(req: Request) {
  await ensureUserRole()
  return handler.POST(req)
}
