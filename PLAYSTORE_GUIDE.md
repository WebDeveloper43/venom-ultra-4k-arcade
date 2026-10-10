# 📱 GOOGLE PLAY STORE & MOBILE APK GUIDE (VENOM ARCADE)

Aap ki game **100% Mobile & PC Responsive**, **Touchscreen Optimized**, aur **PWA Ready (Progressive Web App)** ban chuki hai.

---

## 🚀 3 Aasan Tareeqe Mobile me Chalane aur Play Store pe Dalne ke:

### Tareeqa 1: Direct Mobile Browser Installation (Zero Setup)
1. Apne mobile ke **Google Chrome** me game ka link open karein.
2. Top right par **3 dots (Menu)** par tap karein.
3. **"Install App"** ya **"Add to Home Screen"** select karein.
4. Game aap ke mobile me bilkul ek **Real Android App / Game** ki tarah install ho jaye gi aur Full Screen me chalegi!

---

### Tareeqa 2: Google Bubblewrap (Official Google Play Store TWA Tool) — Recommended! ⭐
Google ka official tool jo PWA ko 2 minute me Play Store ke liye ready **`.aab`** ya **`.apk`** bana deta hai:

1. Apne computer terminal me run karein:
   ```bash
   npm install -g @bubblewrap/cli
   ```
2. Initialize karein:
   ```bash
   bubblewrap init --manifest=http://your-domain.com/manifest.json
   ```
3. Build karein:
   ```bash
   bubblewrap build
   ```
4. Output file **`app-release-bundle.aab`** ko direct **Google Play Console** par upload kar dein!

---

### Tareeqa 3: Capacitor (Android Studio Native APK)
Agar aap isay Android Studio me open karke direct APK nikalna chahein:

1. Terminal me run karein:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "Venom Arcade" "com.venom.arcade"
   npx cap add android
   npx cap open android
   ```
2. Android Studio me **Build > Build APK(s)** par click karein aur apna APK download kar lein!

---

## ✨ Features Added for Mobile & Ludo Dice:
- **🎲 Real 3D Pip Dot Dice**: Ludo ke dice ke upar asli **1 se 6 Dot sockets** lagaye gaye hain (Face 1 Ruby red dot, Faces 2-6 crisp metallic engraved dots) jo 3D me ghoom kar number dikhate hain.
- **✨ Pulsing Movable Token Rings**: Dice roll ke baad sirf wohi token glow karte hain jo move ho sakte hain, aur mobile ke liye bottom token selector buttons bhi add kiye gaye hain.
- **📱 Touchscreen Friendly**: Har game (Car Racing touch steer buttons, Carrom drag power bar, Pool touch cue rotation, Chess tap-move, Tic Tac Toe) mobile aur tablet par silky smooth chalti hai.
- **⚡ Offline Service Worker (`sw.js`)**: Internet ke baghair bhi mobile me fast open hoti hai.
