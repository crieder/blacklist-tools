"""Erzeugt _locales/<lang>/messages.json aus einer einzigen Quelle.

Texte hier pflegen, dann `python tools/locales.py` ausführen (build.py macht das automatisch).
Platzhalter werden als $1 … $9 geschrieben und in benannte WebExtension-Platzhalter umgesetzt.
"""

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent

# key: (English, Deutsch)
MESSAGES = {
    # Manifest
    "extensionName": ("Blacklist-Tools", "Blacklist-Tools"),
    "extensionDescription": (
        "Spam menu in the message view: add the sender, subject or selected text to an existing message filter, manage the ISPConfig email blacklist and mark messages as junk.",
        "Spam-Menü in der Nachrichtenansicht: bestehende Nachrichtenfilter um Absender, Betreff oder markierten Text ergänzen, die ISPConfig-E-Mail-Blacklist pflegen und als Spam markieren.",
    ),
    "actionLabel": ("Spam", "Spam"),

    # Menü
    "menuFilterSender": ("Add sender to filter …", "Filter um Absender ergänzen …"),
    "menuFilterSubject": ("Add subject to filter …", "Filter um Betreff ergänzen …"),
    "menuFilterBody": ("Add selected text to filter …", "Filter um markierten Mailinhalt ergänzen …"),
    "menuBlacklist": ("Add to ISPConfig blacklist …", "Auf ISPConfig-Blacklist setzen …"),
    "menuBlacklistManage": ("Show ISPConfig blacklist …", "ISPConfig-Blacklist anzeigen …"),
    "menuMarkSpam": ("Mark as junk", "Als Spam markieren"),
    "menuOptions": ("Settings …", "Einstellungen …"),
    "menuDonate": ("♥ Support Blacklist-Tools (donate) …", "♥ Blacklist-Tools unterstützen (Spende) …"),
    "menuCtxFilterSelection": ("Add selection to filter …", "Markierung zu Filter hinzufügen …"),
    "notifyNoMessage": ("No message is selected.", "Es ist keine Nachricht ausgewählt."),
    "notifyErrorTitle": ("$1 – error", "$1 – Fehler"),

    # Allgemein
    "btnCancel": ("Cancel", "Abbrechen"),
    "btnAdd": ("Add", "Hinzufügen"),
    "btnDelete": ("Delete", "Löschen"),
    "btnConfirmDelete": ("Really delete?", "Wirklich löschen?"),
    "btnBlock": ("Block", "Sperren"),
    "btnTest": ("Test connection", "Verbindung testen"),
    "btnSave": ("Save", "Speichern"),
    "yes": ("Yes", "Ja"),
    "no": ("No", "Nein"),
    "typeRecipient": ("Recipient", "Recipient"),
    "typeSender": ("Sender", "Sender"),
    "typeRecipientLong": ("Recipient (e.g. a burned address)", "Recipient (Empfänger – z. B. verbrannte Adresse)"),
    "typeSenderLong": ("Sender", "Sender (Absender)"),
    "statusWorking": ("Working …", "Wird ausgeführt …"),

    # Dialog
    "dlgFilterTitle": ("Add to filter", "Filter ergänzen"),
    "dlgSubjectLine": ("Subject: $1", "Betreff: $1"),
    "dlgNoSubject": ("(no subject)", "(kein Betreff)"),
    "dlgConnection": ("Connection", "Verbindung"),
    "dlgReceivedIn": ("Mail received in account", "Mail empfangen im Konto"),
    "dlgFilter": ("Filter", "Filter"),
    "dlgType": ("Type", "Typ"),
    "dlgCondition": ("Condition", "Bedingung"),
    "fieldSender": ("From", "Von"),
    "fieldSubject": ("Subject", "Betreff"),
    "fieldBody": ("Body", "Inhalt"),
    "dlgContains": ("contains", "enthält"),
    "dlgSearchText": ("Search text", "Suchtext"),
    "dlgHintTrim": ("Shorten the text to the part you need, e.g. just the domain.", "Text auf den gewünschten Teil kürzen, z. B. nur die Domain."),
    "dlgMarkAfter": ("Then mark the message as junk", "Nachricht anschließend als Spam markieren"),
    "chipAddress": ("Address", "Adresse"),
    "chipDomain": ("Domain", "Domain"),
    "chipWholeSubject": ("Whole subject", "Ganzer Betreff"),
    "chipsOtherRecipients": ("Other recipient addresses:", "Weitere Empfängeradressen:"),
    "chipsUse": ("Use:", "Übernehmen:"),
    "dlgTipSelect": ("Tip: select text in the message, then open the menu again.", "Tipp: Text in der Nachricht markieren, dann das Menü erneut öffnen."),
    "dlgOwnWarning": (
        "Warning: this is one of your own mailbox addresses – all mail to it would be rejected!",
        "Achtung: Das ist eine Ihrer eigenen Postfachadressen – alle Mails an diese Adresse würden abgewiesen!",
    ),
    "dlgConfirmOwn": ("Your own mailbox address! Click “Block” again to confirm.", "Eigene Postfachadresse! Zum Bestätigen nochmals auf „Sperren“ klicken."),
    "hintRecipient": ("Mail to this address will be rejected by the server.", "Mails an diese Adresse werden vom Server abgewiesen."),
    "hintSender": ("Mail from this sender will be rejected by the server.", "Mails von diesem Absender werden vom Server abgewiesen."),
    "dlgBlacklistTitle": ("ISPConfig email blacklist", "ISPConfig E-Mail-Blacklist"),
    "dlgBlacklistHeading": ("Add to the ISPConfig email blacklist", "Eintrag zur ISPConfig E-Mail-Blacklist"),
    "dlgAddressToBlock": ("Address to block", "Zu sperrende Adresse"),
    "errNoFilters": ("This account has no message filters.", "In diesem Konto gibt es keine Nachrichtenfilter."),
    "errEnterSearchText": ("Please enter a search text.", "Bitte einen Suchtext eingeben."),
    "blAlreadyListed": ("“$1” ($2) is already on the blacklist.", "„$1“ ($2) steht bereits auf der Blacklist."),
    "blAdded": ("“$1” ($2) was added to the blacklist.", "„$1“ ($2) wurde auf die Blacklist gesetzt."),
    "filterDuplicate": ("This condition already exists in filter “$1”.", "Bedingung ist im Filter „$1“ bereits vorhanden."),
    "filterAdded": ("Added to filter “$1” ($2 conditions).", "Zu Filter „$1“ hinzugefügt ($2 Bedingungen)."),
    "markedAsJunk": ("Message marked as junk.", "Nachricht als Spam markiert."),

    # Blacklist-Fenster
    "mgPlaceholder": ("Search or enter a new address …", "Suchen oder neue Adresse eingeben …"),
    "mgTypeTitle": ("Type for a new entry", "Typ für neuen Eintrag"),
    "mgAdd": ("Add", "Add"),
    "mgReload": ("Reload", "Neu laden"),
    "colAddress": ("Address", "Adresse"),
    "colType": ("Type", "Typ"),
    "colActive": ("Active", "Aktiv"),
    "mgPerPage": ("Entries per page", "Einträge pro Seite"),
    "mgAll": ("All", "Alle"),
    "mgFirst": ("First page", "Erste Seite"),
    "mgPrev": ("Previous page", "Vorherige Seite"),
    "mgNext": ("Next page", "Nächste Seite"),
    "mgLast": ("Last page", "Letzte Seite"),
    "mgNoMatch": ("No matches – use “Add” to create a new entry.", "Keine Treffer – mit „Add“ als neuen Eintrag übernehmen."),
    "mgEmpty": ("No entries.", "Keine Einträge."),
    "mgPageInfo": ("Page $1 of $2 · $3 entries", "Seite $1 von $2 · $3 Einträge"),
    "mgPageInfoFiltered": ("Page $1 of $2 · $3 of $4 entries", "Seite $1 von $2 · $3 von $4 Einträgen"),
    "mgExists": ("This entry already exists", "Eintrag ist bereits vorhanden"),
    "mgAddTitle": ("Add to the blacklist", "In die Blacklist übernehmen"),
    "mgLoading": ("Loading blacklist …", "Lade Blacklist …"),
    "mgLoaded": ("$1 entries loaded.", "$1 Einträge geladen."),
    "mgDeleting": ("Deleting “$1” …", "Lösche „$1“ …"),
    "mgStillThere": ("“$1” is still present – deleting failed.", "„$1“ ist noch vorhanden – Löschen fehlgeschlagen."),
    "mgDeleted": ("“$1” deleted.", "„$1“ gelöscht."),
    "mgOwnWarning": ("Warning: your own mailbox address! Click “Add” again to confirm.", "Achtung: eigene Postfachadresse! Zum Bestätigen nochmals auf „Add“ klicken."),
    "mgAdding": ("Adding “$1” …", "Füge „$1“ hinzu …"),
    "mgWasPresent": ("“$1” was already present.", "„$1“ war bereits vorhanden."),
    "mgAdded": ("“$1” ($2) added.", "„$1“ ($2) hinzugefügt."),

    # Einstellungen
    "optTitle": ("Blacklist-Tools – Settings", "Blacklist-Tools – Einstellungen"),
    "optFilters": ("Message filters", "Nachrichtenfilter"),
    "optFilterAccount": ("Account containing the filter", "Konto mit dem Filter"),
    "optFilterAccountDefault": ("Account of the displayed message", "Konto der angezeigten Nachricht"),
    "optFilterName": ("Default filter", "Vorausgewählter Filter"),
    "optFilterHint": ("The filter must already exist. New conditions are appended as “contains”.", "Der Filter muss bereits existieren. Neue Bedingungen werden als „enthält“ angehängt."),
    "optFilterCount": ("$1 filters found in the account. The filter must already exist.", "$1 Filter im Konto gefunden. Der Filter muss bereits existieren."),
    "optMarkAfterFilter": ("After adding, mark the message as junk (default)", "Nach dem Ergänzen die Nachricht als Spam markieren (Vorauswahl)"),
    "optSpamButton": ("Spam button", "Spam-Button"),
    "optHideNative": ("Hide Thunderbird's own junk button (show only “Spam ▾”)", "Originalen Thunderbird-Spam-Button ausblenden (nur „Spam ▾“ anzeigen)"),
    "optMarkSpam": ("Mark as junk", "Als Spam markieren"),
    "optMarkRead": ("Mark as read", "Als gelesen markieren"),
    "optMoveJunk": ("Move to the account's junk folder", "In den Spam-Ordner des Kontos verschieben"),
    "optIsp": ("ISPConfig email blacklist", "ISPConfig E-Mail-Blacklist"),
    "optIspIntro": (
        "Optional. Only needed if your mail is hosted on a server managed with ISPConfig.",
        "Optional. Nur nötig, wenn Ihre Mails auf einem mit ISPConfig verwalteten Server liegen.",
    ),
    "optIspUrl": ("ISPConfig address", "ISPConfig-Adresse"),
    "optAuth": ("Login", "Anmeldung"),
    "optAuthPanel": ("Panel login (regular customer login)", "Panel-Login (normaler Kundenzugang)"),
    "optAuthRemote": ("Remote API user (created by the hoster)", "Remote-API-Benutzer (vom Hoster angelegt)"),
    "optUser": ("User name", "Benutzername"),
    "optPassword": ("Password", "Passwort"),
    "optPasswordHint": (
        "Stored in Thunderbird's password manager (Settings → Privacy & Security → Saved Passwords).",
        "Wird in der Thunderbird-Passwortverwaltung gespeichert (Einstellungen → Datenschutz & Sicherheit → Gespeicherte Passwörter).",
    ),
    "optPasswordSaved": ("saved – leave empty to keep it", "gespeichert – leer lassen, um es zu behalten"),
    "optDefaultType": ("Default type", "Vorauswahl Typ"),
    "optTypeRecipient": ("Recipient", "Recipient (Empfänger)"),
    "optTypeSender": ("Sender", "Sender (Absender)"),
    "optMailbox": ("Mailbox in ISPConfig (remote API only)", "Postfach in ISPConfig (nur Remote-API)"),
    "optMailboxPh": ("empty = address of the message's account", "leer = Adresse des Kontos der Nachricht"),
    "optClientId": ("Client ID (remote API only)", "Client-ID (nur Remote-API)"),
    "optClientIdPh": ("empty = automatic", "leer = automatisch"),
    "optMarkAfterBlacklist": ("After blocking, mark the message as junk (default)", "Nach dem Sperren die Nachricht als Spam markieren (Vorauswahl)"),
    "optDebug": ("Troubleshooting", "Fehlersuche"),
    "optDebugLog": ("Keep a log file of ISPConfig requests", "Protokoll (Logdatei) für ISPConfig-Zugriffe führen"),
    "optDebugHint": (
        "Password, session ID and form tokens are masked; blocked addresses appear in plain text. File:",
        "Passwort, Sitzungs-ID und Formular-Token werden maskiert; gesperrte Adressen stehen im Klartext. Datei:",
    ),
    "optOpenLog": ("Open log file", "Logdatei öffnen"),
    "optClearLog": ("Delete log file", "Logdatei löschen"),
    "optDonate": ("Support the project", "Projekt unterstützen"),
    "optDonateHint": (
        "Blacklist-Tools is free. If it saves you time, you can support its development with a small donation on Liberapay.",
        "Blacklist-Tools ist kostenlos. Wenn es Ihnen Zeit spart, können Sie die Weiterentwicklung mit einer kleinen Spende auf Liberapay unterstützen.",
    ),
    "optDonateButton": ("♥ Donate on Liberapay …", "♥ Auf Liberapay spenden …"),
    "optNoLog": ("There is no log file yet – enable logging and click “Test connection”.", "Es gibt noch keine Logdatei – Protokoll einschalten und „Verbindung testen“ klicken."),
    "optLogCleared": ("Log file deleted.", "Logdatei gelöscht."),
    "optSaved": ("Saved.", "Gespeichert."),
    "optSavedNoPermission": ("Saved – but without permission to access the ISPConfig server.", "Gespeichert – aber ohne Zugriffsrecht auf den ISPConfig-Server."),
    "optTesting": ("Testing connection …", "Teste Verbindung …"),
    "errHttps": ("Please use an https address.", "Bitte eine https-Adresse verwenden."),

    # ISPConfig
    "errMissingUrl": ("No ISPConfig address configured. Please enter it in the add-on settings.", "Keine ISPConfig-Adresse eingetragen. Bitte in den Add-on-Einstellungen eintragen."),
    "errMissingCredentials": ("ISPConfig credentials are missing. Please enter them in the add-on settings.", "ISPConfig-Zugangsdaten fehlen. Bitte in den Add-on-Einstellungen eintragen."),
    "errUnreachable": ("ISPConfig is not reachable ($1).", "ISPConfig nicht erreichbar ($1)."),
    "errHttp": ("ISPConfig responded with HTTP $1.", "ISPConfig antwortet mit HTTP $1."),
    "errLoginFailed": ("ISPConfig login failed: $1", "ISPConfig-Login fehlgeschlagen: $1"),
    "errLoginLost": (
        "ISPConfig login failed (no error message from ISPConfig – the session was lost; see the log file under Settings → Troubleshooting).",
        "ISPConfig-Login fehlgeschlagen (keine Fehlermeldung von ISPConfig – die Sitzung ging verloren; Details in der Logdatei, siehe Einstellungen → Fehlersuche).",
    ),
    "errNoForm": (
        "After logging in, the blacklist form was not reachable. Does the account have access to Email → Email Blacklist?",
        "Nach dem Login war das Blacklist-Formular nicht erreichbar. Hat das Konto Zugriff auf E-Mail → E-Mail-Blacklist?",
    ),
    "errIsp": ("ISPConfig: $1", "ISPConfig: $1"),
    "errNotSaved": ("ISPConfig did not accept the entry (not found in the list after saving).", "ISPConfig hat den Eintrag nicht übernommen (nach dem Speichern nicht in der Liste gefunden)."),
    "errBadResponse": ("Unexpected response from ISPConfig ($1). Is the remote API enabled?", "Unerwartete Antwort von ISPConfig ($1). Ist die Remote-API aktiviert?"),
    "errIspMethod": ("ISPConfig ($1): $2", "ISPConfig ($1): $2"),
    "errMailboxNotFound": ("Mailbox “$1” was not found in ISPConfig.", "Postfach „$1“ wurde in ISPConfig nicht gefunden."),
    "errNoDeleteLink": ("No delete link was found for this entry.", "Für diesen Eintrag wurde kein Löschlink gefunden."),
    "connPanel": ("Panel login as “$1” · $2", "Panel-Login als „$1“ · $2"),
    "connRemote": ("Remote API as “$1” · $2", "Remote-API als „$1“ · $2"),
    "testRemoteOk": ("Remote API login successful.", "Remote-API-Login erfolgreich."),
    "testPanelOk": ("Panel login successful, blacklist form reachable (server: $1).", "Panel-Login erfolgreich, Blacklist-Formular erreichbar (Server: $1)."),

    # Experiment-API (Thunderbird-intern)
    "expUnknownField": ("Unknown field: $1", "Unbekanntes Feld: $1"),
    "expAccountNotFound": ("Account “$1” not found.", "Konto „$1“ nicht gefunden."),
    "expNoFilterSupport": ("The account “$1” does not support message filters.", "Das Konto „$1“ unterstützt keine Nachrichtenfilter."),
    "expFilterListFailed": ("The filter list could not be loaded.", "Filterliste konnte nicht geladen werden."),
    "expEmptyText": ("The search text is empty.", "Der Suchtext ist leer."),
    "expFilterNotFound": ("Account “$1” has no filter named “$2”.", "Im Konto „$1“ gibt es keinen Filter „$2“."),
    "expMatchAll": (
        "The filter “$1” is set to “Match all messages”. Please switch it to “Match any of the following” first.",
        "Der Filter „$1“ steht auf „Alle Nachrichten“. Bitte zuerst auf „Mindestens eine Bedingung erfüllen“ umstellen.",
    ),
    "expHttpsOnly": ("Only HTTPS addresses are allowed.", "Nur HTTPS-Adressen sind erlaubt."),
    "expNoMainWindow": ("No Thunderbird main window found for the connection.", "Kein Thunderbird-Hauptfenster für die Verbindung gefunden."),
}

LANGS = {"en": 0, "de": 1}


def entry(text):
    nums = sorted(set(int(n) for n in re.findall(r"\$(\d)", text)))
    if not nums:
        return {"message": text}
    msg = re.sub(r"\$(\d)", lambda m: f"$P{m.group(1)}$", text)
    return {"message": msg, "placeholders": {f"p{n}": {"content": f"${n}"} for n in nums}}


def main():
    for lang, idx in LANGS.items():
        out = {key: entry(texts[idx]) for key, texts in MESSAGES.items()}
        path = ROOT / "_locales" / lang / "messages.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(path)


if __name__ == "__main__":
    main()
