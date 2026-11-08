# Texte für addons.thunderbird.net (ATN)

Zum Kopieren in das Upload-Formular. Englisch ist die Standardsprache des Eintrags; die deutschen Texte trägt man auf ATN unter „Übersetzungen verwalten“ / *Manage translations* → Deutsch ein.

---

## 1. Name

**Blacklist-Tools** (in allen Sprachen gleich)

## 2. Kurzbeschreibung / Summary (max. 250 Zeichen)

**English**

> Add the sender, subject or selected text of a junk mail to your existing message filters with one click – and manage the email blacklist of your ISPConfig mail server right from Thunderbird.

**Deutsch**

> Absender, Betreff oder markierten Text einer Spam-Mail mit einem Klick zu Ihren bestehenden Nachrichtenfiltern hinzufügen – und die E-Mail-Blacklist Ihres ISPConfig-Mailservers direkt aus Thunderbird pflegen.

## 3. Beschreibung / Description

**English**

```
Blacklist-Tools replaces the junk button in the message header with a “Spam ▾” menu:

• Add sender to filter …
• Add subject to filter …
• Add selected text to filter …
Appends a “contains …” condition to one of your existing message filters (for example a filter named “Spam” that moves mail to the junk folder). If you select part of the subject or of the message text first, only that part is used. A small dialog lets you shorten the text – e.g. to just the domain – and pick the filter before anything is saved.

• Add to ISPConfig blacklist …
• Show ISPConfig blacklist …
For mail hosted on a server managed with ISPConfig: block an address under Email → Email Blacklist (type Recipient for burned aliases, or Sender), and view all entries in a sortable, searchable list with paging, delete and add. Works with your normal customer login to the ISPConfig panel, or with an ISPConfig remote API user.

• Mark as junk
Same as Thunderbird's own junk button: marks the message as junk, optionally as read, and moves it to the account's junk folder. Thunderbird's own junk button can be hidden so that only one button remains.

Safety
• Your own mailbox addresses are never suggested for blocking; blocking one needs an extra confirmation.
• Deleting a blacklist entry needs two clicks.
• The ISPConfig password is stored in Thunderbird's password manager.
• The add-on only talks to the ISPConfig server you enter yourself. Nothing is sent to the developer.

The ISPConfig part is optional – the filter functions work without it.

Languages: English, German.

Why does the add-on need full access to Thunderbird?
Thunderbird has no official add-on interface for message filters or for its password manager. Blacklist-Tools therefore contains a small “Experiment” module that uses Thunderbird's own filter list, password manager and junk button directly. That is also why Thunderbird asks for full access during installation.
```

**Deutsch**

```
Blacklist-Tools ersetzt den Spam-Button im Nachrichtenkopf durch ein Menü „Spam ▾“:

• Filter um Absender ergänzen …
• Filter um Betreff ergänzen …
• Filter um markierten Mailinhalt ergänzen …
Hängt an einen Ihrer bestehenden Nachrichtenfilter eine Bedingung „enthält …“ an (zum Beispiel an einen Filter „Spam“, der Mails in den Spam-Ordner verschiebt). Ist vorher ein Teil des Betreffs oder des Nachrichtentextes markiert, wird nur dieser Teil übernommen. In einem kleinen Dialog lässt sich der Text noch kürzen – etwa auf die Domain – und der Filter auswählen, bevor etwas gespeichert wird.

• Auf ISPConfig-Blacklist setzen …
• ISPConfig-Blacklist anzeigen …
Für Mails auf einem mit ISPConfig verwalteten Server: eine Adresse unter E-Mail → E-Mail-Blacklist sperren (Typ Recipient für verbrannte Aliase oder Sender) und alle Einträge in einer sortierten, durchsuchbaren Liste mit Blättern, Löschen und Hinzufügen anzeigen. Funktioniert mit dem normalen Kundenzugang zum ISPConfig-Panel oder mit einem ISPConfig-Remote-API-Benutzer.

• Als Spam markieren
Wie der eingebaute Spam-Button: markiert die Nachricht als Spam, auf Wunsch als gelesen, und verschiebt sie in den Spam-Ordner des Kontos. Der eingebaute Button lässt sich ausblenden, damit nur noch ein Spam-Button da ist.

Sicherheit
• Eigene Postfachadressen werden nie zum Sperren vorgeschlagen; eine trotzdem eingetragene muss zusätzlich bestätigt werden.
• Löschen eines Blacklist-Eintrags braucht zwei Klicks.
• Das ISPConfig-Passwort liegt in der Thunderbird-Passwortverwaltung.
• Das Add-on spricht nur mit dem ISPConfig-Server, den Sie selbst eintragen. An den Entwickler wird nichts gesendet.

Der ISPConfig-Teil ist optional – die Filterfunktionen arbeiten auch ohne.

Sprachen: Deutsch, Englisch.

Warum braucht das Add-on vollen Zugriff auf Thunderbird?
Thunderbird bietet Add-ons keine offizielle Schnittstelle für Nachrichtenfilter oder die Passwortverwaltung. Blacklist-Tools enthält deshalb ein kleines „Experiment“-Modul, das Thunderbirds eigene Filterliste, Passwortverwaltung und den Spam-Button direkt nutzt. Deshalb fragt Thunderbird bei der Installation nach vollem Zugriff.
```

## 4. Kategorien, Schlagwörter, Lizenz

- **Kategorien** (Namen auf ATN können leicht abweichen): *Folders and Filters*, *Privacy and Security*
- **Schlagwörter / Tags:** spam, junk, filter, blacklist, ispconfig, message filter
- **Lizenz:** Mozilla Public License 2.0 (MPL-2.0)
- **Datenschutzerklärung:** Inhalt von `PRIVACY.md` einfügen (beide Sprachen)
- **Homepage:** https://github.com/crieder/blacklist-tools
- **Support-Website:** https://github.com/crieder/blacklist-tools/issues
- **Support-E-Mail:** leer lassen (optional)
- **Quellcode für Prüfer:** nicht nötig (Code ist nicht minimiert); Link zum Repository in den Prüfer-Hinweisen genügt

## 5. Screenshots und Bildunterschriften

Dateien in `store/screenshots/`, in dieser Reihenfolge hochladen. 4 und 5 sind mit Beispieldaten erzeugt (`python store/screenshots/make.py`).

| Datei | English | Deutsch |
|---|---|---|
| 1-menu.png | The “Spam ▾” menu in the message header | Das Menü „Spam ▾“ im Nachrichtenkopf |
| 2-filter-subject.png | Add the subject (or the selected part of it) to an existing filter | Betreff (oder den markierten Teil davon) zu einem bestehenden Filter hinzufügen |
| 3-filter-sender.png | Add the sender's address or domain to a filter | Absenderadresse oder Domain zu einem Filter hinzufügen |
| 4-blacklist-dialog.png | Block a burned recipient address on the ISPConfig server | Verbrannte Empfängeradresse auf dem ISPConfig-Server sperren |
| 5-blacklist-window.png | Search, page through, add and delete blacklist entries | Blacklist-Einträge suchen, blättern, hinzufügen und löschen |
| 6-settings.png | Settings | Einstellungen |

## 6. Angaben zur Datenübertragung

Für das Formular „Does your add-on collect or transmit data?“ bzw. die Datenschutzangaben:

- **Sammelt das Add-on Daten für den Entwickler oder Dritte?** Nein. Keine Statistik, keine Telemetrie, kein eigener Server.
- **Werden Daten übertragen?** Nur, wenn der Nutzer die optionale ISPConfig-Funktion einrichtet, und nur an den ISPConfig-Server, dessen Adresse er selbst einträgt (nur HTTPS):
  - Zugangsdaten (Benutzername und Passwort) zur Anmeldung,
  - die E-Mail-Adressen, die der Nutzer selbst sperrt oder löscht,
  - Abfragen der Blacklist.
- **Speicherung:** Einstellungen lokal; Passwort in der Thunderbird-Passwortverwaltung; Sitzungs-Cookie nur im Arbeitsspeicher.

Falls ATN die neuen Mozilla-Kategorien abfragt („data collection permissions“): Wählen Sie **„keine Daten gesammelt“** und tragen Sie den Text oben zusätzlich bei den Prüfer-Hinweisen ein. Falls der Prüfer das anders einstuft (Übertragung an einen vom Nutzer gewählten Server), wären die passenden Kategorien *authenticationInfo* (Zugangsdaten) und *personallyIdentifyingInfo* (E-Mail-Adressen); das ergänzen wir dann im Manifest.

## 7. Hinweise für die Prüfer / Notes to reviewers (Englisch einfügen)

```
Changes in 2.1.5: the "Spam ▾" menu is now also available as a main toolbar button (manifest "action", type menu) and as a submenu in the message list context menu ("message_list" context), because the message header button is not shown when several messages are selected. With several messages selected, the filter and blacklist dialogs process one entry per message (messages from info.selectedMessages / mailTabs.getSelectedMessages); "Mark as junk" applies to all of them. No Experiment code was changed and no new permissions are requested.

Changes in 2.1.4: a donation link was added as the last item of the "Spam ▾" menu and as a button at the bottom of the settings page. Both call messenger.windows.openDefaultBrowser("https://liberapay.com/crieder/donate") on a user click only; no Experiment code was changed and no new permissions are requested.

Blacklist-Tools is a plain, unminified MailExtension (Manifest V3). There is no build step for the code; the only generated files are _locales/*/messages.json, created from tools/locales.py (included in the source repository, not needed at runtime).

The Experiment API "spamFilterEditor" (api/spamFilterEditor/implementation.js, ~440 lines, commented) is needed because Thunderbird has no WebExtension API for these tasks:

1. Message filters – getFilterNames() and addCondition() use nsIMsgIncomingServer.getFilterList(), nsIMsgFilter.createTerm()/appendTerm() and nsIMsgFilterList.saveToDefaultFile(), exactly as Thunderbird's own filter editor does. Only "contains" conditions are appended to filters that already exist; nothing is deleted.

2. Hiding the built-in junk button (optional setting) – registers a USER_SHEET via nsIStyleSheetService that hides #hdrJunkButton in about:message. It is unregistered when the add-on is disabled.

3. Reading a selection in the message header (subject/sender) – getHeaderSelection() reads window.getSelection() of the about:message document of the given tab. The message body selection uses scripting.executeScript.

4. ISPConfig panel login – httpRequest() sends HTTPS requests only, and only to the ISPConfig URL the user configures. Requests are made with credentials: "omit"; an http-on-modify-request / http-on-examine-response observer, restricted to requests carrying the add-on's own marker header (X-Blacklist-Tools), keeps the ISPConfig session cookie in memory. Reason: ISPConfig needs a session cookie, and with Thunderbird's cookie setting "reject all" (common in mail clients) the cookie would otherwise be dropped. The in-memory cookie jar is cleared on shutdown. Users who have a remote API user can use the ISPConfig JSON API instead (plain fetch from the options page; host permission requested via optional_host_permissions).

5. Password storage – setIspPassword()/getIspPassword()/hasIspPassword() store the ISPConfig password in Thunderbird's login manager (searchLoginsAsync, addLoginAsync, removeLoginAsync) under the realm "ISPConfig (Blacklist-Tools)" instead of storage.local.

6. Optional debug log – writeLog()/clearLog()/revealLog() write blacklist-tools.log to the profile folder only when the user enables logging. Passwords, session IDs and CSRF tokens are masked before writing.

No remote code is loaded, no data is sent anywhere except the user-configured ISPConfig server. The donation link only opens a web page in the user's default browser when clicked; nothing is transmitted by the add-on.

Source repository: https://github.com/crieder/blacklist-tools

Testing without ISPConfig: the filter functions can be tested with any account that has a message filter (e.g. create a filter "Spam", match "any of the following", one condition). Open a message, click "Spam ▾" in the header, choose "Add sender to filter …".
```
