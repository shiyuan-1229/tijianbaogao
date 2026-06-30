export default function WorkspaceLoading() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f7f9fb] px-4 py-6 sm:px-6 lg:px-8">
      <section
        role="status"
        aria-label="正在打开页面"
        aria-live="polite"
        className="mx-auto w-full max-w-6xl rounded-md border border-[#e4e9ef] bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#edf1f5] pb-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#151922]">正在打开页面</p>
            <p className="mt-1 text-sm text-[#5f6b7a]">正在准备数据和页面内容。</p>
          </div>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#e6f7f7]">
            <div className="h-full w-1/2 rounded-full bg-[#0b9a9a] motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
        <div className="mt-5 space-y-3" aria-hidden="true">
          <div className="h-4 w-2/5 rounded bg-[#e7edf3] motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-20 rounded bg-[#f0f4f7] motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-24 rounded bg-[#f0f4f7] motion-safe:animate-pulse motion-reduce:animate-none" />
            <div className="h-24 rounded bg-[#f0f4f7] motion-safe:animate-pulse motion-reduce:animate-none" />
            <div className="h-24 rounded bg-[#f0f4f7] motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
      </section>
    </main>
  );
}