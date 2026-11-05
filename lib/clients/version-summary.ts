/**
 * 버전 기록 '바뀐 내용' 한 줄 문장을 읽기 좋은 목록으로 나눈다.
 * 저장 문장 예: "견적서 수정: 상온 전실 벽체 (사진 1), 공통 (자재 운반·폐기물), 4번 도크 (사진 4) 삭제, 선택 A 추가"
 * - 앞머리 "견적서 수정:" 같은 머리말은 제목으로
 * - 괄호 밖 쉼표에서만 자름 (괄호 안 "사진 2, 2-2" 는 한 항목)
 * - 머리말이 있을 때(자동 생성 문장) 끝이 " 추가"·" 삭제" 면 표시를 붙이고 글에서 뺀다. 손으로 쓴 문장은 글 그대로 둠
 */
export type SummaryKind = 'changed' | 'added' | 'removed' | 'note'
export type SummaryItem = { kind: SummaryKind; text: string }
export type ParsedSummary = { head: string; items: SummaryItem[] }

function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  const chars = [...s]
  chars.forEach((ch, i) => {
    if (ch === '(' || ch === '（' || ch === '[') depth++
    else if ((ch === ')' || ch === '）' || ch === ']') && depth > 0) depth--
    // 183,150,000 처럼 숫자 사이 쉼표는 자르지 않음
    const inNumber = /\d/.test(chars[i - 1] ?? '') && /\d/.test(chars[i + 1] ?? '')
    if (ch === ',' && depth === 0 && !inNumber) {
      out.push(cur)
      cur = ''
      return
    }
    cur += ch
  })
  out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}

export function parseVersionSummary(summary: string): ParsedSummary {
  const s = (summary ?? '').trim()
  const m = s.match(/^([^:：(]{1,20})[:：]\s*([\s\S]+)$/)
  const head = m ? m[1].trim() : ''
  const body = m ? m[2] : s
  const parts = splitTop(body)
  // 쉼표가 없는 짧은 문장은 그대로 한 줄
  if (!head && parts.length <= 1) return { head: '', items: s ? [{ kind: 'note', text: s }] : [] }
  const items = parts.map<SummaryItem>((p) => {
    const t = head ? p.match(/^(.+?)\s+(추가|삭제)$/) : null
    if (t) return { kind: t[2] === '추가' ? 'added' : 'removed', text: t[1] }
    return { kind: head ? 'changed' : 'note', text: p }
  })
  return { head, items }
}

/** 고르는 칸 등 한 줄로 보여 줄 때: "견적서 수정 · 수정 12 · 삭제 3" 처럼 짧게 */
export function shortVersionSummary(summary: string, max = 60): string {
  const { head, items } = parseVersionSummary(summary)
  if (!head) return summary.length > max ? `${summary.slice(0, max)}…` : summary
  const n = (k: SummaryKind) => items.filter((i) => i.kind === k).length
  const counts = [
    n('changed') && `수정 ${n('changed')}`,
    n('added') && `추가 ${n('added')}`,
    n('removed') && `삭제 ${n('removed')}`,
  ].filter(Boolean)
  return [head, ...counts].join(' · ')
}
