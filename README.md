# ✋ AR Hand Tracker & Mini-Games dla Huawei MatePad 12 X

Aplikacja Augmented Reality (AR) do śledzenia dłoni i rozpoznawania gestów w czasie rzeczywistym, stworzona i zoptymalizowana pod urządzenia **Huawei (HarmonyOS)**, a w szczególności tablet **Huawei MatePad 12 X** (ekran 12 cali 144Hz, proporcje 3:2, kamera z obsługą 60 FPS).

---

## 🌟 Funkcje aplikacji

1. **Pełny szkielet dłoni (21 punktów 3D)**:
   - Śledzenie każdego stawu, kości palców i nadgarstka przy użyciu Google MediaPipe.
   - Neonowe, świecące linie AR z efektem głębi i dynamicznym laserowym śladem czubka palca.
2. **Wykrywanie gestów w czasie rzeczywistym**:
   - 🤏 **Pinch** (szczypnięcie kciuk + wskazujący)
   - ✋ **Otwarta dłoń** (Open Palm)
   - ✊ **Zaciśnięta pięść** (Fist)
   - ☝️ **Palec wskazujący** (Point)
   - ✌️ **Znak pokoju / Victory**
   - 👍 **Kciuk w górę**
3. **4 Mini-Gry AR**:
   - 🍉 **Fruit Slicer AR**: Owoce wyskakują w przestrzeni przed kamerą. Twój palec staje się mieczem świetlnym AR! Uważaj na bomby.
   - 🫧 **Bubble Pop AR**: Zbijaj i uszczypuj unoszące się neonowe bańki, zdobywaj punkty i aktywuj złote bonusy.
   - ⭐ **Złap Gwiazdy AR**: Spadające kryształy i gwiazdki. Otwórz dłoń, aby wytworzyć pole magnetyczne AR łapiące obiekty do dłoni.
   - 🎹 **Cyber Synth AR**: Wirtualna perkusja i syntezator zawieszony w powietrzu. Dotykaj palcami kolorowych pól, aby grać melodie.
4. **Wbudowane audio bez pobierania**:
   - Dźwięki generowane proceduralnie przez Web Audio API (działa w 100% offline, bez dodatkowych plików mp3).

---

## 📱 Jak uruchomić i pobrać na tablet Huawei MatePad 12 X

### SPOSÓB 1: GitHub Pages (Zalecany – 100% darmowy, z bezpiecznym HTTPS)
Przeglądarki mobilne na tabletach wymagają bezpiecznego połączenia **HTTPS**, aby kamera mogła działać. GitHub Pages daje to za darmo:

1. Wejdź na [github.com](https://github.com) i utwórz nowe repozytorium (np. o nazwie `ar-hands`).
2. Kliknij **"uploading an existing file"** (lub przeciągnij wszystkie pliki z tego folderu do okna przeglądarki).
3. Kliknij zielony przycisk **"Commit changes"**.
4. W repozytorium wejdź w **Settings** (Ustawienia) ➔ z lewego menu wybierz **Pages**.
5. W sekcji **Branch** wybierz `main` (lub `master`), folder `/ (root)` i kliknij **Save**.
6. Po 1 minucie otrzymasz link, np.:  
   `https://twoj-login.github.io/ar-hands/`
7. Otwórz ten link na tablecie **Huawei MatePad 12 X** w przeglądarce **Huawei Browser** lub Chrome!

---

### 📲 Jak zainstalować jako Aplikację na Pulpicie MatePada (PWA)
Aplikacja została przygotowana jako **Progressive Web App (PWA)**:
1. Otwórz stronę z aplikacją na tablecie w przeglądarce.
2. Kliknij ikonę trzech kropek (menu przeglądarki) w prawym górnym rogu.
3. Wybierz opcję **"Dodaj do ekranu głównego"** (lub **"Zainstaluj aplikację"**).
4. Na pulpicie Twojego tabletu pojawi się ikonka dłoni **AR Hands**.
5. Po jej kliknięciu aplikacja otwiera się na pełnym ekranie (bez pasków przeglądarki), działając jak natywna gra z AppGallery!

---

### SPOSÓB 2: Uruchomienie lokalne na komputerze (i test przez Wi-Fi)
1. Uruchom plik `start_app.bat` (lub w terminalu wpisz `node server.js`).
2. W oknie konsoli pojawi się Twój adres lokalny, np. `http://localhost:3000`.
3. Możesz od razu przetestować aplikację na kamerze laptopa/komputera.

---

## 🎮 Klawisze i sterowanie na ekranie
- **🔄 Przełącznik kamery**: Przełączanie między kamerą przednią (do selfie i zabawy przy biurku) a kamerą tylną.
- **🪞 Odbicie lustrzane**: Odwraca widok z kamery w poziomie (naturalne przy przedniej kamerze).
- **🦴 Szkielet**: Włączanie/wyłączanie widoku linii i stawów dłoni.
- **🔊 Dźwięk**: Wyciszanie lub aktywowanie efektów dźwiękowych.
- **⛶ Pełny ekran**: Maksymalizuje widok na cały 12-calowy ekran tabletu MatePad.
