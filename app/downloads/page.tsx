export default function DownloadsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <h1 className="text-3xl font-semibold">Downloads</h1>
      <p className="mt-3 text-sm text-muted sm:text-base">
        Completed purchases appear here. Files are served from private S3 via a
        short-lived signed URL and are never made public.
      </p>
    </main>
  );
}
