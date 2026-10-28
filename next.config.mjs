/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 업체 제출 서류(인쇄용 PDF·엑셀)는 공개 폴더가 아니라 private/ 에 두고 내려받기 경로에만 싣는다 (lib/clients/files.ts)
  outputFileTracingIncludes: {
    '/api/admin/clients/**': ['./private/client-files/**/*', './node_modules/@sparticuz/chromium/bin/**/*'],
    '/api/portal/files/**': ['./private/client-files/**/*'],
    // 서버에서 PDF 를 만드는 크롬 (lib/clients/pdf.ts)
    '/adreaming': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    '/sinil': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    '/atotech': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    '/jstech': ['./node_modules/@sparticuz/chromium/bin/**/*'],
  },
  // 검색광고 상황판은 나노마스터 관리 화면의 같은 상황판으로 옮겼다 (lib/board-sync.ts)
  async redirects() {
    return [{ source: '/admin/ads', destination: 'https://nanomaster.co.kr/admin/ads?brand=nmsolution', permanent: false }]
  },
  async headers() {
    return [
      // 발주처 제출용이라 검색에 노출하지 않는다
      { source: '/kkt-assets/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/admin/(.*)',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ]
  },
}

export default nextConfig
