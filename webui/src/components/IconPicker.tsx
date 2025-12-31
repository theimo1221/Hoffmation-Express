import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X } from 'lucide-react';

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string | undefined) => void;
  color?: string;
}

const POPULAR_ICONS = [
  'Home', 'Bed', 'Baby', 'Users', 'Warehouse', 'Package', 'Trees', 'Flower',
  'Sofa', 'UtensilsCrossed', 'Bath', 'Laptop', 'Tv', 'Gamepad2', 'BookOpen',
  'Star', 'Heart', 'Smile', 'Sun', 'Moon', 'CloudFog', 'Droplets', 'Sprout',
  'DoorOpen', 'Archive', 'Box', 'Boxes', 'CookingPot', 'ArrowUpDown'
];

export function IconPicker({ value, onChange, color = '#3B82F6' }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const allIconNames = Object.keys(LucideIcons).filter(
    name => name !== 'default' && name !== 'createLucideIcon'
  );

  const filteredIcons = search
    ? allIconNames.filter(name => 
        name.toLowerCase().includes(search.toLowerCase())
      )
    : POPULAR_ICONS;

  const displayedIcons = filteredIcons.slice(0, 48);

  const IconComponent = value && (LucideIcons as any)[value];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        {IconComponent ? (
          <IconComponent size={20} style={{ color }} />
        ) : (
          <div className="w-5 h-5 border-2 border-dashed rounded" />
        )}
        <span className="text-sm">{value || 'Icon wählen'}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-2 p-4 bg-white dark:bg-gray-900 border rounded-lg shadow-lg w-96 max-h-96 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Icon suchen..."
                  className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm"
                  autoFocus
                />
              </div>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(undefined);
                    setIsOpen(false);
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Icon entfernen"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-8 gap-2">
              {displayedIcons.map((iconName) => {
                const Icon = (LucideIcons as any)[iconName];
                const isSelected = value === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                    }}
                    className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                      isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                    }`}
                    title={iconName}
                  >
                    <Icon size={20} style={{ color: isSelected ? color : undefined }} />
                  </button>
                );
              })}
            </div>

            {filteredIcons.length > displayedIcons.length && (
              <p className="mt-3 text-xs text-gray-500 text-center">
                {filteredIcons.length - displayedIcons.length} weitere Icons...
              </p>
            )}

            {filteredIcons.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Keine Icons gefunden
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
