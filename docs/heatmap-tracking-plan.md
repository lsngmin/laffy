# 콘텐츠 상세 페이지 히트맵 도입 계획

## 현황 요약
- 런타임 의존성: Next.js, Vercel Analytics, Upstash Redis 등.
- `_app` 단계에서 `<Analytics>`를 로드하여 전역 방문 데이터를 수집.
- 각 슬러그 상세 페이지는 `usePageviewTracker`와 `trackOnce`를 통해 방문, 체류, 스크롤, 클릭 등의 이벤트를 `vaTrack`으로 Vercel Analytics에 전달.
- 좌표 기반 시각화 데이터는 아직 수집하지 않으며, 서버의 `metricsStore`는 조회/좋아요 합계와 일자별 이력만 관리.
- 상세 뷰는 `ContentDetailPage`와 그 내부의 `VideoCard` 컴포넌트가 CTA, 오버레이, 내비게이션 등을 묶어 렌더링.

## 설계 제안

### 1. 클라이언트 이벤트 수집
- `ContentDetailPage` 상단 래퍼에 신규 훅 `useHeatmapTracker`를 도입하고 `pointermove`, `pointerdown`, `scroll` 이벤트를 `requestAnimationFrame` 또는 `setTimeout`으로 샘플링.
- 각 이벤트는 뷰포트 대비 정규화한 좌표(`xRatio`, `yRatio`), 이벤트 타입, 가시 섹션 ID(`video`, `cta`, `nav` 등)를 포함.
- `VideoCard` 내 기존 `vaTrack` 호출과 연동하여 동일 이벤트를 재사용하거나, `onEngagement` 콜백을 감싸 히트맵 버퍼를 갱신.
- 1초 단위로 좌표를 12×8 격자 셀로 내린 뒤 카운트를 누적해 네트워크 부하를 최소화.

### 2. 이벤트 전송 및 저장소
- 5~10개 샘플이 쌓이거나 탭 종료 직전에 `navigator.sendBeacon`(fallback: `fetch`)으로 `/api/heatmap/record`에 전송.
- 페이로드: `slug`, `viewportBucket`(해상도 범주), `cells`(셀 인덱스와 카운트), `sessionId`(viewer 쿠키 기반) 등 최소 정보만 포함.
- 서버에 `heatmapStore`를 신설해 Upstash Redis의 `HINCRBY heatmap:{slug} {bucket}:{cell} count` 형태로 누적. 환경변수 부재 시에는 메모리/Blob 백엔드를 재사용.
- API 핸들러는 `pages/api/metrics/view` 패턴을 참고하여 POST만 허용하고, `ensureViewerId`로 익명 세션 쿠키를 보장.

### 3. 분석/시각화
- 관리자 페이지 Analytics 탭에 `HeatmapPanel` 컴포넌트를 추가하여 선택된 슬러그의 히트맵 버킷 데이터를 조회.
- `<canvas>` 또는 경량 라이브러리(`heatmap.js` 등)를 사용해 시각화하고, 기존 `AnalyticsOverview` 레이아웃을 재활용.
- 기간·디바이스 필터를 위해 버킷 키에 날짜 프리픽스를 두거나 API에서 시간 구간별 롤업을 반환.
- 조회·좋아요와 동일하게 CSV 내보내기 옵션을 제공.

### 4. 운영 고려 사항
- 셀 단위 누적, 최소 체류 시간(2초 이상), 동일 좌표 반복 샘플 드롭 등으로 트래픽을 제어.
- viewer 쿠키만 저장하여 개인정보 리스크를 완화하되, 민감 영역(스폰서 배너 등) 데이터 수집 여부는 정책 검토.
- Vercel Analytics에 `track('x_heatmap_cell', …)`을 병행 전송해 파이프라인 이중화를 확보하되, 이벤트 볼륨 제한을 고려해 샘플만 전송.

## 후속 작업
1. `useHeatmapTracker` 훅과 버퍼링 로직 구현.
2. `/api/heatmap/record` API와 `heatmapStore` 백엔드 구현.
3. 관리자 Analytics 탭에 히트맵 시각화 UI 추가.
4. 데이터 보존 정책과 추적 허용 범위를 문서화.
