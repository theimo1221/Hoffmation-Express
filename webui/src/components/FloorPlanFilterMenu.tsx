import { useState } from 'react';
import { Filter, Lightbulb, Shield, Thermometer, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FloorPlanFilters } from '@/stores/settingsStore';

interface FloorPlanFilterMenuProps {
  filters: FloorPlanFilters;
  onToggle: (key: keyof FloorPlanFilters) => void;
}

export function FloorPlanFilterMenu({ filters, onToggle }: FloorPlanFilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filterConfig = [
    { key: 'switchable' as const, icon: Lightbulb, label: 'Schaltbar', color: '#F59E0B' },
    { key: 'security' as const, icon: Shield, label: 'Sicherheit', color: '#8B4513' },
    { key: 'climate' as const, icon: Thermometer, label: 'Klima', color: '#3B82F6' },
    { key: 'other' as const, icon: MoreHorizontal, label: 'Sonstiges', color: '#6B7280' },
  ];

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="relative">
      {/* Mobile: Single filter button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg transition-all active:scale-95 bg-background/50 relative"
        title="Filter"
        aria-label="Filter"
      >
        <Filter size={20} className="text-primary" />
        {activeCount < 4 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Desktop: Individual filter buttons */}
      <div className="hidden md:flex items-center gap-1">
        {filterConfig.map(({ key, icon: Icon, label, color }) => (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={cn(
              'p-2 rounded-lg transition-all active:scale-95',
              filters[key] ? 'bg-background/50' : 'opacity-40 hover:opacity-60'
            )}
            title={label}
            aria-label={label}
          >
            <Icon 
              size={20} 
              style={{ color: filters[key] ? color : '#9CA3AF' }}
            />
          </button>
        ))}
      </div>

      {/* Mobile: Filter popup */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Popup */}
          <div className="absolute right-0 top-12 z-50 w-48 rounded-lg bg-card shadow-lg border border-border p-2 md:hidden">
            {filterConfig.map(({ key, icon: Icon, label, color }) => (
              <button
                key={key}
                onClick={() => {
                  onToggle(key);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all active:scale-95',
                  filters[key] ? 'bg-background/50' : 'opacity-60 hover:opacity-80'
                )}
              >
                <Icon 
                  size={20} 
                  style={{ color: filters[key] ? color : '#9CA3AF' }}
                />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
