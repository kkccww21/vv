import React from 'react';

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

interface BatteryState {
  supported: boolean;
  charging: boolean;
  level: number;
}

declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManager>;
  }
}

export function useBatteryStatus() {
  const [battery, setBattery] = React.useState<BatteryState>({
    supported: false,
    charging: false,
    level: 100,
  });

  React.useEffect(() => {
    if (!navigator.getBattery) {
      return;
    }

    let batteryManager: BatteryManager | null = null;

    const initBattery = async () => {
      try {
        batteryManager = await navigator.getBattery!();
        
        const updateBattery = () => {
          setBattery({
            supported: true,
            charging: batteryManager!.charging,
            level: Math.round(batteryManager!.level * 100),
          });
        };

        updateBattery();

        batteryManager.addEventListener('chargingchange', updateBattery);
        batteryManager.addEventListener('levelchange', updateBattery);

      } catch {
        setBattery({
          supported: false,
          charging: false,
          level: 100,
        });
      }
    };

    initBattery();

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('chargingchange', () => {});
        batteryManager.removeEventListener('levelchange', () => {});
      }
    };
  }, []);

  return battery;
}
