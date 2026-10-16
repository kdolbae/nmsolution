import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { pool } from '@/lib/db'

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  databaseHooks: {
    user: {
      create: {
        // 단일 관리자 사이트: 최초 1명만 가입 가능. 이후 가입 시도는 차단.
        before: async () => {
          const { rows } = await pool.query('SELECT count(*)::int AS count FROM "user"')
          if ((rows[0]?.count ?? 0) > 0) {
            throw new APIError('FORBIDDEN', { message: '관리자 계정이 이미 존재합니다.' })
          }
        },
      },
    },
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
          ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []),
          ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []),
          ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : []),
        ]
      : []),
    ...(process.env.NODE_ENV === 'production'
      ? [
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
            : []),
          // 미리보기(브랜치) 주소. VERCEL_URL 은 배포마다 바뀌는 고유 주소라
          // `...-git-<브랜치>-...vercel.app` 별칭과 다르다. 이것이 없으면
          // 미리보기에서 로그인이 출처 검사에 걸려 막힌다.
          ...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : []),
        ]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          // v0 preview는 cross-site iframe이므로 세션 쿠키 유지를 위해 필요.
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})
