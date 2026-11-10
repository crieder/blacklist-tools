# Blacklist-Tools for Thunderbird

**[⬇ Download the latest version (.xpi)](https://github.com/crieder/blacklist-tools/releases/latest/download/blacklist-tools.xpi)** · [All releases](https://github.com/crieder/blacklist-tools/releases) · [Support the project on Liberapay](https://liberapay.com/crieder/donate)

*Deutsche Beschreibung weiter unten.*

## Installation

1. Download **[blacklist-tools.xpi](https://github.com/crieder/blacklist-tools/releases/latest/download/blacklist-tools.xpi)**.
2. In Thunderbird open *Add-ons and Themes* (Tools menu), click the gear icon → *Install Add-on From File …* and choose the downloaded file.
3. Open the add-on's settings (the “Spam ▾” menu → *Settings …*).

Requires Thunderbird 128 or newer.

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

Blacklist-Tools is free. If it saves you time, you can support its development on **[Liberapay](https://liberapay.com/crieder/donate)**. Bug reports and ideas are welcome as [GitHub issues](https://github.com/crieder/blacklist-tools/issues).

## Privacy

See [PRIVACY.md](PRIVACY.md). In short: the add-on only talks to the ISPConfig server *you* enter. Nothing is sent to the developer or anyone else.

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

License: MPL 2.0.

---

# Blacklist-Tools für Thunderbird (Deutsch)

**[⬇ Aktuelle Version herunterladen (.xpi)](https://github.com/crieder/blacklist-tools/releases/latest/download/blacklist-tools.xpi)** – in Thunderbird unter *Add-ons und Themes* → Zahnrad → *Add-on aus Datei installieren …* auswählen. Benötigt Thunderbird 128 oder neuer.

Fügt im Nachrichtenkopf einen Button **„Spam ▾“** hinzu. Das Menü bietet:

1. **Filter um Absender / Betreff / markierten Mailinhalt ergänzen**: Hängt an einen *bestehenden* Nachrichtenfilter eine Bedingung „enthält …“ an. Markierter Text im Betreff oder im Nachrichtentext wird übernommen und lässt sich vorher noch kürzen.
2. **Auf ISPConfig-Blacklist setzen**: Sperrt eine Adresse unter *E-Mail → E-Mail-Blacklist* (Typ *Recipient* für verbrannte Aliase oder *Sender*).
3. **ISPConfig-Blacklist anzeigen**: Alle Einträge alphabetisch, mit Suchfeld, Blättern, Löschen mit Bestätigung und „Add“-Button.
4. **Als Spam markieren**: Wie der eingebaute Spam-Button. Der eingebaute Button lässt sich ausblenden.

**Rechtsklick = ohne Dialog:** Ein Rechtsklick auf „Filter um … ergänzen“ oder „Auf ISPConfig-Blacklist setzen“ führt die Aktion direkt mit den vorgeschlagenen Werten aus (zuletzt verwendeter Filter bzw. Blacklist-Typ, markierter Text, Spam-Einstellungen). Das Ergebnis erscheint als Benachrichtigung; eigene Postfachadressen werden so nie gesperrt. Ein Tooltip beim Darüberfahren erklärt das.

**Mehrere Nachrichten auf einmal:** Das Menü gibt es auch als Button in der Hauptsymbolleiste und per Rechtsklick in der Nachrichtenliste („Blacklist-Tools“). Bei mehreren markierten Nachrichten wird jede Funktion für jede Nachricht ausgeführt; der Dialog zeigt dafür eine Zeile pro Nachricht, die sich vorher kürzen oder löschen lässt.

Der ISPConfig-Teil ist optional. Das Passwort liegt in der Thunderbird-Passwortverwaltung (Eintrag „ISPConfig (Blacklist-Tools)“). Beim Panel-Login verwaltet das Add-on das Sitzungs-Cookie selbst; es funktioniert also auch, wenn Thunderbird alle Cookies ablehnt. Bei Problemen hilft das Protokoll unter Einstellungen → Fehlersuche.

Das Add-on ist kostenlos. Wer die Entwicklung unterstützen möchte: **[Liberapay](https://liberapay.com/crieder/donate)**. Fehler und Wünsche bitte als [GitHub-Issue](https://github.com/crieder/blacklist-tools/issues).
