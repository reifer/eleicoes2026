interface DataErrorProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function DataError({ title, message, actionLabel, onAction }: DataErrorProps) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950"
    >
      <h2 className="font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-red-900 px-4 font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"
        >
          {actionLabel}
        </button>
      )}
    </section>
  );
}
