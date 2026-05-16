'use client';

import { useCallback, useEffect, useState, useRef } from 'react';

interface DlnaDevice {
  name: string;
  controlUrl: string;
  service: string;
}

export function useDlnaControls(src: string) {
  const [isExtensionAvailable, setIsExtensionAvailable] = useState(false);
  const [devices, setDevices] = useState<DlnaDevice[]>([]);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const pendingMessagesRef = useRef<Map<string, (data: any) => void>>(new Map());
  const messageIdRef = useRef(0);

  // 生成唯一消息ID
  const getMessageId = useCallback(() => {
    return `msg_${++messageIdRef.current}`;
  }, []);

  // 向扩展发送消息
  const sendToExtension = useCallback((type: string, data: any = {}) => {
    return new Promise<any>((resolve) => {
      const messageId = getMessageId();
      pendingMessagesRef.current.set(messageId, resolve);

      window.postMessage({
        source: 'kvideo-page',
        type,
        messageId,
        ...data
      }, '*');

      // 超时处理
      setTimeout(() => {
        if (pendingMessagesRef.current.has(messageId)) {
          pendingMessagesRef.current.delete(messageId);
          resolve({ error: 'Timeout' });
        }
      }, 10000);
    });
  }, [getMessageId]);

  // 监听扩展消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.source !== 'kvideo-dlna-extension') return;

      const { type, messageId, ...data } = event.data;

      if (type === 'EXTENSION_READY') {
        setIsExtensionAvailable(true);
        // 获取设备列表
        sendToExtension('GET_DEVICES');
      } else if (messageId && pendingMessagesRef.current.has(messageId)) {
        const callback = pendingMessagesRef.current.get(messageId)!;
        pendingMessagesRef.current.delete(messageId);
        callback(data);

        if (type === 'GET_DEVICES_RESPONSE' && data.devices) {
          setDevices(data.devices);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendToExtension]);

  // 获取设备列表
  const getDevices = useCallback(async () => {
    const response = await sendToExtension('GET_DEVICES');
    if (response.devices) {
      setDevices(response.devices);
    }
    return response;
  }, [sendToExtension]);

  // 投屏到设备
  const castToDevice = useCallback(async (device: DlnaDevice) => {
    if (!src) return;

    setIsCasting(true);
    setStatus('正在投屏...');

    const response = await sendToExtension('CAST', {
      device,
      mediaUrl: src
    });

    if (response.success) {
      setStatus('投屏成功！');
      setTimeout(() => setStatus(null), 3000);
    } else {
      setStatus('投屏失败: ' + (response.error || response.text || '未知错误'));
    }

    setIsCasting(false);
    setShowDeviceList(false);
  }, [src, sendToExtension]);

  const startScan = useCallback(async () => {
    setStatus('正在扫描...');
    const result = await sendToExtension('SCAN_DEVICES');
    if (result.success) {
      setStatus(`扫描完成，发现 ${result.devices?.length || 0} 个设备`);
      await getDevices();
    } else {
      setStatus('扫描失败');
    }
    setTimeout(() => setStatus(null), 3000);
  }, [sendToExtension, getDevices]);

  return {
    isExtensionAvailable,
    devices,
    showDeviceList,
    setShowDeviceList,
    isCasting,
    status,
    getDevices,
    castToDevice,
    startScan
  };
}
