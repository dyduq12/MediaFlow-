// Service Worker (Manifest V3) - MediaFlow Pro Background Engine

const NATIVE_HOST_NAME = "com.extensao.downloader";
const interceptedMediaMap = new Map(); // tabId -> Array of media items

// 1. Onboarding Automático na Primeira Instalação
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

// 2. Network Sniffer de Mídias (webRequest API)
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId <= 0) return;
    const contentTypeHeader = details.responseHeaders.find(
      (h) => h.name.toLowerCase() === "content-type"
    );

    if (contentTypeHeader) {
      const mime = contentTypeHeader.value.toLowerCase();
      if (
        mime.includes("video/") ||
        mime.includes("audio/") ||
        mime.includes("application/x-mpegurl") ||
        mime.includes("application/vnd.apple.mpegurl")
      ) {
        let list = interceptedMediaMap.get(details.tabId) || [];
        if (!list.some((item) => item.url === details.url)) {
          list.push({
            url: details.url,
            title: "Mídia Interceptada (" + mime.split("/")[1] + ")",
            type: mime,
            duration: "Network Stream"
          });
          interceptedMediaMap.set(details.tabId, list.slice(-10)); // Mantém até 10 itens
        }
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// 3. Gerenciamento do Offscreen Document (WASM FFmpeg)
let creatingOffscreenPromise = null;

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) return;

  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
  } else {
    creatingOffscreenPromise = chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ["WORKERS", "BLOBS"],
      justification: "Executar processamento de vídeo/áudio via WebAssembly (FFmpeg) isolado."
    });
    await creatingOffscreenPromise;
    creatingOffscreenPromise = null;
  }
}

// 4. Invocador Bidirecional do Native Messaging Host (yt-dlp)
function sendNativePing() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendNativeMessage(
        NATIVE_HOST_NAME,
        { action: "ping" },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            resolve({ connected: false, error: chrome.runtime.lastError?.message });
          } else {
            resolve({ connected: true, version: response.version, ytdlp: response.ytdlp });
          }
        }
      );
    } catch (e) {
      resolve({ connected: false, error: e.message });
    }
  });
}

function sendNativeDownload(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, payload, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve({ success: false, error: chrome.runtime.lastError?.message });
      } else {
        resolve(response);
      }
    });
  });
}

// 5. Roteamento Central de Mensagens
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkHostStatus") {
    sendNativePing().then(sendResponse);
    return true;
  }

  if (message.action === "getInterceptedMedia") {
    const list = interceptedMediaMap.get(message.tabId) || [];
    sendResponse({ mediaList: list });
    return true;
  }

  if (message.action === "processMediaCapture") {
    if (message.usePowerMode) {
      // Usa yt-dlp via Native Messaging
      sendNativeDownload({
        action: "download",
        url: message.url,
        format: message.format,
        startTime: message.startTime,
        endTime: message.endTime
      }).then((res) => {
        sendResponse(res);
      });
    } else {
      // Download Direto Nativo do Navegador
      chrome.downloads.download({
        url: message.url,
        filename: "MediaFlow_" + Date.now() + "." + (message.format === "mp3" ? "mp3" : "mp4"),
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      });
    }
    return true;
  }

  if (message.action === "convertLocalWASM") {
    ensureOffscreenDocument().then(() => {
      chrome.runtime.sendMessage({
        action: "EXECUTE_WASM_CONVERT",
        payload: message
      }, (offscreenResponse) => {
        sendResponse(offscreenResponse);
      });
    });
    return true;
  }

  return true;
});
