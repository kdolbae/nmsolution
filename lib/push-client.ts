'use client'

/** 브라우저 쪽 푸시 구독. 서비스워커(/sw.js) 등록 → 권한 요청 → 구독 정보를 서버에 보낸다. */
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** 아이폰은 홈 화면에 추가해서 연 앱에서만 웹 푸시가 된다 */
export function needsHomeScreen(): boolean {
  if (typeof window === 'undefined') return false
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
  return ios && !standalone
}

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration('/')
  return (await reg?.pushManager.getSubscription()) ?? null
}

/** 성공하면 서버에 보낼 구독 JSON, 거절·미지원이면 에러 메시지 */
export async function subscribePush(): Promise<{ ok: true; sub: PushSubscriptionJSON } | { ok: false; error: string }> {
  if (!pushSupported()) return { ok: false, error: '이 브라우저는 알림을 지원하지 않습니다.' }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: '알림이 차단되어 있습니다. 브라우저 설정에서 이 사이트 알림을 허용해 주세요.' }
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await navigator.serviceWorker.ready
  const res = await fetch('/api/push/key', { cache: 'no-store' })
  const { key } = (await res.json()) as { key: string }
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }))
  return { ok: true, sub: sub.toJSON() }
}
