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
  refresh: () => void;
}

declare global {
  interface Navigator {
    getBattery?: () => Promise<BatteryManager>;
  }
}

export function useBatteryStatus(): BatteryState {
  const [batteryState, setBatteryState] = React.useState<Omit<BatteryState, 'refresh'>>({
    supported: false,
    charging: false,
    level: 100,
  });

  const refresh = React.useCallback(async () => {
    if (!navigator.getBattery) {
      return;
    }

    try {
      const manager = await navigator.getBattery!();
      setBatteryState({
        supported: true,
        charging: manager.charging,
        level: Math.round(manager.level * 100),
      });
    } catch {
      setBatteryState({
        supported: false,
        charging: false,
        level: 100,
      });
    }
  }, []);

  React.useEffect(() => {
    if (!navigator.getBattery) {
      return;
    }

    let batteryManager: BatteryManager | null = null;

    const initBattery = async () => {
      try {
        batteryManager = await navigator.getBattery!();
        
        const updateBattery = () => {
          setBatteryState({
            supported: true,
            charging: batteryManager!.charging,
            level: Math.round(batteryManager!.level * 100),
          });
        };

        updateBattery();

        batteryManager.addEventListener('chargingchange', updateBattery);
        batteryManager.addEventListener('levelchange', updateBattery);

      } catch {
        setBatteryState({
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

  return {
    ...batteryState,
    refresh,
  };
}
