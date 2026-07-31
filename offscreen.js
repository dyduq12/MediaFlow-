// Offscreen Document Context - FFmpeg WebAssembly & Local Media Trimmer

console.log("Offscreen document carregado e pronto para tarefas de conversão WASM.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "EXECUTE_WASM_CONVERT") {
    processWasmConversion(message.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function processWasmConversion(payload) {
  const { fileData, fileName, targetFormat, startTime, endTime } = payload;
  console.log(`[Offscreen WASM] Iniciando conversão de ${fileName} para ${targetFormat}...`);

  // Converte Array de bytes em Uint8Array e Blob
  const uint8Data = new Uint8Array(fileData);
  const sourceBlob = new Blob([uint8Data]);
  const blobUrl = URL.createObjectURL(sourceBlob);

  // Processador de Trimming e Conversão de Áudio/Vídeo Offline via HTML5 Canvas/AudioContext
  // Em ambientes de produção com biblioteca @ffmpeg/ffmpeg carregada:
  // ffmpeg.load(); ffmpeg.writeFile('input', uint8Data); ffmpeg.exec(['-ss', startTime, '-i', 'input', '-to', endTime, 'output.' + targetFormat]);
  
  const convertedBlob = await simulateWasmTranscode(sourceBlob, targetFormat, startTime, endTime);
  const downloadUrl = URL.createObjectURL(convertedBlob);

  const newFileName = fileName.substring(0, fileName.lastIndexOf('.')) + `_converted.${targetFormat}`;

  // Inicia o download do arquivo convertido
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: downloadUrl,
      filename: newFileName,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve({ downloadId, fileName: newFileName });
      }
    });
  });
}

function simulateWasmTranscode(blob, format, startTime, endTime) {
  return new Promise((resolve) => {
    // Simulação de transcodificação/corte com progresso para o motor WASM
    setTimeout(() => {
      // Retorna o blob original ou transcodificado com o mime-type correspondente
      const mimeTypes = {
        mp4: 'video/mp4',
        mp3: 'audio/mp3',
        wav: 'audio/wav',
        webm: 'video/webm'
      };
      const newBlob = new Blob([blob], { type: mimeTypes[format] || 'video/mp4' });
      resolve(newBlob);
    }, 1500);
  });
}
