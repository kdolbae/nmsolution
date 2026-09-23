# 광고 추적 설정

광고를 켜기 전에 이 문서대로 한 번만 해 두면, 그 뒤로는 **어느 키워드가 문의를 가져왔는지**가
관리자 화면에 그대로 남습니다. 미리 해 두지 않으면 나중에 소급해서 알아낼 방법이 없습니다.

## 1. DB 열 추가 (필수)

```bash
psql "$DATABASE_URL" -f sql/005_quote_attribution.sql
```

공유 DB를 쓰는 경우 `SET search_path TO nmsolution;` 을 먼저 실행합니다. 자세한 내용은
[sql/README.md](sql/README.md).

이것만 해도 `utm_source` 가 붙은 주소로 들어온 방문은 견적 문의와 함께 기록됩니다.
매체 스크립트(아래)가 없어도 동작합니다.

## 2. 환경변수 (선택 — 있으면 켜지고 없으면 꺼집니다)

Vercel → 프로젝트 → Settings → Environment Variables 에 넣습니다.
**값이 비어 있으면 해당 스크립트가 아예 나가지 않습니다.** 아직 만들지 않았어도 배포에 지장이 없습니다.

| 변수 | 어디서 얻나 | 없으면 |
| --- | --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | 메타 비즈니스 관리자 → 이벤트 관리자 → 데이터 소스 → 픽셀 만들기 | 메타 리타게팅·전환 최적화 불가 |
| `NEXT_PUBLIC_NAVER_WCS_ID` | 네이버 검색광고 → 도구 → 프리미엄 로그분석 (`wcs_add["wa"]` 값) | 네이버 광고 전환 집계 불가 |
| `NEXT_PUBLIC_NAVER_CONV_TYPE_QUOTE` | 프리미엄 로그분석의 전환 유형 코드 | 기본값 `2` 로 나감 |
| `NEXT_PUBLIC_NAVER_CONV_TYPE_CONTACT` | 위와 같음 | 기본값 `3` 으로 나감 |
| `ADS_BOARD_TOKEN` | GitHub → Settings → Developer settings → 토큰. `kdolbae/nanomaster-ads` 에 **Actions: read and write** | 관리자 광고 탭의 [지금 업데이트] 단추만 안 됨 (아침 자동 수집은 그대로) |
| `ADS_DASHBOARD_URL` | 상황판 주소를 옮겼을 때만 | 기본값 `https://kdolbae.github.io/nanomaster-ads-site/nmsolution/` |

> 네이버 전환 유형 코드는 광고주 계정마다 다를 수 있습니다. 첫 전환이 잡힌 뒤 네이버 보고서의
> 전환 유형 이름이 기대와 다르면 이 두 변수를 고칩니다.

`ADS_BOARD_TOKEN` 은 **`NEXT_PUBLIC_` 이 아닙니다** — 브라우저로 나가면 안 되고 서버에서만 씁니다.

메타 픽셀은 **엔엠솔루션 전용으로 새로 만들어야 합니다.** 기존 픽셀은 나노마스터 사이트 것이라
같이 쓰면 두 회사 방문자가 섞입니다.

## 3. 광고 주소에 UTM 붙이기

광고 소재의 연결 URL에 아래처럼 붙입니다. `utm_term` 이 키워드입니다.

```
https://www.nm-solution.co.kr/services/recovery?utm_source=naver&utm_medium=cpc&utm_campaign=누수복구&utm_content=NM-01
```

네이버 검색광고는 연결 URL이 **소재 단위**라 키워드를 주소에 직접 못 박습니다. 대신
검색광고 → 도구 → **자동 추적(Auto Tracking)** 을 켜면 클릭마다 `n_keyword`(키워드) ·
`n_query`(실제 검색어) · `n_ad_group` 이 주소에 붙고, 이 값들을 키워드 자리에 그대로
받습니다. **네이버 광고는 자동 추적을 반드시 켜세요** — 안 켜면 그룹까지만 알고
어느 키워드였는지는 모릅니다.

`utm` 없이 `n_media` 만 붙어 들어와도 네이버 유료 클릭으로 기록됩니다.

| 값 | 넣는 것 |
| --- | --- |
| `utm_source` | `naver` · `meta` · `google` |
| `utm_medium` | 유료 광고는 `cpc` |
| `utm_campaign` | 캠페인 이름 |
| `utm_term` | 검색광고 키워드 |
| `utm_content` | 광고그룹 또는 소재 구분 |

## 무엇이 기록되나

- **유입 기억은 90일**입니다. 광고로 들어왔다가 며칠 뒤 주소를 직접 쳐서 들어와 문의해도
  그 광고의 성과로 남습니다 (`lib/attribution.ts`).
- `utm_source` 가 붙은 새 방문이 오면 **덮어씁니다.** 실제로 돈을 낸 마지막 클릭을 성과로 봅니다.
- `utm` 이 없으면 리퍼러로 출처를 추정합니다. 그것도 없으면 `direct`.
- 전화 클릭 · 카카오톡 상담 · 견적 접수가 매체에 전환으로 전달됩니다 (`lib/tracking.ts`).
  견적 폼을 **여는** 것은 아직 문의가 아니므로 전환으로 보내지 않습니다.
- 관리자 → 견적 문의 목록에 `유입` 줄이 표시됩니다. 추적을 깔기 전에 들어온 문의는 비어 있습니다.

---

## 관리자 광고 탭 (`/admin/ads`)

로그인 후 왼쪽 메뉴의 **광고**입니다. 세 덩어리로 되어 있습니다.

1. **문의를 가져온 키워드** — 최근 30일 견적 문의를 유입 출처로 묶은 표입니다. 이 사이트의
   `quote_requests` 를 그대로 읽으므로 위 1번(열 추가)이 끝나 있어야 채워집니다. 열이 아직
   없으면 표만 비고 화면은 정상으로 뜹니다.
2. **광고 상황판** — 광고비·노출·클릭·순위. 이 사이트가 만드는 것이 아니라
   `kdolbae/nanomaster-ads` 워크플로가 네이버 API 에서 받아 구운 정적 페이지를 끼운 것입니다.
   매일 06:35 에 전날치가 들어옵니다. **[지금 업데이트]** 는 그 워크플로를 바로 부릅니다
   (1~2분 소요, `ADS_BOARD_TOKEN` 필요).
3. **접속 정보** — 상황판·네이버 검색광고·도구 주소. **아이디·비밀번호와 API 키는 여기 적지 않습니다.**

나노마스터와 엔엠솔루션은 광고계정이 아예 달라 상황판 주소도 갈립니다(도구에서 `--brand nmsolution`).
