import { PageHeader } from '@/components/admin/form'
import { ActualForm, DeleteActual, ItemForm, ItemRowEdit, LaborForm, PriceForm, RateSetForm, RoleSelect, RuleForm } from '@/components/est/masters-edit'
import { Badge, Card, Empty, SampleBadge, Tabs, TableWrap, tdCls, thCls, won } from '@/components/est/ui'
import { estPageSession } from '@/lib/session'
import {
  kstToday,
  listActualObservations,
  listClasses,
  listItems,
  listLaborRates,
  listPriceHistory,
  listQuestions,
  listRateSets,
  listRules,
  listTemplateItems,
  listTemplates,
  listUsersForRoles,
} from '@/lib/est/data'
import { actualStats } from '@/lib/est/calc'
import { getSettings } from '@/lib/est/settings'
import { sNum, sStr } from '@/lib/est/settings-defaults'
import { canSeeCost } from '@/lib/est/perm'

export const dynamic = 'force-dynamic'
export const metadata = { title: '마스터 | NM SOLUTION 관리자' }

const TABS = [
  ['classes', '분류'],
  ['questions', '체크리스트 질문'],
  ['items', '품목·단가'],
  ['templates', '템플릿'],
  ['rules', '규칙표'],
  ['rates', '요율 세트'],
  ['labor', '노무 실단가'],
  ['actual', '실단가 관측'],
  ['users', '사용자 역할'],
  ['import', '가져오기'],
] as const
const GRADE: Record<string, string> = { required: '필수', basic: '기본', conditional: '조건부' }
const LABOR: Record<string, string> = { our_staff: '우리 직원', daily: '일용', partner: '협력사' }
const SRC: Record<string, string> = { purchase: '구매', rental: '임차', subcontract_quote: '외주 견적', subcontract_contract: '외주 계약', labor: '노무', expense: '경비', manual: '직접 입력', import: '가져오기', variance: '정산 반영' }
const ROLE: Record<string, string> = { writer: '작성자', reviewer: '검토자', ceo: '대표' }

const j = (v: unknown) => (v === null || v === undefined ? '' : JSON.stringify(v))

/** S13 마스터: 전원 조회, 대표만 수정(품목·단가·요율·규칙·실단가·노무·사용자 역할). 분류·질문·템플릿 편집은 2단계(가져오기와 함께) */
export default async function Masters({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'items' } = await searchParams
  const s = await estPageSession()
  const ceo = s?.estRole === 'ceo'
  // 실단가·원가는 cost.visible_roles 역할만(§8). 마스터 조회라도 같음
  const seeCost = canSeeCost(s?.estRole, await getSettings())
  const today = kstToday()
  const classes = await listClasses()
  const cname = (id: number | null) => classes.find((c) => c.id === id)?.name ?? '-'

  let body: React.ReactNode = null
  if (tab === 'classes') {
    const tree = (parent: number | null, level: number): React.ReactNode => (
      <ul className={level > 1 ? 'ml-4 border-l border-border pl-3' : ''}>
        {classes
          .filter((c) => c.parentId === parent)
          .map((c) => (
            <li key={c.id} className="py-1 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{c.code}</span> {c.name} {!c.isActive && <Badge tone="muted">끔</Badge>}
              {typeof c.meta?.rate_set === 'string' && <span className="ml-2 text-xs text-muted-foreground">요율 {c.meta.rate_set}</span>}
              {tree(c.id, level + 1)}
            </li>
          ))}
      </ul>
    )
    body = <Card title="분류(대분류 › 소분류 › 공정 › 세부)">{classes.length ? tree(null, 1) : <Empty>분류 없음</Empty>}</Card>
  } else if (tab === 'questions') {
    const qs = await listQuestions(null, true)
    body = (
      <Card title="체크리스트 질문" description="소분류 없음 = 모든 작업 유형 공통">
        <TableWrap>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                {['코드', '질문', '유형', '단위', '필수', '소분류'].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qs.map((q) => (
                <tr key={q.id}>
                  <td className={tdCls + ' font-mono text-xs'}>{q.code}</td>
                  <td className={tdCls}>{q.label}</td>
                  <td className={tdCls + ' text-xs'}>{q.answerType}{q.options.length ? ` (${q.options.map((o) => o.label).join('/')})` : ''}</td>
                  <td className={tdCls + ' text-xs'}>{q.unit ?? ''}</td>
                  <td className={tdCls}>{q.required ? '필수' : ''}</td>
                  <td className={tdCls + ' text-xs'}>{q.class2Id ? cname(q.class2Id) : '공통'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    )
  } else if (tab === 'items') {
    const [items, hist, obs, settings] = await Promise.all([listItems(), listPriceHistory(), listActualObservations(), getSettings()])
    const win = sNum(settings, 'actual.window_count')
    const method = sStr(settings, 'actual.typ_method') === 'median' ? 'median' : 'last'
    body = (
      <div className="flex flex-col gap-4">
        {ceo && (
          <Card title="품목 추가">
            <ItemForm />
          </Card>
        )}
        <Card title="품목" description={`견적단가 = 오늘 적용 중인 단가 이력. 실단가 = 최근 ${win}건(${method === 'median' ? '중앙값' : '최근값'})`}>
          <TableWrap>
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr>
                  {['코드', '비목', '품명·규격', '단위', '견적단가', '실단가 min·typ·max', '산식', '근거문구', ''].map((h) => (
                    <th key={h} className={thCls}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const st = actualStats(
                    obs.filter((o) => o.itemCode === i.code).map((o) => ({ unitPrice: o.unitPrice, observedOn: o.observedOn, id: o.id })),
                    win,
                    method,
                  )
                  const h = hist.filter((x) => x.itemCode === i.code)
                  return (
                    <tr key={i.code} className={i.isActive ? '' : 'text-muted-foreground'}>
                      <td className={tdCls + ' font-mono text-xs'}>{i.code}</td>
                      <td className={tdCls + ' text-xs'}>{i.kind}</td>
                      <td className={tdCls}>
                        {i.name}
                        {i.spec && <span className="block text-xs text-muted-foreground">{i.spec}</span>}
                      </td>
                      <td className={tdCls + ' text-xs'}>{i.unit}</td>
                      <td className={tdCls + ' text-right font-mono'}>
                        {won(i.price)}
                        {h.length > 1 && (
                          <details className="text-left text-[11px] text-muted-foreground">
                            <summary className="cursor-pointer">이력 {h.length}</summary>
                            {h.map((x) => (
                              <span key={x.id} className="block">
                                {x.effectiveFrom} {won(x.price)} {SRC[x.source] ?? x.source}
                              </span>
                            ))}
                          </details>
                        )}
                        {ceo && (
                          <details className="text-left">
                            <summary className="cursor-pointer text-[11px] text-electric">단가 이력 추가</summary>
                            <PriceForm itemCode={i.code} today={today} />
                          </details>
                        )}
                      </td>
                      <td className={tdCls + ' text-right font-mono text-xs'}>{!seeCost ? <span className="text-muted-foreground">권한 없음</span> : st ? `${won(st.min)} · ${won(st.typ)} · ${won(st.max)} (${st.n})` : <span className="text-muted-foreground">관측 없음</span>}</td>
                      <td className={tdCls + ' font-mono text-[11px]'}>
                        {i.qtyRuleType} {j(i.qtyRule)}
                      </td>
                      <td className={tdCls + ' max-w-56 text-xs text-muted-foreground'}>{i.basisText}</td>
                      <td className={tdCls}>
                        {ceo && (
                          <ItemRowEdit
                            item={{
                              code: i.code,
                              kind: i.kind,
                              name: i.name,
                              spec: i.spec,
                              unit: i.unit,
                              qtyRuleType: i.qtyRuleType,
                              qtyRule: j(i.qtyRule) || '{}',
                              basisText: i.basisText,
                              internalMemo: i.internalMemo,
                              laborClass: i.laborClass ?? '',
                              isActive: i.isActive,
                              price: i.price,
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      </div>
    )
  } else if (tab === 'templates') {
    const [templates, titems, items] = await Promise.all([listTemplates(), listTemplateItems(), listItems()])
    const iname = (c: string) => items.find((i) => i.code === c)?.name ?? c
    body = (
      <div className="flex flex-col gap-4">
        {templates.map((t) => (
          <Card key={t.id} title={`${t.class2Name} · ${t.name} v${t.version}`} description={t.note ?? undefined} actions={<SampleBadge />}>
            <TableWrap>
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr>
                    {['공정', '품목', '등급', '조건', '자동 삭제 제안', '수량 산식'].map((h) => (
                      <th key={h} className={thCls}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {titems
                    .filter((x) => x.templateId === t.id)
                    .map((x) => (
                      <tr key={x.id}>
                        <td className={tdCls + ' text-xs'}>{cname(x.class3Id)}</td>
                        <td className={tdCls}>{iname(x.itemCode)}</td>
                        <td className={tdCls}>
                          <Badge tone={x.grade === 'required' ? 'navy' : x.grade === 'conditional' ? 'accent' : 'neutral'}>{GRADE[x.grade]}</Badge>
                        </td>
                        <td className={tdCls + ' font-mono text-[11px]'}>{j(x.condition)}</td>
                        <td className={tdCls + ' font-mono text-[11px]'}>{j(x.removeIf)}</td>
                        <td className={tdCls + ' font-mono text-[11px]'}>{x.qtyRuleType ? `${x.qtyRuleType} ${j(x.qtyRule)}` : '(품목 기본)'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        ))}
        {!templates.length && <Empty>템플릿 없음</Empty>}
        <p className="text-xs text-muted-foreground">템플릿 편집은 2단계(가져오기 화면과 함께)에서 붙음. 지금은 샘플 템플릿을 씀.</p>
      </div>
    )
  } else if (tab === 'rules') {
    const rules = await listRules()
    const class1 = classes.filter((c) => c.level === 1).map((c) => ({ id: c.id, name: c.name }))
    body = (
      <div className="flex flex-col gap-4">
        {rules.map((r) => (
          <Card key={r.id} title={`${r.code} · ${r.name}`} description={r.class1Id ? cname(r.class1Id) : '전 사업 공통'} actions={<span className="flex gap-1">{r.isSample && <SampleBadge />}{!r.isActive && <Badge tone="muted">끔</Badge>}</span>}>
            {ceo ? (
              <RuleForm rule={r} class1={class1} />
            ) : (
              <div className="font-mono text-xs">
                <p>조건 {j(r.condition)}</p>
                <p>동작 {j(r.action)}</p>
                <p className="font-sans text-sm">{r.message}</p>
              </div>
            )}
          </Card>
        ))}
        {ceo && (
          <Card title="규칙 추가">
            <RuleForm class1={class1} />
          </Card>
        )}
      </div>
    )
  } else if (tab === 'rates') {
    const rates = await listRateSets()
    body = (
      <div className="flex flex-col gap-4">
        {rates.map((r) => (
          <Card key={r.id} title={`${r.name} (${r.code})`} actions={r.isSample ? <SampleBadge /> : undefined}>
            {ceo ? (
              <RateSetForm rs={r} />
            ) : (
              <p className="font-mono text-xs">
                {r.mode} {j(r.rates)} · 절사 {won(r.truncateUnit)} · 경비 {won(r.expensePerCrewDay)}/인·일
              </p>
            )}
          </Card>
        ))}
        {ceo && (
          <Card title="요율 세트 추가">
            <RateSetForm />
          </Card>
        )}
      </div>
    )
  } else if ((tab === 'labor' || tab === 'actual') && !seeCost) {
    body = <Empty>실단가는 기준 설정 cost.visible_roles 에 든 역할만 볼 수 있음</Empty>
  } else if (tab === 'labor') {
    const [rates, items] = await Promise.all([listLaborRates(), listItems()])
    const labor = items.filter((i) => i.kind === '노무')
    body = (
      <Card title="노무 인·일 실단가" description="실단가 관측이 없는 노무 품목의 예상원가에 씀">
        <TableWrap>
          <table className="mb-4 w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr>
                {['구분', '품목', '1일 단가', '연장', '야간', '적용일', '메모'].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id}>
                  <td className={tdCls}>{LABOR[r.laborClass]}</td>
                  <td className={tdCls}>{r.itemCode ? (labor.find((i) => i.code === r.itemCode)?.name ?? r.itemCode) : '(기본)'}</td>
                  <td className={tdCls + ' text-right font-mono'}>{won(r.dayRate)}</td>
                  <td className={tdCls + ' font-mono'}>×{r.overtimeFactor}</td>
                  <td className={tdCls + ' font-mono'}>×{r.nightFactor}</td>
                  <td className={tdCls + ' font-mono text-xs'}>{r.effectiveFrom}</td>
                  <td className={tdCls + ' text-xs'}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {ceo && <LaborForm items={labor.map((i) => ({ code: i.code, name: i.name }))} today={today} />}
      </Card>
    )
  } else if (tab === 'actual') {
    const [obs, items] = await Promise.all([listActualObservations(), listItems()])
    body = (
      <Card title="실단가 관측" description="구매·임차·외주·노무·경비 실지출. 정산 마감 때 완료 발주에서 자동으로도 쌓임(최근 500건)">
        {ceo && (
          <div className="mb-4">
            <ActualForm items={items.map((i) => ({ code: i.code, name: i.name }))} today={today} />
          </div>
        )}
        <TableWrap>
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                {['관측일', '품목', '출처', '실단가', '업체', '메모', ''].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {obs.map((o) => (
                <tr key={o.id}>
                  <td className={tdCls + ' font-mono text-xs'}>{o.observedOn}</td>
                  <td className={tdCls}>{items.find((i) => i.code === o.itemCode)?.name ?? o.itemCode}</td>
                  <td className={tdCls + ' text-xs'}>{SRC[o.source] ?? o.source}</td>
                  <td className={tdCls + ' text-right font-mono'}>{won(o.unitPrice)}</td>
                  <td className={tdCls + ' text-xs'}>{o.vendor}</td>
                  <td className={tdCls + ' text-xs'}>
                    {o.note === '샘플' ? <SampleBadge /> : o.note}
                  </td>
                  <td className={tdCls}>{ceo && <DeleteActual id={o.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    )
  } else if (tab === 'users') {
    const users = await listUsersForRoles()
    body = (
      <Card title="사용자 견적 역할" description="로컬 관리자는 항상 대표 권한. SBworks 로그인 사용자는 로그인할 때 SBworks 역할로 정해짐(기준 설정 sso.role_map)">
        <TableWrap>
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                {['이름', '이메일', '로그인', '견적 역할'].map((h) => (
                  <th key={h} className={thCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={tdCls}>{u.name}</td>
                  <td className={tdCls + ' text-xs'}>{u.email}</td>
                  <td className={tdCls + ' text-xs'}>{u.role === 'admin' ? '로컬 관리자' : u.sso ? 'SBworks' : '로컬'}</td>
                  <td className={tdCls}>{u.role === 'admin' ? '대표' : ceo ? <RoleSelect userId={u.id} role={u.estRole} sso={u.sso} /> : u.estRole ? ROLE[u.estRole] : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    )
  } else {
    body = (
      <Card title="가져오기(2단계)">
        <p className="text-sm text-muted-foreground">
          실자료(NM_견적DB_v1.xlsx)가 오면 xlsx/CSV 업로드 → 열 매핑 → 미리보기 → 반영 화면이 여기에 붙음. 지금 마스터는 전부 &ldquo;샘플&rdquo; 표식이 있는 시드 값임.
        </p>
      </Card>
    )
  }

  return (
    <>
      <PageHeader title="마스터" description={ceo ? '견적 산출 기준 자료. 대표만 고칠 수 있음' : '견적 산출 기준 자료(조회만)'} />
      <Tabs items={TABS.map(([k, l]) => ({ key: k, label: l, href: `/admin/est/masters?tab=${k}` }))} current={tab} />
      <div className="mt-5">{body}</div>
    </>
  )
}
