'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { currentSubscription, needsHomeScreen, pushSupported, subscribePush } from '@/lib/push-client'

/** 관리자 → 견적 문의: 이 기기(휴대폰)로 새 문의·메시지 알림 받기 */
export function AdminPushButton() {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'unsupported' | 'ios' | 'off' | 'on'>('loading')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (needsHomeScreen()) return setState('ios')
    if (!pushSupported()) return setState('unsupported')
    currentSubscription().then((s) => setState(s ? 'on' : 'off'))
  }, [])

  async function on() {
    setMsg(null)
    const r = await subscribePush()
    if (!r.ok) return setMsg(r.error)
    const label = /iPhone|Android/.exec(navigator.userAgent)?.[0] || 'PC'
    const res = await fetch('/api/push/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sub: r.sub, label }) })
    if (!res.ok) return setMsg('등록에 실패했습니다. 다시 눌러 주세요.')
    setState('on')
    router.refresh()
  }

  async function test() {
    await fetch('/api/push/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test: true }) })
    setMsg('시험 알림을 보냈습니다. 몇 초 안에 와야 합니다.')
  }

  async function off() {
    const s = await currentSubscription()
    if (s) {
      await fetch('/api/push/admin', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) })
      await s.unsubscribe()
    }
    setState('off')
    router.refresh()
  }

  const btn = 'font-semibold text-navy underline'
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3">
      {state === 'ios' && <span>아이폰은 사파리 공유 버튼 → &lsquo;홈 화면에 추가&rsquo; 후, 홈 화면 아이콘으로 열어서 눌러 주세요.</span>}
      {state === 'unsupported' && <span>이 브라우저는 알림을 지원하지 않습니다.</span>}
      {state === 'off' && (
        <button type="button" onClick={on} className={btn}>
          이 기기로 알림 받기
        </button>
      )}
      {state === 'on' && (
        <>
          <span>이 기기는 받는 중</span>
          <button type="button" onClick={test} className={btn}>
            시험 알림
          </button>
          <button type="button" onClick={off} className="underline">
            이 기기 끄기
          </button>
        </>
      )}
      {msg && <span className="text-electric">{msg}</span>}
    </span>
  )
}
