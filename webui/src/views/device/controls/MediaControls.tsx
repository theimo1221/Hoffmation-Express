import { useState } from 'react';
import { Speaker, Play, Square, Camera } from 'lucide-react';
import type { Device } from '@/stores/dataStore';
import { isDeviceOn } from '@/stores/deviceStore';
import { speakOnDevice, startScene, endScene } from '@/api/devices';
import { executeDeviceAction } from '@/lib/deviceActions';

interface SpeakerControlsProps {
  device: Device;
  onUpdate: () => Promise<void>;
}

export function SpeakerControls({ device, onUpdate }: SpeakerControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [speakMessage, setSpeakMessage] = useState('');
  
  const handleSpeak = async (message: string) => {
    await executeDeviceAction(
      device,
      (id) => speakOnDevice(id, message),
      onUpdate,
      setIsLoading
    );
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Speaker className="h-4 w-4" />
        Lautsprecher
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <textarea
          value={speakMessage}
          onChange={(e) => setSpeakMessage(e.target.value)}
          placeholder="Nachricht eingeben..."
          className="w-full rounded-xl bg-secondary p-3 text-sm resize-none h-20"
        />
        <button
          onClick={() => {
            handleSpeak(speakMessage);
            setSpeakMessage('');
          }}
          disabled={isLoading || !speakMessage.trim()}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all active:scale-95 disabled:opacity-50"
        >
          Abspielen
        </button>
      </div>
    </section>
  );
}

interface SceneControlsProps {
  device: Device;
  onUpdate: () => Promise<void>;
}

export function SceneControls({ device, onUpdate }: SceneControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sceneTimeout, setSceneTimeout] = useState(0);
  const isOn = isDeviceOn(device);
  
  const handleScene = async (start: boolean, timeout?: number) => {
    await executeDeviceAction(
      device,
      (id) => start ? startScene(id, timeout) : endScene(id),
      onUpdate,
      setIsLoading
    );
  };
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Play className="h-4 w-4" />
        Szene
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Status</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isOn ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'
          }`}>
            {isOn ? 'Aktiv' : 'Inaktiv'}
          </span>
        </div>
        {!isOn && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Auto-Aus Timeout</span>
              <span className="font-medium">{sceneTimeout === 0 ? 'Standard' : `${sceneTimeout} min`}</span>
            </div>
            <input
              type="range"
              min="0"
              max="240"
              step="5"
              value={sceneTimeout}
              onChange={(e) => setSceneTimeout(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        )}
        {isOn ? (
          <button
            onClick={() => handleScene(false)}
            disabled={isLoading}
            className="w-full rounded-xl bg-red-500/20 text-red-600 py-3 font-medium transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
          >
            <Square className="inline h-4 w-4 mr-2" />
            Szene beenden
          </button>
        ) : (
          <button
            onClick={() => handleScene(true, sceneTimeout > 0 ? sceneTimeout : undefined)}
            disabled={isLoading}
            className="w-full rounded-xl bg-green-500/20 text-green-600 py-3 font-medium transition-all hover:bg-green-500/30 active:scale-95 disabled:opacity-50"
          >
            <Play className="inline h-4 w-4 mr-2" />
            Szene starten
          </button>
        )}
      </div>
    </section>
  );
}

interface CameraControlsProps {
  device: Device;
}

export function CameraControls({ device }: CameraControlsProps) {
  const cameraImageLink = device.currentImageLink;
  const h264StreamLink = device.h264IosStreamLink;
  const mpegStreamLink = device.mpegStreamLink;
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
        <Camera className="h-4 w-4" />
        Kamera
      </h2>
      <div className="rounded-2xl bg-card p-4 shadow-soft space-y-4">
        {cameraImageLink && (
          <img 
            src={cameraImageLink} 
            alt="Kamerabild" 
            className="w-full rounded-xl"
          />
        )}
        {h264StreamLink && (
          <a
            href={h264StreamLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all hover:bg-primary/90"
          >
            <Play className="h-4 w-4" />
            Live-Stream öffnen
          </a>
        )}
        {mpegStreamLink && !h264StreamLink && (
          <a
            href={mpegStreamLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition-all hover:bg-primary/90"
          >
            <Play className="h-4 w-4" />
            MPEG-Stream öffnen
          </a>
        )}
      </div>
    </section>
  );
}
