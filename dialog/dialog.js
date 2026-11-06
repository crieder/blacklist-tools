/* Bestätigungsdialog für „Filter ergänzen“ und „ISPConfig-Blacklist“. */

"use strict";

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const mode = params.get("mode"); // "filter" | "blacklist"
const messageId = Number(params.get("messageId"));
const selection = (params.get("selection") || "").trim();

const state = { settings: null, message: null, sender: null };

function setStatus(text, kind = "") {
  $("status").textContent = text;
  $("status").className = kind;
}

function closeSoon(ms = 1400) {
  setTimeout(async () => {
    const win = await browser.windows.getCurrent();
    browser.windows.remove(win.id);
  }, ms);
}

function setChips(entries, label = "") {
  const box = $("chips");
  box.replaceChildren();
  if (label && entries.some(([, v]) => v)) {
    const span = document.createElement("span");
    span.className = "chips-label";
    span.textContent = label;
    box.append(span);
  }
  for (const [label, value] of entries) {
    if (!value) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.title = value;
    b.addEventListener("click", () => {
      $("value").value = value;
      $("value").focus();
    });
    box.append(b);
  }
}

const headerSelection = (params.get("headerSelection") || "").trim();

/**
 * Markierung nur übernehmen, wenn sie zum gewählten Feld passt.
 * Zuerst die Markierung in der Kopfzeile (Betreff/Absender), dann die im Nachrichtentext.
 */
function fittingSelection(text) {
  const lower = String(text || "").toLowerCase();
  return [headerSelection, selection].find(s => s && lower.includes(s.toLowerCase())) || "";
}

function fillForField(field) {
  const subject = state.message.subject || "";
  const email = state.sender.email;
  if (field === "sender") {
    $("value").value = fittingSelection(state.message.author) || email;
    setChips([[t("chipAddress"), email], [t("chipDomain"), domainOf(email)]]);
  } else if (field === "subject") {
    $("value").value = fittingSelection(subject) || subject;
    setChips([[t("chipWholeSubject"), subject]]);
  } else {
    $("value").value = selection;
    setChips([]);
    if (!selection) {
      setStatus(t("dlgTipSelect"));
    }
  }
  $("value").select();
}

async function filterAccountId() {
  return state.settings.filterAccountId || state.message.folder.accountId;
}

async function mailboxForIsp() {
  return state.settings.ispMailbox || (await accountEmail(state.message.folder.accountId));
}

function isOwn(address) {
  return state.own?.has(String(address).trim().toLowerCase());
}

/** Warnt, wenn eine eigene Postfachadresse gesperrt würde. */
function checkOwnAddress() {
  state.confirmOwn = false;
  if ($("bltype").value === "recipient" && isOwn($("value").value)) {
    setStatus(t("dlgOwnWarning"), "err");
  } else {
    setStatus("");
  }
}

function fillBlacklist(type) {
  if (type === "recipient") {
    // Eigene Postfachadressen werden weder vorgeschlagen noch vorausgewählt.
    const foreign = state.recipients.filter(a => !isOwn(a));
    $("value").value = foreign[0] || "";
    setChips(foreign.length > 1 ? foreign.map(a => [a, a]) : [], t("chipsOtherRecipients"));
    $("hint").textContent = t("hintRecipient");
  } else {
    $("value").value = state.sender.email;
    setChips([[t("chipAddress"), state.sender.email], [t("chipDomain"), domainOf(state.sender.email)]], t("chipsUse"));
    $("hint").textContent = t("hintSender");
  }
  checkOwnAddress();
  $("value").select();
}

/** Liest die vorhandenen Nachrichtenfilter des Kontos ein; der zuletzt benutzte ist vorausgewählt. */
async function loadFilters() {
  const select = $("filter");
  select.replaceChildren();
  const names = await browser.spamFilterEditor.getFilterNames(await filterAccountId());
  if (!names.length) {
    throw new Error(t("errNoFilters"));
  }
  for (const name of names) {
    select.append(new Option(name, name));
  }
  select.value = names.includes(state.settings.filterName)
    ? state.settings.filterName
    : names[0];
}

async function init() {
  localizePage();
  state.settings = await loadSettings();
  state.message = await browser.messages.get(messageId);
  state.sender = await parseAddress(state.message.author);

  $("cancel").addEventListener("click", () => window.close());
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") window.close();
  });

  if (mode === "blacklist") {
    document.title = t("dlgBlacklistTitle");
    $("heading").textContent = t("dlgBlacklistHeading");
    $("target").classList.add("hidden");
    $("bl-info").classList.remove("hidden");
    $("bl-conn").textContent = IspConfig.connectionLabel(state.settings);
    $("bl-account").textContent =
      (await accountEmail(state.message.folder.accountId)) || state.message.folder.accountId;
    $("field-row").classList.add("hidden");
    $("filter-row").classList.add("hidden");
    $("bltype-row").classList.remove("hidden");
    $("value-label").textContent = t("dlgAddressToBlock");
    state.own = await ownAddresses();
    state.recipients = await recipientCandidates(messageId);
    $("bltype").value = state.settings.ispBlacklistType;
    $("bltype").addEventListener("change", () => fillBlacklist($("bltype").value));
    $("value").addEventListener("input", checkOwnAddress);
    $("mark").checked = state.settings.markAfterBlacklist;
    $("ok").textContent = t("btnBlock");
    fillBlacklist($("bltype").value);
  } else {
    const field = params.get("field") || "body";
    document.title = t("dlgFilterTitle");
    $("heading").textContent = t("dlgFilterTitle");
    await loadFilters();
    $("target").textContent = t("dlgSubjectLine", state.message.subject || t("dlgNoSubject"));
    $("field").value = field;
    $("field").addEventListener("change", () => {
      setStatus("");
      fillForField($("field").value);
    });
    $("mark").checked = state.settings.markAfterFilter;
    fillForField(field);
  }

  $("form").addEventListener("submit", onSubmit);
}

async function onSubmit(event) {
  event.preventDefault();
  const value = $("value").value.trim();
  if (!value) {
    setStatus(t("errEnterSearchText"), "err");
    return;
  }
  $("ok").disabled = true;
  setStatus(t("statusWorking"));

  try {
    let text;
    if (mode === "blacklist") {
      const type = $("bltype").value;
      if (type === "recipient" && isOwn(value) && !state.confirmOwn) {
        state.confirmOwn = true;
        $("ok").disabled = false;
        setStatus(t("dlgConfirmOwn"), "err");
        return;
      }
      const mailbox = await mailboxForIsp();
      const result = await IspConfig.addToBlacklist(state.settings, value, type, mailbox);
      await saveSettings({ ispBlacklistType: type });
      const label = t(type === "recipient" ? "typeRecipient" : "typeSender");
      text = t(result.duplicate ? "blAlreadyListed" : "blAdded", value, label);
    } else {
      const filterName = $("filter").value;
      const result = await browser.spamFilterEditor.addCondition(
        await filterAccountId(),
        filterName,
        $("field").value,
        value
      );
      // Auswahl merken → beim nächsten Mal vorausgewählt
      await saveSettings({ filterName });
      text = result.duplicate
        ? t("filterDuplicate", filterName)
        : t("filterAdded", filterName, result.termCount);
    }

    if ($("mark").checked) {
      await markAsSpam(messageId, state.settings);
      text += " " + t("markedAsJunk");
    }
    setStatus(text, "ok");
    closeSoon();
  } catch (e) {
    console.error(e);
    setStatus(e.message || String(e), "err");
    $("ok").disabled = false;
  }
}

init().catch(e => setStatus(e.message || String(e), "err"));
