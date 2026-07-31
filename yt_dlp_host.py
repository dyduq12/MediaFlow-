#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MediaFlow Pro - Host de Native Messaging (yt-dlp Integration)
Protocolo de comunicação Chrome Native Messaging via Stdin/Stdout
"""

import sys
import os
import json
import struct
import subprocess
import shutil

# Garante codificação UTF-8
if sys.platform == "win32":
    import msvcrt
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)

def read_message():
    """Lê uma mensagem JSON enviada pelo Chrome com prefixo de 4 bytes de tamanho."""
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length or len(raw_length) < 4:
        return None
    message_length = struct.unpack('@I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message_content):
    """Envia uma resposta JSON para o Chrome com o prefixo de 4 bytes de tamanho."""
    encoded_content = json.dumps(message_content).encode('utf-8')
    encoded_length = struct.pack('@I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()

def check_ytdlp():
    """Verifica se o yt-dlp está disponível no sistema."""
    return shutil.which("yt-dlp") is not None

def handle_download(payload):
    """Executa o download via yt-dlp com suporte a corte de seção (--download-sections)."""
    url = payload.get("url")
    fmt = payload.get("format", "mp4_audio")
    start_time = payload.get("startTime")
    end_time = payload.get("endTime")

    cmd = ["yt-dlp"]

    # Formato
    if fmt == "mp3":
        cmd.extend(["-x", "--audio-format", "mp3"])
    elif fmt == "mp4_mute":
        cmd.extend(["-f", "bestvideo"])
    else:
        cmd.extend(["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"])

    # Corte de tempo (Sections Trimming)
    if start_time or end_time:
        if start_time == "00:00:00" and not end_time:
            # Padrão, não faz corte
            pass
        else:
            s_time = start_time if start_time else "00:00:00"
            e_time = end_time if end_time else "inf"
            section_arg = f"*{s_time}-{e_time}"
            cmd.extend(["--download-sections", section_arg])

    # Destino dos downloads (Pergunta ao usuário)
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        
        default_dir = os.path.join(os.path.expanduser("~"), "Downloads")
        
        # Extensões sugeridas
        file_ext = ".mp4"
        if fmt == "mp3":
            file_ext = ".mp3"
            
        save_path = filedialog.asksaveasfilename(
            initialdir=default_dir,
            initialfile=f"MediaFlow_%(title)s{file_ext}",
            title=f"MediaFlow Pro: Salvar {fmt}",
            filetypes=[("Arquivo de Mídia", f"*{file_ext}"), ("Todos os Arquivos", "*.*")],
            defaultextension=file_ext
        )
        root.destroy()
        
        if not save_path:
            return {"success": False, "error": "Download cancelado pelo usuário."}
        
        downloads_path = save_path
    except Exception:
        # Fallback de segurança se o tkinter falhar
        downloads_path = os.path.join(os.path.expanduser("~"), "Downloads", "MediaFlow_%(title)s.%(ext)s")

    cmd.extend(["-o", downloads_path])
    cmd.append(url)

    try:
        if sys.platform == "win32":
            # Abre uma nova janela do CMD para mostrar o progresso. Adiciona pause para ver erros.
            cmd_str = " ".join([f'"{c}"' if " " in c else c for c in cmd])
            full_cmd = f'cmd.exe /c "{cmd_str} & echo. & echo Pressione qualquer tecla para fechar... & pause > nul"'
            subprocess.Popen(full_cmd, creationflags=subprocess.CREATE_NEW_CONSOLE)
        else:
            subprocess.Popen(cmd)
        
        return {"success": True, "message": "Download iniciado via yt-dlp em nova janela", "cmd": " ".join(cmd)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    while True:
        try:
            message = read_message()
            if message is None:
                break

            action = message.get("action")

            if action == "ping":
                send_message({
                    "status": "ok",
                    "version": "1.0.0",
                    "ytdlp": check_ytdlp()
                })
            elif action == "download":
                res = handle_download(message)
                send_message(res)
            else:
                send_message({"status": "unknown_action"})

        except Exception as e:
            send_message({"error": str(e)})
            break

if __name__ == '__main__':
    main()
