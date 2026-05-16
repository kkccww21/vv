// Content Script - 与网页通信

// 向网页注入消息
function sendToPage(message) {
  window.postMessage({
    source: 'kvideo-dlna-extension',
    ...message
  }, '*');
}

// 监听网页消息
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data.source !== 'kvideo-page') return;

  const { type, ...data } = event.data;

  try {
    const response = await chrome.runtime.sendMessage({ type, ...data });
    sendToPage({ type: `${type}_RESPONSE`, ...response });
  } catch (error) {
    sendToPage({ type: `${type}_RESPONSE`, error: error.message });
  }
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_VIDEO_URL') {
    try {
      // 优先从data属性获取（由useHlsPlayer设置）
      const video = document.querySelector('video');
      const dataUrl = video?.getAttribute('data-kvideo-url');
      if (dataUrl) {
        sendResponse({ mediaUrl: dataUrl });
        return true;
      }
      
      // 备用方案：从video元素获取
      if (video && video.src) {
        sendResponse({ mediaUrl: video.src });
      } else {
        const source = document.querySelector('video source');
        if (source && source.src) {
          sendResponse({ mediaUrl: source.src });
        } else {
          sendResponse({ mediaUrl: null });
        }
      }
    } catch (error) {
      sendResponse({ mediaUrl: null, error: error.message });
    }
    return true;
  }
});

// 告诉页面扩展已加载
sendToPage({ type: 'EXTENSION_READY' });
