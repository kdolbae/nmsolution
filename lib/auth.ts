import { AsyncLocalStorage } from 'node:async_hooks'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { pool } from '@/lib/db'
import { ADMIN_EMAIL, adminCount, ensureUserRole, isAdminEmail } from '@/lib/auth-roles'
import { mailEnabled, mailLayout, sendMail } from '@/lib/mail'

/**
 * 협력업체 관계자 가입 중임을 표시한다. 업체 코드를 확인한 서버 액션(app/actions/portal.ts)만 이 안에서 가입시킨다.
 * /api/auth/sign-up 을 직접 부르는 가입은 이 표시가 없으므로, 관리자가 이미 있으면 막힌다.
 */
export const partnerSignup = new AsyncLocalStorage<{ clientId: number; /** 관리자가 직접 등록: 인증 메일을 보내지 않는다 */ direct?: boolean }>()

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  user: {
    additionalFields: {
      // 'admin' | 'partner' (lib/auth-roles.ts). 사용자가 직접 바꿀 수 없다
      role: { type: 'string', required: false, defaultValue: 'partner', input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // 메일 발송(RESEND_API_KEY)이 켜져 있을 때만 이메일 인증을 요구한다. 관리자 계정은 인증된 것으로 만든다
    requireEmailVerification: mailEnabled(),
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: '[엔엠솔루션] 비밀번호 재설정',
        html: mailLayout({
          title: '비밀번호 재설정',
          lines: [`${user.name}님, 아래 버튼을 눌러 새 비밀번호를 정해 주세요.`, '링크는 1시간 동안만 쓸 수 있습니다.'],
          button: { label: '비밀번호 다시 정하기', url },
        }),
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      if (user.emailVerified || partnerSignup.getStore()?.direct) return
      await sendMail({
        to: user.email,
        subject: '[엔엠솔루션] 이메일 인증',
        html: mailLayout({
          title: '이메일 인증',
          lines: [`${user.name}님, 엔엠솔루션 협력업체 포털 가입을 마치려면 아래 버튼을 눌러 이메일을 인증해 주세요.`],
          button: { label: '이메일 인증하기', url },
        }),
      })
    },
  },
  databaseHooks: {
    user: {
      create: {
        // 관리자는 1명, ADMIN_EMAIL 로만 만든다. 그 밖의 가입은 업체 코드를 확인한 협력업체 관계자만 된다
        before: async (user) => {
          await ensureUserRole()
          if (partnerSignup.getStore()) {
            if (isAdminEmail(user.email)) throw new APIError('FORBIDDEN', { message: '이 이메일로는 가입할 수 없습니다.' })
            return { data: { ...user, role: 'partner' } }
          }
          if ((await adminCount()) > 0) {
            throw new APIError('FORBIDDEN', { message: '관리자 계정이 이미 존재합니다.' })
          }
          if (!isAdminEmail(user.email)) {
            throw new APIError('FORBIDDEN', { message: `관리자 계정은 ${ADMIN_EMAIL} 로만 만들 수 있습니다.` })
          }
          return { data: { ...user, role: 'admin', emailVerified: true } }
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
