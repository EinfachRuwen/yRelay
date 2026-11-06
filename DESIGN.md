# yRelay – Gestaltung

yRelay ist der direkte Draht zu Ruwen: Eingeladene schicken Nachrichten, Wichtiges und Notfälle an seinen KI-Agenten und sehen, wie jede Nachricht ankommt und beantwortet wird. Die Gestaltung leiht sich ihre Sprache von der **deutschen Verkehrsbeschilderung** – einem System, das jede Person im Alltag liest, bei dem jede Farbe eine feste Bedeutung hat und das unter Zeitdruck funktionieren muss.

Die Welt liefert nur vier Dinge: Schrift, Farben, Dichte und eine Signatur. Navigation, Formulare und Bedienelemente bleiben gewöhnliche Web-Bausteine.

## Farben (RAL-Verkehrsreihe)

Jede Farbe hat genau eine Aufgabe. Keine Verläufe, kein Glas, keine farbigen Schatten.

| Token | Wert | Aufgabe |
|---|---|---|
| `--blau` | `#0e518d` (RAL 5017 Verkehrsblau) | Kopfband, Navigation, Stufe „Normal“, primäre Aktionen |
| `--orange` | `#e5531f` (RAL 2009 Verkehrsorange) | Stufe „Wichtig“, „Du bist dran“ – Text darauf immer schwarz |
| `--rot` | `#c4120f` (RAL 3020 Verkehrsrot) | Stufe „Notfall“, Sofort-Alarm, Zustellfehler |
| `--gelb` | `#f2c500` (RAL 1003 Signalgelb) | „In Bearbeitung“ (Baustelle), Textauswahl |
| `--gruen` | `#00774a` (RAL 6024 Verkehrsgrün) | „Erledigt“, Erfolg |
| `--tinte` | `#1c1e1f` (RAL 9017) | Text |
| `--grund` / `--flaeche` | `#eceeed` / `#ffffff` | Seitengrund / Tafeln |

Das dunkle Design (`prefers-color-scheme` oder Umschalter im Nutzermenü) nutzt einen Asphaltgrund und eine aufgehellte Linienfarbe `--blau-linie: #3a7cc0`, damit die Linien lesbar bleiben.

## Schrift

**Schild** – eine umbenannte Web-Teilmenge von D-DIN (Datto, SIL OFL 1.1, siehe `public/fonts/OFL.txt`). DIN ist die Schrift der deutschen Straßenschilder.

- Überschriften, Uhrzeiten, Zahlen: *Schild Condensed* Bold
- Fließtext und Bedienelemente: *Schild* Regular/Bold, 16 px, Zeilenhöhe 1,45
- Ziffern immer tabellarisch (`font-variant-numeric: tabular-nums`)
- Keine Versal-Etiketten mit Sperrung, keine Eyebrow-Labels über Überschriften

Selbst gehostet, kein Google-Fonts-Abruf (DSGVO).

## Signatur: der Linienplan

Jede Nachricht ist eine Fahrt mit Haltestellen – gezeichnet wie ein Linienverlauf im Nahverkehr: **Übergabe → Antworten → Ziel**.

- Linienfarbe = Dringlichkeit (blau / orange / rot)
- Gefüllter Haltepunkt = erreicht, hohler pulsierender Punkt = wartet, grüner Haken = erledigt, gelb = in Bearbeitung, rotes Kreuz = Zustellung gestört
- Die gestrichelte Strecke führt zur noch offenen Haltestelle

Dieselbe Linie trägt den Stundenplan im Schul-Dashboard (vergangene Stunden grau, laufende markiert) und das Beispiel auf der Anmeldeseite.

## Formen und Bausteine

- **Wegweiser-Logo**: weiße Pfeiltafel mit Spitze nach rechts – yRelay leitet weiter.
- **Verkehrszeichen-Plaketten**: Sofort-Alarm, Spiele und Einführung zeigen Piktogramme auf Tafeln mit weißem Innenrand wie echte Schilder.
- **Radien klein** (3 / 5 / 8 px), Rahmen 1 px, Eingaben 2 px. Tiefe nur für schwebende Ebenen (Menü, Modal, Toast).
- **Icons**: Phosphor (MIT), als Sprite `public/img/icons.svg`, über `UI.icon(name)`. Keine Emoji als Icons. Das Sprite wird aus den Phosphor-Rohdaten erzeugt; neue Icons dort ergänzen.
- **Stufenwahl**: Die ganze Verfasser-Tafel nimmt die Farbe der gewählten Stufe an (Kopfkante, Fokusrahmen, Senden-Knopf).
- **Alarm-Effekt**: Beim Auslösen fährt ein großes Verkehrszeichen ins Bild – eine einzige, abgestimmte Bewegung statt verstreuter Effekte. `prefers-reduced-motion` wird respektiert.

## Aufbau

- Kopfband in Verkehrsblau mit Bereichen (Nachrichten, Schule, Spiele, Verwaltung) und Nutzermenü (Profil, Passwort, Design, Abmelden).
- Unter 760 px wandert die Navigation in eine untere Leiste; Modals öffnen als Blatt von unten.
- Verwaltung mit Seitennavigation; Übersicht mit eigenen Säulen statt externer Diagramm-Bibliothek.
- E-Mails nutzen dieselbe Farbwelt (heller Grund, Tafel mit farbiger Kopfkante nach Anlass).

## Was vermieden wird

Indigo/Violett, Verläufe, Glas und Unschärfe als Dekoration, Inter, Emoji als Icons, Karten in Karten, Icon-Kacheln über Überschriften, farbige Seitenstreifen an Karten, Kennzahlen-Heldenblöcke, Pfeile an jeder Beschriftung.
