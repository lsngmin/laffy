export default function AdminPageShell({ header, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <main className="mx-auto w-full max-w-5xl space-y-6">
        {header}
        {children}
      </main>
    </div>
  );
}
