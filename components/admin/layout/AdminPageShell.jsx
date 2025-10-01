import Head from 'next/head';

export default function AdminPageShell({ children }) {
  return (
    <>
      <Head>
        <title>Admin · Laffy</title>
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.18),_transparent_60%)]" />
        <main className="relative z-10 mx-auto w-full max-w-5xl space-y-6 animate-fade-slide">
          {children}
        </main>
      </div>
    </>
  );
}
