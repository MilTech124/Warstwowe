# Konstrukcja stalowa garaży z płyt warstwowych — dokumentacja

Dokument opisuje, jak realnie buduje się garaże z płyt warstwowych, jakie elementy, przekroje
i rozstawy stosują producenci, oraz jak te zasady są (i mają być) odwzorowane w konfiguratorze.
Wartości są praktyczne/orientacyjne — konfigurator służy do wizualizacji i ofertowania,
nie zastępuje projektu wykonawczego.

## 1. Jak realnie buduje się garaż z płyty warstwowej

- **Szkielet** — spawany (rzadziej skręcany) z ocynkowanych profili zamkniętych (kwadratowych
  i prostokątnych rur SHS/RHS), stal S235. Po spawaniu zaprawki cynkowe lub malowanie proszkowe.
- **Posadowienie** — płyta fundamentowa lub stopy/ława; słupy przez blachy podstawy (8–10 mm)
  kotwione kotwami rozporowymi lub wklejanymi M12 (4 szt. na stopę).
- **Ściany** — płyty warstwowe PIR układane **poziomo**, pasami o module 1 m, mocowane wkrętami
  z podkładką EPDM do słupów. Każdy pas łączy się z sąsiednim na zamek pióro–wpust
  (widoczna pozioma linia łączenia co 1 m).
- **Dach** — płyty warstwowe dachowe układane **wzdłuż spadu** (żebra prowadzą wodę),
  mocowane do płatwi/krokwi biegnących prostopadle do spadu.
- **Obróbki blacharskie** — cokół (listwa startowa u dołu ścian), narożniki, wiatrownice
  (krawędzie boczne dachu), pas nadrynnowy/okapowy, kalenica przy dwuspadzie, opaski otworów.

## 2. Elementy konstrukcji i ich rola

| Element | Rola |
|---|---|
| Słupy narożne | Główne podpory, zwykle o oczko większy profil niż słupy pośrednie |
| Słupy pośrednie | Podparcie płyt ściennych; rozstaw ograniczony rozpiętością płyty |
| Podwalina (profil startowy) | Dolny rygiel po obwodzie, oparcie pierwszego pasa płyt; przerwana w świetle bram i drzwi |
| Rygiel górny | Górny rygiel wieńczący ściany; na ścianach skośnych podąża za linią spadu |
| Krokwie | Belki wzdłuż spadu, przenoszą dach na ściany; na ścianach szczytowych rolę skrajnych krokwi pełni rygiel górny skośny |
| Płatwie | Belki prostopadłe do spadu, bezpośrednie podparcie płyt dachowych |
| Kalenica | Belka podłużna pod stykiem krokwi w dwuspadzie |
| Jętki | Poziome ściągi par krokwi w szerszych dwuspadach (rozpiętość ≥ ~4,5 m) |
| Słupek szczytowy | Słup pod kalenicą w ścianie szczytowej dwuspadu |
| Nadproże + słupki przybramowe | Wzmocniona rama otworu bramowego |
| Rygiel podokienny | Dolny rygiel podramy okna; oparcie dociętej płyty i słupka podokiennego |
| Słupek podokienny / nadprożowy | Odcinki słupa przerwanego otworem, oparte na podramie |
| Zastrzały narożne | Krótkie ukośniki słup–rygiel górny usztywniające szkielet |
| Rygiel pośredni ścian | Dodatkowy poziomy rygiel przy ścianach wyższych niż ~3 m |

Sztywność małego garażu zapewniają: spawane węzły ram, zastrzały narożne oraz tarcza
poszycia (płyty przykręcone do szkieletu). Osobne stężenia X pojawiają się dopiero
w obiektach halowych.

## 3. Typowe przekroje i rozstawy (praktyka producentów)

### 3.1 Rozstaw podpór poszycia

> **UWAGA — poprzednia wersja tej tabeli była błędna.** Podawała rozstaw słupów
> 1,20–1,80 m i płatwi 0,90–1,50 m. **To nie jest nośność płyty warstwowej.** Płyta
> warstwowa jest samonośna na kilku metrach — to jej podstawowa zaleta — a podane
> wartości odpowiadają raczej rozstawowi podpór dla blachy trapezowej albo gęstości
> linii mocowania. Skutek: konstrukcje wychodziły około **trzy razy za gęste**.
> Producenci dla lekkich ścian z rdzeniem 80–120 mm podają rozpiętości „do ~5 m".

Rozstaw podpór wynika z dopuszczalnej rozpiętości płyty (im grubszy rdzeń PIR, tym większa),
ale w praktyce ogranicza go też sztywność samego szkieletu i rozmieszczenie linii mocowania.
Poniższe wartości są **zachowawcze wobec katalogów producentów** — nie mamy tablic
konkretnego wyrobu, a wybór producenta jest w katalogu konfiguratora.

| Grubość płyty ściennej | Rozstaw słupów |
|---|---|
| 40 mm | ~2,00 m |
| 60 mm | ~2,40 m |
| 80 mm | ~2,80 m |
| 100 mm | ~3,20 m |
| 120 mm | ~3,60 m |

| Grubość płyty dachowej | Rozstaw płatwi |
|---|---|
| 40 mm | ~1,60 m |
| 60 mm | ~1,95 m |
| 80 mm | ~2,30 m |
| 100 mm | ~2,65 m |
| 120 mm | ~3,00 m |

Rozstaw płatwi jest dodatkowo korygowany strefą śniegową (płyta też przenosi śnieg).

### 3.1a Przekrój ze zginania, nie z rozpiętości

Szerszy rozstaw oznacza, że każda belka zbiera szerszy pas obciążenia, więc **przekroju
nie wolno dobierać z samej rozpiętości**. Płatwie i krokwie idą przez
`pickProfileByBending`: q = obciążenie × pas zbierany, M = qL²/8, σ = M/Wy ≤ f_y.

Obciążenie połaci liczone jest ze strefy śniegowej (PN-EN 1991-1-3, załącznik krajowy):
sk = 0,7 / 0,9 / 1,2 / 1,6 / 2,0 kN/m² dla stref 1–5, s = 0,8·sk, kombinacja 1,35·G + 1,5·S.
Dzięki temu strefa śniegowa wpływa na PRZEKRÓJ, a nie tylko na rozstaw.

Ta zmiana ujawniła, że poprzedni dobór był **niedowymiarowany**: płatew RHS 60×40×2 ma
Wy = 6,4 cm³, a przy rozstawie 1,2 m i rozpiętości 3,22 m wymagane było 10,3 cm³. Model był
więc jednocześnie za gęsty i za słaby — rzadsze podpory z prawidłowym przekrojem wychodzą
**lżejsze** (44 kg wobec 65 kg dla płatwi garażu 3,5 × 6 m).

Gdy nawet najmocniejszy profil z tablicy nie przenosi momentu, model zgłasza
ostrzeżenie `section_capacity` zamiast po cichu przyjąć zbyt słaby przekrój.

### 3.2 Dobór przekrojów wg rozpiętości elementu

| Rola | Warunek | Profil |
|---|---|---|
| Słup pośredni | ściana ≤ 3,0 m | 60×60×2 |
| Słup pośredni | ściana 3,0–3,6 m | 70×70×2 |
| Słup pośredni | ściana > 3,6 m | 80×80×3 |
| Słup narożny | zawsze o stopień większy od pośredniego | 70×70×2 / 80×80×3 / 100×100×3 |
| Krokiew | rozpiętość ≤ 3,5 m | 60×40×2 |
| Krokiew | rozpiętość 3,5–5,0 m | 80×60×3 |
| Krokiew | rozpiętość 5,0–7,0 m | 100×60×3 |
| Krokiew | rozpiętość > 7,0 m | 120×60×4 |
| Płatew | rozpiętość ≤ 3,5 m | 40×40×2 |
| Płatew | rozpiętość > 3,5 m | 60×40×2 |
| Podwalina / rygiel górny | jak słup pośredni (spójny system) | 60×60×2 → 80×80×3 |
| Nadproże bramy | zawsze wzmocnione | ≥ 80×80×3 |
| Jętka / zastrzał | — | 40×40×2 / 50×50×2 |

## 4. Konstrukcja a typ dachu

Zasada nadrzędna: **płatwie zawsze prostopadle do spadu** (płyty dachowe muszą leżeć
żebrami wzdłuż spływu wody).

- **Jednospad (tył/przód)** — spad wzdłuż długości: krokwie biegną wzdłuż budynku
  od ściany wysokiej do niskiej, płatwie poziomo w poprzek na malejących wysokościach.
- **Jednospad (lewo/prawo)** — spad w poprzek: krokwie w poprzek szerokości (pochylone),
  płatwie wzdłuż budynku.
- **Dwuspad** — pary krokwi od okapów do kalenicy, belka kalenicowa, słupek szczytowy
  w ścianach szczytowych, jętki przy rozpiętości ≥ ~4,5 m, płatwie na obu połaciach.
- **Spadki minimalne** — jednospad ≥ 5–7 % (przy połaciach sztukowanych z kilku płyt ≥ 10 %),
  dwuspad ≥ ~5° (w konfiguratorze 18–45 %).

## 5. Zmiany konstrukcji z rozmiarem

| Obiekt | Szerokość | Charakter konstrukcji |
|---|---|---|
| Garaż pojedynczy | do ~4,3 m | Profile 60 mm, słupy co ~1,2–1,4 m |
| Garaż podwójny | do ~5,5 m | Profile 70–85 mm, gęstsze podparcie dachu |
| Garaż duży / wielostanowiskowy | do ~7 m | Profile 80–100 mm, jętki w dwuspadzie |
| Hala | od 7 m | Ramy portalowe, rygle ścienne, stężenia X (osobna klasa w kodzie) |

Progi klas w kodzie: `getStructureClass()` w `src/scene/geometry.js`
(garage_frame < 7 m szerokości < portal_hall, heavy_hall od 12 m szer. lub 20 m dł.).

## 6. Normy (kontekst)

Wykonawstwo konstrukcji stalowych reguluje PN-EN 1090, obciążenia i nośność Eurokody
(PN-EN 1991, PN-EN 1993), ochronę antykorozyjną m.in. PN-EN ISO 1461 (cynkowanie).
Dopuszczalne rozpiętości płyt zawsze według tabel obciążeniowych konkretnego producenta.
**Konfigurator jest narzędziem wizualizacyjno-ofertowym — wymiarowanie konstrukcji
pod konkretną lokalizację (śnieg/wiatr) wykonuje uprawniony konstruktor.**

## 7. Odwzorowanie w kodzie

Konstrukcja jest **czystym modelem** — `buildStructure(inputs)` zwraca listę elementów
(rola, profil, początek, koniec, długość, masa jednostkowa) bez JSX i bez obiektów `three`.
Ten sam model zasila scenę 3D, zestawienie stali i rysunki wektorowe w PDF.

- `src/config/steelProfiles.js` — katalog profili (SHS/RHS, IPE/HEA, Z/C) z masami `kgPerM`
  wg tablic wyrobów oraz tabele doboru wg rozpiętości. `pickProfile(tables, role, span, stepUp)`
  — `stepUp` realizuje wzmocnienie „o stopień wyżej".
- `src/scene/structure/spec.js` — `garageSpec` / `hallSpec`: rozstawy z tabel 3.1
  (interpolacja po grubości PIR odtwarza tabelę dokładnie), przekroje z tabeli 3.2,
  poziomy konstrukcji (`REINFORCEMENT_LEVELS`) i korekta strefą śniegową.

  | Poziom | Rozstawy | Profile | Charakter |
  |---|---|---|---|
  | **Lekka** | ×1,25 (szersze od tabeli) | z tabeli | mniej słupów, płatwi i ram; ostrzeżenie ofertowe |
  | **Standard** | ×1,00 (tabela 3.1) | z tabeli | praktyka producentów |
  | **Wzmocniona** | ×0,85 | +1 stopień | zastrzały przy wszystkich osiach krokwi, stężenia X |

  Wariant lekki jest fizycznie uzasadniony — płyta warstwowa ma zapas nad wartościami
  tabelarycznymi (100 mm PIR przenosi kilkumetrowe rozpiętości) — ale margines sztywności
  szkieletu jest mniejszy, dlatego `buildStructure` dokłada ostrzeżenie
  `light_structure` (albo mocniejsze `light_structure_risk` przy cienkiej płycie
  lub strefie śniegowej ≥ 4). Rozstaw ram hal jest twardo ograniczony do 6 m,
  a rozstaw krokwi do 3,2 m, żeby wariant lekki nie wyszedł poza tabelę doboru płatwi.
- `src/scene/structure/garage.js` — szkielet garażu. **Kolejność doboru jest istotna:**
  najpierw linie nośne połaci (ich rozstaw wynika z nośności płatwi), potem słupy
  dogęszczane pod nimi do rozpiętości płyty. Każda krokiew stoi na słupie i nie powstaje
  krata krokwi × płatwi. W dwuspadzie pierwsza płatew idzie tuż przy kalenicy — inaczej
  górna krawędź płyty wisi bez podparcia między krokwiami.

  **Rygiel górny skośny ≠ krokiew.** Dwie skrajne linie połaci leżą na ścianach biegnących wzdłuż
  spadu, czyli NA słupach co ~1,2–1,8 m. Ich rozpiętość to rozstaw słupów, więc dostają
  profil rygla górnego (`rakedTopRail`). Tylko krokiew pośrednia rozpina się swobodnie między
  ścianami szczytowymi i wymaga przekroju z tabeli krokwi. Dobieranie profilu skrajnej
  linii z pełnej długości ściany dawało w garażu 3,5 m RHS 100×60×3 na 5,7 m tam, gdzie
  realna rozpiętość wynosi 1,15 m — to była **największa pojedyncza pozycja masy**.

  **Krokwi pośrednich może nie być wcale.** Lekka płatew przenosi ~3,5 m, więc dopóki
  budynek jest węższy, płatwie leżą wprost na obu ryglach górnych skośnych. Krokiew dochodzi
  dopiero wtedy, gdy rozpiętość płatwi przekroczyłaby jej nośność (garaż 3,5 m → 0 krokwi,
  6 m → 1, 7 m → 2).

  **Blachy podstawy tylko tam, gdzie realnie są.** Szkielet garażowy jest spawany, a do
  płyty kotwiona jest PODWALINA (co ~1 m); słupki pośrednie są w nią wspawane i nie mają
  własnych stóp. Stopa z 4 kotwami pod każdym słupkiem dawała 56 kotew w garażu 3,5 × 6 m.

  **Podwalina, rygiel górny i rygiel pośredni są CIĄGŁE.** Słupy są do nich przyspawane, więc
  przerywają je tylko otwory sięgające posadzki. Przycinanie przy każdym słupie dawało
  kilkanaście krótkich odcinków (w tym 20-centymetrowe skrawki), czego nikt nie spawa
  i co zaśmiecało zestawienie stali. W halach rygiel i podwalina są przerywane wyłącznie
  słupami RAM — przez słupki pośrednie przechodzą ciągiem i są do nich przykręcone
  (wcześniej wychodziło 44 odcinki po ~1,6 m zamiast pełnych przęseł po ~3,3 m).
- `src/scene/structure/hall.js` — hala z ramami portalowymi. Płyty ścienne leżą **poziomo**,
  więc ściany dostają **słupki pośrednie** w rozstawie z rozpiętości płyty; rygle poziome
  usztywniają szkielet, ale nie są podporą poszycia — dlatego ich rozstaw to ~1,8–2,0 m,
  a nie ~1,05 m (gęstsze rygle podwajały funkcję słupków i szło na nie ~9% masy hali).
  Ramy to **IPE, nie HEA** (rama pracuje na zginanie w swojej płaszczyźnie, gdzie
  dwuteownik wąskostopowy daje nośność taniej — a na słupach idzie ~25–30% masy).
  Płatew kalenicowa jest PŁATWIĄ (Z, stopień wyżej), nie ryglem ramy. Stężenia krzyżowe
  to **ściągi prętowe** M16/M20 pracujące na rozciąganie, nie profile zamknięte;
  na ściskanie pracuje tylko zastrzał podokapowy i on zostaje SHS.

### Orientacyjna masa konstrukcji (poziom Standard)

| Obiekt | Masa | kg/m² |
|---|---|---|
| Garaż 3,5 × 6 | ~354 kg | 16,9 |
| Garaż 6 × 6 | ~559 kg | 15,5 |
| Hala 9 × 15 | ~4,5 t | 33,6 |
| Hala 12 × 24 | ~8,8 t | 30,7 |

Wariant Lekki schodzi niżej, Wzmocniony rośnie. Wartości do kontroli przy zmianach reguł —
jeśli garaż wychodzi grubo powyżej 20 kg/m², a hala powyżej 40 kg/m², coś jest przeszacowane.
Strefy śniegowe 4–5 podnoszą masę wyraźnie i to jest poprawne: przekrój wynika z obciążenia.
- `src/scene/structure/openings.js` — **każdy** otwór w ścianie zmienia szkielet, także okno.
  `openingBandsAtCoord` zwraca pionowe pasy zajęte przez otwory w osi słupa, a
  `addPostWithOpenings` (parts.js) liczy z nich odcinki słupa. Jedna reguła obsługuje oba
  warianty: otwór do posadzki (brama/drzwi) zostawia tylko słupek nadprożowy, okno dzieli
  słup na słupek podokienny i nadprożowy. Każdy otwór dostaje podramę: stojaki + nadproże,
  a okno dodatkowo rygiel podokienny. Okna dachowe (`wall === "roof"`) nie dotyczą ścian.
- **Konwencja współrzędnej otworu (pułapka).** `openingWallCoord` — jak
  `wallOpeningAxisCenter` w geometry.js i `wallOpeningRects` w WallPanels.jsx — zwraca
  **surową współrzędną świata** wzdłuż ściany: `x` dla przód/tył, `z` dla lewa/prawa.
  Ujemny offset ścian „back" i „left" jest już w niej zawarty. Nie wolno mnożyć jej
  po raz drugi przez współczynnik znaku — taki błąd odbija geometrię wyłącznie na
  ścianie lewej (na prawej znak to +1, a na tylnej bywa ignorowany), więc łatwo
  go przeoczyć. Zdarzył się dwa razy: w `openingPoint` i w `elevationSvg`.
- **Wyjątek:** słupa ramy portalowej w hali nie dzielimy pasem okiennym — to główna droga
  obciążenia. Szklenie jest w rzeczywistości podzielone słupem na pola między ramami,
  więc model zgłasza ostrzeżenie `window_crosses_frame` zamiast ciąć słup.
- `src/scene/structure/collector.js` — zbiera elementy, liczy długości z osi (nie z geometrii
  mesha, która jest wydłużona o `overlapM`), w trybie dev wykrywa duplikaty i elementy pokrywające się.
- `src/scene/StructureSystem.jsx` — cienki renderer: mapuje tablice modelu na meshe.
  Memoizacja po wąskim wycinku configu (`structure/inputs.js`), żeby zmiana kamery czy koloru
  rynny nie wymuszała rekoncyliacji kilkuset meshy.
- Poszycie: `src/scene/WallPanels.jsx` — pasy poziome co 1 m z zamkami, płyty i rdzeń
  docinane wokół otworów; `src/scene/FlashingSystem.jsx` — cokół, narożniki, obróbki dachu.

## 8. Ofertowanie: BOM, rysunki, PDF

- `src/lib/bom/steelBom.js` — zestawienie stali: rola × profil → szt., długość, masa
  (`lengthM × kgPerM`), blachy podstawy z pola × grubości × gęstości, kotwy, drobnica;
  `steelOrderByProfile` daje zapotrzebowanie hutnicze z 5% zapasem na docinanie.
- `src/lib/bom/panelBom.js` — powierzchnia ścian netto (całkowanie po `wallTopHeightAt`,
  minus otwory) i **pochylona** powierzchnia połaci; `accessoryBom.js` — obróbki i orynnowanie.
- `src/lib/projectSummary.js` — jedno źródło treści opisowej dla panelu i PDF.
- `src/lib/drawings/*` — rzut, przekrój ramy i elewacje jako SVG generowane z modelu.
- `src/lib/pdf/*` — dokument zamówienia w pdfmake (przypięty `0.3.11`), ładowany leniwie.
  **PDF nie zawiera wyceny** — katalog nie ma cennika, więc rubryki cenowe zostają puste
  do ręcznego uzupełnienia. Warstwę cenową można dołożyć bez zmian w generatorze.
- `src/lib/capture/captureViews.js` — zrzuty widoków 3D; kamera ustawiana imperatywnie
  z pominięciem animacji, `showDimensions` wymuszone na `false` (etykiety miarek są w DOM
  i nie trafiają do bufora WebGL — wymiary idą na rysunki wektorowe).

## 9. Mapa drogowa

1. **Tabele producentów płyt** — zastąpienie wartości orientacyjnych rzeczywistymi kartami
   (Kingspan, Balex, Pruszyński…), wybór producenta już istnieje w katalogu.
2. **Cennik** — `src/config/pricing.js` (zł/kg stali, zł/m² płyt wg grubości, ceny bram),
   po dodaniu PDF policzy netto/VAT/brutto w istniejących rubrykach.
3. **Profile dwuteowe w 3D** — `Beam.jsx` rysuje wyłącznie `boxGeometry`; hale mają poprawne
   etykiety IPE/HEA i masy, ale wizualizacja przekroju jest przybliżona.
4. **Strefa wiatrowa** — analogicznie do strefy śniegowej, korekta rozstawu słupów.
5. **Detale montażowe** — łączniki, wentylacja, świetliki kalenicowe.
