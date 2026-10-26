import { useEffect, useState } from 'react';

export function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const showOfflineNotice = () => setIsOffline(true);
    const hideOfflineNotice = () => setIsOffline(false);
    window.addEventListener('offline', showOfflineNotice);
    window.addEventListener('online', hideOfflineNotice);
    return () => {
      window.removeEventListener('offline', showOfflineNotice);
      window.removeEventListener('online', hideOfflineNotice);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-950"
    >
      Você está offline. Dados armazenados podem estar desatualizados; estados sem cache não poderão ser carregados.
    </p>
  );
}
