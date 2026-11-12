import Image from 'next/image'

export type StripPhoto = { src: string; label: string }

/**
 * 첫 화면 현장 사진 줄(kevin 2026-11-12 "엔엠 모든 랜딩에 이미지 넣기").
 * 광고로 들어온 사람이 휴대폰 첫 화면에서 바로 '이 회사가 이런 큰 공사를 한다'를 보게 한다.
 * 사진은 엔엠솔루션 실제 현장 사진(public/images/gallery, leak/work-*)만 쓴다.
 */
export function PhotoStrip({ photos, className = '', priority = false }: { photos: StripPhoto[]; className?: string; priority?: boolean }) {
  // 2장이면 2칸, 3장이면 3칸 (Tailwind 가 읽을 수 있게 클래스 이름을 통째로 둔다)
  const cols = photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
  return (
    <ul className={`grid ${cols} gap-1 ${className}`} aria-label="엔엠솔루션 현장 사진">
      {photos.map((p, i) => (
        <li key={p.src} className="relative aspect-[4/3] overflow-hidden bg-charcoal">
          <Image
            src={p.src}
            alt={p.label}
            fill
            priority={priority && i === 0}
            sizes="(min-width: 1024px) 220px, 33vw"
            className="object-cover"
          />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 to-transparent px-2 pb-1.5 pt-5 text-[11px] font-semibold leading-tight text-navy-foreground sm:text-xs">
            {p.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** 홈(/) 첫 화면: 큰 공사(증축 · 양중 · 배관) 중심 */
export const HOME_PHOTOS: StripPhoto[] = [
  { src: '/images/gallery/g-steel-frame-1.jpg', label: '공장 증축 철골 골조' },
  { src: '/images/gallery/g-truss-lift.jpg', label: '트러스 양중 · 설치' },
  { src: '/images/gallery/g-pipe-line.jpg', label: '공장 유틸리티 배관' },
]

/** 사업소개 상세(/services/<slug>) 현장 사진. 실제 사진이 없는 사업은 비워 두고 대표 이미지만 쓴다 */
export const SERVICE_PHOTOS: Record<string, StripPhoto[]> = {
  factory: [
    { src: '/images/gallery/g-steel-frame-1.jpg', label: '옥상 증축 철골 골조' },
    { src: '/images/gallery/g-truss-lift.jpg', label: '트러스 양중 · 설치' },
    { src: '/images/gallery/g-pipe-line.jpg', label: '공장 유틸리티 배관 정비' },
  ],
  plant: [
    { src: '/images/gallery/g-pipe-line.jpg', label: '유틸리티 배관 라인' },
    { src: '/images/gallery/g-hp-gas.jpg', label: '스텐 고압 가스 배관' },
    { src: '/images/gallery/g-tank-done.jpg', label: '탱크 노즐 · 배관 연결' },
  ],
  insulation: [
    { src: '/images/gallery/g-panel-window.jpg', label: '외벽 판넬 · 창호 마감' },
    { src: '/images/gallery/g-panel-hall.jpg', label: '통로 지붕 · 벽 판넬' },
    { src: '/images/leak/work-roof-frame.webp', label: '지붕 골조 · 판넬 시공' },
  ],
}
