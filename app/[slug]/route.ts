import { portalGet, portalPost } from '@/lib/clients/portal-route'

// 업체용 링크 nm-solution.co.kr/<주소>. 업체마다 폴더(app/atotech 등)를 만들지 않아도 N-CMS 에서 정한 주소가 바로 열린다.
// 폴더가 따로 있는 주소와 다른 화면 주소가 먼저 잡히고, 남는 한 단계 주소만 여기로 온다.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SLUG = /^[a-z0-9][a-z0-9-]{1,40}$/
const notFound = () => new Response('Not Found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } })

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params
  return SLUG.test(slug) ? portalGet(req, slug) : notFound()
}

export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params
  return SLUG.test(slug) ? portalPost(req, slug) : notFound()
}
