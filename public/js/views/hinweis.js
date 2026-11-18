// yRelay - Hinweisseite: private Instanz + vorsorgliche Datenschutzinformationen
// Erreichbar ohne Anmeldung unter /#hinweis (und /hinweis, wird umgeleitet).
// Inhalt bei jeder datenschutzrelevanten Änderung prüfen (siehe CLAUDE.md und docs/PRIVAT-HINWEIS.md).
const HinweisView = {
  stand: '18. November 2026',

  rendern() {
    const zurueck = (typeof App !== 'undefined' && App.nutzer) ? '#dashboard' : '#login';
    const zurueckText = (typeof App !== 'undefined' && App.nutzer) ? 'Zurück zu yRelay' : 'Zurück zur Anmeldung';
    return `
      <div class="solo hinweis-seite">
        <div class="solo-tafel hinweis-tafel">
          <span class="wegweiser wegweiser-blau">yRelay</span>

          <h1>Private Instanz</h1>
          <p class="unterzeile">Kurz gesagt: Das hier ist kein öffentlicher Dienst.</p>
          <div class="tafel hinweis-kurz">
            <p>Diese yRelay-Instanz betreibt <strong>Ruwen Hohnholz</strong> privat und ohne kommerziellen Zweck – ausschließlich für sich, seine Familie und Personen, die er persönlich eingeladen hat. Eine öffentliche Nutzung ist nicht vorgesehen; einen Zugang gibt es nur per Einladung.</p>
            <p>Die Verarbeitung erfolgt im Rahmen ausschließlich persönlicher bzw. familiärer Tätigkeiten. Die DSGVO findet daher nach Art. 2 Abs. 2 lit. c DSGVO keine Anwendung. Es handelt sich nicht um ein geschäftsmäßiges digitales Angebot, daher besteht keine Impressumspflicht nach § 5 DDG.</p>
            <p><strong>Unbefugte Nutzung ist nicht gestattet.</strong> Wenn du keinen Zugang erhalten hast, verlass diese Seite bitte.</p>
            <p>Technisch in einem Satz: Die Seite läuft auf einem von Ruwen selbst verwalteten Server und wird über Cloudflare ausgeliefert; Nachrichten gehen an Ruwens KI-Agenten, Benachrichtigungen je nach deiner Wahl per E-Mail, ntfy oder Pushover. Fragen oder Löschwünsche: <a href="mailto:info@focusonruwen.com" class="text-link">info@focusonruwen.com</a>.</p>
          </div>

          <h2 class="hinweis-h2">Vorsorglich: Datenschutzinformationen</h2>
          <p class="unterzeile">Falls die DSGVO doch anwendbar sein sollte, gelten die folgenden Informationen nach Art. 13 DSGVO. Stand: ${this.stand}.</p>

          <div class="tafel hinweis-lang">
            <section>
              <h3>1. Verantwortlicher und Anbieter</h3>
              <p>Ruwen Hohnholz<br>c/o Autorenglück #45094<br>Albert-Einstein-Str. 47<br>02977 Hoyerswerda<br>E-Mail: <a href="mailto:info@focusonruwen.com" class="text-link">info@focusonruwen.com</a></p>
              <p>Ein Datenschutzbeauftragter ist nicht benannt (keine Pflicht).</p>
            </section>

            <section>
              <h3>2. Aufruf der Seite</h3>
              <p>Beim Aufruf verarbeiten der Server und Cloudflare (Cloudflare, Inc., USA) technisch notwendige Verbindungsdaten wie IP-Adresse, Zeitpunkt, aufgerufene Adresse und Browserangaben, um die Seite auszuliefern und abzusichern. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer, funktionierender Betrieb). yRelay selbst schreibt keine Zugriffsprotokolle; nur Fehlermeldungen im Serverprotokoll können die IP-Adresse enthalten.</p>
              <p>Die Oberfläche lädt außerdem den Texteditor Quill von <code>cdn.quilljs.com</code> (ausgeliefert über Cloudflare). Dabei erhält dieser Anbieter deine IP-Adresse. Nach dem Anmelden kann für einen Konfetti-Effekt zusätzlich eine Datei von <code>cdn.jsdelivr.net</code> geladen werden.</p>
            </section>

            <section>
              <h3>3. Zugang und Konto</h3>
              <p>Für eingeladene Personen speichert yRelay Benutzername, E-Mail-Adresse, Anzeigename, Rolle, Passwort (nur als Hash), Einladungs- und Rücksetz-Token, Erstellungs- und letzten Anmeldezeitpunkt sowie deine Benachrichtigungs-Einstellungen. Einladungen und Passwort-Links werden per E-Mail über den eingestellten SMTP-Server verschickt. Zur Absicherung werden Anmeldungen und wichtige Aktionen in einem Protokoll (Audit-Log) festgehalten. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des Zugangs, um den du gebeten hast) und für das Protokoll Art. 6 Abs. 1 lit. f DSGVO (Missbrauchsschutz).</p>
            </section>

            <section>
              <h3>4. Nachrichten an Ruwen</h3>
              <p>Was du schreibst (Text, Art, Dringlichkeit), zusammen mit deinem Namen und deiner E-Mail-Adresse, wird gespeichert und an Ruwens KI-Agenten übergeben – je nach Einrichtung an Poke (The Interaction Company of California Inc., USA) oder einen anderen per Webhook, E-Mail oder MCP angebundenen Agenten. Antworten des Agenten werden ebenfalls gespeichert. Ruwen als Verwalter kann alle Nachrichten einsehen. Diktierst du eine Nachricht, wird die Aufnahme zur Umwandlung in Text an Deepgram, Inc. (USA) gesendet; yRelay selbst speichert die Aufnahme nicht. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Zustellung, die du auslöst).</p>
            </section>

            <section>
              <h3>5. Benachrichtigungen</h3>
              <p>Über Antworten wirst du nach deiner Wahl informiert: per E-Mail (eingestellter SMTP-Server), per ntfy (öffentlicher Dienst ntfy.sh von Philipp C. Heckel – Titel und Text der Benachrichtigung gehen an das von dir gewählte Topic und werden dort laut Betreiber rund 12 Stunden zwischengespeichert; wer das Topic kennt, kann mitlesen; die Zustellung an Handys läuft teils über Google Firebase, USA) und/oder per Pushover (Superblock, LLC, USA – mit deinem User-Key). ntfy und Pushover nutzt du nur, wenn du sie im Profil aktivierst. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
            </section>

            <section>
              <h3>6. Schul-Dashboard, Spiele, Dateien</h3>
              <p>Wer Zugriff auf das Schul-Dashboard hat, sieht dort Stundenplan, Termine, Aufgaben und Chat, die über den KI-Agenten eingespielt und in yRelay gespeichert werden. Für Wetter und Abfahrten fragt der Server mit dem eingestellten Ort bzw. der Haltestelle (nicht mit deiner IP-Adresse) bei OpenStreetMap Nominatim, Bright Sky (Daten des DWD) und dem VRR an. Hochgeladene Dateien werden – sofern eingerichtet – in einer Pingvin-Share-Instanz abgelegt; der Link (7 Tage gültig) geht an den Agenten und ist für jede Person mit dem Link abrufbar. Spielstände werden gespeichert und Züge mit dem Agenten ausgetauscht. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
            </section>

            <section>
              <h3>7. Empfänger und Drittländer</h3>
              <p>Empfänger sind die oben genannten Dienste (Cloudflare, Quill-CDN, jsDelivr, KI-Agent, Deepgram, SMTP-Anbieter, ntfy.sh, Pushover, Nominatim, Bright Sky, VRR, Pingvin Share). In die USA gehen Daten bei Cloudflare, Poke, Deepgram und Pushover sowie bei ntfy über Google Firebase. Für Empfänger, die nach dem EU-US Data Privacy Framework zertifiziert sind, gilt der Angemessenheitsbeschluss der EU-Kommission (Art. 45 DSGVO). Im Übrigen erfolgt die Übermittlung, weil sie für die von dir gewünschte Zustellung bzw. Benachrichtigung erforderlich ist (Art. 49 Abs. 1 lit. b DSGVO). Daten werden nicht verkauft und nicht für Werbung genutzt.</p>
            </section>

            <section>
              <h3>8. Speicherdauer</h3>
              <p>Konto, Nachrichten, Antworten, Schul-Dashboard-Daten und Spielstände bleiben gespeichert, bis dein Konto gelöscht wird (auf Wunsch jederzeit). Einträge im Audit-Log bleiben auch danach ohne Kontozuordnung erhalten, bis sie gelöscht werden. Einladungs- und Rücksetz-Links laufen ab. Datenbank-Sicherungen werden täglich und bei jedem Start angelegt; aufbewahrt werden die jeweils 15 neuesten, ältere werden automatisch gelöscht (einzelne Sicherungen vor Updates oder Wiederherstellungen bleiben länger erhalten). Bei den externen Diensten gelten deren eigene Fristen.</p>
            </section>

            <section>
              <h3>9. Speicher im Browser (§ 25 TDDDG)</h3>
              <p>yRelay setzt keine Cookies und kein Tracking. Im lokalen Speicher deines Browsers liegen nur: dein Anmelde-Token (<code>yrelay_token</code>), offline vorgemerkte Nachrichten (<code>yrelay_offline_queue</code>) und deine Design-Wahl (<code>yrelay_thema</code>); dazu speichert der Service Worker die App-Dateien für die Offline-Nutzung. Das ist für den von dir gewünschten Dienst unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG), eine Einwilligung ist nicht nötig. Du kannst alles über die Browser-Einstellungen löschen; das Token wird beim Abmelden entfernt.</p>
            </section>

            <section>
              <h3>10. Deine Rechte</h3>
              <p>Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen nach Art. 6 Abs. 1 lit. f DSGVO (Art. 21). Schreib dafür einfach an <a href="mailto:info@focusonruwen.com" class="text-link">info@focusonruwen.com</a>.</p>
              <p>Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), zum Beispiel bei: Die Landesbeauftragte für den Datenschutz Niedersachsen, Prinzenstraße 5, 30159 Hannover.</p>
              <p>Die Angabe deiner Daten ist freiwillig; ohne Benutzername, E-Mail und Passwort ist eine Nutzung aber nicht möglich. Eine automatisierte Entscheidungsfindung nach Art. 22 DSGVO findet nicht statt.</p>
            </section>
          </div>

          <p class="hinweis-zurueck"><a href="${zurueck}" class="text-link">${zurueckText}</a></p>
        </div>
      </div>
    `;
  },

  initialisieren() {
    window.scrollTo(0, 0);
  },
};
