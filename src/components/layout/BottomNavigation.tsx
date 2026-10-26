import { BarChart3, Clock3, MapPinned, Vote } from 'lucide-react';

export type ViewId = 'overview' | 'turnout' | 'flips' | 'post17h';

const ITEMS: { id: ViewId; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Visão geral', icon: BarChart3 },
  { id: 'turnout', label: 'Abstenções', icon: Vote },
  { id: 'flips', label: 'Viradas', icon: MapPinned },
  { id: 'post17h', label: 'Pós-17h', icon: Clock3 },
];

interface BottomNavigationProps {
  activeView: ViewId;
  onChange: (view: ViewId) => void;
}

export function BottomNavigation({ activeView, onChange }: BottomNavigationProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-4">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = id === activeView;
          return (
            <li key={id}>
              <button
                type="button"
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                onClick={() => onChange(id)}
                className={`flex min-h-12 w-full flex-col items-center justify-center gap-1 px-1 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-post17h ${
                  active ? 'font-semibold text-[#6B46C1]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon aria-hidden="true" size={20} />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
