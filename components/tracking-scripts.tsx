'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { captureAttribution } from '@/lib/attribution'
import { META_PIXEL_ID, NAVER_WCS_ID } from '@/lib/tracking'

/**
 * 광고 추적 스크립트와 유입 기록.
 *
 * - 메타 픽셀: 리타게팅과 전환 최적화에 필요하다. 방문자가 쌓여야 리타게팅을 켤 수 있으므로
 *   광고를 켜기 전에 미리 깔아 둔다
 * - 네이버 프리미엄 로그분석: 검색광고 전환 집계
 * - 유입 기록: 어느 광고에서 온 방문인지를 쿠키에 담아 견적 접수 때 함께 저장한다
 *
 * 환경변수가 비어 있는 매체는 스크립트가 나가지 않는다.
 */
export function TrackingScripts() {
  const pathname = usePathname()

  useEffect(() => {
    captureAttribution()
  }, [])

  // 화면 안에서 이동할 때도 페이지뷰를 다시 보낸다 (Next.js 는 새로고침 없이 이동한다)
  useEffect(() => {
    if (!pathname) return
    window.fbq?.('track', 'PageView')
    if (window.wcs && window.wcs_do) window.wcs_do()
  }, [pathname])

  return (
    <>
      {META_PIXEL_ID && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {NAVER_WCS_ID && (
        <>
          <Script src="https://wcs.naver.net/wcslog.js" strategy="afterInteractive" />
          <Script id="naver-wcs" strategy="afterInteractive">
            {`if(!window.wcs_add) window.wcs_add={};
window.wcs_add["wa"]="${NAVER_WCS_ID}";
if(window.wcs) window.wcs.inflow("nm-solution.co.kr");
if(window.wcs_do) window.wcs_do();`}
          </Script>
        </>
      )}
    </>
  )
}
