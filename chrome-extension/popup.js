document.addEventListener('DOMContentLoaded', async () => {
  const deviceList = document.getElementById('deviceList');
  const statusDiv = document.getElementById('status');
  const refreshBtn = document.getElementById('refreshBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const targetIpInput = document.getElementById('targetIpInput');
  const settingsSaveBtn = document.getElementById('settingsSaveBtn');
  
  let isScanning = false;

  // 加载配置
  async function loadConfig() {
    try {
      const { config } = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (config && config.targetIp) {
        targetIpInput.value = config.targetIp;
      }
    } catch (e) {
      console.warn('加载配置失败:', e.message);
    }
  }

  // 显示状态
  function showStatus(text, type = 'info') {
    statusDiv.textContent = text;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);
  }

  // 渲染设备列表
  function renderDevices(devices) {
    if (devices.length === 0) {
      deviceList.innerHTML = `
        <div class="empty-state">
          <p>暂无设备</p>
          <p>点击扫描按钮发现设备</p>
        </div>
      `;
      return;
    }

    deviceList.innerHTML = devices.map((device, index) => {
      const ipMatch = device.controlUrl.match(/(\d+\.\d+\.\d+\.\d+:\d+)/);
      const ipDisplay = ipMatch ? ipMatch[1] : device.controlUrl;
      
      return `
      <div class="device-item" data-index="${index}">
        <div class="device-info">
          <div>
            <div class="device-name">${device.name}</div>
            <div class="device-ip">${ipDisplay}</div>
          </div>
          <div class="device-actions">
            <button class="cast-btn" data-index="${index}">投屏</button>
            <button class="delete-btn" data-index="${index}">删除</button>
          </div>
        </div>
      </div>
    `}).join('');
  }

  // 加载设备
  async function loadDevices() {
    const { devices } = await chrome.runtime.sendMessage({ type: 'GET_DEVICES' });
    renderDevices(devices);
  }

  // 开始扫描
  async function startScan() {
    if (isScanning) return;
    
    isScanning = true;
    refreshBtn.disabled = true;
    refreshBtn.textContent = '扫描中...';
    deviceList.innerHTML = `
      <div style="text-align: center; padding: 24px;">
        <div style="font-size: 14px; margin-bottom: 12px; color: #6b7280;">正在扫描...</div>
        <div style="width: 100%; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
          <div id="scanProgress" style="height: 100%; width: 0%; background: #3b82f6; transition: width 0.3s;"></div>
        </div>
        <div id="scanProgressText" style="font-size: 12px; color: #9ca3af; margin-top: 8px;">0%</div>
      </div>
    `;

    const progressListener = (message) => {
      if (message.type === 'SCAN_PROGRESS') {
        const progressBar = document.getElementById('scanProgress');
        const progressText = document.getElementById('scanProgressText');
        if (progressBar && progressText) {
          progressBar.style.width = `${message.progress}%`;
          progressText.textContent = `${message.progress}%`;
        }
      }
    };
    chrome.runtime.onMessage.addListener(progressListener);

    try {
      const result = await chrome.runtime.sendMessage({ type: 'SCAN_DEVICES' });
      
      if (result.success) {
        if (result.devices.length > 0) {
          showStatus(`发现 ${result.devices.length} 个设备`, 'success');
        } else {
          showStatus('未发现设备', 'error');
        }
        await loadDevices();
      }
    } catch (e) {
      showStatus('扫描出错', 'error');
    } finally {
      chrome.runtime.onMessage.removeListener(progressListener);
      isScanning = false;
      refreshBtn.disabled = false;
      refreshBtn.textContent = '扫描设备';
    }
  }

  // 添加设备
  function showAddDeviceDialog() {
    const name = prompt('设备名称（例如：坚果投影仪）：');
    if (!name) return;
    
    let controlUrl = prompt('控制URL（留空将自动尝试常见端口）：');
    if (!controlUrl) {
      const ip = prompt('设备IP地址（例如：192.168.3.134）：');
      if (!ip) return;
      controlUrl = `http://${ip}:49152/_urn:schemas-upnp-org:service:AVTransport_control`;
    }
    
    const service = prompt('服务类型（留空使用默认）：', 'urn:schemas-upnp-org:service:AVTransport:1') || 'urn:schemas-upnp-org:service:AVTransport:1';
    
    chrome.runtime.sendMessage({
      type: 'ADD_DEVICE',
      device: { name, controlUrl, service }
    }).then(async () => {
      await loadDevices();
      showStatus('设备已添加', 'success');
    });
  }

  // 删除设备
  async function deleteDevice(index) {
    const { devices } = await chrome.runtime.sendMessage({ type: 'GET_DEVICES' });
    devices.splice(index, 1);
    await chrome.storage.local.set({ dlnaDevices: devices });
    await loadDevices();
    showStatus('设备已删除', 'success');
  }

  // 事件监听
  refreshBtn.addEventListener('click', startScan);
  document.getElementById('addBtn').addEventListener('click', showAddDeviceDialog);
  
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('active');
  });
  
  settingsSaveBtn.addEventListener('click', async () => {
    const ip = targetIpInput.value.trim();
    if (!ip) {
      showStatus('IP地址不能为空', 'error');
      return;
    }
    await chrome.runtime.sendMessage({ type: 'SET_CONFIG', config: { targetIp: ip } });
    showStatus('IP已保存', 'success');
    settingsPanel.classList.remove('active');
  });
  
  deviceList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const index = parseInt(e.target.dataset.index);
      deleteDevice(index);
    } else if (e.target.classList.contains('cast-btn')) {
      const index = parseInt(e.target.dataset.index);
      await castToDevice(index);
    }
  });

  async function castToDevice(index) {
    const { devices } = await chrome.runtime.sendMessage({ type: 'GET_DEVICES' });
    const device = devices[index];
    if (!device) {
      showStatus('设备不存在', 'error');
      return;
    }

    showStatus('获取视频地址...', 'info');
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (!tab) {
        showStatus('未找到活动标签页', 'error');
        return;
      }

      let mediaUrl = null;
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_URL' });
        mediaUrl = response?.mediaUrl;
      } catch (e) {
        console.error('content script不可用:', e.message);
      }

      if (!mediaUrl) {
        const manualUrl = prompt('未检测到视频，请手动输入视频地址：');
        if (!manualUrl) {
          showStatus('未找到可投屏的视频', 'error');
          return;
        }
        mediaUrl = manualUrl;
      }

      showStatus('投屏中...', 'info');
      const result = await chrome.runtime.sendMessage({
        type: 'CAST',
        device,
        mediaUrl
      });

      if (result.success) {
        showStatus('投屏成功！', 'success');
      } else {
        showStatus('投屏失败：' + (result.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('投屏错误:', error);
      showStatus('投屏出错', 'error');
    }
  }

  // 初始加载
  await loadConfig();
  await loadDevices();
});
