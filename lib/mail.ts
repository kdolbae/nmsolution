/**
 * 메일 보내기 (Resend). Vercel 환경변수 RESEND_API_KEY 가 있을 때만 켜진다.
 * 보내는 주소는 MAIL_FROM (없으면 NM SOLUTION <noreply@nm-solution.co.kr>). 이 도메인은 Resend 에 등록·인증되어 있어야 한다.
 * 키가 없으면 보내지 않고 false 를 돌려준다 — 이때 협력업체 가입은 이메일 인증 없이 관리자 승인만으로 열린다(lib/auth.ts).
 */
export function mailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY
}

export async function sendMail({ to, subject, html }: { to: string | string[]; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[mail] RESEND_API_KEY 가 없어 메일을 보내지 않았습니다:', subject)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'NM SOLUTION <noreply@nm-solution.co.kr>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })
    if (!res.ok) console.error('[mail] 발송 실패', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('[mail] 발송 실패', e)
    return false
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** 버튼 하나 있는 짧은 안내 메일 본문 */
export function mailLayout({ title, lines, button }: { title: string; lines: string[]; button?: { label: string; url: string } }) {
  return `<div style="font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0f2a44">
<p style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#1f6feb;margin:0 0 8px">NM SOLUTION</p>
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
${lines.map((l) => `<p style="font-size:15px;line-height:1.6;margin:0 0 10px">${escapeHtml(l)}</p>`).join('')}
${button ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#0f2a44;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px">${escapeHtml(button.label)}</a></p>` : ''}
<p style="font-size:12px;color:#6b7785;margin-top:28px">엔엠솔루션 · 010-2369-3691 · 본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다.</p>
</div>`
}
