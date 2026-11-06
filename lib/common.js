/* Gemeinsame Hilfsfunktionen für Hintergrundskript, Dialog und Einstellungen. */

"use strict";

/** Übersetzter Text aus _locales/<Sprache>/messages.json. */
function t(key, ...subs) {
  return browser.i18n.getMessage(key, subs.map(String)) || key;
}

/**
 * Übersetzt eine HTML-Seite: data-i18n (Text), data-i18n-placeholder,
 * data-i18n-title. Der Seitentitel kommt aus <html data-i18n-doc-title>.
 */
function localizePage() {
  document.documentElement.lang = browser.i18n.getUILanguage();
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.dataset.i18nTitle);
  }
  const docTitle = document.documentElement.dataset.i18nDocTitle;
  if (docTitle) document.title = t(docTitle);
}

const DEFAULT_SETTINGS = Object.freeze({
  // Nachrichtenfilter
  filterName: "Spam",
  filterAccountId: "", // leer = Konto der angezeigten Nachricht
  markAfterFilter: true,

  // „Als Spam markieren“
  hideNativeJunkButton: true,
  spamMarkRead: true,
  spamMoveToJunk: true,

  // ISPConfig
  ispUrl: "", // z. B. https://ispconfig.example.com:8080
  ispAuthMode: "panel", // "panel" = Kunden-Login der Weboberfläche | "remote" = Remote-API-Benutzer
  ispUser: "", // Passwort liegt in der Thunderbird-Passwortverwaltung, nicht hier
  ispBlacklistType: "recipient", // Vorauswahl im Dialog: "recipient" | "sender"
  ispMailbox: "", // nur Remote-API: leer = E-Mail-Adresse des Kontos der Nachricht
  ispClientId: "", // nur Remote-API: leer = automatisch ermitteln
  markAfterBlacklist: true,
  debugLog: false,
});

async function loadSettings() {
  const stored = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function saveSettings(values) {
  const { ispPassword, ...rest } = values; // Passwort nie in storage.local
  await browser.storage.local.set(rest);
}

/** Origin (https://host:port) der ISPConfig-Adresse; null, wenn ungültig. */
function ispOrigin(url) {
  try {
    const u = new URL(String(url || "").trim());
    return u.protocol === "https:" ? u.origin : null;
  } catch (e) {
    return null;
  }
}

/** Speichert das ISPConfig-Passwort in Thunderbirds Passwortverwaltung (leer = löschen). */
async function storeIspPassword(url, user, password) {
  const origin = ispOrigin(url);
  if (!origin || !user) return;
  await browser.spamFilterEditor.setIspPassword(origin, user, password || "");
}

/** Holt das ISPConfig-Passwort aus Thunderbirds Passwortverwaltung. */
async function readIspPassword(url, user) {
  const origin = ispOrigin(url);
  if (!origin || !user) return "";
  return browser.spamFilterEditor.getIspPassword(origin, user);
}

/** Bis Version 1.x lag das Passwort unverschlüsselt in storage.local – einmalig umziehen. */
async function migrateIspPassword() {
  const old = await browser.storage.local.get(["ispPassword", "ispUrl", "ispUser"]);
  if (!old.ispPassword) return;
  if (ispOrigin(old.ispUrl) && old.ispUser) {
    await storeIspPassword(old.ispUrl, old.ispUser, old.ispPassword);
  }
  await browser.storage.local.remove("ispPassword");
}

/** Zerlegt „Name <adresse@domain>“ in { name, email }. */
async function parseAddress(raw) {
  const text = String(raw || "");
  try {
    const [first] = await browser.messengerUtilities.parseMailboxString(text);
    if (first?.email) {
      return { name: first.name || "", email: first.email };
    }
  } catch (e) {
    // Fallback unten
  }
  const m = text.match(/<([^>]+)>/) || text.match(/([^\s<>"]+@[^\s<>"]+)/);
  return { name: "", email: m ? m[1].trim() : text.trim() };
}

function domainOf(email) {
  const at = String(email).lastIndexOf("@");
  return at >= 0 ? String(email).slice(at) : "";
}

/** Liefert die E-Mail-Adresse der Standardidentität eines Kontos. */
async function accountEmail(accountId) {
  try {
    const account = await browser.accounts.get(accountId, false);
    return account?.identities?.[0]?.email || "";
  } catch (e) {
    return "";
  }
}

/** Alle eigenen Adressen (Identitäten aller Konten), kleingeschrieben. */
async function ownAddresses() {
  const result = new Set();
  try {
    for (const account of await browser.accounts.list(false)) {
      for (const identity of account.identities || []) {
        if (identity.email) result.add(identity.email.toLowerCase());
      }
    }
  } catch (e) {
    // ohne Identitäten keine Warnung
  }
  return result;
}

/**
 * Empfängeradressen einer Nachricht in sinnvoller Reihenfolge:
 * zuerst die tatsächliche Zustelladresse (X-Original-To, Delivered-To …),
 * dann To/Cc. Doppelte Einträge werden entfernt.
 */
async function recipientCandidates(messageId) {
  const full = await browser.messages.getFull(messageId).catch(() => null);
  const headers = full?.headers || {};
  const raw = [
    ...(headers["x-original-to"] || []),
    ...(headers["envelope-to"] || []),
    ...(headers["delivered-to"] || []),
    ...(headers["to"] || []),
    ...(headers["cc"] || []),
  ];
  const seen = new Set();
  const list = [];
  for (const line of raw) {
    for (const part of String(line).split(",")) {
      const { email } = await parseAddress(part);
      const key = email.toLowerCase();
      if (email.includes("@") && !seen.has(key)) {
        seen.add(key);
        list.push(email);
      }
    }
  }
  return list;
}

async function findJunkFolder(accountId) {
  try {
    const found = await browser.folders.query({
      accountId,
      specialUse: ["junk"],
    });
    if (found?.length) {
      return found[0];
    }
  } catch (e) {
    // Fallback: Ordnerbaum durchsuchen
  }
  const account = await browser.accounts.get(accountId, true);
  const stack = [...(account?.rootFolder?.subFolders || [])];
  while (stack.length) {
    const folder = stack.shift();
    if (folder.specialUse?.includes("junk")) {
      return folder;
    }
    stack.push(...(folder.subFolders || []));
  }
  return null;
}

/**
 * Bildet den Thunderbird-Spam-Button nach: Spam-Status setzen,
 * optional als gelesen markieren und in den Spam-Ordner verschieben.
 */
async function markAsSpam(messageIds, settings) {
  const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
  const byFolder = new Map();

  for (const id of ids) {
    const msg = await browser.messages.get(id);
    const props = { junk: true };
    if (settings.spamMarkRead) {
      props.read = true;
    }
    await browser.messages.update(id, props);

    if (settings.spamMoveToJunk && msg.folder) {
      const key = msg.folder.accountId;
      if (!byFolder.has(key)) {
        byFolder.set(key, { sourceId: msg.folder.id, ids: [] });
      }
      byFolder.get(key).ids.push(id);
    }
  }

  for (const [accountId, entry] of byFolder) {
    const junk = await findJunkFolder(accountId);
    if (junk && junk.id !== entry.sourceId) {
      await browser.messages.move(entry.ids, junk.id);
    }
  }
}

async function notify(title, message) {
  try {
    await browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("icons/spam.svg"),
      title,
      message,
    });
  } catch (e) {
    console.warn(title, message);
  }
}
