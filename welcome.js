document.addEventListener('DOMContentLoaded', () => {
  const extIdStr = chrome.runtime.id;
  const display1 = document.getElementById('extension-id-display');
  const display2 = document.getElementById('extension-id-display-2');
  if (display1) display1.textContent = extIdStr;
  if (display2) display2.textContent = extIdStr;

  const btnTestNative = document.getElementById('btn-test-native-welcome');
  const statusSpan = document.getElementById('diagnostic-status');
  const outputDiv = document.getElementById('diagnostic-output');

  btnTestNative.addEventListener('click', () => {
    statusSpan.textContent = 'Status: Testando...';
    statusSpan.style.color = '#eab308';

    outputDiv.style.display = 'block';
    outputDiv.textContent = 'Enviando pacote PING via chrome.runtime.sendNativeMessage("com.extensao.downloader")...';

    chrome.runtime.sendMessage({ action: 'checkHostStatus' }, (response) => {
      if (response && response.connected) {
        statusSpan.textContent = 'Status: ✅ CONECTADO (Modo Power Ativo)';
        statusSpan.style.color = '#34d399';

        outputDiv.style.background = 'rgba(16, 185, 129, 0.15)';
        outputDiv.style.borderColor = '#10b981';
        outputDiv.style.color = '#34d399';
        outputDiv.innerHTML = `
          <strong>Sucesso! O Assistente Local respondeu com êxito.</strong><br>
          • Host: com.extensao.downloader<br>
          • Versão: ${response.version || '1.0.0'}<br>
          • yt-dlp disponível: ${response.ytdlp ? 'Sim' : 'Não (Instale o yt-dlp para recursos avançados)'}
        `;
      } else {
        statusSpan.textContent = 'Status: ❌ DESCONECTADO (Modo Padrão Ativo)';
        statusSpan.style.color = '#fda4af';

        outputDiv.style.background = 'rgba(244, 63, 94, 0.15)';
        outputDiv.style.borderColor = '#f43f5e';
        outputDiv.style.color = '#fda4af';
        outputDiv.innerHTML = `
          <strong>Host nativo não detectado.</strong><br>
          Motivo: ${response ? response.error : 'O assistente não está registrado no Registro do SO.'}<br><br>
          <em>Para ativar, execute <code>install_host.bat</code> na pasta da extensão ou cole o comando CMD abaixo.</em>
        `;
      }
    });
  });

  // Copiar comando CMD
  const btnCopyCmd = document.getElementById('btn-copy-cmd');
  const copyStatus = document.getElementById('copy-status');
  const cmdBox = document.getElementById('cmd-command-box');

  function copyCmdToClipboard() {
    const cmdText = `python host_installer.py ${chrome.runtime.id}`;
    navigator.clipboard.writeText(cmdText).then(() => {
      copyStatus.style.display = 'inline';
      setTimeout(() => {
        copyStatus.style.display = 'none';
      }, 3000);
    });
  }

  if (btnCopyCmd) btnCopyCmd.addEventListener('click', copyCmdToClipboard);
  if (cmdBox) cmdBox.addEventListener('click', copyCmdToClipboard);
});
