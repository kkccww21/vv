// DLNA设备存储
let devices = [];
let config = { targetIp: '192.168.3.134' };

// 加载配置
async function loadConfig() {
  const result = await chrome.storage.local.get(['dlnaConfig']);
  if (result.dlnaConfig) {
    config = { ...config, ...result.dlnaConfig };
  }
  return config;
}

// 保存配置
async function saveConfig(newConfig) {
  config = { ...config, ...newConfig };
  await chrome.storage.local.set({ dlnaConfig: config });
  return config;
}

// 常见的DLNA端口和控制端点组合（包含Python脚本中使用的两个端点）
const COMMON_DLNA_ENDPOINTS = [
  // 坚果投影仪风格（Python脚本中的Redsonic DLNA）
  { port: 49152, path: '/_urn:schemas-upnp-org:service:AVTransport_control' },
  { port: 49153, path: '/_urn:schemas-upnp-org:service:AVTransport_control' },
  { port: 49154, path: '/_urn:schemas-upnp-org:service:AVTransport_control' },
  // Dangbei DLNA（Python脚本中成功使用的端点）
  { port: 46577, path: '/upnp/dev/03e6f013-3b79-45bc-b22f-1a2872236046/svc/upnp-org/AVTransport/action' },
];

const DEFAULT_SERVICE = 'urn:schemas-upnp-org:service:AVTransport:1';

// 从存储加载设备
async function loadDevices() {
  const result = await chrome.storage.local.get(['dlnaDevices']);
  devices = result.dlnaDevices || [];
  return devices;
}

// 保存设备
async function saveDevices() {
  await chrome.storage.local.set({ dlnaDevices: devices });
}

// 添加设备
function addDevice(device) {
  const exists = devices.find(d => d.controlUrl === device.controlUrl);
  if (!exists) {
    devices.push(device);
    saveDevices();
  }
}

// 发送SOAP请求
async function sendSoapRequest(url, action, body) {
  // 确保URL有http://协议头
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>${body}</s:Body>
</s:Envelope>`;

  console.log('[DLNA] 发送SOAP请求到:', url);
  console.log('[DLNA] SOAPAction:', action);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'SOAPAction': action,
        'Content-Type': 'text/xml; charset=utf-8',
        'Connection': 'close',
      },
      body: envelope
    });

    const text = await response.text();
    console.log('[DLNA] 响应状态:', response.status);
    console.log('[DLNA] 响应内容:', text.substring(0, 200));
    
    return {
      success: response.ok && !text.includes('Fault'),
      status: response.status,
      text
    };
  } catch (error) {
    console.error('[DLNA] 请求失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 多种SOAP格式变体
const SOAP_VARIANTS = [
  {
    name: 'standard',
    setUri: (service, url) => `<u:SetAVTransportURI xmlns:u="${service}">
      <InstanceID>0</InstanceID>
      <CurrentURI>${url}</CurrentURI>
      <CurrentURIMetaData></CurrentURIMetaData>
    </u:SetAVTransportURI>`,
    play: (service) => `<u:Play xmlns:u="${service}">
      <InstanceID>0</InstanceID>
      <Speed>1</Speed>
    </u:Play>`,
  },
  {
    name: 'no_prefix',
    setUri: (service, url) => `<SetAVTransportURI xmlns="${service}">
      <InstanceID>0</InstanceID>
      <CurrentURI>${url}</CurrentURI>
      <CurrentURIMetaData></CurrentURIMetaData>
    </SetAVTransportURI>`,
    play: (service) => `<Play xmlns="${service}">
      <InstanceID>0</InstanceID>
      <Speed>1</Speed>
    </Play>`,
  },
];

// 设置AV传输URI - 尝试多种SOAP格式
async function setAVTransportURI(device, mediaUrl) {
  for (const variant of SOAP_VARIANTS) {
    const body = variant.setUri(device.service, mediaUrl);
    const action = `"${device.service}#SetAVTransportURI"`;
    
    console.log(`[DLNA] 尝试SOAP格式: ${variant.name}`);
    const result = await sendSoapRequest(device.controlUrl, action, body);
    
    if (result.success) {
      console.log(`[DLNA] ${variant.name} 格式成功!`);
      return { ...result, variant: variant.name };
    }
  }
  
  return { success: false, error: '所有SOAP格式均失败' };
}

// 播放 - 使用对应的SOAP格式
async function play(device, variantName = 'standard') {
  const variant = SOAP_VARIANTS.find(v => v.name === variantName) || SOAP_VARIANTS[0];
  const body = variant.play(device.service);
  const action = `"${device.service}#Play"`;
  
  console.log(`[DLNA] 发送Play命令，使用格式: ${variant.name}`);
  return await sendSoapRequest(device.controlUrl, action, body);
}

// 投屏到设备 - 尝试多种格式
async function castToDevice(device, mediaUrl) {
  console.log('[DLNA] 开始投屏，设备:', device.name, 'URL:', mediaUrl);
  
  for (const variant of SOAP_VARIANTS) {
    console.log(`[DLNA] === 尝试变体: ${variant.name} ===`);
    console.log('[DLNA] 媒体URL:', mediaUrl);
    
    const setBody = variant.setUri(device.service, mediaUrl);
    const setAction = `"${device.service}#SetAVTransportURI"`;
    
    console.log('[DLNA] SOAP Body:', setBody.substring(0, 300));
    
    const result1 = await sendSoapRequest(device.controlUrl, setAction, setBody);
    if (!result1.success) {
      console.log(`[DLNA] ${variant.name} 设置URI失败，尝试下一个变体`);
      console.log('[DLNA] 失败详情:', result1);
      continue;
    }
    
    console.log(`[DLNA] ${variant.name} 设置URI成功，等待500ms后发送Play...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const playBody = variant.play(device.service);
    const playAction = `"${device.service}#Play"`;
    const result2 = await sendSoapRequest(device.controlUrl, playAction, playBody);
    
    if (result2.success) {
      console.log(`[DLNA] 投屏成功! 使用变体: ${variant.name}`);
      return { success: true, variant: variant.name };
    }
  }
  
  return { success: false, error: '所有变体均失败' };
}

// 测试单个端点是否是DLNA设备
async function testDlnaEndpoint(ip, port, path) {
  const url = `http://${ip}:${port}${path}`;
  
  // 发送一个简单的GetPositionInfo请求来测试
  const testBody = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <u:GetPositionInfo xmlns:u="${DEFAULT_SERVICE}">
      <InstanceID>0</InstanceID>
    </u:GetPositionInfo>
  </s:Body>
</s:Envelope>`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时5秒超时增加到5秒超时，避免请求被取消

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'SOAPAction': `"${DEFAULT_SERVICE}#GetPositionInfo"`,
        'Content-Type': 'text/xml; charset=utf-8',
      },
      body: testBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    // 记录所有响应以便调试
    console.log(`[扫描] ${ip}:${port} -> 状态: ${response.status}`);
    
    // 如果返回200或500（500通常表示设备存在但命令不支持或无媒体）
    if (response.status === 200 || response.status === 500) {
      console.log(`[扫描] ✅ 发现DLNA设备: ${url}`);
      return {
        success: true,
        url,
        service: DEFAULT_SERVICE
      };
    }
  } catch (e) {
    // 只记录连接成功的错误（非超时）
    if (e.name !== 'AbortError') {
      console.log(`[扫描] ${ip}:${port} -> 错误: ${e.message}`);
    }
  }
  return { success: false };
}

// 扫描局域网中的DLNA设备（精准模式 - 针对固定IP优化）
async function scanForDlnaDevices(progressCallback) {
  const foundDevices = [];
  
  // 使用配置的IP扫描
  const ipsToScan = [config.targetIp];
  
  const total = ipsToScan.length * COMMON_DLNA_ENDPOINTS.length;
  let checked = 0;

  for (let i = 0; i < ipsToScan.length; i++) {
    const ip = ipsToScan[i];
    
    for (const endpoint of COMMON_DLNA_ENDPOINTS) {
      checked++;
      if (progressCallback) {
        progressCallback(Math.floor((checked / total) * 100));
      }
      
      const result = await testDlnaEndpoint(ip, endpoint.port, endpoint.path);
      
      if (result.success) {
        const deviceName = `DLNA Device (${ip}:${endpoint.port})`;
        if (!devices.find(d => d.controlUrl === result.url) && 
            !foundDevices.find(d => d.controlUrl === result.url)) {
          foundDevices.push({
            name: deviceName,
            controlUrl: result.url,
            service: result.service
          });
        }
      }
      
      // 每个端口之间加短暂延迟
      await new Promise(r => setTimeout(r, 50));
    }
  }

  return foundDevices;
}

// 消息处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_DEVICES':
      loadDevices().then(() => sendResponse({ devices }));
      return true;

    case 'ADD_DEVICE':
      addDevice(message.device);
      sendResponse({ success: true });
      break;

    case 'CAST':
      castToDevice(message.device, message.mediaUrl).then(sendResponse);
      return true;

    case 'SET_AV_TRANSPORT_URI':
      setAVTransportURI(message.device, message.mediaUrl).then(sendResponse);
      return true;

    case 'PLAY':
      play(message.device).then(sendResponse);
      return true;

    case 'GET_CONFIG':
      loadConfig().then(() => sendResponse({ config }));
      return true;

    case 'SET_CONFIG':
      saveConfig(message.config).then(() => sendResponse({ success: true }));
      return true;
      
    case 'SCAN_DEVICES':
      scanForDlnaDevices((progress) => {
        // 发送进度更新
        chrome.runtime.sendMessage({
          type: 'SCAN_PROGRESS',
          progress
        }).catch(() => {});
      }).then(foundDevices => {
        // 添加新发现的设备
        foundDevices.forEach(d => addDevice(d));
        sendResponse({ success: true, devices: foundDevices });
      });
      return true;

    case 'TRIGGER_CAST':
      (async () => {
        try {
          // 获取设备列表
          const loadedDevices = await loadDevices();
          if (loadedDevices.length === 0) {
            sendResponse({ success: false, error: 'No devices available' });
            return;
          }

          // 使用第一个设备
          const device = loadedDevices[0];
          const mediaUrl = message.mediaUrl;
          
          if (!mediaUrl) {
            sendResponse({ success: false, error: 'No URL provided' });
            return;
          }

          const result = await castToDevice(device, mediaUrl);
          sendResponse(result);
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
  }
});

// 初始化时加载设备
loadDevices();
