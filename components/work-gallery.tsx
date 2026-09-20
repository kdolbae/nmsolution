import Image from 'next/image'
import { SectionHeading } from './section-heading'
import { MultilineText } from './multiline-text'
import type { HomeContent } from '@/lib/content/defaults'

/**
 * 실제 현장 사진. 사례별 설명 없이 공종별로 묶어 어떤 작업을 하는지만 보여준다.
 * 사진마다 완성도가 다르므로 비율을 4:3으로 통일해 한 덩어리로 읽히게 한다.
 */
export function WorkGallery({ content }: { content: HomeContent['gallery'] }) {
  const groups = content.groups.filter((g) => g.images.length > 0)
  if (groups.length === 0) return null

  return (
    <section id="works" className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading
          kicker={content.kicker}
          title={<MultilineText text={content.title} />}
          description={content.description}
        />

        <div className="mt-14 flex flex-col gap-12 lg:gap-16">
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-5">
              <h3 className="text-kicker flex items-center gap-3 text-muted-foreground">
                <span className="h-px w-8 bg-electric" aria-hidden />
                {g.label}
              </h3>
              <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
                {g.images.map((src) => (
                  <li key={src} className="relative aspect-[4/3] bg-background">
                    <Image
                      src={src}
                      alt={`${g.label} 시공 현장`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
