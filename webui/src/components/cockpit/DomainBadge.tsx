import { cn } from '@/lib/utils';
import type { CockpitConfig } from '@/types/cockpit';
import { DOMAIN_FALLBACK_COLOR } from './helpers';

export function DomainBadge({
  domain,
  config,
  onClick,
}: {
  domain: string;
  config: CockpitConfig;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const def = config.domain[domain];
  const bg = def?.color ?? DOMAIN_FALLBACK_COLOR;
  const color = def?.text_color ?? '#ffffff';
  return (
    <span
      onClick={onClick}
      style={{ backgroundColor: bg, color }}
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
        onClick && 'cursor-pointer hover:opacity-75',
      )}
    >
      {def?.label ?? domain}
    </span>
  );
}
