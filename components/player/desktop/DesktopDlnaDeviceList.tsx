import React, { useState } from 'react';

interface DlnaDevice {
  name: string;
  controlUrl: string;
  service: string;
}

interface DesktopDlnaDeviceListProps {
  devices: DlnaDevice[];
  isVisible: boolean;
  isCasting: boolean;
  status: string | null;
  onClose: () => void;
  onCastToDevice: (device: DlnaDevice) => void;
  onRefresh: () => void;
  onScan?: () => void;
}

export function DesktopDlnaDeviceList({
  devices,
  isVisible,
  isCasting,
  status,
  onClose,
  onCastToDevice,
  onRefresh,
  onScan
}: DesktopDlnaDeviceListProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const handleScan = async () => {
    if (!onScan) {
      setIsScanning(true);
      // 模拟进度
      for (let i = 0; i <= 100; i += 10) {
        setScanProgress(i);
        await new Promise(r => setTimeout(r, 200));
      }
      await onRefresh?.();
      setIsScanning(false);
      setScanProgress(0);
    } else {
      await onScan();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-full right-0 mb-2 w-80 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700/50">
      <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
        <h3 className="text-white font-semibold">DLNA 投屏</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {status && (
          <div className={`mb-3 p-2 rounded-lg text-sm ${status.includes('成功') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {status}
          </div>
        )}

        {isScanning ? (
          <div className="text-center py-8">
            <div className="text-white mb-3">正在扫描局域网设备...</div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <div className="text-gray-400 text-sm">{scanProgress}%</div>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">暂无设备</div>
            <div className="space-y-2">
              <button
                onClick={handleScan}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                扫描局域网设备
              </button>
              <button
                onClick={onRefresh}
                className="w-full px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg text-sm transition-colors"
              >
                从扩展刷新
              </button>
            </div>
            <div className="mt-4 text-gray-500 text-xs">
              提示：先点击扩展图标添加或扫描设备
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-3">
              {devices.map((device, index) => (
                <button
                  key={index}
                  onClick={() => onCastToDevice(device)}
                  disabled={isCasting}
                  className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-white font-medium">{device.name}</div>
                  <div className="text-gray-400 text-xs mt-1 truncate">{device.controlUrl}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleScan}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                扫描设备
              </button>
              <button
                onClick={onRefresh}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg text-sm transition-colors"
              >
                刷新
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
