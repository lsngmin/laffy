export default function AnalyticsEmptyState({ colSpan = 7 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-slate-400">
        분석할 콘텐츠가 없습니다.
      </td>
    </tr>
  );
}
