import { notFound } from 'next/navigation'
import { estPageSession } from '@/lib/session'
import { SiteCheck } from '@/components/est/site-check'
import { getProject, kstToday, listAnswers, listPhotos, listQuestions, listVisits } from '@/lib/est/data'
import { getSettings } from '@/lib/est/settings'
import { sNum } from '@/lib/est/settings-defaults'

export const dynamic = 'force-dynamic'

/** S4 현장 확인(P2). 공통 질문 + 소분류 질문 */
export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  await estPageSession()
  const pid = Number((await params).id)
  const p = await getProject(pid)
  if (!p) notFound()
  const [questions, answers, photos, visits, settings] = await Promise.all([listQuestions(p.class2Id), listAnswers(pid), listPhotos(pid), listVisits(pid), getSettings()])
  return (
    <SiteCheck
      projectId={pid}
      questions={questions}
      answers={answers.map((a) => ({ questionId: a.questionId, value: a.value, confirmNeeded: a.confirmNeeded, note: a.note }))}
      photos={photos.map((x) => ({ id: x.id, questionId: x.questionId, caption: x.caption }))}
      visits={visits}
      requiredPhotos={sNum(settings, 'check.required_photos')}
      today={kstToday()}
    />
  )
}
