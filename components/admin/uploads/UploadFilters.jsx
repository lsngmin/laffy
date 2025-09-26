const SORT_LABELS = {
  recent: '최근 등록 순',
  title: '제목 A-Z',
  views: '조회수 순',
};

export default function UploadFilters({
  search,
  sort,
  type,
  availableTypes,
  onSearchChange,
  onSortChange,
  onTypeChange,
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <label className="flex flex-col text-xs uppercase tracking-widest text-slate-400">
        검색
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="제목 또는 슬러그 검색"
          className="mt-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </label>
      <label className="flex flex-col text-xs uppercase tracking-widest text-slate-400">
        타입 필터
        <select
          value={type}
          onChange={(event) => onTypeChange(event.target.value)}
          className="mt-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">전체</option>
          {availableTypes.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs uppercase tracking-widest text-slate-400">
        정렬
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          className="mt-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export const uploadSortLabels = SORT_LABELS;
