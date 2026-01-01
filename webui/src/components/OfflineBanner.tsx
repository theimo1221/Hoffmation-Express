import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500/90 backdrop-blur-sm text-white px-4 py-3 shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <WifiOff className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Keine Verbindung</p>
          <p className="text-sm text-white/90">Zeigt letzte bekannte Daten (max. 30 Sekunden alt)</p>
        </div>
      </div>
    </div>
  );
}
