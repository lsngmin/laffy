import ClientBlobUploader from '../../ClientBlobUploader';

export default function UploadForm({
  hasToken,
  title,
  channel,
  externalSource,
  cardStyle,
  onTitleChange,
  onChannelChange,
  onExternalSourceChange,
  onCardStyleChange,
  onRegisterExternal,
  isRegisteringExternal,
  handleUploadUrl,
  onUploaded,
  onClose,
}) {
  const isKChannel = channel === 'k';
  const isGChannel = channel === 'g';
  const uploadAccept = isKChannel
    ? 'image/jpeg,image/png,image/webp'
    : 'image/jpeg,image/png,image/webp,video/mp4';
  const uploadHeading = isKChannel ? '썸네일 이미지 업로드' : '파일 업로드';
  const uploadHint = isKChannel
    ? '플레이어 카드와 공유 썸네일로 사용할 이미지를 업로드하세요. 동영상은 외부 CDN 주소를 통해 재생됩니다.'
    : '이미지 또는 영상을 업로드하면 즉시 메타 정보가 저장됩니다.';
  const externalLabel = isGChannel ? '자동 생성됨' : '외부 CDN 동영상 URL';
  const externalPlaceholder = isGChannel
    ? '자동으로 스마트링크가 연결됩니다'
    : 'https://cdn.example.com/path/to/video.mp4';
  const externalHint = isGChannel
    ? '고파일 채널은 제목만 입력하면 기존 스마트링크로 자동 연결됩니다.'
    : '실제 재생에 사용될 스트리밍 주소를 입력하세요. 비워두면 업로드된 파일 URL이 사용됩니다.';
  const showUploader = !isGChannel;
  const showCardStyleSelector = channel === 'l';

  return (
    <div className="space-y-6 rounded-3xl bg-[#070b1b]/95 p-6 shadow-[0_0_45px_rgba(59,130,246,0.2)] ring-1 ring-slate-800/70 backdrop-blur">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-slate-300">콘텐츠 업로드</p>
        <h3 className="text-xl font-semibold text-slate-50">간편하게 새 콘텐츠를 등록하세요</h3>
        <p className="text-sm leading-relaxed text-slate-300">
          제목과 채널만 지정하면 파일을 올리는 즉시 메타 정보가 자동으로 저장됩니다.
        </p>
      </div>
      <div className="space-y-4">
        <label className="group flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 transition hover:border-sky-500/40">
          <span className="text-xs font-medium text-slate-300">콘텐츠 제목</span>
          <input
            disabled={!hasToken}
            type="text"
            placeholder="예) 6월 1주차 하이라이트"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-lg border border-slate-800/40 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 group-hover:border-sky-400/40 disabled:opacity-40"
          />
        </label>
        <label className="group flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 transition hover:border-sky-500/40">
          <span className="text-xs font-medium text-slate-300">채널 선택</span>
          <select
            disabled={!hasToken}
            value={channel}
            onChange={(event) => onChannelChange(event.target.value)}
            className="w-full rounded-lg border border-slate-800/40 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 group-hover:border-sky-400/40 disabled:opacity-40"
          >
            <option value="l">L 채널</option>
            <option value="x">X 채널</option>
            <option value="k">K 채널</option>
            <option value="g">Gofile 채널</option>
          </select>
        </label>
        {!isGChannel && (
          <label className="group flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 transition hover:border-sky-500/40">
            <span className="text-xs font-medium text-slate-300">{externalLabel}</span>
            <input
              disabled={!hasToken}
              type="url"
              placeholder={externalPlaceholder}
              value={externalSource}
              onChange={(event) => onExternalSourceChange(event.target.value)}
              className="w-full rounded-lg border border-slate-800/40 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 group-hover:border-sky-400/40 disabled:opacity-40"
            />
            <span className="text-xs text-slate-500">{externalHint}</span>
          </label>
        )}
        {showCardStyleSelector && (
          <div className="grid gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
            <span className="text-xs font-medium text-slate-300">트위터 카드 썸네일 형태</span>
            <div className="flex flex-col gap-2 text-sm text-slate-200">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="twitterCardStyle"
                  value="summary_large_image"
                  checked={cardStyle === 'summary_large_image'}
                  onChange={() => onCardStyleChange?.('summary_large_image')}
                  disabled={!hasToken}
                  className="accent-sky-400"
                />
                <span>가로형 (summary_large_image)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="twitterCardStyle"
                  value="summary"
                  checked={cardStyle === 'summary'}
                  onChange={() => onCardStyleChange?.('summary')}
                  disabled={!hasToken}
                  className="accent-sky-400"
                />
                <span>정사각형 (summary)</span>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              새 콘텐츠는 기본적으로 가로형으로 공유됩니다. 필요하다면 정사각형 카드를 선택하세요.
            </p>
          </div>
        )}
      </div>
      {showUploader && (
        <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-cyan-950/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/80">{uploadHeading}</p>
            <span className="text-[11px] text-slate-300">
              {isKChannel ? 'JPG / PNG / WEBP · 최대 200MB' : 'JPG / PNG / WEBP / MP4 · 최대 200MB'}
            </span>
          </div>
          <p className="text-xs text-slate-400">{uploadHint}</p>
          {hasToken ? (
            <ClientBlobUploader
              handleUploadUrl={handleUploadUrl}
              accept={uploadAccept}
              maxSizeMB={200}
              onUploaded={onUploaded}
            />
          ) : (
            <div className="rounded-xl border border-slate-800/70 bg-black/40 px-4 py-3 text-sm text-slate-300">
              관리자 토큰이 있어야 업로드할 수 있어요.
            </div>
          )}
        </div>
      )}
      {isKChannel && (
        <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-900/50 p-5 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">외부 CDN 동영상 등록 안내</p>
          <p className="text-sm leading-relaxed text-slate-400">
            K 채널은 외부 동영상 주소와 함께 썸네일 이미지를 업로드해야 플레이어 카드가 올바르게 표시됩니다. 우선 썸네일을 업로드한 뒤 외부 CDN으로 등록 버튼을 눌러 주세요.
          </p>
        </div>
      )}
      {isGChannel && (
        <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-900/50 p-5 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Gofile 링크 등록 안내</p>
          <p className="text-sm leading-relaxed text-slate-400">
            Gofile 채널은 다운로드 URL만 등록하면 <span className="font-semibold text-slate-200">https://gofile.io/d/…</span> 경로로 연결되는 고유한 리다이렉트 주소가 자동으로 생성됩니다.
          </p>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        {typeof onClose === 'function' && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            닫기
          </button>
        )}
        {typeof onRegisterExternal === 'function' && (isKChannel || isGChannel) && (
          <button
            type="button"
            onClick={onRegisterExternal}
            disabled={
              !hasToken
              || isRegisteringExternal
              || (isKChannel && !externalSource?.trim())
            }
            className="rounded-xl border border-sky-500/60 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRegisteringExternal
              ? '등록 중…'
              : isKChannel
                ? '외부 CDN으로 등록'
                : '고파일 링크 등록'}
          </button>
        )}
      </div>
    </div>
  );
}
