export default function GlobalLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 md:px-8 lg:px-12">
      <div className="h-10 w-64 animate-pulse rounded-md bg-slate-200" />
      <div className="mt-4 h-4 w-96 animate-pulse rounded bg-slate-200" />

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} className="rounded-xl border border-border bg-white p-4">
            <div className="h-40 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-4 h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-6 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200" />
          </article>
        ))}
      </section>
    </main>
  );
}
