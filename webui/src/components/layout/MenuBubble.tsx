import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Layers, Star, DoorOpen, Smartphone, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface MenuButtonProps {
  variant?: 'floating' | 'inline';
  className?: string;
}

export function MenuButton({ variant = 'inline', className }: MenuButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { to: '/', icon: Layers, label: t('tabs.floorPlan') },
    { to: '/favorites', icon: Star, label: t('tabs.favorites') },
    { to: '/rooms', icon: DoorOpen, label: t('tabs.rooms') },
    { to: '/devices', icon: Smartphone, label: t('tabs.devices') },
    { to: '/settings', icon: Settings, label: t('tabs.settings') },
  ];

  const buttonClass = variant === 'floating'
    ? 'flex h-12 w-12 items-center justify-center rounded-full bg-card/90 shadow-soft-lg backdrop-blur-xl transition-all hover:bg-accent active:scale-95'
    : 'flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95';

  const iconClass = variant === 'floating' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
      >
        {isOpen ? <X className={iconClass} /> : <Menu className={iconClass} />}
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          {/* Menu Dropdown */}
          <div className={cn(
            "absolute min-w-[180px] rounded-2xl bg-card/95 p-2 shadow-soft-lg backdrop-blur-xl z-50",
            variant === 'floating' ? 'bottom-14 left-0' : 'top-12 left-0'
          )}>
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
        </>
      )}
    </div>
  );
}

export function MenuBubble() {
  return (
    <div className="fixed bottom-4 left-4 z-50 safe-bottom">
      <MenuButton variant="floating" />
    </div>
  );
}
