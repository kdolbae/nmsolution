import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Noto_Sans_KR } from 'next/font/google'
import { siteUrl, siteVerification } from '@/lib/site'
import './globals.css'

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

const SITE_NAME = '엔엠솔루션 NM SOLUTION'
const TITLE = '공장 수리 전문 엔엠솔루션 | 철골·지붕·설비·배관·장비·크린룸'
// 네이버는 검색 결과에 쓰는 설명을 80자 이내로 권고한다. 넘기면 잘려서 문장이 끊긴다.
const DESCRIPTION =
  '평택 고덕 기반 공장 개보수 전문. 철골·지붕·배관·탱크 용접·크린룸까지 모두 가능. 당일 회신 010-2369-3691'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    '공장 수리',
    '공장 개보수',
    '평택 공장 수리',
    '철골 보강',
    '공장 지붕 보수',
    '판넬 교체',
    '공장 벽체',
    '에폭시 바닥',
    '공장 단열',
    '방음 시공',
    '흡음 시공',
    '크린룸 시공',
    '공압설비',
    '배관설비',
    '배관 수리',
    '스텐 고압배관',
    '탱크 수리',
    '탱크 용접',
    '스텐 제작',
    '철골 트러스 제작',
    '생산 장비 수리',
    '공장 누수',
    '경기 공장 개보수',
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
        alt: '저녁 하늘 아래 정돈된 현대식 공장 외관',
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
    <html lang="ko" className={`bg-background ${notoSansKr.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
