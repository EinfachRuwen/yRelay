# yRelay – Designsystem „Stellwerk“

yRelay leitet Nachrichten von eingeladenen Menschen an KI-Agenten weiter – vom Einkaufszettel bis zur Türklingel um Mitternacht. Die Oberfläche ist ein Werkzeug (Operate-Modus): Sie soll sofort vertraut wirken und im Alltag verschwinden. Ausdruck zeigt sich in Präzision, nicht in Effekten.

## Leitidee

Ein Relais ist ein Stellwerk. Jede Nachricht bekommt ein **Signal**: Fahrt (Standard), Achtung (Wichtig), Halt (Notfall). Diese drei Farben tragen Bedeutung und werden nirgends als Dekoration verwendet. Die Signalwahl beim Senden ist das einzige auffällige Element; alles darum bleibt ruhig.

## Farbe

Hell ist Standard, Dunkel folgt der Systemeinstellung (Nachts an der Tür, abends auf dem Sofa). Alle Werte liegen als Tokens in `public/css/style.css`.

| Token | Hell | Dunkel | Rolle |
|---|---|---|---|
| `--grund` | `#EEF0EC` | `#121815` | Seitenhintergrund (kühles Kreidegrau) |
| `--flaeche` | `#FFFFFF` | `#1A211D` | Arbeitsflächen |
| `--flaeche-2` | `#E4E8E3` | `#222B26` | Zweite Neutralebene: Leisten, Felder, Tabs |
| `--linie` | `#D3D9D2` | `#2E3832` | Trennlinien, Rahmen |
| `--tinte` | `#17201C` | `#E8EDE9` | Text |
| `--tinte-2` | `#4D5952` | `#A9B5AE` | Sekundärtext |
| `--signal` | `#1E6B52` | `#4FB38C` | Fahrt: Primäraktionen, Auswahl, Fokus |
| `--achtung` | `#9A5B00` | `#E3A33B` | Wichtig |
| `--halt` | `#B42318` | `#F0705F` | Notfall, Fehler, Löschen |

Akzentfarbe nur für Primäraktionen, aktuelle Auswahl und Status. Sekundärtext auf farbigen Flächen wird aus der Flächenfarbe abgeleitet, nie grau.

## Schrift

Eine Familie: **Atkinson Hyperlegible Next** (selbst gehostet, `public/fonts/`). Vom Braille Institute für maximale Lesbarkeit entworfen – passend für eine App, die auch im Notfall und von Menschen jeden Alters gelesen wird. Feste rem-Stufen im Verhältnis ~1.2:

`--t-klein 0.8125rem · --t-ui 0.9375rem · --t-text 1rem · --t-gross 1.1875rem · --t-titel 1.4375rem · --t-seite 1.75rem`

Labels in Satzschreibung, keine Großbuchstaben-Labels, keine Überzeilen über Überschriften. Zeiten und Zahlen mit `tabular-nums`.

## Form und Tiefe

- Radien nach Hierarchie: Steuerelemente 8 px, Flächen 12 px, nur Status-Badges sind Pillen.
- Flächen trennen sich durch 1-px-Linien, nicht durch Schatten. Schatten (mit Versatz und weicher Unschärfe) nur für schwebende Ebenen: Dialog, Menü, Toast.
- Kein Glas, keine Verläufe, keine farbigen Seitenstreifen an Karten.

## Icons

Gezeichnete Lucide-Icons (ISC-Lizenz) als SVG-Sprite in `public/img/icons.svg`, eingebunden über `UI.icon(name)`. Emoji gehören in Inhalte (Spiele, Nachrichten), nicht in die Bedienoberfläche.

## Bewegung

150–200 ms für Zustandswechsel, `ease-out`. Keine Einblend-Choreografie beim Laden. Die Spezialaktionen (Türklingel, SOS …) behalten ihre Vollbild-Effekte – sie sind die eine bewusste Inszenierung und melden einen echten Zustand. `prefers-reduced-motion` wird respektiert.

## Navigation

Eine gemeinsame Kopfzeile für alle Bereiche (`UI.kopfzeile`). Auf dem Handy wandern die Bereiche in eine Leiste am unteren Rand, erreichbar mit dem Daumen.

## Sprache

Knöpfe benennen ihre Aktion („Notfall senden“, nicht „Absenden“). Fehlermeldungen sagen, was passiert ist und was zu tun ist. Leere Zustände zeigen den nächsten Schritt.
