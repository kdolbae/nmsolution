import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { clientFiles } from '@/lib/clients/files'
import { getClient } from '@/lib/clients/table'
import { approvedClientId } from '@/lib/portal/access'

export const dynamic = 'force-dynamic'

/** 협력업체 포털: 자기 업체 제출 서류 내려받기 (목록은 lib/clients/files.ts) */
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const clientId = await approvedClientId(req.headers)
  if (!clientId) return new Response('로그인이 필요합니다.', { status: 401 })
  const client = await getClient(clientId)
  const { file } = await params
  const set = client && clientFiles(client.name)
  const f = set?.files.find((x) => x.file === file)
  if (!set || !f) return new Response('없는 파일', { status: 404 })

  const body = await readFile(path.join(process.cwd(), 'private', 'client-files', set.dir, f.file))
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': f.type,
      'Content-Disposition': `attachment; filename="${f.file}"; filename*=UTF-8''${encodeURIComponent(f.download)}`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
