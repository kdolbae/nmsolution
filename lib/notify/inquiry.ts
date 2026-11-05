import { notifyAdmin, telegramEnabled } from '@/lib/notify/telegram'
import { notifyKakao, kakaoConfigured, kakaoSaved } from '@/lib/notify/kakao'
import { mailEnabled, mailLayout, sendMail } from '@/lib/mail'
import { adminEmails } from '@/lib/admin'

const ADMIN_URL = 'https://nm-solution.co.kr/admin/quotes'

/**
 * 문의 접수 즉시 관리자에게 알린다. 켜진 수단으로 모두 보내고, 꺼진 것은 건너뛴다.
 *  - 텔레그램: TELEGRAM_BOT_TOKEN
 *  - 카카오톡(나에게 보내기): KAKAO_REST_API_KEY + 관리자 화면에서 한 번 연결
 *  - 메일: RESEND_API_KEY. 받는 주소는 NOTIFY_EMAIL(쉼표로 여러 개), 없으면 관리자 계정 메일
 * 어느 하나가 실패해도 접수는 그대로 성공이다.
 */
export async function notifyInquiry({ title, lines }: { title: string; lines: string[] }) {
  const body = lines.filter(Boolean)
  await Promise.all([
    notifyAdmin([title, ...body, ADMIN_URL].join('\n')),
    notifyKakao([title, ...body].join('\n'), ADMIN_URL),
    (async () => {
      if (!mailEnabled()) return
      const to = (process.env.NOTIFY_EMAIL || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const recipients = to.length ? to : await adminEmails().catch(() => [])
      if (!recipients.length) return
      await sendMail({ to: recipients, subject: `[홈페이지 문의] ${title}`, html: mailLayout({ title, lines: body, button: { label: '관리자에서 보기', url: ADMIN_URL } }) })
    })(),
  ]).catch((e) => console.error('[notify]', e))
}

/** 관리자 화면에 보여줄 알림 수단별 상태 */
export async function notifyStatus() {
  const kakao = kakaoConfigured() ? await kakaoSaved() : null
  return {
    telegram: telegramEnabled(),
    mail: mailEnabled(),
    mailTo: process.env.NOTIFY_EMAIL || '',
    kakaoKey: kakaoConfigured(),
    kakao: kakao ? { connectedAt: kakao.connectedAt, nickname: kakao.nickname ?? '' } : null,
  }
}
