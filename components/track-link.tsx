'use client'

import { track } from '@vercel/analytics'

/**
 * 누른 횟수를 집계하는 링크. 서버 컴포넌트 안에서 전화·견적 버튼을 만들 때 쓴다.
 * 광고 랜딩에서 어떤 버튼으로 연락이 오는지 보려고 `from`을 남긴다.
 */
export function TrackLink({
  channel,
  from,
  ...props
}: React.ComponentProps<'a'> & { channel: string; from: string }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track('contact_click', { channel, from })
        props.onClick?.(e)
      }}
    />
  )
}
