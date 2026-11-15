# Digital Compass: GPS, Map & Qibla

Features: live digital compass, Qibla direction (with haptic "aligned" buzz), GPS details
(lat/lon/altitude/speed/accuracy), and an OpenStreetMap map with a line to the Kaaba.

## Build the Android APK with GitHub (no Android Studio needed)
1. Create a new repository on github.com.
2. Upload the *contents* of this folder (including the hidden `.github` folder) to the repo's `main` branch.
3. Open the **Actions** tab -> **Build Android APK** -> wait ~5-8 minutes (or click **Run workflow**).
4. Open the finished run -> **Artifacts** -> download `DigitalCompass-debug-apk`, unzip, and install `app-debug.apk` on your phone
   (allow "Install unknown apps").

## Run locally in a browser
    npm install
    npm start        # http://localhost:8080 (compass sensor needs HTTPS or a phone)

## Customize
- App name/ID: `capacitor.config.json`
- UI/logic: `src/` (index.html, style.css, app.js)
- App icon: after `npx cap add android`, replace `android/app/src/main/res/mipmap-*` icons
  (or use `@capacitor/assets`).

Note: Compass accuracy depends on your phone's magnetometer. Calibrate by moving it in a figure 8.
Map tiles need internet. For Play Store release, build a signed release AAB in Android Studio.
