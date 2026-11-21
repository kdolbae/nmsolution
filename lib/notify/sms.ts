import { createHmac, randomBytes } from 'node:crypto'

/**
 * 문자 보내기 (솔라피 SOLAPI). SOLAPI_API_KEY·SOLAPI_API_SECRET 이 있을 때만 켜진다.
 * 보내는 번호 SMS_FROM 은 솔라피에 등록된 발신번호여야 한다(없으면 대표 휴대폰 010-2369-3691).
 * 90바이트가 넘으면 솔라피가 장문(LMS)으로 보낸다.
 */
export function smsEnabled(): boolean {
  return !!(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET)
}

export async function sendSms({ to, text, subject }: { to: string; text: string; subject?: string }): Promise<boolean> {
  const key = process.env.SOLAPI_API_KEY
  const secret = process.env.SOLAPI_API_SECRET
  if (!key || !secret) {
    console.warn('[sms] SOLAPI_API_KEY·SOLAPI_API_SECRET 이 없어 문자를 보내지 않았습니다')
    return false
  }
  const date = new Date().toISOString()
  const salt = randomBytes(16).toString('hex')
  const signature = createHmac('sha256', secret).update(date + salt).digest('hex')
  try {
    const res = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        Authorization: `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          to: to.replace(/[^0-9]/g, ''),
          from: (process.env.SMS_FROM || '01023693691').replace(/[^0-9]/g, ''),
          text,
          ...(subject ? { subject } : {}),
        },
      }),
    })
    if (!res.ok) console.error('[sms] 발송 실패', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('[sms] 발송 실패', e)
    return false
  }
}
