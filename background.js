/* Hintergrundskript: Menü des Spam-Buttons und Kontextmenü. */

"use strict";

const SELECTION_SCRIPT_ID = "spamTools-selection";

// title = Schlüssel in _locales/<Sprache>/messages.json
const MENU = [
  { id: "filter-sender", title: "menuFilterSender" },
  { id: "filter-subject", title: "menuFilterSubject" },
  { id: "filter-body", title: "menuFilterBody" },
  { id: "sep-1", type: "separator" },
  { id: "blacklist", title: "menuBlacklist" },
  { id: "blacklist-manage", title: "menuBlacklistManage" },
  { id: "sep-2", type: "separator" },
  { id: "mark-spam", title: "menuMarkSpam" },
  { id: "sep-3", type: "separator" },
  { id: "options", title: "menuOptions" },
  { id: "donate", title: "menuDonate" },
];

// Präfix der Einträge im Kontextmenü der Nachrichtenliste (IDs müssen eindeutig sein)
const LIST_PREFIX = "list:";

async function createMenus() {
  await browser.menus.removeAll();
  // Button im Nachrichtenkopf (eine Nachricht) und Button in der Hauptsymbolleiste
  // (funktioniert auch, wenn mehrere Nachrichten markiert sind – dann gibt es keinen Nachrichtenkopf).
  for (const item of MENU) {
    const props = {
      id: item.id,
      contexts: ["message_display_action_menu", "action_menu"],
      type: item.type || "normal",
    };
    if (item.title) props.title = t(item.title);
    browser.menus.create(props);
  }
  // Rechtsklick in der Nachrichtenliste → Untermenü „Blacklist-Tools“
  browser.menus.create({ id: "list-root", contexts: ["message_list"], title: t("extensionName") });
  for (const item of MENU) {
    const props = {
      id: LIST_PREFIX + item.id,
      parentId: "list-root",
      contexts: ["message_list"],
      type: item.type || "normal",
    };
    if (item.title) props.title = t(item.title);
    browser.menus.create(props);
  }
  // Rechtsklick auf markierten Text in der Nachricht
  browser.menus.create({
    id: "ctx-filter-selection",
    contexts: ["selection"],
    title: t("menuCtxFilterSelection"),
  });
}

async function registerSelectionScript() {
  try {
    const existing = await browser.scripting.messageDisplay.getRegisteredScripts({
      ids: [SELECTION_SCRIPT_ID],
    });
    if (!existing.length) {
      await browser.scripting.messageDisplay.registerScripts([
        { id: SELECTION_SCRIPT_ID, js: ["content/selection.js"], runAt: "document_idle" },
      ]);
    }
  } catch (e) {
    console.error("Blacklist-Tools: script registration failed", e);
  }
}

async function applyJunkButtonSetting() {
  const { hideNativeJunkButton } = await loadSettings();
  try {
    await browser.spamFilterEditor.setNativeJunkButtonHidden(hideNativeJunkButton);
  } catch (e) {
    console.error("Blacklist-Tools: could not toggle the native junk button", e);
  }
}

async function init() {
  await migrateIspPassword().catch(e => console.error("Blacklist-Tools: password migration failed", e));
  await registerSelectionScript();
  await createMenus();
  await applyJunkButtonSetting();
}

browser.runtime.onInstalled.addListener(init);
browser.runtime.onStartup.addListener(init);
// Bei jedem Aufwachen des Hintergrundskripts neu registrieren (siehe getSelectionText).
registerSelectionScript();

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.hideNativeJunkButton) {
    applyJunkButtonSetting();
  }
});

/**
 * Liest die Markierung aus der angezeigten Nachricht.
 * Primär per scripting.executeScript (zielt bei Mail-Tabs auf den Nachrichtenbereich);
 * das registrierte Skript ist nur Rückfallebene, weil Thunderbird es an den
 * Hintergrundkontext bindet, der bei MV3 im Leerlauf beendet wird.
 */
async function getSelectionText(tabId) {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => window.getSelection()?.toString() ?? "",
    });
    const text = (results || []).map(r => r?.result).find(t => typeof t === "string" && t.trim());
    if (text) return text.trim();
  } catch (e) {
    console.warn("Blacklist-Tools: executeScript failed", e);
  }
  try {
    const text = await browser.tabs.sendMessage(tabId, { cmd: "spamTools.getSelection" });
    return typeof text === "string" ? text : "";
  } catch (e) {
    return "";
  }
}

async function displayedMessages(tabId) {
  const result = await browser.messageDisplay.getDisplayedMessages(tabId);
  return Array.isArray(result) ? result : result?.messages || [];
}

/** Liest eine (ggf. seitenweise gelieferte) MessageList vollständig. */
async function allMessages(list) {
  if (!list) return [];
  if (Array.isArray(list)) return list;
  const result = [...(list.messages || [])];
  let page = list;
  while (page.id) {
    page = await browser.messages.continueList(page.id);
    result.push(...(page.messages || []));
  }
  return result;
}

/**
 * Nachrichten, auf die sich ein Menüklick bezieht: im Kontextmenü der Liste die
 * dort markierten, sonst die im Tab markierten bzw. angezeigten Nachrichten.
 */
async function targetMessages(info, tab) {
  if (info.selectedMessages) {
    const selected = await allMessages(info.selectedMessages);
    if (selected.length) return selected;
  }
  if (!tab) return [];
  if (tab.type === "mail") {
    const selected = await allMessages(await browser.mailTabs.getSelectedMessages(tab.id).catch(() => null));
    if (selected.length) return selected;
  }
  return displayedMessages(tab.id).catch(() => []);
}

async function openDialog(params, messages) {
  const query = new URLSearchParams({ ...params, messageId: messages[0].id });
  if (messages.length > 1) query.set("messageIds", messages.map(m => m.id).join(","));
  const url = browser.runtime.getURL("dialog/dialog.html?" + query.toString());
  await browser.windows.create({ type: "popup", url, width: 560, height: messages.length > 1 ? 620 : 470 });
}

browser.menus.onClicked.addListener(async (info, tab) => {
  try {
    const menuItemId = String(info.menuItemId).startsWith(LIST_PREFIX)
      ? String(info.menuItemId).slice(LIST_PREFIX.length)
      : info.menuItemId;
    info = { ...info, menuItemId };
    if (info.menuItemId === "options") {
      await browser.runtime.openOptionsPage();
      return;
    }
    if (info.menuItemId === "donate") {
      await openDonatePage();
      return;
    }
    if (info.menuItemId === "blacklist-manage") {
      const params = new URLSearchParams();
      const shown = await targetMessages(info, tab).catch(() => []);
      if (shown.length) params.set("messageId", shown[0].id);
      await browser.windows.create({
        type: "popup",
        url: browser.runtime.getURL("manage/manage.html?" + params),
        width: 680,
        height: 760,
      });
      return;
    }

    const messages = await targetMessages(info, tab);
    if (!messages.length) {
      await notify(t("extensionName"), t("notifyNoMessage"));
      return;
    }
    switch (info.menuItemId) {
      case "filter-sender":
      case "filter-subject":
      case "filter-body":
      case "ctx-filter-selection": {
        // Rechtsklick auf markierten Text betrifft immer nur die angezeigte Nachricht.
        const targets = info.menuItemId === "ctx-filter-selection" ? messages.slice(0, 1) : messages;
        const params = {
          mode: "filter",
          field: info.menuItemId === "ctx-filter-selection" ? "body" : info.menuItemId.replace("filter-", ""),
        };
        // Markierten Text gibt es nur bei einer einzelnen Nachricht.
        if (targets.length === 1) {
          params.selection = info.selectionText || (await getSelectionText(tab.id));
          // Markierung im Betreff/Absender liegt in der Kopfzeile, nicht im Nachrichtentext.
          params.headerSelection = await browser.spamFilterEditor.getHeaderSelection(tab.id).catch(() => "");
        }
        await openDialog(params, targets);
        break;
      }
      case "blacklist":
        await openDialog({ mode: "blacklist" }, messages);
        break;
      case "mark-spam":
        await markAsSpam(
          messages.map(m => m.id),
          await loadSettings()
        );
        break;
    }
  } catch (e) {
    console.error(e);
    await notify(t("notifyErrorTitle", t("extensionName")), e.message || String(e));
  }
});
