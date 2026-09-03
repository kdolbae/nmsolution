import { Fragment } from 'react'

/** "\n" 으로 구분된 문자열을 <br />로 렌더링 */
export function MultilineText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  )
}

/** 빈 줄로 구분된 문단을 <p>로 렌더링 */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className={className}>
          <MultilineText text={p} />
        </p>
      ))}
    </>
  )
}
