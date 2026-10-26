interface LoadingStatusProps {
  label: string;
}

export function LoadingStatus({ label }: LoadingStatusProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="flex min-h-36 items-center justify-center gap-3 rounded-2xl bg-white p-6 text-slate-700 shadow-sm ring-1 ring-slate-200"
    >
      <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-post17h" aria-hidden="true" />
      <span className="font-medium">{label}</span>
    </section>
  );
}
