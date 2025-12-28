import { NavLink } from 'react-router-dom';
import { Layers, Star, DoorOpen, Smartphone, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function TabBar() {
  const { t } = useTranslation();

  const tabs = [
    { to: '/', icon: Layers, label: t('tabs.floorPlan') },
    { to: '/favorites', icon: Star, label: t('tabs.favorites') },
    { to: '/rooms', icon: DoorOpen, label: t('tabs.rooms') },
    { to: '/devices', icon: Smartphone, label: t('tabs.devices') },
    { to: '/settings', icon: Settings, label: t('tabs.settings') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="mx-auto max-w-lg">
        <div className="mx-3 mb-3 flex items-center justify-around rounded-2xl bg-card/80 p-2 shadow-soft-lg backdrop-blur-xl">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-200 ease-out-expo',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-6 w-6" strokeWidth={1.5} />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
