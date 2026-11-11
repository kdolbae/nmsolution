/* 엔엠솔루션 푸시 알림 (lib/notify/push.ts). 알림을 띄우고, 누르면 해당 화면을 연다. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: '엔엠솔루션', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || '엔엠솔루션', {
      body: data.body || '',
      icon: '/apple-icon.png',
      badge: '/icon-light-32x32.png',
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(url.split('#')[0]) && 'focus' in c) return c.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
