import { useState } from 'react';
import { type Device, getDeviceRoom, useDataStore } from '@/stores/dataStore';
import { DeviceCapability, hasCapability } from '@/stores/deviceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { DeviceSettingsSection } from '@/components/DeviceSettingsSection';
import { DeviceHeader } from './DeviceHeader';
import { DeviceInfo } from './DeviceInfo';
import {
  LampControls,
  DimmerControls,
  LedControls,
  ShutterQuickControls,
  ShutterPositionControls,
  ActuatorControls,
  TemperatureControls,
  AcControls,
  HeaterControls,
  HumiditySensorControls,
  MotionSensorControls,
  HandleSensorControls,
  SpeakerControls,
  SceneControls,
  CameraControls,
  BlockAutomaticControls,
  EnergyManagerControls,
  BatteryControls,
} from './controls';

interface DeviceDetailViewProps {
  device: Device;
  onBack: () => void;
}

export function DeviceDetailView({ device: initialDevice, onBack }: DeviceDetailViewProps) {
  const { devices, fetchDevice } = useDataStore();
  const { expertMode } = useSettingsStore();
  const { isFavorite: checkIsFavorite, toggleFavorite: toggleFavoriteInStore } = useFavoritesStore();
  const [showRawJson, setShowRawJson] = useState(false);

  // Get live device from store
  const device = initialDevice.id ? (devices[initialDevice.id] ?? initialDevice) : initialDevice;

  const info = device.info ?? device._info;
  const name = info?.customName ?? info?._customName ?? info?.fullName ?? 'Unbekannt';
  const room = getDeviceRoom(device);
  
  // Device state values - only for conditional rendering
  const temp = device.temperatureSensor?.roomTemperature ?? device._roomTemperature;
  const humidity = device.humiditySensor?.humidity ?? device._humidity ?? -1;
  const currentLevel = device._currentLevel ?? -1;
  const batteryLevel = device.battery?.level ?? device.batteryLevel ?? -99;
  
  const isFavorite = device.id ? checkIsFavorite(device.id) : false;

  const toggleFavorite = () => {
    if (device.id) {
      toggleFavoriteInStore(device.id);
    }
  };


  return (
    <div className="flex h-full flex-col">
      <DeviceHeader
        name={name}
        room={room}
        isFavorite={isFavorite}
        onBack={onBack}
        onToggleFavorite={toggleFavorite}
      />

      <div className="flex-1 overflow-auto pb-tabbar">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left column: Device Controls */}
            <div className="lg:col-span-2 space-y-6">
              {hasCapability(device, DeviceCapability.lamp) && !hasCapability(device, DeviceCapability.dimmableLamp) && !hasCapability(device, DeviceCapability.ledLamp) && (
                <LampControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.shutter) && (
                <ShutterQuickControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.temperatureSensor) && temp !== undefined && (
                <TemperatureControls device={device} />
              )}

              {hasCapability(device, DeviceCapability.dimmableLamp) && !hasCapability(device, DeviceCapability.ledLamp) && (
                <DimmerControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.ledLamp) && (
                <LedControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.actuator) && !hasCapability(device, DeviceCapability.lamp) && (
                <ActuatorControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.ac) && (
                <AcControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.heater) && (
                <HeaterControls device={device} />
              )}

              {hasCapability(device, DeviceCapability.shutter) && currentLevel >= 0 && (
                <ShutterPositionControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.motionSensor) && (
                <MotionSensorControls device={device} />
              )}

              {hasCapability(device, DeviceCapability.handleSensor) && (
                <HandleSensorControls device={device} />
              )}

              {hasCapability(device, DeviceCapability.humiditySensor) && humidity >= 0 && (
                <HumiditySensorControls device={device} />
              )}

              {hasCapability(device, DeviceCapability.speaker) && (
                <SpeakerControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.scene) && (
                <SceneControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.camera) && (
                <CameraControls device={device} />
              )}

              {hasCapability(device, 104) && (
                <BlockAutomaticControls
                  device={device}
                  onUpdate={() => device.id ? fetchDevice(device.id) : Promise.resolve()}
                />
              )}

              {hasCapability(device, DeviceCapability.energyManager) && (
                <EnergyManagerControls device={device} />
              )}

              {batteryLevel !== -99 && (
                <BatteryControls device={device} />
              )}
            </div>

            {/* Right column: Device Settings */}
            <div className="lg:col-span-3 lg:sticky lg:top-20 lg:self-start space-y-6">
              <DeviceSettingsSection device={device} onUpdate={() => device.id && fetchDevice(device.id)} />

              <DeviceInfo
                device={device}
                expertMode={expertMode}
                showRawJson={showRawJson}
                setShowRawJson={setShowRawJson}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
