# NM SOLUTION Design System

엔엠솔루션 웹사이트와 관리자 화면을 일관되게 확장하기 위한 디자인 규약입니다. 실제 구현의 기준 파일은 `app/globals.css`, `app/layout.tsx`, `components/section-heading.tsx`, `components/page-shell.tsx`입니다.

## 1. Design Direction

### Brand keywords

- 신속함
- 전문성
- 젊은 감각
- 고객 중심
- 정돈된 산업 현장

### Visual direction

- White / Light Gray 기반의 깨끗한 화면
- Deep Navy로 전문성과 신뢰 표현
- Electric Blue는 행동 유도와 핵심 정보에만 사용
- Charcoal은 배너, 강조 섹션, 관리자 내비게이션에 제한적으로 사용
- 장식보다 정보 계층, 사진, 여백으로 완성
- 공장 개보수가 메인 사업임을 항상 첫 화면과 주요 내비게이션에서 우선 표현

## 2. Color System

색상은 반드시 `app/globals.css`의 semantic token을 사용합니다. 컴포넌트 안에 임의 HEX/RGB 색상을 직접 작성하지 않습니다.

| Role | Tailwind token | CSS source | Usage |
| --- | --- | --- | --- |
| Base | `bg-background`, `text-foreground` | `--background`, `--foreground` | 일반 페이지 배경과 본문 |
| Primary | `bg-navy`, `text-navy` | `--navy` | 헤더, 핵심 CTA, 브랜드 영역 |
| Dark surface | `bg-charcoal` | `--charcoal` | 상단 사업 배너, 강한 대비 섹션 |
| Accent | `bg-electric`, `text-electric` | `--electric` | 링크, 상태, CTA, 키커 라인 |
| Neutral | `bg-secondary`, `text-muted-foreground` | `--secondary`, `--muted-foreground` | 보조 배경과 설명 문구 |

### Rules

1. 한 화면에서 Electric Blue가 차지하는 면적은 작게 유지합니다.
2. Navy 또는 Charcoal 배경에서는 반드시 `text-navy-foreground` 또는 `text-charcoal-foreground`를 사용합니다.
3. 본문은 `text-foreground`, 보조 설명은 `text-muted-foreground`를 기본으로 합니다.
4. 경계선은 `border-border`, 입력 포커스는 `ring-electric` 계열을 사용합니다.
5. 오류 상태 외에는 `destructive` 색상을 사용하지 않습니다.

## 3. Typography

### Font families

- 본문 및 한글 제목: `font-sans` — Noto Sans KR
- 영문 키커, 숫자, 전화번호, 기술 정보: `font-mono` — Geist Mono
- 추가 폰트 도입 금지

### Hierarchy

| Level | Recommended classes |
| --- | --- |
| Hero H1 | `text-5xl sm:text-6xl lg:text-7xl xl:text-[6.5rem] font-black leading-[1.02] tracking-[-0.035em] text-balance` |
| Page H1 | `text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-[-0.03em] text-balance` |
| Section H2 | `text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.15] tracking-[-0.025em] text-balance` |
| Card title | `text-xl lg:text-2xl font-bold text-balance` |
| Body | `text-base leading-relaxed text-pretty` |
| Supporting text | `text-sm leading-relaxed text-muted-foreground` |
| Kicker | `text-kicker` |

### Copy rules

- 제목은 짧고 단정하게 작성합니다.
- 본문은 최소 14px 이상을 유지합니다.
- 한국어 줄바꿈은 전역 `word-break: keep-all`을 유지합니다.
- 영문 대문자와 넓은 자간은 키커, 상태, 분류에만 사용합니다.
- 과장된 표현보다 작업 범위, 회신 속도, 진행 방식처럼 확인 가능한 정보를 우선합니다.

## 4. Layout

### Container

```tsx
<div className="mx-auto w-full max-w-7xl px-5 lg:px-8">
  {children}
</div>
```

### Section spacing

- 일반 섹션: `py-16 lg:py-24`
- 중요한 브랜드/CTA 섹션: `py-20 lg:py-28`
- 컴포넌트 내부 간격은 `gap-*`을 우선 사용
- 같은 요소에 `gap-*`과 자식 margin을 혼용하지 않음

### Grid

- 모바일 우선: 기본은 1열
- 사업 카드: `md:grid-cols-2`, 필요 시 `lg:grid-cols-4`
- 본문 + 이미지: `lg:grid-cols-2`
- 복잡한 2차원 배치가 아니면 Grid보다 Flexbox를 우선

### Radius

기본 radius는 `--radius: 0.25rem`입니다.

- 브랜드/마케팅 카드: `rounded-sm` 또는 모서리 없음
- 입력, 버튼, 관리자 패널: `rounded-none` 또는 token 기반의 작은 radius
- 큰 pill 형태, 과도하게 둥근 카드 금지
- 원형은 플로팅 버튼, 아이콘 버튼처럼 기능상 필요한 경우만 허용

## 5. Core Components

### Section heading

섹션 제목은 직접 반복 구현하지 않고 `SectionHeading`을 사용합니다.

```tsx
<SectionHeading
  kicker="Factory Renovation"
  title="공장 개보수, 빠르게 그리고 정확하게."
  description="현장을 진단하고 가동 계획에 맞춰 시공합니다."
/>
```

- `tone="dark"`: Navy/Charcoal 배경
- `align="center"`: 중앙 정렬이 필요한 제한적인 섹션
- 키커 앞 Electric Blue 32px 라인은 공통 시그니처

### Inner-page shell

공개 상세 페이지는 `PageShell`을 사용하여 헤더, 푸터, 상담 위젯을 유지합니다.

```tsx
<PageShell settings={settings}>
  <PageHero
    kicker="Business Area"
    title="누수 피해복구"
    description="피해 범위를 확인하고 필요한 공정만 명확하게 제안합니다."
  />
  {/* page content */}
</PageShell>
```

### Buttons and links

- Primary CTA: Navy 또는 Electric 배경 + 반대 명도 텍스트
- Secondary CTA: 투명 배경 + `border-border`
- 최소 클릭 영역: 높이 44px 이상
- CTA 문구는 동사형으로 작성: `상담 시작하기`, `견적 문의`, `자세히 보기`
- 아이콘은 Lucide를 사용하고 일반적으로 `size-4`, `size-5` 유지
- 이모지 또는 직접 그린 SVG 아이콘 금지

Example:

```tsx
<a
  href="#contact"
  className="inline-flex h-12 items-center justify-center gap-2 bg-electric px-5 font-semibold text-electric-foreground transition-colors hover:bg-navy hover:text-navy-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
>
  견적 문의
</a>
```

### Cards

- 카드 전체에 의미 없는 장식 아이콘이나 숫자를 추가하지 않습니다.
- 이미지가 있는 카드는 이미지가 정보 전달 역할을 해야 합니다.
- 호버 효과는 이미지 확대, 화살표 이동, 경계색 변화 중 하나만 선택합니다.
- 그림자는 기본값으로 사용하지 않고 경계선과 배경 대비로 구분합니다.

### Forms

- Label과 input의 `htmlFor`/`id`를 항상 연결합니다.
- 입력 필드는 의미 있는 기본값과 도움말을 제공합니다.
- 저장 작업 중 버튼 비활성화와 진행 문구를 표시합니다.
- 성공/실패 상태를 색상만으로 전달하지 않습니다.

## 6. Image Direction

- 실제 공장, 지붕, 판넬, 외벽, 바닥, 작업 현장의 사진을 우선
- Cool neutral, Navy, Gray 톤의 전문 산업 사진
- 추상 그라디언트 원, glow, blob을 장식용으로 사용하지 않음
- 카드 이미지는 `aspect-[4/3]`, 히어로는 넓은 landscape 비율 권장
- 모든 정보성 이미지에 구체적인 한국어 `alt` 제공
- Before/After는 동일 각도 이미지가 확보된 경우에만 사용

## 7. Motion and Interaction

- 전환 시간은 일반적으로 150–300ms
- 동작은 상태 변화 설명에만 사용
- 권장: 헤더 배경 전환, 카드 이미지 1.03–1.05 확대, 화살표 4px 이동
- 금지: 지속적으로 떠다니는 장식, 과도한 parallax, 다수의 반복 애니메이션
- `prefers-reduced-motion`을 방해하는 필수 애니메이션을 만들지 않음

## 8. Responsive Rules

### Mobile

- 한 화면에서 가장 중요한 CTA 하나를 우선
- 내비게이션은 햄버거 메뉴 사용
- Other Solutions는 상단 배너 대신 모바일 메뉴에서 노출
- 하단 전화/카카오톡 상담 바 유지
- 제목 크기와 줄 수를 제한하고 390px 폭에서 가로 스크롤이 없어야 함

### Desktop

- 최대 콘텐츠 폭 `max-w-7xl`
- Other Solutions 상단 배너 노출
- 우하단 플로팅 상담 메뉴 노출
- 넓은 화면에서도 문장 폭은 `max-w-xl` 또는 `max-w-2xl`로 제한

## 9. Accessibility

- semantic HTML: `header`, `nav`, `main`, `section`, `footer`
- 키보드로 모든 메뉴, 버튼, 팝업을 조작 가능하게 구현
- 포커스 상태를 제거하지 않음
- 본문/배경 WCAG AA 대비 확보
- 장식 이미지는 빈 alt, 정보 이미지는 의미 있는 alt 제공
- 새 창 또는 팝업 동작은 버튼의 `aria-label`에 안내
- 아이콘 단독 버튼에는 반드시 접근 가능한 이름 제공

## 10. Page Architecture

### Home `/`

공장 개보수 정보만 노출합니다.

1. Header + Other Solutions banner
2. Factory renovation hero
3. Scope of work
4. Work process
5. Why NM
6. Contact CTA
7. Projects — 관리자 설정이 켜진 경우에만 노출

### Business `/services`

기타 사업 전체 목록을 독립 페이지로 제공합니다. 각 사업은 `/services/[slug]` 상세 페이지로 연결합니다.

### About `/about`

대표 인사 중심의 간결한 회사소개 페이지입니다.

### Admin `/admin`

공개 페이지와 시각적으로 구분하되 같은 색상 token, 폰트, radius를 사용합니다.

## 11. Implementation Rules

1. 색상은 semantic token만 사용합니다.
2. 새 공개 상세 페이지는 `PageShell`을 사용합니다.
3. 섹션 제목은 `SectionHeading` 또는 `PageHero`를 우선 사용합니다.
4. 관리자에서 편집할 내용은 `lib/content/defaults.ts`에 type과 default를 먼저 정의합니다.
5. 콘텐츠 조회는 `lib/content/get.ts`, 수정은 인증된 Server Action을 사용합니다.
6. 공개 페이지에서 관리자 전용 로직을 client-side로 숨기는 방식은 사용하지 않습니다.
7. 데이터 변경 후 관련 경로를 revalidate합니다.
8. 모바일 390px와 데스크톱 1280px 이상에서 실제 브라우저 검증을 수행합니다.

## 12. Review Checklist

- [ ] 공장 개보수가 첫 화면의 명확한 주제인가?
- [ ] 색상 수와 Electric Blue 사용량이 절제되어 있는가?
- [ ] 제목, 본문, 보조 설명의 계층이 분명한가?
- [ ] semantic token을 사용했는가?
- [ ] 모바일에서 가로 스크롤과 겹침이 없는가?
- [ ] 클릭 영역과 포커스 상태가 충분한가?
- [ ] 이미지 alt와 버튼 접근성 이름이 있는가?
- [ ] 관리자 수정 내용이 공개 페이지에 정상 반영되는가?
- [ ] 불필요한 장식 요소를 하나 이상 제거했는가?
- [ ] 실제 브라우저에서 변경 기능을 확인했는가?
