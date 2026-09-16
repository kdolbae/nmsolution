# NM SOLUTION 디자인 시스템 구현 명세서

> 문서 버전: 2.0  
> 적용 대상: NM SOLUTION 공개 웹사이트 및 관리자 화면  
> 기준 구현: Next.js App Router + Tailwind CSS v4 + shadcn/ui + Lucide  
> 목적: 다른 개발자 또는 AI가 이 문서만 읽고도 동일한 브랜드 언어와 매우 유사한 화면을 재현하도록 만드는 것

---

## 0. AI 실행 계약

이 문서를 전달받은 AI는 아래 규칙을 최우선으로 따른다.

1. 이 문서는 아이디어 모음이 아니라 **구현 명세서**다. `MUST`, `MUST NOT`, `SHOULD`의 의미를 임의로 완화하지 않는다.
2. 기존 프로젝트에 `app/globals.css`, `app/layout.tsx`, 공통 컴포넌트가 있으면 새로 만들기 전에 반드시 읽고 재사용한다.
3. 충돌 시 우선순위는 다음과 같다.
   1. 사용자의 현재 요청
   2. 접근성·보안·프레임워크 필수 규칙
   3. 이 문서의 `MUST` / `MUST NOT`
   4. 이 문서의 컴포넌트·페이지 규격
   5. 예시 코드
4. 아래 색상·폰트·폭·여백·모서리·반응형 기준을 임의의 비슷한 값으로 바꾸지 않는다.
5. 새로운 시각 언어를 추가하지 않는다. 특히 보라색 그라디언트, 크림색 편집 디자인, 유리 카드, glow, blob, pill 카드, 과한 그림자를 추가하지 않는다.
6. 디자인은 **화이트 기반의 정돈된 산업 전문성**, **딥 네이비의 신뢰감**, **전기적 블루의 신속함**으로 설명되어야 한다.
7. 공개 페이지는 모바일 390px 및 데스크톱 1280px 이상에서 검수한다.
8. 완성 후 본 문서의 `검수 체크리스트`를 직접 확인한다.

### 규범 키워드

- **MUST**: 반드시 적용
- **MUST NOT**: 절대 금지
- **SHOULD**: 특별한 이유가 없으면 적용
- **MAY**: 선택 가능

---

## 1. 브랜드 정의

### 1.1 브랜드 역할

NM SOLUTION은 평택 고덕을 기반으로 공장 개보수와 산업 현장 솔루션을 제공한다. 사이트의 첫 번째 목적은 방문자가 다음 세 가지를 즉시 이해하게 하는 것이다.

1. 공장 개보수 전문 업체임
2. 현장을 직접 진단하고 명확한 공정을 제안함
3. 전화·견적·카카오톡으로 빠르게 상담할 수 있음

### 1.2 브랜드 키워드

- 신속함
- 정확함
- 전문성
- 현장 중심
- 젊고 정돈된 감각
- 과장보다 증거

### 1.3 시각적 성격

- 미니멀하지만 차갑거나 무표정하지 않다.
- 산업적이지만 낡거나 거칠지 않다.
- 전문적이지만 관공서처럼 보이지 않는다.
- 사진과 정보 계층이 주인공이며 장식은 보조 역할만 한다.
- 강한 인상은 대형 타이포그래피, 실제 현장 이미지, Navy/Electric 대비에서 만든다.

### 1.4 단 하나의 시그니처

영문 키커 앞의 **32px Electric Blue 수평선**을 브랜드 시그니처로 사용한다.

```tsx
<p className="text-kicker flex items-center gap-3 text-muted-foreground">
  <span className="h-px w-8 bg-electric" aria-hidden />
  Factory Renovation
</p>
```

시그니처를 제외한 장식 요소는 최대한 절제한다.

---

## 2. 기술 및 파일 기준

### 2.1 권장 스택

- Next.js App Router
- React Server Components 우선
- Tailwind CSS v4
- shadcn/ui 또는 Base UI 기반 접근 가능한 인터랙션
- Lucide React 아이콘
- `next/image` 이미지 최적화

### 2.2 기준 파일

동일 저장소에서 작업한다면 아래 파일이 최종 진실의 원천이다.

| 영역 | 기준 파일 |
| --- | --- |
| 색상·폰트·radius | `app/globals.css` |
| 폰트 로딩·메타데이터 | `app/layout.tsx` |
| 로고·내비게이션 | `components/brand.tsx` |
| 헤더 | `components/site-header.tsx` |
| 히어로 | `components/hero.tsx` |
| 섹션 제목 | `components/section-heading.tsx` |
| 내부 페이지 셸 | `components/page-shell.tsx` |
| 상담 시스템 | `components/contact-widgets.tsx` |
| 푸터 | `components/site-footer.tsx` |
| 관리자 폼 | `components/admin/form.tsx` |
| 기계 판독 토큰 | `design-system.tokens.json` |

### 2.3 컴포넌트 재사용 원칙

- 같은 역할의 UI를 다른 Tailwind 조합으로 복제하지 않는다.
- `SectionHeading`, `PageHero`, `PageShell`, `SiteHeader`, `SiteFooter`를 우선 재사용한다.
- 새 변형이 필요하면 `className`, `tone`, `align`, `variant`를 확장한다.
- 페이지 파일은 조립만 담당하고 큰 UI 블록은 별도 컴포넌트로 분리한다.

---

## 3. 색상 시스템

### 3.1 전체 팔레트

시각적으로 사용하는 핵심 색상은 정확히 5개다.

1. White — 기본 배경
2. Ink — 본문
3. Deep Navy — 브랜드 주색
4. Electric Blue — 행동·상태 강조
5. Cool Light Gray — 보조 표면·경계

오류 메시지에만 별도의 destructive red를 허용한다.

### 3.2 정확한 토큰

```css
:root {
  color-scheme: light;

  --background: oklch(1 0 0);
  --foreground: oklch(0.2 0.012 260);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2 0.012 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.2 0.012 260);

  --navy: oklch(0.22 0.06 262);
  --navy-foreground: oklch(0.98 0 0);
  --primary: var(--navy);
  --primary-foreground: var(--navy-foreground);

  --charcoal: oklch(0.24 0.008 260);
  --charcoal-foreground: oklch(0.98 0 0);

  --electric: oklch(0.58 0.22 262);
  --electric-foreground: oklch(1 0 0);
  --accent: var(--electric);
  --accent-foreground: var(--electric-foreground);

  --secondary: oklch(0.965 0.003 260);
  --secondary-foreground: oklch(0.2 0.012 260);
  --muted: oklch(0.965 0.003 260);
  --muted-foreground: oklch(0.5 0.012 260);
  --border: oklch(0.9 0.005 260);
  --input: oklch(0.9 0.005 260);
  --ring: var(--electric);
  --destructive: oklch(0.577 0.245 27.325);
  --radius: 0.25rem;
}
```

### 3.3 Tailwind 의미 토큰

| 의미 | 클래스 | 용도 |
| --- | --- | --- |
| 기본 화면 | `bg-background text-foreground` | 공개·관리자 기본 배경 |
| 브랜드 면 | `bg-navy text-navy-foreground` | 히어로, 프로세스, CTA |
| 가장 어두운 면 | `bg-charcoal text-charcoal-foreground` | 기타 사업 배너, 제한적 강조 |
| 핵심 행동 | `bg-electric text-electric-foreground` | Primary CTA, 활성 상태 |
| 보조 면 | `bg-secondary text-secondary-foreground` | Why, 관리자 배경, 작은 아이콘 면 |
| 설명 문구 | `text-muted-foreground` | 캡션, 도움말, 메타데이터 |
| 구분선 | `border-border`, `bg-border` | 카드·섹션 분리 |

### 3.4 면적 비율

일반 공개 페이지 한 화면 기준 권장 비율:

- White / Light Gray: 65–80%
- Navy / Charcoal: 15–30%
- Electric Blue: 3–8%

Electric Blue는 넓은 배경 장식이 아니라 CTA, 키커 선, 링크 호버, 상태에 사용한다.

### 3.5 색상 조합 규칙

- `bg-navy` 위에는 `text-navy-foreground`만 사용한다.
- `bg-charcoal` 위에는 `text-charcoal-foreground`만 사용한다.
- `bg-electric` 위에는 `text-electric-foreground`를 사용한다.
- Light surface 본문은 `text-foreground`, 보조 문장은 `text-muted-foreground`를 사용한다.
- 반투명 Dark surface 텍스트는 `/50`, `/60`, `/70`, `/75`, `/80`만 사용한다.
- 직접 HEX/RGB 값을 컴포넌트에 작성하지 않는다.
- 장식용 그라디언트는 금지한다. 단, 히어로 사진 가독성을 위한 Navy overlay는 허용한다.

### 3.6 허용된 히어로 오버레이

```tsx
<div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/20" aria-hidden />
<div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/30 to-transparent" aria-hidden />
```

이 두 그라디언트는 장식이 아니라 텍스트 대비 확보 목적이다.

---

## 4. 타이포그래피

### 4.1 폰트 가족

정확히 두 가족만 사용한다.

| 역할 | 폰트 | Tailwind |
| --- | --- | --- |
| 한글·본문·제목 | Noto Sans KR | `font-sans` |
| 영문 키커·숫자·전화·메타 | Geist Mono | `font-mono` |

Fallback:

```css
--font-sans: var(--font-noto), 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
--font-mono: var(--font-geist-mono), var(--font-noto), 'Apple SD Gothic Neo', 'Malgun Gothic', ui-monospace, monospace;
```

### 4.2 폰트 로딩

```tsx
const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})
```

`<body>`에는 `font-sans antialiased`를 적용한다.

### 4.3 전역 텍스트 규칙

```css
body {
  font-feature-settings: 'ss01', 'cv11';
  letter-spacing: -0.01em;
  word-break: keep-all;
  overflow-wrap: anywhere;
}
```

- 한글 제목은 단어 중간이 아니라 어절 단위로 줄바꿈한다.
- 제목에는 `text-balance`, 본문에는 `text-pretty`를 사용한다.
- 본문 줄높이는 1.4–1.6 범위다.
- 일반 본문은 16px, 보조 본문은 14px보다 작아지지 않는다.
- 11–12px는 영문 키커, 짧은 메타데이터, 모바일 하단 바에만 허용한다.

### 4.4 타입 스케일

| 역할 | 정확한 클래스 |
| --- | --- |
| Home hero H1 | `text-5xl sm:text-6xl lg:text-7xl xl:text-[6.5rem] font-black leading-[1.02] tracking-[-0.035em] text-balance` |
| Contact hero H2 | `text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.1] tracking-[-0.025em] text-balance` |
| Inner page H1 | `text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-[-0.03em] text-balance` |
| Standard section H2 | `text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.15] tracking-[-0.025em] text-balance` |
| Dark process H2 | `text-4xl lg:text-5xl xl:text-6xl font-black leading-[1.08] tracking-[-0.03em] text-balance` |
| Featured card H2 | `text-3xl lg:text-4xl font-black tracking-tight` |
| Step title | `text-2xl font-bold tracking-tight` |
| Card title | `text-xl font-bold tracking-tight text-balance` |
| Project title | `text-lg font-bold tracking-tight` |
| Large body | `text-base lg:text-lg leading-relaxed text-pretty` |
| Standard body | `text-base leading-relaxed text-pretty` |
| Supporting body | `text-sm leading-relaxed text-muted-foreground` |
| Kicker | `font-mono text-[11px] font-medium uppercase tracking-[0.2em]` |
| Phone emphasis | `font-mono text-3xl lg:text-4xl font-bold tracking-tight` |

### 4.5 콘텐츠 어조

- 문장은 짧고 직접적이어야 한다.
- “혁신적인”, “최고의”, “압도적인” 같은 검증 불가능한 수식은 피한다.
- 작업 범위, 소요 시간, 회신 속도, 현장 방문, 공정 순서를 우선한다.
- CTA는 동사형으로 쓴다: `현장 진단 요청`, `지금 문의하기`, `자세히 보기`, `견적 문의`.
- 한 제목에서 강조색 단어는 최대 2개다.

---

## 5. 공간 및 레이아웃

### 5.1 반응형 기준

Tailwind 기본 breakpoint를 사용한다.

| 이름 | 최소 너비 | 역할 |
| --- | ---: | --- |
| base | 0 | 모바일 우선 |
| `sm` | 640px | 2열 카드, 가로 CTA |
| `md` | 768px | 데스크톱 상담 플로팅 시작 |
| `lg` | 1024px | 데스크톱 내비게이션, 12열 구성 |
| `xl` | 1280px | Hero 최대 타이포 |

### 5.2 공개 페이지 컨테이너

```tsx
<div className="mx-auto w-full max-w-7xl px-5 lg:px-8">
  {children}
</div>
```

- 최대 폭: `80rem` / 1280px
- 모바일 좌우 패딩: `1.25rem` / 20px
- 데스크톱 좌우 패딩: `2rem` / 32px
- 컨테이너 밖 full-bleed 배경 안에 컨테이너를 한 번만 둔다.

### 5.3 관리자 컨테이너

```tsx
<div className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 lg:px-10 lg:py-12">
  {children}
</div>
```

### 5.4 수직 리듬

| 영역 | 클래스 |
| --- | --- |
| 기본 내부 페이지 섹션 | `py-16 lg:py-24` |
| 홈 주요 섹션 | `py-24 lg:py-32` |
| 강한 Contact CTA | `py-24 lg:py-36` |
| 내부 PageHero | `py-16 lg:py-24` |
| Footer | `pt-16 pb-28 lg:pb-16` |

새 섹션은 특별한 이유가 없으면 위 값 중 하나를 사용한다.

### 5.5 레이아웃 우선순위

1. Flexbox: 단일 축 정렬, 버튼 그룹, 헤더, 메타데이터
2. Grid: 카드 배열, 12열 본문/이미지 구성
3. Absolute: 이미지 fill, overlay, 화면 고정 상담 위젯에만 제한
4. Float는 사용하지 않는다.

### 5.6 12열 패턴

```tsx
<div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
  <div className="lg:col-span-5">...</div>
  <div className="lg:col-span-7">...</div>
</div>
```

주요 허용 비율:

- 설명 5 / 콘텐츠 7
- 이미지 7 / 설명 5
- Contact 문구 8 / 행동 4

### 5.7 간격 원칙

- 형제 간격은 `gap-*` 사용을 우선한다.
- 같은 컨테이너에 `gap-*`과 자식의 반복 margin을 혼용하지 않는다.
- 허용되는 주요 gap: `gap-1`, `gap-2`, `gap-3`, `gap-4`, `gap-5`, `gap-6`, `gap-8`, `gap-12`, `gap-14`, `gap-16`.
- 임의 픽셀 간격은 사용하지 않는다.

---

## 6. 형태, 경계, 깊이

### 6.1 Radius

```css
--radius: 0.25rem;
```

- 공개 마케팅 UI는 `rounded-none` 또는 `rounded-sm`.
- 큰 카드에 `rounded-xl`, `rounded-2xl`을 사용하지 않는다.
- Pill은 태그가 실제 필터·상태인 경우에만 제한적으로 허용한다.
- 원형은 플로팅·아이콘 버튼처럼 기능적으로 필요한 경우만 허용한다.

### 6.2 Border

- 카드 그룹 분할: `gap-px bg-border` + 자식 `bg-background`.
- 독립 요소: `border border-border`.
- Dark surface: `border-navy-foreground/15` 또는 `/30`.
- 구분선은 얇고 구조적으로만 사용한다.

### 6.3 Shadow

기본 카드에는 그림자를 사용하지 않는다. 유일한 강한 그림자는 화면 위에 떠 있는 상담 패널이다.

```tsx
shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]
```

버튼은 플로팅 상담 토글에만 `shadow-lg`를 허용한다.

### 6.4 금지 형태

- 카드 왼쪽에 장식용 컬러 라인
- 이유 없는 원형 숫자 배지
- 과도한 둥근 모서리
- 유리질 카드와 glow
- 장식용 gradient border
- 화면 곳곳에 반복되는 drop shadow

---

## 7. 아이콘 및 이미지

### 7.1 아이콘

- Lucide React만 사용한다.
- 일반 아이콘: `size-4` 또는 `size-5`.
- 큰 상태 아이콘: 최대 `size-6`.
- 기본 `strokeWidth={1.75}`를 권장한다.
- 아이콘은 텍스트 의미를 보조해야 하며 장식용으로 남발하지 않는다.
- 이모지를 아이콘으로 쓰지 않는다.
- 복잡한 SVG를 직접 그리지 않는다.

### 7.2 이미지 방향

- 현대적 공장 외관
- 지붕·판넬·외벽·바닥의 실제 질감
- 현장 점검 및 시공 장면
- 차가운 중성광, Navy/Gray와 자연스럽게 어울리는 톤
- 과도한 HDR, 따뜻한 빈티지 필터, 비현실적 AI 질감 금지

### 7.3 이미지 비율

| 용도 | 비율 |
| --- | --- |
| Home hero | viewport full bleed, `object-cover` |
| 일반 서비스 카드 | `aspect-[4/3]` |
| 공장 개보수 범위 카드 | `aspect-[4/5]` |
| Featured 서비스 | 모바일 `aspect-[16/9]`, 데스크톱 최소 높이 420px |
| Process 현장 사진 | `aspect-[4/3]` |
| Before / After | 반드시 같은 비율과 가능하면 같은 촬영 각도 |

### 7.4 이미지 상호작용

카드가 클릭 가능할 때만 아래 효과를 사용한다.

```tsx
className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
```

한 카드에서 이미지 확대와 복잡한 overlay animation을 동시에 사용하지 않는다.

### 7.5 프로젝트 기본 자산

동일 재현 시 다음 경로를 유지한다.

- `/images/hero-factory.png`
- `/images/factory-survey.png`
- `/images/factory-floor.png`
- `/images/factory-wall.png`
- `/images/project-roof.png`
- `/images/project-uv.png`
- `/images/recovery-before.png`
- `/images/recovery-after.png`
- `/images/mold-before.png`
- `/images/mold-after.png`
- `/images/industrial.png`
- `/images/insulation.png`
- `/images/coating.png`
- `/images/products.png`
- `/images/academy.png`

이미지가 없으면 동일한 주제와 비율의 실제 이미지를 생성하거나 확보한다. 빈 placeholder를 남기지 않는다.

### 7.6 Alt text

- 정보 이미지: 대상과 맥락을 한국어로 구체적으로 설명한다.
- 예: `공장 지붕 구조를 점검하는 현장 담당자`.
- 주변 텍스트와 동일한 정보만 반복하면 빈 alt를 고려한다.
- `image`, `photo`, 파일명을 alt로 사용하지 않는다.

---

## 8. 공통 컴포넌트 규격

### 8.1 Logo

구조:

- 28×28px Navy 정사각형
- 내부 `NM`: Geist Mono, 11px, bold
- 우측 `NM Solution`: Geist Mono, 14px, semibold, uppercase, tracking 0.18em
- 아이콘과 워드마크 간격 10px

```tsx
<Link href="/" className="flex items-center gap-2.5" aria-label="NM SOLUTION 홈">
  <span className="flex h-7 w-7 items-center justify-center bg-navy text-navy-foreground" aria-hidden>
    <span className="font-mono text-[11px] font-bold leading-none tracking-tight">NM</span>
  </span>
  <span className="font-mono text-sm font-semibold uppercase tracking-[0.18em]">NM Solution</span>
</Link>
```

### 8.2 SectionHeading

MUST:

- 세로 `gap-5`
- Kicker + 32px Electric line
- H2 최대 폭 `max-w-3xl`
- 설명 최대 폭 `max-w-xl`
- Light / Dark tone 지원
- Left 기본, Center는 특별한 섹션에만 사용

```tsx
<SectionHeading
  kicker="Factory Renovation"
  title="공장 개보수, 빠르게 그리고 정확하게."
  description="현장을 진단하고 가동 계획에 맞춰 시공합니다."
/>
```

### 8.3 PageHero

- 배경 White
- 하단 `border-border`
- 내부 컨테이너 `max-w-7xl px-5 lg:px-8`
- `py-16 lg:py-24`
- Kicker, H1, description 사이 `gap-6`
- H1 최대 폭 `max-w-4xl`
- 설명 최대 폭 `max-w-2xl`

### 8.4 버튼 계층

#### Public primary

```tsx
className="inline-flex h-14 items-center justify-center gap-3 bg-electric px-7 text-base font-semibold text-electric-foreground transition-colors hover:bg-background hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
```

#### Public secondary on dark

```tsx
className="inline-flex h-14 items-center justify-center gap-3 border border-navy-foreground/30 px-7 text-base font-semibold text-navy-foreground transition-colors hover:border-navy-foreground hover:bg-navy-foreground/10"
```

#### Public secondary on light

```tsx
className="inline-flex h-12 items-center gap-3 border border-foreground/20 px-6 text-sm font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
```

#### Admin action

- shadcn `Button` 사용
- 주요 저장 버튼 `h-10 rounded-none px-6`
- 보조 버튼 `variant="outline"` 또는 `variant="ghost"`
- 관리자 화면에서는 기존 shadcn size를 따르되 32px 미만 버튼은 아이콘 도구 외 사용하지 않는다.

#### 공통 버튼 규칙

- 모바일 핵심 CTA 높이 48px 이상, 주요 hero CTA 56px.
- 텍스트와 아이콘 간격 `gap-2` 또는 `gap-3`.
- 오른쪽 진행 의미: `ArrowRight`.
- 새 페이지·외부 이동: `ArrowUpRight`.
- 호버 화살표 이동은 최대 4px.
- disabled는 상호작용 제거 + `opacity-50`.
- 아이콘 단독 버튼은 `aria-label` 필수.

### 8.5 카드

#### 카드 그룹

```tsx
<ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
  <li className="bg-background">...</li>
</ul>
```

#### 카드 본문

- padding: `p-6`, 큰 카드 `p-8 lg:p-12`
- title/description: `gap-3`
- 설명: `text-sm leading-relaxed text-muted-foreground`
- 그림자 없음
- 테두리 또는 1px grid divider로 구분

#### 카드 호버

다음 중 최대 두 가지를 사용한다.

1. 이미지 1.05 확대
2. 화살표 색상 Electric
3. 배경 또는 경계색 변화

카드 전체가 링크이면 내부에 중복 CTA 버튼을 넣지 않는다.

### 8.6 태그 및 배지

- 메타 배지: White 90% 배경, 11–12px.
- 범위 extra tag: `border border-border px-3 py-1.5 text-sm`.
- 태그에 큰 radius나 shadow를 사용하지 않는다.
- 장식용 수치가 아니라 실제 분류·순서 정보만 표시한다.

### 8.7 폼

- Label과 input의 `htmlFor`/`id` 연결.
- 세로 `gap-2`.
- 공개/관리자 입력은 작은 radius 또는 `rounded-none`.
- 도움말 `text-xs text-muted-foreground`.
- 긴 문자열·URL은 `font-mono text-xs` 허용.
- 오류는 `text-destructive` + 텍스트 설명.
- 성공은 아이콘과 텍스트를 함께 표시.
- 저장 중 버튼 비활성화 및 spinner 표시.

### 8.8 Header

#### Desktop, 스크롤 전

- 화면 상단 고정 `fixed inset-x-0 top-0 z-50`.
- 기타 사업 배너: 높이 40px, Charcoal.
- 메인 헤더: 높이 80px, Hero 위 투명.
- Hero 밖 내부 페이지는 처음부터 White solid.
- 로고 좌측, 내비게이션 중앙, 빠른 견적 우측.
- 내비게이션 간격 `gap-9`, text 14px medium.

#### Desktop, 24px 이상 스크롤

- 기타 사업 배너를 max-height 0 + opacity 0으로 접는다.
- 메인 헤더 White 95% + backdrop blur + 하단 border.
- 전환 300ms.

#### Mobile

- 메인 헤더 높이 64px.
- 햄버거 버튼 40×40px.
- 메뉴는 viewport 높이를 넘지 않도록 scroll.
- 주 메뉴는 18px, 행마다 bottom border, 우측 01/02 인덱스.
- Other Solutions는 2열 Light Gray 카드.
- 메뉴가 열리면 body scroll을 잠근다.

### 8.9 Home Hero

- 최소 높이 `100svh`.
- 배경 Navy + full-bleed 실제 공장 이미지.
- 콘텐츠는 화면 하단 정렬.
- 모바일 `px-5 pb-28 pt-40`, 데스크톱 `lg:px-8 lg:pb-24`.
- H1 최대 폭 `max-w-5xl`.
- H1 핵심 단어 최대 2개만 Electric.
- 설명 최대 폭 `max-w-2xl`.
- CTA는 모바일 세로, `sm`부터 가로.
- 통계는 모바일 1열, `sm`부터 3열.
- 데스크톱 최하단에 범위 ticker를 표시하고 모바일에서는 숨긴다.

### 8.10 Process section

- 전체 Navy surface.
- `lg:grid-cols-12`, 설명/사진 5열, 단계 7열.
- 단계는 위아래 1px divider.
- 각 단계는 순번, 시간, 제목, 설명 순서.
- 순번은 Electric Mono 12px.
- 장식용 타임라인 원이나 연결선을 추가하지 않는다.

### 8.11 Contact CTA

- Navy 배경, `py-24 lg:py-36`.
- 데스크톱 문구 8열 / 행동 4열.
- 전화 카드, Electric 견적 CTA, Outline Kakao CTA 순서.
- 전화번호는 Mono 30–36px.
- Kakao는 popup 동작을 텍스트로 안내한다.

### 8.12 상담 위젯

#### Desktop / Tablet `md` 이상

- 우하단 `bottom-6 right-5`, 큰 화면 `lg:bottom-8 lg:right-8`.
- 패널 폭 288px.
- 토글 버튼 높이 56px.
- 닫힘: Electric, 열림: Charcoal.
- 패널 전환: opacity + translateY 12px + scale 0.95, 300ms.
- 패널에만 강한 shadow 허용.

#### Mobile `md` 미만

- 화면 하단 고정 4열.
- 각 항목 높이 64px.
- 전화 / 카톡 / 채팅 / 견적 순서.
- 견적만 Navy surface.
- safe-area inset을 반영한다.
- Footer는 bar와 겹치지 않도록 모바일 하단 padding 112px을 확보한다.

### 8.13 Footer

- White + top border.
- 모바일 `pb-28`, 데스크톱 `pb-16`.
- 데스크톱 12열: 브랜드 5 / 메뉴 3 / 회사정보 4.
- 설명은 `max-w-sm`.
- 회사 정보는 `dl` 2열.
- 마지막 저작권 행은 top border로 분리.

### 8.14 Admin

- 공개 페이지와 같은 token·font·radius를 사용한다.
- 전체 배경 Secondary.
- Sidebar: 240px, White, sticky, desktop only.
- 콘텐츠: max 1024px.
- Admin panel: White + `ring-1 ring-border`, `p-6 lg:p-8`.
- 활성 navigation: Navy surface.
- 폼 필드와 편집 카드: `rounded-none`.
- 모바일 관리자 내비게이션은 별도 상단/하단 패턴을 구현하되 공개 사이트의 상담 바와 혼동하지 않는다.

---

## 9. 모션 및 상태

### 9.1 시간

| 상호작용 | 시간 |
| --- | ---: |
| 색상·opacity | 150–300ms |
| Header 상태 전환 | 300ms |
| 메뉴 max-height | 300ms |
| 상담 popup UI | 300ms |
| 카드 이미지 확대 | 700ms |

### 9.2 Easing

- 일반: Tailwind 기본 easing.
- 이미지: `ease-out`.
- 빠른 UI feedback에 spring 또는 bounce를 사용하지 않는다.

### 9.3 허용 모션

- 색상 변화
- 투명도 변화
- 화살표 2–4px 이동
- 이미지 1.05 확대
- 메뉴 max-height 전개
- 상담 패널 작은 scale/translate

### 9.4 금지 모션

- 지속적인 부유 애니메이션
- 무한 pulse/glow
- 장식 요소 parallax
- 모든 섹션에 반복되는 스크롤 등장 효과
- 읽기나 클릭을 지연시키는 entrance animation

`prefers-reduced-motion` 사용자의 작업을 방해하는 필수 애니메이션을 만들지 않는다.

---

## 10. 반응형 행동 표

| 요소 | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| Header nav | 햄버거 | 햄버거 | 가로 nav |
| Other Solutions top bar | 숨김 | 숨김 | 표시 |
| Hero CTA | 세로 | 가로 | 가로 |
| Scope cards | 1열 | 2열 | 4열 |
| Project cards | 1열 | 2열 | 3열 |
| 12-column content | 1열 | 1열 | 12열 |
| 상담 UI | 4열 하단 bar | Floating | Floating |
| Footer | 1열 | 1열 | 5/3/4 열 |
| Admin sidebar | 숨김 | 숨김 | 240px sidebar |

### 10.1 최소 검수 뷰포트

- Mobile: 390×844
- Tablet: 768×1024
- Desktop: 1280×800
- Wide Desktop: 1920×1080 이상에서 컨테이너가 1280px을 넘지 않는지 확인

### 10.2 모바일 필수 조건

- 390px에서 가로 스크롤 없음.
- 긴 한글 제목이 잘리거나 버튼을 밀어내지 않음.
- 고정 하단 bar가 콘텐츠·Footer를 가리지 않음.
- 메뉴가 열렸을 때 body가 뒤에서 스크롤되지 않음.
- 터치 영역 44×44px 이상.

---

## 11. 접근성 규약

### 11.1 구조

- 페이지당 `main` 하나.
- `header`, `nav`, `main`, `section`, `footer`를 의미에 맞게 사용.
- 반복 목록은 `ul`/`ol`, 회사 정보는 `dl`.
- 제목 순서는 H1 → H2 → H3를 건너뛰지 않는다.

### 11.2 키보드와 포커스

- 모든 링크·버튼·메뉴·필터는 키보드로 동작해야 한다.
- `focus-visible`을 제거하지 않는다.
- Focus ring은 Electric 계열.
- 모바일 메뉴와 popup에는 `aria-expanded`, `aria-controls`를 제공한다.
- 아이콘 단독 버튼에는 `aria-label`과 필요 시 `title` 제공.

### 11.3 색상 대비

- 본문은 WCAG AA 대비 이상.
- 색상만으로 선택·성공·실패 상태를 전달하지 않는다.
- Dark surface의 작은 글자는 최소 `/60`, 핵심 본문은 `/70` 이상.

### 11.4 링크와 popup

- 전화는 `tel:` 링크.
- 새 창·popup은 접근 가능한 이름이나 인접 문구로 안내.
- 외부 링크는 목적을 알 수 있는 텍스트 사용.

### 11.5 이미지

- 모든 `Image` 또는 `img`에 alt 제공.
- 장식 overlay에는 `aria-hidden`.
- 비어 있는 이미지 영역은 실제 대체 상태와 텍스트를 제공.

---

## 12. 페이지 조립 규격

### 12.1 Home `/`

순서를 변경하지 않는 것을 원칙으로 한다.

1. `SiteHeader` — Hero 위 transparent
2. `Hero` — 공장 개보수 핵심 가치
3. `FactoryScope` — 작업 범위 4개
4. `FactoryProcess` — 진행 단계
5. `Projects` — 설정이 켜지고 데이터가 있을 때
6. `Why` — 신뢰 이유
7. `ContactCta`
8. `SiteFooter`
9. `FloatingContact` / `MobileContactBar`

Home의 첫 화면에는 기타 사업을 공장 개보수와 동급으로 나열하지 않는다.

### 12.2 Services `/services`

1. White solid Header
2. `PageHero`
3. Core Business featured card — Navy surface, 이미지 7 / 문구 5
4. Other Solutions 1/2/3열 카드 grid
5. Footer + 상담 위젯

공장 개보수를 항상 첫 번째 featured item으로 둔다.

### 12.3 Service detail `/services/[slug]`

1. `PageShell`
2. `PageHero`
3. 실제 서비스 이미지 또는 Before/After
4. 문제·해결·공정·적용 범위
5. 관련 상담 CTA

### 12.4 About `/about`

- 장황한 연혁보다 대표 인사와 현장 원칙 중심.
- 최대 2열.
- 수치가 실제 근거가 있을 때만 통계 사용.

### 12.5 Admin `/admin`

- 인증된 사용자만 접근.
- Sidebar + max-w-5xl content.
- `PageHeader`, `Section`, `Field`, `ListEditor`, `SaveBar` 재사용.
- 저장되지 않은 상태, 저장 중, 성공, 실패를 명확히 표시.

---

## 13. 콘텐츠 및 데이터 규칙

- 관리자 편집 대상은 type과 default schema를 먼저 정의한다.
- 동일 정보는 페이지마다 하드코딩하지 않고 설정값을 재사용한다.
- 전화번호, 주소, 운영시간, 카카오 URL은 settings에서 관리한다.
- 시공사례가 없으면 fake data를 표시하지 않고 명확한 empty state를 보인다.
- 공개 페이지에서 관리자 기능을 CSS로만 숨기지 않는다.
- 새로운 통계 숫자는 실제 근거가 없으면 추가하지 않는다.

---

## 14. 금지 목록

다른 AI는 아래 요소를 추가해서는 안 된다.

### Visual

- Purple/violet gradient
- Warm cream + serif + terracotta 조합
- Acid green 또는 vermilion 중심 다크 테마
- 장식용 glow, orb, blob, blurry shape
- 과도한 glassmorphism
- 모든 카드의 큰 radius와 shadow
- 좌측 색상 stripe 카드
- 의미 없는 통계 숫자
- 실제 순서가 아닌 01/02/03 장식
- serif 또는 script font
- 3개 이상의 font family
- Lucide 외 임의 아이콘 세트 혼용
- Emoji 아이콘

### UX

- 핵심 CTA보다 장식이 더 눈에 띄는 구성
- 자동 재생 영상/오디오
- 닫을 수 없는 popup
- hover에서 layout이 움직이는 효과
- 모바일에서 horizontal scroll에 의존하는 핵심 콘텐츠
- 클릭 영역 44px 미만

### Code

- 컴포넌트 내부 임의 HEX/RGB
- 같은 역할 공통 컴포넌트 복제
- 이미지 placeholder 방치
- 접근 가능한 이름 없는 아이콘 버튼
- `useEffect` 안에서 일반 데이터 fetch
- Client-only persistence

---

## 15. 구현 순서

다른 AI가 새 페이지를 만들 때 아래 순서를 따른다.

1. 기존 `globals.css`, `layout.tsx`, 공통 컴포넌트 확인
2. 페이지 목적과 가장 중요한 CTA 한 개 결정
3. Light/Dark surface 순서 설계
4. `max-w-7xl px-5 lg:px-8` 컨테이너 적용
5. `PageShell`, `PageHero`, `SectionHeading` 재사용
6. 모바일 1열 UI 먼저 작성
7. `sm`, `md`, `lg`, `xl`에서 필요한 변화만 추가
8. 실제 이미지 연결 및 alt 작성
9. Hover, focus, disabled, empty, loading 상태 구현
10. 390px / 1280px 브라우저 검수
11. 아래 체크리스트 확인

---

## 16. 검수 체크리스트

### 브랜드

- [ ] 첫 화면에서 공장 개보수 전문 업체임이 5초 안에 이해되는가?
- [ ] White, Navy, Electric 대비가 주된 시각 언어인가?
- [ ] Electric Blue 면적이 8% 이하로 절제되어 있는가?
- [ ] 장식보다 현장 이미지와 정보가 우선하는가?

### 토큰

- [ ] 컴포넌트에 임의 HEX/RGB가 없는가?
- [ ] 배경을 바꾸면 대응 foreground도 함께 바뀌는가?
- [ ] radius가 4px 수준 또는 square인가?
- [ ] 기본 카드에 shadow가 없는가?

### 타이포

- [ ] Noto Sans KR + Geist Mono만 사용하는가?
- [ ] 제목에 `text-balance`, 본문에 `text-pretty`를 사용했는가?
- [ ] 본문이 14px보다 작지 않은가?
- [ ] 제목/본문/메타데이터 계층이 명확한가?

### 레이아웃

- [ ] 공개 컨테이너가 `max-w-7xl px-5 lg:px-8`인가?
- [ ] 모바일이 기본 1열인가?
- [ ] 주요 섹션 여백이 규격값 중 하나인가?
- [ ] wide desktop에서 콘텐츠가 지나치게 늘어나지 않는가?

### 컴포넌트

- [ ] `SectionHeading`, `PageHero`, `PageShell`을 재사용했는가?
- [ ] 버튼 높이와 위계가 일관적인가?
- [ ] 카드 hover 효과가 1–2개 이하인가?
- [ ] 아이콘 크기와 stroke가 일관적인가?

### 반응형

- [ ] 390px에서 가로 스크롤이 없는가?
- [ ] 768px에서 상담 UI가 Floating으로 전환되는가?
- [ ] 1024px에서 desktop header와 12열 layout이 적용되는가?
- [ ] 모바일 하단 bar가 Footer를 가리지 않는가?

### 접근성

- [ ] 페이지에 H1이 하나인가?
- [ ] 제목 순서가 올바른가?
- [ ] 모든 아이콘 버튼에 accessible name이 있는가?
- [ ] 키보드 포커스가 보이는가?
- [ ] 이미지 alt가 구체적인가?
- [ ] 색상 외 텍스트·아이콘으로 상태가 설명되는가?

### 콘텐츠

- [ ] 검증 불가능한 과장 문구가 없는가?
- [ ] 실제 근거 없는 통계가 없는가?
- [ ] CTA가 구체적인 동사형인가?
- [ ] 전화·카카오·견적 경로가 실제로 작동하는가?

---

## 17. 다른 AI에 전달할 실행 프롬프트

아래 문구와 이 파일, `design-system.tokens.json`, 이미지 자산을 함께 전달한다.

```text
당신은 NM SOLUTION 디자인 시스템을 구현하는 UI 엔지니어입니다.
첨부된 DESIGN_SYSTEM.md를 아이디어가 아닌 구현 명세로 취급하세요.
MUST와 MUST NOT 규칙을 모두 준수하고, design-system.tokens.json의 값을 임의로 변경하지 마세요.

우선 기존 저장소의 globals.css, layout.tsx, 공통 컴포넌트를 읽고 재사용하세요.
디자인의 핵심은 White/Light Gray 기반, Deep Navy의 신뢰감, Electric Blue의 제한적인 행동 강조,
Noto Sans KR의 강한 한글 제목, Geist Mono의 영문 키커와 숫자, 4px 이하의 모서리,
실제 산업 현장 이미지, 1280px 콘텐츠 컨테이너입니다.

보라색 그라디언트, glow, blob, glassmorphism, 큰 radius, 불필요한 shadow,
serif 폰트, 의미 없는 통계나 장식 숫자를 추가하지 마세요.

모바일 390px을 먼저 구현하고, 768px과 1024px breakpoint 규칙을 적용하세요.
공개 페이지는 PageShell/PageHero/SectionHeading 패턴을 재사용하고,
마지막에 DESIGN_SYSTEM.md의 검수 체크리스트를 확인하세요.
완료 전 390x844와 1280x800 실제 브라우저에서 가로 스크롤, 겹침, 대비,
고정 상담 UI, 메뉴, CTA 동작을 검증하세요.
```

---

## 18. 재현성의 범위

이 문서와 토큰 파일만으로 **동일한 디자인 언어와 컴포넌트 비례**를 재현할 수 있다. 현재 사이트에 최대한 가까운 결과를 위해서는 다음을 함께 전달해야 한다.

1. `DESIGN_SYSTEM.md`
2. `design-system.tokens.json`
3. `public/images/*` 실제 이미지 자산
4. 로고 및 공통 컴포넌트 코드
5. 현재 데스크톱·모바일 기준 화면 이미지

문서만 전달해도 색상, 폰트, 여백, 형태, 반응형, 상호작용은 일관되게 구현할 수 있다. 다만 실제 사진 crop과 문장 길이에 따른 픽셀 차이까지 동일하게 하려면 원본 자산과 기준 스크린샷이 필요하다.
