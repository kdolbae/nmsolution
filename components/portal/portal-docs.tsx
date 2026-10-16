'use client'

import { useMemo, useState } from 'react'
import { Calculator, Download, FileText, MonitorPlay, Printer } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { quoteDocument, type Quote, type QuoteRecipient } from '@/lib/clients/quote'
import { withBrandFont } from '@/lib/clients/proposal'
import { PresentOverlay, type PresentDoc } from '@/components/admin/present'

type Tab = 'proposal' | 'quote'

/** 협력업체가 보는 제안서·견적서: 보기 · 프레젠테이션 · 인쇄(PDF) · 제출 서류 내려받기 */
export function PortalDocs({
  clientName,
  label,
  updatedAt,
  proposalHtml,
  quote,
  recipient,
  files,
}: {
  clientName: string
  label: string
  updatedAt: string
  proposalHtml: string
  quote: Quote
  recipient: QuoteRecipient
  files: { file: string; label: string }[]
}) {
  const docs = useMemo(
    () =>
      [
        proposalHtml && { key: 'proposal', label: '제안서', html: withBrandFont(proposalHtml) },
        { key: 'quote', label: '견적서', html: quoteDocument(quote, recipient) },
      ].filter(Boolean) as PresentDoc[],
    [proposalHtml, quote, recipient],
  )
  const [tab, setTab] = useState<Tab>(proposalHtml ? 'proposal' : 'quote')
  const [present, setPresent] = useState(false)
  const doc = docs.find((d) => d.key === tab) ?? docs[0]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">제안서 · 견적서</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {clientName} · {label ? `${label} · ` : ''}
          {updatedAt} 기준
        </p>
      </div>

      {files.length > 0 && (
        <section className="flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
          <h2 className="text-sm font-semibold">제출 서류</h2>
          <div className="flex flex-wrap gap-2">
            {files.map((f) => (
              <a key={f.file} href={`/api/portal/files/${f.file}`} download className={cn(buttonVariants({ variant: 'outline' }), 'rounded-none')}>
                <Download /> {f.label}
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <div className="flex gap-1" role="tablist" aria-label="문서">
          {docs.map((d) => {
            const Icon = d.key === 'proposal' ? FileText : Calculator
            return (
              <button
                key={d.key}
                type="button"
                role="tab"
                aria-selected={tab === d.key}
                onClick={() => setTab(d.key as Tab)}
                className={cn(
                  '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                  tab === d.key ? 'border-electric text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {d.label}
              </button>
            )
          })}
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-none" onClick={() => setPresent(true)}>
            <MonitorPlay /> 프레젠테이션
          </Button>
          <a href={`/api/portal/print?docs=${tab}`} target="_blank" rel="noopener" className={cn(buttonVariants({ variant: 'outline' }), 'rounded-none')}>
            <Printer /> 인쇄 · PDF
          </a>
          {docs.length > 1 && (
            <a href="/api/portal/print?docs=both" target="_blank" rel="noopener" className={cn(buttonVariants({ variant: 'outline' }), 'rounded-none')}>
              <Printer /> 함께 인쇄
            </a>
          )}
        </div>
      </div>

      {doc && <iframe key={doc.key} title={doc.label} srcDoc={doc.html} className="h-[78vh] w-full bg-background ring-1 ring-border" />}

      {present && <PresentOverlay title={clientName} initial={tab} docs={docs} onClose={() => setPresent(false)} />}
    </div>
  )
}
