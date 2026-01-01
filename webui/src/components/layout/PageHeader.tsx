import { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowLeft, Menu, RefreshCw, X, Layers, Star, DoorOpen, Smartphone, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  backIcon?: ReactNode;
  rightContent?: ReactNode;
  children?: ReactNode;
  className?: string;
  showMenu?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  onRefresh,
  isLoading,
  backIcon,
  rightContent,
  children,
  className,
  showMenu = true,
}: PageHeaderProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { to: '/', icon: Layers, label: t('tabs.floorPlan') },
    { to: '/favorites', icon: Star, label: t('tabs.favorites') },
    { to: '/rooms', icon: DoorOpen, label: t('tabs.rooms') },
    { to: '/devices', icon: Smartphone, label: t('tabs.devices') },
    { to: '/settings', icon: Settings, label: t('tabs.settings') },
  ];

  return (
    <header
      className={cn(
        'px-4 bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50',
        className
      )}
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Menu Button or Back Button */}
          {onBack ? (
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
              aria-label="Back"
            >
              {backIcon ?? <ArrowLeft className="h-5 w-5" />}
            </button>
          ) : showMenu ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95"
                aria-label="Menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              {menuOpen && (
                <div className="absolute top-12 left-0 min-w-[180px] rounded-2xl bg-card/95 p-2 shadow-soft-lg backdrop-blur-xl z-50">
                  {tabs.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMenuOpen(false)}
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
          ) : null}
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightContent}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-soft transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
            </button>
          )}
        </div>
        </div>
      </div>
      {children && <div className="mx-auto max-w-3xl mt-3">{children}</div>}
    </header>
  );
}
