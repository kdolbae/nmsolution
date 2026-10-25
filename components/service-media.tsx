import Image from 'next/image'
import type { ServiceMedia } from '@/lib/content/defaults'

/**
 * 사업 상세의 "현장 기록" — 실제 사진과 짧은 영상(드론 항공 촬영, 작업 계획 3D).
 * 영상은 소리 없이 자동 반복한다. R2 공개 주소를 그대로 쓰므로 next/image 를 거치지 않는다.
 */
export function ServiceMediaSection({ items, name }: { items: ServiceMedia[]; name: string }) {
  if (items.length === 0) return null
  const [lead, ...rest] = items
  return (
    <section className="border-t border-border bg-background py-16 lg:py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <h2 className="text-kicker text-muted-foreground">Field Records</h2>
          <p className="text-2xl font-bold tracking-tight lg:text-3xl">{name}, 실제 현장 기록입니다.</p>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">
            드론 항공 촬영으로 현장을 먼저 읽고, 중량물 양중은 3D 로 순서를 검토한 뒤 들어갑니다. 아래는 최근 현장의 사진과 계획 영상입니다.
          </p>
        </div>

        <figure className="flex flex-col gap-3">
          <MediaTile item={lead} priority className="aspect-video" sizes="(min-width: 1280px) 1216px, 100vw" />
          <figcaption className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <span className="text-base font-bold tracking-tight">{lead.title}</span>
            <span className="text-sm text-muted-foreground">{lead.caption}</span>
          </figcaption>
        </figure>

        <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {rest.map((m, i) => (
            <li key={m.src} className="flex flex-col bg-background">
              <MediaTile
                item={m}
                className="aspect-[4/3]"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                index={i + 2}
              />
              <div className="flex flex-1 flex-col gap-1.5 p-5">
                <h3 className="text-base font-bold tracking-tight">{m.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{m.caption}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          사진·영상은 엔엠솔루션이 직접 진행한 현장과 제안 자료입니다. 발주처 정보는 넣지 않았습니다.
        </p>
      </div>
    </section>
  )
}

function MediaTile({
  item,
  className,
  sizes,
  priority,
  index,
}: {
  item: ServiceMedia
  className: string
  sizes: string
  priority?: boolean
  index?: number
}) {
  const badge =
    item.kind === 'video' ? (
      <span className="absolute left-3 top-3 bg-electric px-1.5 py-0.5 font-mono text-[11px] font-semibold text-electric-foreground">
        VIDEO
      </span>
    ) : index ? (
      <span className="absolute left-3 top-3 bg-background/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold">
        {String(index).padStart(2, '0')}
      </span>
    ) : null
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {item.kind === 'video' ? (
        <video
          src={item.src}
          poster={item.poster}
          autoPlay
          muted
          loop
          playsInline
          preload={priority ? 'auto' : 'metadata'}
          className="absolute inset-0 size-full object-cover"
          aria-label={item.title}
        />
      ) : (
        <Image src={item.src} alt={item.title} fill sizes={sizes} priority={priority} className="object-cover" />
      )}
      {badge}
    </div>
  )
}
