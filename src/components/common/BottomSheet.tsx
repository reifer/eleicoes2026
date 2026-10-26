import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface SheetOption {
  value: string;
  label: string;
  detail?: string;
}

interface BottomSheetProps {
  open: boolean;
  title: string;
  description?: string;
  options: SheetOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function BottomSheet({
  open,
  title,
  description,
  options,
  selectedValue,
  onSelect,
  onClose,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-slate-950/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        className="sheet-enter max-h-[min(80vh,38rem)] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl"
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 pb-4 pt-5">
            <div>
              <h2 id="bottom-sheet-title" className="text-lg font-bold text-slate-900">{title}</h2>
              {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar seleção"
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-post17h"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto p-3">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  aria-pressed={option.value === selectedValue}
                  onClick={() => onSelect(option.value)}
                  className={`flex min-h-12 w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-post17h ${
                    option.value === selectedValue ? 'bg-purple-50 text-post17h' : 'text-slate-800'
                  }`}
                >
                  <span>
                    <span className="block font-semibold">{option.label}</span>
                    {option.detail && <span className="mt-0.5 block text-xs text-slate-500">{option.detail}</span>}
                  </span>
                  {option.value === selectedValue && (
                    <span className="text-sm font-semibold" aria-hidden="true">Selecionado</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
