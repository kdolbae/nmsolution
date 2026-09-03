import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EXCLUDES = ['node_modules/*', '.next/*', '.git/*', '.vercel/*', '.env*', '*.log', '.v0/*', 'user_read_only_context/*', 'v0_memories/*']

/**
 * 프로젝트 소스코드를 ZIP으로 내려받습니다 (관리자 전용).
 * 서버에 소스가 존재하는 환경(v0 프리뷰, 셀프호스팅)에서 동작합니다.
 * Vercel 서버리스 배포에서는 소스가 번들에 포함되지 않아 안내 메시지를 반환합니다.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const root = process.cwd()
  try {
    await access(path.join(root, 'package.json'))
    await access(path.join(root, 'app'))
  } catch {
    return new Response(
      '이 배포 환경에서는 소스코드가 서버에 포함되어 있지 않습니다. GitHub 저장소 또는 v0의 "Download ZIP" 메뉴를 이용해 주세요.',
      { status: 501, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    )
  }

  const args = ['-r', '-q', '-', '.', ...EXCLUDES.flatMap((e) => ['-x', e])]
  const zip = spawn('zip', args, { cwd: root })

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      zip.stdout.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
      zip.stdout.on('end', () => controller.close())
      zip.on('error', (err) => controller.error(err))
    },
    cancel() {
      zip.kill()
    },
  })

  const date = new Date().toISOString().slice(0, 10)
  return new Response(stream, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="nm-solution-site-${date}.zip"`,
      'cache-control': 'no-store',
    },
  })
}
