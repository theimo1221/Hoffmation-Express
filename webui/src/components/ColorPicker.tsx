import { useState } from 'react';
import { X } from 'lucide-react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string | undefined) => void;
}

const PRESET_COLORS = [
  { name: 'Rot', color: '#EF4444' },
  { name: 'Orange', color: '#F59E0B' },
  { name: 'Gelb', color: '#FBBF24' },
  { name: 'Grün', color: '#22C55E' },
  { name: 'Blau', color: '#3B82F6' },
  { name: 'Lila', color: '#8B5CF6' },
  { name: 'Rosa', color: '#EC4899' },
  { name: 'Braun', color: '#8B4513' },
  { name: 'Grau', color: '#6B7280' },
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value || '#3B82F6');

  const handlePresetClick = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div 
          className="w-6 h-6 rounded border-2 border-gray-300"
          style={{ backgroundColor: value || '#E5E7EB' }}
        />
        <span className="text-sm">{value || 'Farbe wählen'}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-2 p-4 bg-white dark:bg-gray-900 border rounded-lg shadow-lg w-72">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Farbe wählen</h3>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(undefined);
                    setIsOpen(false);
                  }}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Farbe entfernen"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Preset Colors */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Vordefinierte Farben</p>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map(({ name, color }) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handlePresetClick(color)}
                      className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                        value === color ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-gray-400' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={name}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Eigene Farbe</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        setCustomColor(val);
                        if (val.length === 7) {
                          onChange(val);
                        }
                      }
                    }}
                    placeholder="#3B82F6"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              {/* Preview */}
              {value && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Vorschau</p>
                  <div 
                    className="w-full h-12 rounded-lg border"
                    style={{ backgroundColor: value }}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
