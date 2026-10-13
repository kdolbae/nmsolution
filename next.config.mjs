/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 검색광고 상황판은 나노마스터 관리 화면의 같은 상황판으로 옮겼다 (lib/board-sync.ts)
  async redirects() {
    return [{ source: '/admin/ads', destination: 'https://nanomaster.co.kr/admin/ads?brand=nmsolution', permanent: false }]
  },
  // 금강변압기 제출 자료(app/kkt/route.ts, 비밀번호 잠금). 한글 주소도 같은 페이지를 연다.
  async rewrites() {
    return [
      // 요청 경로는 퍼센트 인코딩된 채로 비교되므로 인코딩된 형태로 적는다 (/금강변압기)
      { source: '/%EA%B8%88%EA%B0%95%EB%B3%80%EC%95%95%EA%B8%B0', destination: '/kkt' },
    ]
  },
  async headers() {
    return [
      // 발주처 제출용이라 검색에 노출하지 않는다
      { source: '/%EA%B8%88%EA%B0%95%EB%B3%80%EC%95%95%EA%B8%B0', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] },
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
