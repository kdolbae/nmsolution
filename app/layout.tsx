import { Analytics } from '@vercel/analytics/next'
import { SiteTracker } from '@/components/site-tracker'
import { AdminFab } from '@/components/admin-fab'
import type { Metadata, Viewport } from 'next'
import { Geist_Mono } from 'next/font/google'
import { TrackingScripts } from '@/components/tracking-scripts'
import { siteUrl, siteVerification } from '@/lib/site'
// 공식 폰트 Pretendard (디자인 규격). 쓰는 글자 범위만 나눠 받는 dynamic subset을 자체 호스팅한다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './globals.css'

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

const SITE_NAME = '엔엠솔루션 NM SOLUTION'
// 포지셔닝: 산업시설 구독형 턴키 전문회사. 큰 공사(탱크·장비 이전설치·설비배관·공압·덕트)를 앞에,
// 판넬·에폭시 같은 소규모 공종은 뒤로 둔다. 회사명을 맨 앞에 두어 '엔엠솔루션' 이름 검색에 바로 걸리게 한다.
const TITLE = '엔엠솔루션 | 산업시설 구독형 턴키 · 탱크·장비 이전설치·설비배관'
// 네이버는 검색 결과에 쓰는 설명을 80자 이내로 권고한다. 넘기면 잘려서 문장이 끊긴다.
const DESCRIPTION =
  '대형 탱크·장비 이전설치·설비배관·공압·덕트까지 공장 설비 공사를 한 팀이 턴키로. 평택 고덕 기반 경기·충청. 대표번호 1800-5901'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  keywords: [
    '엔엠솔루션',
    'NM SOLUTION',
    '산업시설 턴키',
    '산업시설 유지보수',
    '공장 설비 공사',
    '대형 탱크 제작',
    '탱크 수리',
    '압력탱크 제작',
    '장비 이전설치',
    '장비 셋업',
    '설비배관',
    '공장 배관 공사',
    '스텐 고압배관',
    '공압 배관',
    '수배관',
    '덕트 공사',
    '냉동기 배관',
    '공장 증축',
    '철골 구조물',
    '평택 공장 설비',
    '경기 공장 개보수',
    '공장 지붕 판넬',
    '에폭시 바닥',
  ],

  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    images: [
      {
        url: '/images/hero-factory.png',
        width: 1024,
        height: 1024,
        alt: '엔엠솔루션 산업시설 턴키 — 공장 외관',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/images/hero-factory.png'],
  },
  robots: { index: true, follow: true },
  verification: { other: siteVerification() },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`bg-background ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <TrackingScripts />
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <SiteTracker />
        <AdminFab />
      </body>
    </html>
  )
}
