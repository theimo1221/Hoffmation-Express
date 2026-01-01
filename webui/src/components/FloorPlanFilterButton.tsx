import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface FloorPlanFilterButtonProps {
  icon: keyof typeof LucideIcons;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FloorPlanFilterButton({ icon, label, active, onClick }: FloorPlanFilterButtonProps) {
  const IconComponent = LucideIcons[icon] as React.ComponentType<{ size?: number; className?: string }>;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95',
        active 
          ? 'bg-primary text-primary-foreground shadow-soft' 
          : 'bg-secondary text-muted-foreground hover:bg-accent'
      )}
      title={label}
    >
      {IconComponent && <IconComponent size={20} />}
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}
