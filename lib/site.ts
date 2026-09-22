/**
 * 사이트 공개 URL과 검색엔진용 구조화 데이터.
 *
 * canonical, OG 태그, sitemap, 구조화 데이터가 모두 이 주소를 기준으로 만들어진다.
 * 검색엔진이 한 사이트를 여러 주소로 인식하지 않도록 운영 도메인을 기본값으로 둔다.
 */

import type { ServicesContent, SettingsContent } from '@/lib/content/defaults'

/**
 * 운영 도메인. 환경변수가 없어도 이 주소가 정식 주소로 쓰인다.
 *
 * Vercel에서 `nm-solution.co.kr` 은 `www.nm-solution.co.kr` 로 308 영구이동하도록
 * 설정돼 있다. 즉 실제로 열리는 주소는 www 쪽이다. canonical·sitemap·robots가
 * 리다이렉트되는 주소를 가리키면 검색엔진이 사이트가 이전한 것으로 읽으므로,
 * 여기서도 www를 정식 주소로 쓴다. Vercel에서 기본 도메인을 바꾸면 여기도 같이 바꾼다.
 */
export const PRODUCTION_URL = 'https://www.nm-solution.co.kr'

export function siteUrl(): string {
  // 다른 도메인으로 띄울 때만 환경변수로 덮어쓴다
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')

  // 운영 배포는 항상 정식 도메인을 쓴다 (Vercel이 주는 임의 URL을 쓰지 않는다)
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_URL

  // 프리뷰 배포는 자기 배포 주소를 써야 링크가 실제로 열린다
  const preview = process.env.VERCEL_URL
  if (preview) return `https://${preview}`

  if (process.env.NODE_ENV === 'production') return PRODUCTION_URL

  return 'http://localhost:3000'
}

/**
 * 네이버 서치어드바이저 소유확인 코드.
 *
 * searchadvisor.naver.com → 웹마스터 도구 → 사이트 등록 → `HTML 태그` 방식을 고르면
 * `<meta name="naver-site-verification" content="여기">` 를 준다. 그 content 값만 넣는다.
 * 비어 있으면 태그를 아예 내보내지 않는다.
 */
const NAVER_SITE_VERIFICATION = 'fa33b54b454ae7e0ebb1116a45a771f20cc3b343'

/** 구글 서치콘솔 소유확인 코드. 네이버와 같은 방식이다. */
const GOOGLE_SITE_VERIFICATION = ''

/**
 * 검색엔진 소유확인 태그. 값이 없는 엔진은 태그를 내보내지 않는다.
 * 코드를 코드베이스에 두기 곤란하면 환경변수로 넣어도 된다.
 */
export function siteVerification(): Record<string, string> {
  const entries: Record<string, string> = {}

  const naver = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ?? NAVER_SITE_VERIFICATION
  if (naver) entries['naver-site-verification'] = naver

  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? GOOGLE_SITE_VERIFICATION
  if (google) entries['google-site-verification'] = google

  return entries
}

/** 전화번호를 tel: 및 schema.org용 E.164 형태로 정규화 (예: 010-2369-3691 → +821023693691) */
export function toE164(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  if (!digits) return phone
  return digits.startsWith('0') ? `+82${digits.slice(1)}` : `+82${digits}`
}

/**
 * 네이버·구글이 업체 정보를 그대로 읽어갈 수 있게 하는 LocalBusiness 구조화 데이터.
 * 두 전화번호를 모두 넣어 검색 결과에서 직통 번호까지 노출되도록 한다.
 */
export function localBusinessJsonLd({
  settings,
  services,
}: {
  settings: SettingsContent
  services: ServicesContent
}) {
  const url = siteUrl()

  return {
    '@context': 'https://schema.org',
    '@type': 'GeneralContractor',
    '@id': `${url}/#organization`,
    name: settings.companyName,
    url,
    image: `${url}/images/hero-factory.png`,
    description:
      '평택 고덕 기반 공장 개보수 전문. 철골·지붕·벽체, 배관 수리, 탱크 용접 보수, 스텐 고압배관 제작, 생산 장비 수리, 방음·흡음, 크린룸까지 공장에서 생기는 수리를 범위를 나누지 않고 진행합니다.',
    telephone: [toE164(settings.phoneMobile), toE164(settings.phoneMain)],
    email: undefined,
    founder: { '@type': 'Person', name: settings.ceo },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'KR',
      addressRegion: '경기도',
      addressLocality: '평택시',
      streetAddress: settings.address,
    },
    areaServed: [
      { '@type': 'AdministrativeArea', name: '경기도' },
      { '@type': 'AdministrativeArea', name: '충청남도' },
      { '@type': 'AdministrativeArea', name: '충청북도' },
      { '@type': 'City', name: '평택시' },
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: '작업 범위',
      itemListElement: services.items.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.summary,
          url: `${url}/services/${s.slug}`,
        },
      })),
    },
  }
}

/** JSON-LD를 <script>에 안전하게 넣기 위한 직렬화 (XSS 방지용으로 `<`를 이스케이프) */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
