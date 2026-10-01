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
    return [
      { source: '/admin/ads', destination: 'https://nanomaster.co.kr/admin/ads?brand=nmsolution', permanent: false },
      // nmsolution.sbworks.bond 는 sbworks.bond 관리 웹 안에서 관리 화면만 여는 주소다(lib/sso.ts).
      // 공개 페이지는 원래 주소로 넘겨 같은 글이 두 주소에 생기지 않게 한다.
      {
        source: '/:path((?!admin|api|_next|favicon|icon|apple-icon).*)',
        has: [{ type: 'host', value: 'nmsolution.sbworks.bond' }],
        destination: 'https://www.nm-solution.co.kr/:path',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // 관리 화면은 이 사이트와 sbworks.bond 관리 웹 안에서만 띄울 수 있다 (X-Frame-Options 대신 CSP, lib/sso.ts)
      {
        source: '/admin',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://sbworks.bond" }],
      },
      {
        source: '/admin/(.*)',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://sbworks.bond" }],
      },
      {
        source: '/api/admin/sso',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://sbworks.bond" }],
      },
    ]
  },
}

export default nextConfig
