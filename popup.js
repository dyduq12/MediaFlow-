document.addEventListener('DOMContentLoaded', () => {
  // Elementos das Abas
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Elementos do Status
  const statusDot = document.getElementById('status-dot');
  const engineText = document.getElementById('engine-text');

  // Tab 1: Captura Ativa
  const mediaList = document.getElementById('media-list');
  const btnRefreshMedia = document.getElementById('btn-refresh-media');
  const btnDownloadCapture = document.getElementById('btn-download-capture');
  const timeStart = document.getElementById('time-start');
  const timeEnd = document.getElementById('time-end');
  const trimWarning = document.getElementById('trim-warning');

  // Tab 2: Conversor Local
  const dropzone = document.getElementById('dropzone');
  const localFileInput = document.getElementById('local-file-input');
  const fileInfo = document.getElementById('file-info');
  const targetFormat = document.getElementById('target-format');
  const localStart = document.getElementById('local-start');
  const localEnd = document.getElementById('local-end');
  const btnConvertLocal = document.getElementById('btn-convert-local');
  const progressBar = document.getElementById('convert-progress-bar');
  const progressFill = document.getElementById('convert-progress-fill');
  const statusText = document.getElementById('convert-status-text');

  // Tab 3: Power Mode
  const btnTestPower = document.getElementById('btn-test-power');
  const powerTestResult = document.getElementById('power-test-result');
  const btnDownloadHost = document.getElementById('btn-download-host');
  const btnOpenWelcome = document.getElementById('btn-open-welcome');

  let selectedFile = null;
  let isPowerMode = false;
  let selectedMediaUrl = null;

  // Alternância de Abas
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.dataset.tab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Checagem de Status do Native Messaging Host
  function checkHostStatus() {
    chrome.runtime.sendMessage({ action: 'checkHostStatus' }, response => {
      if (response && response.connected) {
        isPowerMode = true;
        statusDot.classList.add('active');
        engineText.textContent = 'Modo Power (yt-dlp)';
        trimWarning.style.display = 'none';
      } else {
        isPowerMode = false;
        statusDot.classList.remove('active');
        engineText.textContent = 'Modo Padrão (Local)';
      }
    });
  }

  checkHostStatus();

  // Exibe aviso se usuário preencher timestamps no Modo Padrão
  [timeStart, timeEnd].forEach(input => {
    input.addEventListener('input', () => {
      if (timeStart.value !== '00:00:00' || timeEnd.value !== '') {
        if (!isPowerMode) {
          trimWarning.style.display = 'block';
        }
      } else {
        trimWarning.style.display = 'none';
      }
    });
  });

  // Busca Mídias na Aba Ativa
  function loadTabMedia() {
    mediaList.innerHTML = '<div class="notice-box info">Buscando vídeos e áudios na página...</div>';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      
      chrome.tabs.sendMessage(tabs[0].id, { action: 'scanMedia' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.mediaList || response.mediaList.length === 0) {
          // Solicita mídias interceptadas pelo background
          chrome.runtime.sendMessage({ action: 'getInterceptedMedia', tabId: tabs[0].id }, (bgResponse) => {
            renderMediaItems(bgResponse ? bgResponse.mediaList : []);
          });
        } else {
          renderMediaItems(response.mediaList);
        }
      });
    });
  }

  function renderMediaItems(list) {
    if (!list || list.length === 0) {
      mediaList.innerHTML = '<div class="notice-box">Nenhuma mídia HTML5 ou stream detectado nesta aba ainda. Reproduza o vídeo e tente novamente.</div>';
      return;
    }

    mediaList.innerHTML = '';
    list.forEach((item, index) => {
      const mediaItem = document.createElement('div');
      mediaItem.className = 'media-item';

      const isChecked = index === 0 ? 'checked' : '';
      if (index === 0) selectedMediaUrl = item.url;

      mediaItem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="radio" name="selected-media" value="${item.url}" ${isChecked}>
          <div class="media-info">
            <span class="media-title" title="${item.title || item.url}">${item.title || 'Mídia Detectada ' + (index + 1)}</span>
            <span class="media-meta">${item.type || 'video'} • ${item.duration || 'Stream/Direto'}</span>
          </div>
        </div>
      `;

      mediaItem.querySelector('input').addEventListener('change', (e) => {
        selectedMediaUrl = e.target.value;
      });

      mediaList.appendChild(mediaItem);
    });
  }

  btnRefreshMedia.addEventListener('click', loadTabMedia);
  loadTabMedia();

  // Ação de Download da Mídia Capturada
  btnDownloadCapture.addEventListener('click', () => {
    if (!selectedMediaUrl) {
      alert('Selecione uma mídia da lista acima!');
      return;
    }

    const formatCheckboxes = document.querySelectorAll('input[name="format-type"]:checked');
    if (formatCheckboxes.length === 0) {
      alert('Selecione pelo menos um formato!');
      return;
    }

    const start = timeStart.value;
    const end = timeEnd.value;

    let successCount = 0;
    Array.from(formatCheckboxes).forEach(chk => {
      const formatType = chk.value;
      chrome.runtime.sendMessage({
        action: 'processMediaCapture',
        url: selectedMediaUrl,
        format: formatType,
        startTime: start,
        endTime: end,
        usePowerMode: isPowerMode
      }, (res) => {
        if (res && res.success) {
          successCount++;
          console.log(`Sucesso ao iniciar formato ${formatType}`);
        } else {
          console.error(`Erro no formato ${formatType}: ` + (res ? res.error : 'Desconhecido'));
        }
      });
    });
    const originalText = btnDownloadCapture.innerHTML;
    btnDownloadCapture.innerHTML = '<span>✅ Iniciado! Acompanhe o progresso...</span>';
    setTimeout(() => {
      btnDownloadCapture.innerHTML = originalText;
    }, 3000);
  });

  // Drag and Drop (Tab 2)
  dropzone.addEventListener('click', () => localFileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  localFileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileSelection(e.target.files[0]);
  });

  function handleFileSelection(file) {
    selectedFile = file;
    fileInfo.style.display = 'block';
    fileInfo.textContent = `📄 Arquivo: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  }

  // Conversão Local WASM
  btnConvertLocal.addEventListener('click', async () => {
    if (!selectedFile) {
      alert('Por favor, selecione um arquivo primeiro!');
      return;
    }

    progressBar.style.display = 'block';
    progressFill.style.width = '10%';
    statusText.textContent = 'Enviando arquivo para o Offscreen WASM...';

    const reader = new FileReader();
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      
      chrome.runtime.sendMessage({
        action: 'convertLocalWASM',
        fileData: Array.from(new Uint8Array(arrayBuffer)),
        fileName: selectedFile.name,
        targetFormat: targetFormat.value,
        startTime: localStart.value,
        endTime: localEnd.value
      }, response => {
        if (response && response.success) {
          progressFill.style.width = '100%';
          statusText.textContent = 'Conversão concluída! Arquivo baixado.';
        } else {
          statusText.textContent = 'Erro na conversão: ' + (response ? response.error : 'Falha WASM');
        }
      });
    };
    reader.readAsArrayBuffer(selectedFile);
  });

  // Testar Conexão Power Mode (Tab 3)
  btnTestPower.addEventListener('click', () => {
    powerTestResult.style.display = 'block';
    powerTestResult.textContent = 'Testando comunicação via Native Messaging pipe...';

    chrome.runtime.sendMessage({ action: 'checkHostStatus' }, res => {
      if (res && res.connected) {
        powerTestResult.style.background = 'rgba(16, 185, 129, 0.15)';
        powerTestResult.style.borderColor = '#10b981';
        powerTestResult.style.color = '#34d399';
        powerTestResult.textContent = `✅ Assistente Local Conectado! (Versão: ${res.version || '1.0.0'}, yt-dlp OK)`;
        checkHostStatus();
      } else {
        powerTestResult.style.background = 'rgba(244, 63, 94, 0.15)';
        powerTestResult.style.borderColor = '#f43f5e';
        powerTestResult.style.color = '#fda4af';
        powerTestResult.textContent = '❌ Host não encontrado. Execute o script host_installer.py para ativar.';
      }
    });
  });

  btnDownloadHost.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html#installer') });
  });

  btnOpenWelcome.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  });
});
