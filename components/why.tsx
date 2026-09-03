import { Zap, BadgeCheck, Sparkles, Ear, type LucideIcon } from 'lucide-react'
import { SectionHeading } from './section-heading'
import { MultilineText } from './multiline-text'
import type { HomeContent } from '@/lib/content/defaults'

const ICONS: LucideIcon[] = [Zap, BadgeCheck, Sparkles, Ear]

export function Why({ content }: { content: HomeContent['why'] }) {
  return (
    <section id="why" className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              kicker={content.kicker}
              title={<MultilineText text={content.title} />}
              description={content.description}
            />
          </div>
          <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:col-span-7">
            {content.items.map((it, i) => {
              const Icon = ICONS[i % ICONS.length]
              return (
                <li key={it.en} className="flex flex-col gap-6 bg-secondary p-7 lg:p-8">
                  <span className="flex size-11 items-center justify-center bg-navy text-navy-foreground">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-col gap-2">
                    <span className="text-kicker text-electric">{it.en}</span>
                    <h3 className="text-xl font-bold tracking-tight">{it.ko}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{it.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
