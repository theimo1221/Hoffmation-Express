import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDataStore } from '@/stores';
import { getFloorStats } from '@/stores/roomStore';
import { Lightbulb, Wind, Blinds, LockOpen, PersonStanding } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { HouseCrossSectionProps } from './types';

export function HouseCrossSection({ floors, onSelectFloor }: HouseCrossSectionProps) {
  const { t } = useTranslation();
  const { fetchData, isLoading, devices } = useDataStore();
  const sortedFloors = [...floors].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('tabs.floorPlan')}
        onRefresh={fetchData}
        isLoading={isLoading}
      />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-3xl bg-card shadow-soft-lg">
            {sortedFloors.map((floor, index) => {
              const stats = getFloorStats(floor.rooms, devices);
              
              return (
                <button
                  key={floor.level}
                  onClick={() => onSelectFloor(floor)}
                  className={cn(
                    'flex w-full items-center justify-between px-6 py-5 transition-all duration-200 ease-out-expo',
                    'hover:bg-accent active:scale-[0.98]',
                    index !== sortedFloors.length - 1 && 'border-b border-border'
                  )}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: floor.color || 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {floor.icon && (() => {
                      const IconComponent = (LucideIcons as any)[floor.icon];
                      return IconComponent ? (
                        <IconComponent 
                          size={24} 
                          style={{ color: floor.color }} 
                        />
                      ) : null;
                    })()}
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-lg font-semibold">{floor.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {floor.rooms.length} {floor.rooms.length === 1 ? 'Raum' : 'Räume'}
                      </span>
                      
                      {/* Floor Statistics */}
                      <div className="flex items-center gap-3 text-xs mt-1">
                        {stats.lampsOn > 0 && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Lightbulb className="h-3 w-3" />
                            <span>{stats.lampsOn}</span>
                          </div>
                        )}
                        {stats.acCooling > 0 && (
                          <div className="flex items-center gap-1 text-blue-500">
                            <Wind className="h-3 w-3" />
                            <span>{stats.acCooling}</span>
                          </div>
                        )}
                        {stats.acHeating > 0 && (
                          <div className="flex items-center gap-1 text-red-500">
                            <Wind className="h-3 w-3" />
                            <span>{stats.acHeating}</span>
                          </div>
                        )}
                        {stats.shuttersOpen > 0 && (
                          <div className="flex items-center gap-1 text-orange-500">
                            <Blinds className="h-3 w-3" />
                            <span>{stats.shuttersOpen}</span>
                          </div>
                        )}
                        {stats.windowsOpen > 0 && (
                          <div className="flex items-center gap-1 text-orange-500">
                            <LockOpen className="h-3 w-3" />
                            <span>{stats.windowsOpen}</span>
                          </div>
                        )}
                        {stats.motionActive > 0 && (
                          <div className="flex items-center gap-1 text-orange-500">
                            <PersonStanding className="h-3 w-3" />
                            <span>{stats.motionActive}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-2xl">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
