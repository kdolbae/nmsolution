import { vapidKeys } from '@/lib/notify/push'

export const dynamic = 'force-dynamic'

/** 웹 푸시 공개키 (브라우저가 구독할 때 쓴다) */
export async function GET() {
  try {
    return Response.json({ key: (await vapidKeys()).publicKey })
  } catch (e) {
    console.error('[push/key]', e)
    return Response.json({ error: 'unavailable' }, { status: 500 })
  }
}
