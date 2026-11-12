# Blacklist-Tools – an add-on for Thunderbird

Provided by **Software.Solutions.ForYou.at** · [Product page](https://software.solutions.foryou.at/blacklist-tools/) · [Imprint](https://software.solutions.foryou.at/impressum/)

**[⬇ Download the latest version (.xpi)](https://github.com/crieder/blacklist-tools/releases/latest/download/blacklist-tools.xpi)** · [All releases](https://github.com/crieder/blacklist-tools/releases) · [Support the project (voluntary donation)](https://liberapay.com/crieder/donate)

*Deutsche Beschreibung weiter unten.*

## Installation

1. Download **[blacklist-tools.xpi](https://github.com/crieder/blacklist-tools/releases/latest/download/blacklist-tools.xpi)**.
2. In Thunderbird open *Add-ons and Themes* (Tools menu), click the gear icon → *Install Add-on From File …* and choose the downloaded file.
3. Open the add-on's settings (the “Spam ▾” menu → *Settings …*).

Requires Thunderbird 128 or newer.

Blacklist-Tools is distributed here on GitHub, not on addons.thunderbird.net: Thunderbird's add-on site currently does not review new add-ons that need an Experiment API (required for editing message filters). From version 2.1.7 on, Thunderbird updates the add-on automatically from this repository; if you installed an older version, install 2.1.7 or newer once by hand. The file is not reviewed by Mozilla.

Adds a **“Spam ▾”** button to the message header. Its menu offers:

1. **Add sender / subject / selected text to filter** – appends a “contains …” condition to one of your *existing* message filters (e.g. a filter called “Spam” that moves mail to the junk folder). Text you select in the subject or in the message body is taken over; you can still shorten it (e.g. to the domain) before saving.
2. **Add to ISPConfig blacklist** – blocks an address on your mail server's *Email → Email Blacklist* (type *Recipient* for burned aliases, or *Sender*).
3. **Show ISPConfig blacklist** – all entries, sorted alphabetically, with search-as-you-type, paging, delete (with confirmation) and an *Add* button.
4. **Mark as junk** – same as Thunderbird's own junk button (optionally marks as read and moves to the account's junk folder). Thunderbird's own button can be hidden in the settings.

**Right-click = no dialog:** right-click one of the “Add … to filter” items or “Add to ISPConfig blacklist” to run it directly with the suggested values (last used filter / blacklist type, selected text, your “mark as junk” settings). The result is shown as a notification; your own mailbox addresses are never blocked this way. Hovering over an item shows this as a tooltip.

**Several messages at once:** the same menu is available as a button in the main toolbar and by right-clicking in the message list (“Blacklist-Tools”). With several messages selected, every function runs for each message: the dialog lists one entry per message (sender, subject or recipient address), which you can shorten or delete before confirming. Selected text can only be taken over from a single message.

The ISPConfig part is optional and only useful if your mail is hosted on a server managed with [ISPConfig](https://www.ispconfig.org/).

Languages: English, German.

## ISPConfig setup

Open the add-on settings and choose a login method:

- **Panel login (default):** your normal customer login to the ISPConfig web interface. The add-on logs in like a browser and fills in the blacklist form. It keeps the session cookie itself, so it works even if Thunderbird is set to reject all cookies. If your hoster heavily customises the ISPConfig interface, this may need adjusting.
- **Remote API:** needs a remote user that only the ISPConfig administrator can create (*System → Remote Users*) with the permissions *Mail user functions*, *Mail blacklist functions* and optionally *Client functions*. Thunderbird will ask for permission to access the server when you save.

The password is stored in **Thunderbird's password manager** (Settings → Privacy & Security → Saved Passwords, entry “ISPConfig (Blacklist-Tools)”), not in the add-on's storage.

When blocking a *Recipient*, the dialog suggests the address the mail was actually delivered to (X-Original-To, Delivered-To, To). Your own mailbox addresses are never suggested, and blocking one needs an extra confirmation.

## Troubleshooting

Settings → Troubleshooting → *Keep a log file of ISPConfig requests*. The file `blacklist-tools.log` is written to your Thunderbird profile folder. Password, session ID and form tokens are masked; blocked addresses appear in plain text.

## Why an Experiment API?

Thunderbird has no official WebExtension API for message filters, for hiding the built-in junk button, or for the password manager. These parts live in a small, commented Experiment API (`api/spamFilterEditor/`) that uses Thunderbird's own interfaces (`nsIMsgFilterList`, `nsIStyleSheetService`, `nsILoginManager`). Everything else uses the regular MailExtension APIs.

Thunderbird can block Experiment add-ons via `extensions.experiments.suppressed`. In that case, add the add-on ID `{4346d631-753f-47b3-84ca-a3d0b8fecebb}` to `extensions.experiments.allowed` (Settings → Config Editor).

## Support the project

Blacklist-Tools is free. If it saves you time, you can support its development with a voluntary donation on **[Liberapay](https://liberapay.com/crieder/donate)**; a donation does not entitle you to features, support or updates. Bug reports and ideas are welcome as [GitHub issues](https://github.com/crieder/blacklist-tools/issues).

## Privacy

See [PRIVACY.md](PRIVACY.md). In short: the add-on only talks to the ISPConfig server *you* enter. Nothing is sent to us or anyone else. Downloads and update checks are served by GitHub.

## Building

```
python build.py
```

creates `dist/blacklist-tools-<version>.xpi`. All texts live in `tools/locales.py`; the build generates `_locales/*/messages.json` from it and checks that every key used in the code exists.

| Path | Purpose |
|---|---|
| `manifest.json` | Manifest V3, Thunderbird ≥ 128 |
| `background.js` | menus, reading the selection, opening dialogs |
| `dialog/` | confirmation dialog (filter / blacklist) |
| `manage/` | “Show ISPConfig blacklist” window |
| `options/` | settings |
| `lib/common.js` | settings, translation helpers, “Mark as junk” |
| `lib/ispconfig.js` | ISPConfig: panel form automation or remote API |
| `content/selection.js` | fallback for reading the selection in the message |
| `api/spamFilterEditor/` | Experiment API (Thunderbird internals) |
| `tools/` | translation source and checks |

## Disclaimer

Blacklist-Tools is free and provided as is, at your own risk. Liability is excluded as far as the law permits; liability for intent and gross negligence and other mandatory liability remain unaffected. Please note in particular:

- The add-on uses an Experiment API with access to Thunderbird internals (message filters, password manager). Back up your Thunderbird profile, especially `msgFilterRules.dat`, before larger changes.
- The ISPConfig panel login fills in the web form like a browser. Check whether your hoster's terms allow this; a hoster may block accounts for automated access.
- Blocked addresses and filter conditions can also catch legitimate mail.
- There is no guarantee of compatibility with future Thunderbird or ISPConfig versions (currently tested up to Thunderbird 159).

## Trademarks

Thunderbird is a trademark of Mozilla; ISPConfig is a trademark of its respective owners. Blacklist-Tools is an independent product and is neither endorsed nor reviewed by them.

Copyright © 2026 Software.Solutions.ForYou.at. License: [MPL 2.0](LICENSE).

---

# Blacklist-Tools – ein Add-on für Thunderbird (Deutsch)

Anbieter: **Software.Solutions.ForYou.at** · [Produktseite](https://software.solutions.foryou.at/blacklist-tools/) · [Impressum](https://software.solutions.foryou.at/impressum/)

**[⬇ Aktuelle Version herunterladen (.xpi)](https://github.com/crieder/blacklist-tools/releases/latest/download/blacklist-tools.xpi)** – in Thunderbird unter *Add-ons und Themes* → Zahnrad → *Add-on aus Datei installieren …* auswählen. Benötigt Thunderbird 128 oder neuer.

Das Add-on wird hier auf GitHub verteilt, nicht auf addons.thunderbird.net: Die Add-on-Seite von Thunderbird prüft derzeit keine neuen Add-ons mit Experiment-API (nötig zum Bearbeiten von Nachrichtenfiltern). Ab Version 2.1.7 aktualisiert Thunderbird das Add-on automatisch aus diesem Repository; ältere Versionen bitte einmal von Hand durch 2.1.7 oder neuer ersetzen. Die Datei wird nicht von Mozilla geprüft.

Fügt im Nachrichtenkopf einen Button **„Spam ▾“** hinzu. Das Menü bietet:

1. **Filter um Absender / Betreff / markierten Mailinhalt ergänzen**: Hängt an einen *bestehenden* Nachrichtenfilter eine Bedingung „enthält …“ an. Markierter Text im Betreff oder im Nachrichtentext wird übernommen und lässt sich vorher noch kürzen.
2. **Auf ISPConfig-Blacklist setzen**: Sperrt eine Adresse unter *E-Mail → E-Mail-Blacklist* (Typ *Recipient* für verbrannte Aliase oder *Sender*).
3. **ISPConfig-Blacklist anzeigen**: Alle Einträge alphabetisch, mit Suchfeld, Blättern, Löschen mit Bestätigung und „Add“-Button.
4. **Als Spam markieren**: Wie der eingebaute Spam-Button. Der eingebaute Button lässt sich ausblenden.

**Rechtsklick = ohne Dialog:** Ein Rechtsklick auf „Filter um … ergänzen“ oder „Auf ISPConfig-Blacklist setzen“ führt die Aktion direkt mit den vorgeschlagenen Werten aus (zuletzt verwendeter Filter bzw. Blacklist-Typ, markierter Text, Spam-Einstellungen). Das Ergebnis erscheint als Benachrichtigung; eigene Postfachadressen werden so nie gesperrt. Ein Tooltip beim Darüberfahren erklärt das.

**Mehrere Nachrichten auf einmal:** Das Menü gibt es auch als Button in der Hauptsymbolleiste und per Rechtsklick in der Nachrichtenliste („Blacklist-Tools“). Bei mehreren markierten Nachrichten wird jede Funktion für jede Nachricht ausgeführt; der Dialog zeigt dafür eine Zeile pro Nachricht, die sich vorher kürzen oder löschen lässt.

Der ISPConfig-Teil ist optional. Das Passwort liegt in der Thunderbird-Passwortverwaltung (Eintrag „ISPConfig (Blacklist-Tools)“). Beim Panel-Login verwaltet das Add-on das Sitzungs-Cookie selbst; es funktioniert also auch, wenn Thunderbird alle Cookies ablehnt. Bei Problemen hilft das Protokoll unter Einstellungen → Fehlersuche.

Das Add-on ist kostenlos. Wer die Entwicklung unterstützen möchte, kann freiwillig auf **[Liberapay](https://liberapay.com/crieder/donate)** spenden; eine Spende begründet keinen Anspruch auf Funktionen, Support oder Updates. Fehler und Wünsche bitte als [GitHub-Issue](https://github.com/crieder/blacklist-tools/issues). Datenschutz: [PRIVACY.md](PRIVACY.md).

**Haftungshinweis:** Blacklist-Tools ist kostenlos, die Nutzung erfolgt auf Deine eigene Verantwortung. Die Haftung ist ausgeschlossen, soweit das Gesetz es zulässt; die Haftung für Vorsatz und grobe Fahrlässigkeit sowie sonstige zwingende Haftung bleiben unberührt. Bitte beachte besonders:

- Das Add-on nutzt eine Experiment-API mit Zugriff auf Thunderbird-Interna (Nachrichtenfilter, Passwortverwaltung). Sichere vor größeren Änderungen Dein Thunderbird-Profil, vor allem `msgFilterRules.dat`.
- Der ISPConfig-Panel-Login füllt das Webformular wie ein Browser aus. Prüfe, ob die Bedingungen Deines Hosters das erlauben; ein Hoster kann Konten bei automatisiertem Zugriff sperren.
- Gesperrte Adressen und Filterbedingungen können auch erwünschte Mails treffen.
- Keine Gewähr für die Kompatibilität mit künftigen Thunderbird- oder ISPConfig-Versionen (derzeit getestet bis Thunderbird 159).

**Marken:** Thunderbird ist eine Marke von Mozilla; ISPConfig ist eine Marke der jeweiligen Inhaber. Blacklist-Tools ist ein unabhängiges Produkt und wird von diesen weder unterstützt noch geprüft.

Copyright © 2026 Software.Solutions.ForYou.at. Lizenz: [MPL 2.0](LICENSE).
