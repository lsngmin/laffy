const SORT_OPTIONS = [
  { value: 'recent', label: '최신순' },
  { value: 'title', label: '제목순' },
  { value: 'duration', label: '재생시간' },
];

export default function UploadFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  orientationFilter,
  onOrientationFilterChange,
  channelFilter,
  onChannelFilterChange,
  sortOption,
  onSortOptionChange,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-1">
          <span className="text-xs text-slate-500">검색</span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="제목·슬러그"
            className="w-32 bg-transparent text-sm text-slate-200 outline-none sm:w-48"
          />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-1 text-xs">
          <span className="text-slate-500">타입</span>
          <select
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value)}
            className="bg-transparent text-slate-200 outline-none"
          >
            <option value="">전체</option>
            <option value="video">영상</option>
            <option value="image">이미지</option>
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-1 text-xs">
          <span className="text-slate-500">채널</span>
          <select
            value={channelFilter}
            onChange={(event) => onChannelFilterChange(event.target.value)}
            className="bg-transparent text-slate-200 outline-none"
          >
            <option value="">전체</option>
            <option value="x">x</option>
            <option value="l">l</option>
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-1 text-xs">
          <span className="text-slate-500">방향</span>
          <select
            value={orientationFilter}
            onChange={(event) => onOrientationFilterChange(event.target.value)}
            className="bg-transparent text-slate-200 outline-none"
          >
            <option value="">전체</option>
            <option value="landscape">가로</option>
            <option value="portrait">세로</option>
            <option value="square">정사각형</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start rounded-full bg-slate-950/40 px-3 py-1 text-xs sm:self-auto">
        <span className="text-slate-500">정렬</span>
        <select
          value={sortOption}
          onChange={(event) => onSortOptionChange(event.target.value)}
          className="bg-transparent text-slate-200 outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
