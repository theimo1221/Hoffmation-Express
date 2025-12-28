import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Layers, Star, DoorOpen, Smartphone, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function MenuBubble() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { to: '/', icon: Layers, label: t('tabs.floorPlan') },
    { to: '/favorites', icon: Star, label: t('tabs.favorites') },
    { to: '/rooms', icon: DoorOpen, label: t('tabs.rooms') },
    { to: '/devices', icon: Smartphone, label: t('tabs.devices') },
    { to: '/settings', icon: Settings, label: t('tabs.settings') },
  ];

  return (
    <div className="fixed top-4 left-4 z-50 safe-top">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-card/90 shadow-soft-lg backdrop-blur-xl transition-all hover:bg-accent active:scale-95"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-14 left-0 min-w-[180px] rounded-2xl bg-card/95 p-2 shadow-soft-lg backdrop-blur-xl">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
