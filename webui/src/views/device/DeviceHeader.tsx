import { Star, ArrowLeft } from 'lucide-react';
import { MenuButton } from '@/components/layout/MenuBubble';

interface DeviceHeaderProps {
  name: string;
  room: string;
  isFavorite: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
}

export function DeviceHeader({
  name,
  room,
  isFavorite,
  onBack,
  onToggleFavorite,
}: DeviceHeaderProps) {
  return (
    <header className="bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-40">
      <div className="mx-auto max-w-6xl flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <MenuButton />
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{name}</h1>
            <p className="text-sm text-muted-foreground">{room}</p>
          </div>
        </div>
        <button
          onClick={onToggleFavorite}
          className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-soft transition-all active:scale-95 ${
            isFavorite ? 'bg-yellow-500 text-white' : 'bg-card hover:bg-accent'
          }`}
        >
          <Star className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    </header>
  );
}
