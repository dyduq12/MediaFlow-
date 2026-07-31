// Content Script: Detecção de Mídias Ativas no DOM
(function() {
  function scanPageMedia() {
    const mediaList = [];
    
    // Sempre adiciona a URL da página atual como primeira opção (ideal para yt-dlp / Modo Power)
    mediaList.push({
      url: window.location.href,
      title: document.title || 'Página Web (Análise yt-dlp)',
      type: 'Página Web / Stream (Modo Power)',
      duration: 'Dinâmico'
    });

    const elements = document.querySelectorAll('video, audio, source');

    elements.forEach((el, index) => {
      let src = el.src || el.currentSrc;
      if (!src && el.tagName.toLowerCase() === 'source') {
        src = el.getAttribute('src');
      }

      if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
        let title = document.title || 'Mídia ' + (index + 1);
        let duration = 'Desconhecido';
        let type = el.tagName.toLowerCase() === 'audio' ? 'Áudio' : 'Vídeo';

        if (el.duration && !isNaN(el.duration)) {
          const minutes = Math.floor(el.duration / 60);
          const seconds = Math.floor(el.duration % 60);
          duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (el.videoWidth && el.videoHeight) {
          type += ` (${el.videoWidth}x${el.videoHeight})`;
        }

        mediaList.push({
          url: src,
          title: title,
          type: type,
          duration: duration,
          mimeType: el.type || ''
        });
      }
    });

    // Se nenhuma mídia HTML5 direta for encontrada, verifica metadados OpenGraph ou Twitter Cards
    if (mediaList.length === 0) {
      const ogVideo = document.querySelector('meta[property="og:video"], meta[property="og:video:url"]');
      if (ogVideo && ogVideo.content) {
        mediaList.push({
          url: ogVideo.content,
          title: document.title,
          type: 'Vídeo (OG Metadata)',
          duration: 'Stream'
        });
      }
    }

    return mediaList;
  }

  // Ouvinte de Mensagens da Extensão
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanMedia') {
      const media = scanPageMedia();
      sendResponse({ mediaList: media });
    }
    return true;
  });
})();
