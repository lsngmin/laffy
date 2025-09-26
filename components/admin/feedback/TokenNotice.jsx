export default function TokenNotice() {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
      <p className="font-semibold">토큰이 필요합니다</p>
      <p className="mt-1">
        URL 끝에 <code className="rounded bg-black/30 px-1">?token=YOUR_ADMIN_TOKEN</code> 을 붙여 접근해 주세요.
      </p>
    </div>
  );
}
