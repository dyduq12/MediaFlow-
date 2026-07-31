#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MediaFlow Pro - Script de Instalação do Native Messaging Host (Windows / Linux / macOS)
Registra o pipe 'com.extensao.downloader' para o Google Chrome com o ID exato da extensão.
"""

import os
import sys
import json
import glob

HOST_NAME = "com.extensao.downloader"

def get_script_path():
    return os.path.dirname(os.path.realpath(__file__))

def find_extension_ids():
    """Tenta encontrar automaticamente o ID da extensão instalada no Chrome."""
    ids = []
    local_app = os.environ.get('LOCALAPPDATA', '')
    if not local_app:
        return ids

    chrome_user_data = os.path.join(local_app, 'Google', 'Chrome', 'User Data')
    pref_files = glob.glob(os.path.join(chrome_user_data, '*', 'Preferences'))

    for pref_path in pref_files:
        try:
            with open(pref_path, 'r', encoding='utf-8', errors='ignore') as f:
                data = json.load(f)
            ext_settings = data.get('extensions', {}).get('settings', {})
            for ext_id, ext_info in ext_settings.items():
                path = str(ext_info.get('path', '')).lower()
                name = str(ext_info.get('manifest', {}).get('name', '')).lower()
                if 'extencao' in path or 'baixador' in path or 'mediaflow' in name:
                    if ext_id not in ids:
                        ids.append(ext_id)
        except Exception:
            pass

    return ids

def create_manifest_json(host_script_path, extension_ids):
    allowed_origins = [f"chrome-extension://{ext_id}/" for ext_id in extension_ids]
    
    manifest_data = {
        "name": HOST_NAME,
        "description": "MediaFlow Pro Native Messaging Host (yt-dlp wrapper)",
        "path": host_script_path,
        "type": "stdio",
        "allowed_origins": allowed_origins
    }
    manifest_path = os.path.join(get_script_path(), f"{HOST_NAME}.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
    return manifest_path

def install_windows(manifest_path):
    import winreg
    key_path = rf"Software\Google\Chrome\NativeMessagingHosts\{HOST_NAME}"
    try:
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
        winreg.SetValue(key, "", winreg.REG_SZ, manifest_path)
        winreg.CloseKey(key)
        print(f"✅ [Windows Registry] Host registrado com sucesso em: HKCU\\{key_path}")
        print(f"   Manifest: {manifest_path}")
    except Exception as e:
        print(f"❌ Erro ao escrever no Registro do Windows: {e}")

def main():
    print("=" * 65)
    print(" ⚡ MediaFlow Pro - Instalador do Host Nativo (yt-dlp) ")
    print("=" * 65)

    ext_ids = []

    # 1. Verifica se o ID foi passado por argumento de linha de comando
    if len(sys.argv) > 1 and len(sys.argv[1].strip()) >= 20:
        ext_ids.append(sys.argv[1].strip())
        print(f"📌 Usando ID fornecido por argumento: {ext_ids[0]}")

    # 2. Tenta encontrar automaticamente nos perfis do Chrome
    if not ext_ids:
        detected_ids = find_extension_ids()
        if detected_ids:
            ext_ids.extend(detected_ids)
            print(f"🔍 ID(s) detectado(s) automaticamente nos perfis do Chrome: {detected_ids}")

    # 3. Se ainda não encontrou, solicita ao usuário
    if not ext_ids:
        print("\nℹ️  Para registrar com segurança no Chrome, precisamos do ID da Extensão.")
        print("   Acesse chrome://extensions ➔ Copie o 'ID' da extensão (ex: pkednflcnbhbfioiafgjnhhffjkmmkbo).")
        user_input = input("\n👉 Digite ou cole o ID da sua extensão (ou Enter para tentar genérico): ").strip()
        if user_input:
            ext_ids.append(user_input)

    if not ext_ids:
        print("⚠️ Nenhum ID especificado. Execute novamente informando o ID da extensão.")
        ext_ids = ["pendente_id_chrome"]

    current_dir = get_script_path()
    python_exe = sys.executable
    py_host_path = os.path.join(current_dir, "yt_dlp_host.py")

    if sys.platform == "win32":
        bat_path = os.path.join(current_dir, "run_host.bat")
        with open(bat_path, "w", encoding="utf-8") as f:
            f.write(f'@echo off\n"{python_exe}" "{py_host_path}" %*\n')
        
        manifest_path = create_manifest_json(bat_path, ext_ids)
        install_windows(manifest_path)
    else:
        os.chmod(py_host_path, 0o755)
        manifest_path = create_manifest_json(py_host_path, ext_ids)

        if sys.platform == "darwin":
            dest_dir = os.path.expanduser("~/Library/Application Support/Google/Chrome/NativeMessagingHosts/")
        else:
            dest_dir = os.path.expanduser("~/.config/google-chrome/NativeMessagingHosts/")

        os.makedirs(dest_dir, exist_ok=True)
        dest_manifest = os.path.join(dest_dir, f"{HOST_NAME}.json")

        with open(manifest_path, "r", encoding="utf-8") as src, open(dest_manifest, "w", encoding="utf-8") as dst:
            dst.write(src.read())

        print(f"✅ [Linux/Mac] Manifest copiado para: {dest_manifest}")

    print("\n🎉 Instalação Concluída para o(s) ID(s):", ext_ids)
    print("Recarregue a extensão no Chrome (chrome://extensions) e teste o botão no popup ou na welcome page!\n")

if __name__ == "__main__":
    main()
