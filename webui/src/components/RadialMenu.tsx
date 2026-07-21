import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { RadialMenuItem, DeviceStatus } from './radialMenuUtils';
export type { RadialMenuItem, DeviceStatus } from './radialMenuUtils';

interface RadialMenuProps {
  items: RadialMenuItem[];
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  centerIcon?: React.ReactNode;
  deviceStatus?: DeviceStatus;
  deviceName?: string;
}

export function RadialMenu({ items, isOpen, onClose, position, centerIcon, deviceName }: RadialMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after mount
      requestAnimationFrame(() => setAnimateIn(true));
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const radius = 150; // Distance from center to items (GTA-style, increased to reduce overlap)
  
  // Helper to convert clock position (hours) to radians
  // 12 o'clock = -π/2 (top), then clockwise
  const clockToRadians = (hours: number) => {
    return (hours / 12) * 2 * Math.PI - Math.PI / 2;
  };

  // On mobile devices (width < 768px), center the menu on screen
  // On desktop, clamp position to keep menu within screen bounds
  const isMobile = window.innerWidth < 768;
  const menuSize = radius * 2 + 120; // Approximate menu size (larger for labels)
  const padding = 20;
  
  let clampedX: number;
  let clampedY: number;
  
  if (isMobile) {
    // Center on screen for mobile
    clampedX = window.innerWidth / 2;
    clampedY = window.innerHeight / 2;
  } else {
    // Clamp to screen bounds for desktop
    clampedX = Math.max(menuSize / 2 + padding, Math.min(window.innerWidth - menuSize / 2 - padding, position.x));
    clampedY = Math.max(menuSize / 2 + padding, Math.min(window.innerHeight - menuSize / 2 - padding, position.y));
  }

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'auto' }}>
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200",
          animateIn ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Menu Container */}
      <div
        ref={menuRef}
        className="absolute"
        style={{
          left: clampedX,
          top: clampedY,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Outer circle with hover sectors */}
        <svg
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          width={radius * 2 + 200}
          height={radius * 2 + 200}
          style={{
            opacity: animateIn ? 1 : 0,
            transition: 'opacity 200ms',
          }}
        >
          {/* Base circle */}
          <circle
            cx={(radius * 2 + 200) / 2}
            cy={(radius * 2 + 200) / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border/30"
          />
          
          {/* Hover highlight sectors */}
          {items.map((item, index) => {
            // Only show hover for clickable items
            if (hoveredIndex !== index || item.isInfo || !item.onClick) return null;
            
            const angle = item.clockPosition !== undefined 
              ? clockToRadians(item.clockPosition)
              : clockToRadians((index / items.length) * 12);
            
            // Create arc path for sector
            const sectorAngle = Math.PI / 5; // 36 degrees (wider sector)
            const startAngle = angle - sectorAngle / 2;
            const endAngle = angle + sectorAngle / 2;
            
            const innerRadius = 60;
            const outerRadius = radius + 60; // Extended to cover label with more padding
            
            const centerX = (radius * 2 + 200) / 2;
            const centerY = (radius * 2 + 200) / 2;
            
            const x1 = Math.cos(startAngle) * innerRadius + centerX;
            const y1 = Math.sin(startAngle) * innerRadius + centerY;
            const x2 = Math.cos(startAngle) * outerRadius + centerX;
            const y2 = Math.sin(startAngle) * outerRadius + centerY;
            const x3 = Math.cos(endAngle) * outerRadius + centerX;
            const y3 = Math.sin(endAngle) * outerRadius + centerY;
            const x4 = Math.cos(endAngle) * innerRadius + centerX;
            const y4 = Math.sin(endAngle) * innerRadius + centerY;
            
            // Always use small arc (0) for sectors smaller than 180 degrees
            const largeArcFlag = 0;
            
            return (
              <path
                key={`sector-${item.id}`}
                d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1} Z`}
                fill={item.color || '#3b82f6'}
                fillOpacity="0.2"
                className="transition-all duration-200"
              />
            );
          })}
        </svg>
        {/* Center area with device icon and status */}
        <div
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "flex flex-col items-center justify-center rounded-2xl",
            "bg-card shadow-lg border-2 border-border p-3",
            "transition-all duration-300",
            animateIn ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
          style={{ minWidth: '100px' }}
        >
          {/* Device Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            {centerIcon}
          </div>
          
          {/* Device Name */}
          {deviceName && (
            <div className="text-xs font-medium text-center mb-1 max-w-[90px] truncate">
              {deviceName}
            </div>
          )}
        </div>

        {/* Radial items */}
        {items.map((item, index) => {
          // Use clockPosition if specified, otherwise distribute evenly
          const angle = item.clockPosition !== undefined 
            ? clockToRadians(item.clockPosition)
            : clockToRadians((index / items.length) * 12);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={item.id}
              className="absolute flex flex-col items-center"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => item.onClick && !item.isInfo ? setHoveredIndex(index) : null}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Icon circle */}
              <div
                onClick={item.onClick ? (e) => {
                  e.stopPropagation();
                  item.onClick!();
                } : undefined}
                className={cn(
                  "flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200",
                  "bg-card shadow-lg border-2",
                  hoveredIndex === index && item.onClick && !item.isInfo ? "border-primary scale-110" : "border-border",
                  item.onClick && !item.isInfo ? "hover:scale-110 active:scale-95 cursor-pointer" : "cursor-default",
                  animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"
                )}
                style={{
                  transitionDelay: `${index * 30}ms`,
                }}
              >
                {item.icon}
              </div>
              {/* Label below icon */}
              <div
                className={cn(
                  "mt-1 text-xs font-medium text-center whitespace-nowrap px-2 py-0.5 rounded",
                  "bg-card/90 shadow-sm transition-all duration-200",
                  animateIn ? "opacity-100 scale-100" : "opacity-0 scale-50"
                )}
                style={{
                  transitionDelay: `${index * 30 + 50}ms`,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

