import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface FloorPlanFilterButtonProps {
  icon: keyof typeof LucideIcons;
  label: string;
  active: boolean;
  activeColor: string;
  onClick: () => void;
}

export function FloorPlanFilterButton({ icon, label, active, activeColor, onClick }: FloorPlanFilterButtonProps) {
  const IconComponent = LucideIcons[icon] as React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg transition-all active:scale-95',
        active ? 'bg-background/50' : 'opacity-40 hover:opacity-60'
      )}
      title={label}
      aria-label={label}
    >
      {IconComponent && (
        <IconComponent 
          size={20} 
          style={{ color: active ? activeColor : '#9CA3AF' }}
        />
      )}
    </button>
  );
}
