# ✋ AR Hand Tracker 2.0 & Multiplayer Duels dla Huawei MatePad 12 X

Aplikacja Augmented Reality (AR) do śledzenia dłoni i biometrycznego szkieletu w czasie rzeczywistym z pojedynkami multiplayer, zoptymalizowana pod urządzenia **Huawei (HarmonyOS)**, a w szczególności tablet **Huawei MatePad 12 X** (ekran 12 cali 144Hz, proporcje 3:2).

---

## 🚀 Nowości w wersji 2.0:

1. **Poprawione wykrywanie stron dłoni**:
   - Prawdziwa lewa ręka to teraz w 100% **Lewa**, a prawa to **Prawa**.
   - Dodano przycisk `✋` na pasku górnym do natychmiastowej zamiany stron, jeśli używasz niestandardowego ustawienia kamery.
2. **Płynność 60–144 FPS (Usunięcie lagów)**:
   - Zoptymalizowano silnik WebAssembly ML pod procesory mobilne.
   - Zlikwidowano obciążające filtry rozmycia na korzyść ultra-szybkich podwójnych linii neonowych.
   - Dodano zabezpieczenie przed kolejkowaniem klatek – zerowe opóźnienia sterowania!
3. **56+ Biometrycznych Punktów Dłoni (Przycisk `🔬`)**:
   - Oprócz standardowych 21 stawów, system wylicza teraz **56+ punktów biometrycznych**:
     - Środki kości (mid-phalanges)
     - Fałdy międzypalcowe (webbing)
     - Kłąb i kłąbik dłoni (muscle mounds)
     - Środek wnętrza dłoni
     - Cybernetyczną siatkę wireframe rozpiętą na dłoni.
4. **Nowa mechanika "Złap Gwiazdy" (Zaciśnięcie dłoni ✊)**:
   - Gwiazdki i diamenty nie wpadają już same do dłoni!
   - Kiedy gwiazdka znajdzie się w zasięgu ręki, pojawia się celownik **"ZACIŚNIJ DŁOŃ! ✊"**.
   - Aby zdobyć punkty, musisz fizycznie zacisnąć palce w pięść!
5. **⚔️ Tryb Rywalizacji Multiplayer (Z innego Wi-Fi / LTE)**:
   - Możliwość grania z drugą osobą znajdującą się w zupełnie innej sieci Wi-Fi lub na danych komórkowych (dzięki technologii WebRTC P2P).
   - Generowanie prostego 4-cyfrowego kodu pokoju (np. `4892`).
   - Tryby pojedynku (60 sekund):
     - 🍉 **Fruit Slicer Duel** – kto wytnie więcej owoców!
     - ⭐ **Złap Gwiazdy Duel** – wyścig w chwytaniu gwiazdek pięścią!
     - 🫧 **Bubble Pop Rush** – zbijanie baniek na czas!
   - Tablica wyników na żywo (`TY` vs `PRZECIWNIK`) oraz wskaźnik dłoni przeciwnika na Twoim ekranie!

---

## 📱 Jak zaktualizować na GitHub Pages:

1. Wejdź na swoje repozytorium na [github.com](https://github.com/TSPolonus/Ar-hands).
2. Kliknij **Add file** ➔ **Upload files**.
3. Zaznacz wszystkie pliki z folderu `C:\Users\adiku\Desktop\wykrywanie ręki` i przeciągnij je do okna przeglądarki na GitHubie.
4. Kliknij zielony przycisk **Commit changes**.
5. Za około 30 sekund odśwież stronę na tablecie:
   👉 **https://tspolonus.github.io/Ar-hands/**

---

## ⚔️ Jak grać w Multiplayerze (krok po kroku):

### Osoba 1 (Gospodarz):
1. Klika ikonę skrzyżowanych mieczy `⚔️` na górnym pasku.
2. Zostaje wygenerowany 4-cyfrowy kod (np. `4892`).
3. Podaje ten kod znajomemu (lub klika "Kopiuj kod").
4. Wybiera mini-grę i gdy pojawi się komunikat *"Przeciwnik połączony"*, klika **"ROZPOCZNIJ POJEDYNEK"**.

### Osoba 2 (Gracz z innego Wi-Fi / telefonu / tabletu):
1. Otwiera link `https://tspolonus.github.io/Ar-hands/` na swoim urządzeniu.
2. Klika `⚔️` ➔ przechodzi do zakładki **"DOŁĄCZ PRZEZ KOD"**.
3. Wpisuje 4-cyfrowy kod i klika **"POŁĄCZ"**.
4. Gra rozpoczyna się automatycznie dla obu graczy!
