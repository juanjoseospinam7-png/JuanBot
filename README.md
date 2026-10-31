# 🪙 JUAN-BOT — Bot Multifuncional de WhatsApp

Bot de WhatsApp modular, avanzado y optimizado para funcionar 24/7 en Node.js.

## 🚀 Instalación en Windows (XAMPP / Node.js)
1. Instala **Node.js** (versión 18 o superior).
2. Abre la terminal en la carpeta del proyecto (`C:\xampp\htdocs\Juan-Bot`).
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Configura tu número de propietario en `.env`.
5. Inicia el bot:
   ```bash
   npm start
   ```
6. Escanea el código QR en tu terminal con tu aplicación de WhatsApp.

## 🔄 Mantener Activo 24/7 (PM2)
```bash
npm install pm2 -g
pm2 start index.js --name "juan-bot"
pm2 startup
pm2 save
```
