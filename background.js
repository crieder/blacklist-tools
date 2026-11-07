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

async function createMenus() {
  await browser.menus.removeAll();
  for (const item of MENU) {
    const props = {
      id: item.id,
      contexts: ["message_display_action_menu"],
      type: item.type || "normal",
    };
    if (item.parentId) props.parentId = item.parentId;
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

async function openDialog(params) {
  const url = browser.runtime.getURL(
    "dialog/dialog.html?" + new URLSearchParams(params).toString()
  );
  await browser.windows.create({ type: "popup", url, width: 560, height: 470 });
}

browser.menus.onClicked.addListener(async (info, tab) => {
  try {
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
      const shown = tab ? await displayedMessages(tab.id).catch(() => []) : [];
      if (shown.length) params.set("messageId", shown[0].id);
      await browser.windows.create({
        type: "popup",
        url: browser.runtime.getURL("manage/manage.html?" + params),
        width: 680,
        height: 760,
      });
      return;
    }

    const messages = tab ? await displayedMessages(tab.id) : [];
    if (!messages.length) {
      await notify(t("extensionName"), t("notifyNoMessage"));
      return;
    }
    const message = messages[0];

    switch (info.menuItemId) {
      case "filter-sender":
      case "filter-subject":
      case "filter-body":
      case "ctx-filter-selection": {
        const selection = info.selectionText || (await getSelectionText(tab.id));
        // Markierung im Betreff/Absender liegt in der Kopfzeile, nicht im Nachrichtentext.
        const headerSelection = await browser.spamFilterEditor
          .getHeaderSelection(tab.id)
          .catch(() => "");
        const field =
          info.menuItemId === "ctx-filter-selection"
            ? "body"
            : info.menuItemId.replace("filter-", "");
        await openDialog({ mode: "filter", field, messageId: message.id, selection, headerSelection });
        break;
      }
      case "blacklist":
        await openDialog({ mode: "blacklist", messageId: message.id });
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
