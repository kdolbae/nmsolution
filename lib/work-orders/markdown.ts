import { esc } from '@/lib/clients/proposal'

/**
 * 업무 지시서용 작은 Markdown → HTML 변환기 (외부 패키지 없이).
 * 지원: #~#### 제목, 문단, - / 1. 목록(한 단계 들여쓰기), | 표 |, **굵게**, `코드`, --- 구분선, [ ] 체크박스.
 * 링크·이미지·HTML 은 글자 그대로 보여 준다(현장 팀 링크에 외부 링크가 들어가지 않게).
 */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\[ \] /, '<span class="cb"></span> ')
      .replace(/^\[x\] /i, '<span class="cb on"></span> ')

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      out.push(`<h${h[1].length}>${inline(h[2].trim())}</h${h[1].length}>`)
      i++
      continue
    }
    if (/^---+\s*$/.test(line)) {
      out.push('<hr>')
      i++
      continue
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      if (rows.length) {
        const [head, ...body] = rows
        out.push(
          `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body
            .map((r) => `<tr>${head.map((_, k) => `<td>${inline(r[k] ?? '')}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`,
        )
      }
      continue
    }
    const li = line.match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/)
    if (li) {
      const ordered = /\d/.test(li[2])
      const tag = ordered ? 'ol' : 'ul'
      const items: string[] = []
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/)
        if (!m || /\d/.test(m[2]) !== ordered) break
        const depth = m[1].length
        let item = inline(m[3].trim())
        i++
        // 바로 아래 더 들여쓴 줄은 하위 목록
        const sub: string[] = []
        while (i < lines.length) {
          const s = lines[i].match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/)
          if (!s || s[1].length <= depth) break
          sub.push(`<li>${inline(s[3].trim())}</li>`)
          i++
        }
        if (sub.length) item += `<ul>${sub.join('')}</ul>`
        items.push(`<li>${item}</li>`)
      }
      out.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }
    // 문단: 빈 줄 전까지 이어 붙인다
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|---+\s*$|\s*\||\s*([-*]|\d+[.)])\s)/.test(lines[i])) {
      para.push(inline(lines[i].trim()))
      i++
    }
    out.push(`<p>${para.join('<br>')}</p>`)
  }
  return out.join('\n')
}

/** 첫 번째 # 제목 */
export function markdownTitle(md: string): string {
  return md.match(/^#\s+(.+)$/m)?.[1].trim() ?? ''
}
