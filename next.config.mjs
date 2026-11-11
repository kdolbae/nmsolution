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
    '/api/portal/files/**': ['./private/client-files/**/*'],
    // 서버에서 PDF 를 만드는 크롬 (lib/clients/pdf.ts)
    '/adreaming': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    '/sinil': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    '/atotech': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    '/jstech': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    '/ganatm': ['./node_modules/@sparticuz/chromium/bin/**/*'],
  },
  // 엔엠 어드민은 지웠다(2026-11-11 kevin): 관리는 N-CMS(sbworks.bond › 플랜트사업)에서 한다.
  // 현장 팀 링크(업무 지시서)는 키를 그대로 N-CMS 로 옮겼으므로 같은 키로 넘긴다.
  async redirects() {
    return [
      { source: '/admin', destination: 'https://sbworks.bond/', permanent: false },
      { source: '/admin/:path*', destination: 'https://sbworks.bond/', permanent: false },
      { source: '/work/:key', destination: 'https://sbworks.bond/s/work/:key', permanent: false },
    ]
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
    ]
  },
}

export default nextConfig
