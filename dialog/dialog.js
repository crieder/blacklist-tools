/* Bestätigungsdialog für „Filter ergänzen“ und „ISPConfig-Blacklist“ (eine oder mehrere Nachrichten). */

"use strict";

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const mode = params.get("mode"); // "filter" | "blacklist"
const messageIds = (params.get("messageIds") || params.get("messageId") || "")
  .split(",")
  .map(Number)
  .filter(Boolean);
const messageId = messageIds[0];
// Mehrere Nachrichten: ein Eintrag pro Nachricht, je Zeile einer (Markierungen werden nicht übernommen)
const multi = messageIds.length > 1;
const selection = multi ? "" : (params.get("selection") || "").trim();
const headerSelection = multi ? "" : (params.get("headerSelection") || "").trim();

// items: [{ message, sender, recipients? }] – bei einer Nachricht genau ein Eintrag
const state = { settings: null, message: null, sender: null, items: [] };

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

/** Entfernt leere Einträge und Duplikate (ohne Groß-/Kleinschreibung), Reihenfolge bleibt. */
function unique(list) {
  const seen = new Set();
  const result = [];
  for (const raw of list) {
    const value = String(raw || "").trim();
    const key = value.toLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function setLines(lines) {
  $("values").value = unique(lines).join("\n");
}

/** Die zu verarbeitenden Werte: eine Zeile pro Eintrag bzw. das Eingabefeld. */
function currentValues() {
  return multi ? unique($("values").value.split(/\r?\n/)) : unique([$("value").value]);
}

/**
 * Schnellauswahl unter dem Eingabefeld. entries: [Beschriftung, Wert] –
 * bei mehreren Nachrichten ist der Wert eine Liste (eine Zeile pro Nachricht).
 */
function setChips(entries, label = "") {
  const box = $("chips");
  box.replaceChildren();
  const filled = entries.filter(([, v]) => (Array.isArray(v) ? v.length : v));
  if (label && filled.length) {
    const span = document.createElement("span");
    span.className = "chips-label";
    span.textContent = label;
    box.append(span);
  }
  for (const [text, value] of filled) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.title = Array.isArray(value) ? unique(value).join("\n") : value;
    b.addEventListener("click", () => {
      if (Array.isArray(value)) {
        setLines(value);
        $("values").focus();
      } else {
        $("value").value = value;
        $("value").focus();
      }
      checkOwnAddress();
    });
    box.append(b);
  }
}

/**
 * Markierung nur übernehmen, wenn sie zum gewählten Feld passt.
 * Zuerst die Markierung in der Kopfzeile (Betreff/Absender), dann die im Nachrichtentext.
 */
function fittingSelection(text) {
  const lower = String(text || "").toLowerCase();
  return [headerSelection, selection].find(s => s && lower.includes(s.toLowerCase())) || "";
}

function senderEmails() {
  return state.items.map(i => i.sender.email);
}

function fillForField(field) {
  setStatus("");
  if (multi) {
    if (field === "sender") {
      setLines(senderEmails());
      setChips([[t("chipAddress"), senderEmails()], [t("chipDomain"), senderEmails().map(domainOf)]], t("chipsUse"));
    } else if (field === "subject") {
      setLines(state.items.map(i => i.message.subject));
      setChips([]);
    } else {
      setLines([]);
      setChips([]);
      setStatus(t("dlgMultiBodyHint"));
    }
    return;
  }
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
  if (mode !== "blacklist") return;
  state.confirmOwn = false;
  if ($("bltype").value === "recipient" && currentValues().some(isOwn)) {
    setStatus(t("dlgOwnWarning"), "err");
  } else {
    setStatus("");
  }
}

function fillBlacklist(type) {
  if (type === "recipient") {
    // Eigene Postfachadressen werden weder vorgeschlagen noch vorausgewählt.
    if (multi) {
      setLines(state.items.map(i => i.recipients.find(a => !isOwn(a))));
      setChips([]);
    } else {
      const foreign = state.items[0].recipients.filter(a => !isOwn(a));
      $("value").value = foreign[0] || "";
      setChips(foreign.length > 1 ? foreign.map(a => [a, a]) : [], t("chipsOtherRecipients"));
    }
    $("hint").textContent = t(multi ? "hintRecipientMulti" : "hintRecipient");
  } else {
    if (multi) {
      setLines(senderEmails());
      setChips([[t("chipAddress"), senderEmails()], [t("chipDomain"), senderEmails().map(domainOf)]], t("chipsUse"));
    } else {
      $("value").value = state.sender.email;
      setChips([[t("chipAddress"), state.sender.email], [t("chipDomain"), domainOf(state.sender.email)]], t("chipsUse"));
    }
    $("hint").textContent = t(multi ? "hintSenderMulti" : "hintSender");
  }
  checkOwnAddress();
  if (!multi) $("value").select();
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
  for (const id of messageIds) {
    const message = await browser.messages.get(id);
    state.items.push({ message, sender: await parseAddress(message.author) });
  }
  state.message = state.items[0].message;
  state.sender = state.items[0].sender;

  if (multi) {
    // Mehrzeiliges Feld statt einzeiliger Eingabe
    $("value").classList.add("hidden");
    $("value").required = false;
    $("values").classList.remove("hidden");
    $("hint").textContent = t("dlgMultiHint");
    $("mark").nextElementSibling.textContent = t("dlgMarkAfterMulti");
  }

  $("cancel").addEventListener("click", () => window.close());
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") window.close();
  });

  if (mode === "blacklist") {
    document.title = t("dlgBlacklistTitle");
    $("heading").textContent = t("dlgBlacklistHeading");
    $("bl-info").classList.remove("hidden");
    $("bl-conn").textContent = IspConfig.connectionLabel(state.settings);
    const accounts = unique(
      await Promise.all(
        state.items.map(async i => (await accountEmail(i.message.folder.accountId)) || i.message.folder.accountId)
      )
    );
    $("bl-account").textContent = accounts.join(", ");
    if (multi) {
      $("target").textContent = t("dlgMultiTarget", String(state.items.length));
    } else {
      $("target").classList.add("hidden");
    }
    $("field-row").classList.add("hidden");
    $("filter-row").classList.add("hidden");
    $("bltype-row").classList.remove("hidden");
    $("value-label").textContent = t(multi ? "dlgAddressesToBlock" : "dlgAddressToBlock");
    state.own = await ownAddresses();
    for (const item of state.items) {
      item.recipients = await recipientCandidates(item.message.id);
    }
    $("bltype").value = state.settings.ispBlacklistType;
    $("bltype").addEventListener("change", () => fillBlacklist($("bltype").value));
    $("value").addEventListener("input", checkOwnAddress);
    $("values").addEventListener("input", checkOwnAddress);
    $("mark").checked = state.settings.markAfterBlacklist;
    $("ok").textContent = t("btnBlock");
    fillBlacklist($("bltype").value);
  } else {
    const field = params.get("field") || "body";
    document.title = t("dlgFilterTitle");
    $("heading").textContent = t("dlgFilterTitle");
    await loadFilters();
    $("target").textContent = multi
      ? t("dlgMultiTarget", String(state.items.length))
      : t("dlgSubjectLine", state.message.subject || t("dlgNoSubject"));
    if (multi) $("value-label").textContent = t("dlgSearchTexts");
    $("field").value = field;
    $("field").addEventListener("change", () => fillForField($("field").value));
    $("mark").checked = state.settings.markAfterFilter;
    fillForField(field);
  }

  $("form").addEventListener("submit", onSubmit);
}

/** Führt die Aktion für einen Wert aus; liefert { duplicate, text }. */
async function processValue(value, ctx) {
  if (mode === "blacklist") {
    const result = await IspConfig.addToBlacklist(state.settings, value, ctx.type, ctx.mailbox);
    const label = t(ctx.type === "recipient" ? "typeRecipient" : "typeSender");
    return { duplicate: result.duplicate, text: t(result.duplicate ? "blAlreadyListed" : "blAdded", value, label) };
  }
  const result = await browser.spamFilterEditor.addCondition(ctx.accountId, ctx.filterName, ctx.field, value);
  return {
    duplicate: result.duplicate,
    text: result.duplicate ? t("filterDuplicate", ctx.filterName) : t("filterAdded", ctx.filterName, result.termCount),
  };
}

async function onSubmit(event) {
  event.preventDefault();
  const values = currentValues();
  if (!values.length) {
    setStatus(t("errEnterSearchText"), "err");
    return;
  }

  const ctx = {};
  if (mode === "blacklist") {
    ctx.type = $("bltype").value;
    if (ctx.type === "recipient" && values.some(isOwn) && !state.confirmOwn) {
      state.confirmOwn = true;
      setStatus(t("dlgConfirmOwn"), "err");
      return;
    }
  }

  $("ok").disabled = true;
  setStatus(t("statusWorking"));

  try {
    if (mode === "blacklist") {
      ctx.mailbox = await mailboxForIsp();
    } else {
      ctx.filterName = $("filter").value;
      ctx.accountId = await filterAccountId();
      ctx.field = $("field").value;
    }

    let text;
    const errors = [];
    if (multi) {
      let added = 0;
      let duplicates = 0;
      for (const [i, value] of values.entries()) {
        setStatus(t("statusProgress", String(i + 1), String(values.length)));
        try {
          const result = await processValue(value, ctx);
          result.duplicate ? duplicates++ : added++;
        } catch (e) {
          console.error(e);
          errors.push(`${value}: ${e.message || e}`);
        }
      }
      text = t("multiResult", String(added), String(duplicates));
    } else {
      text = (await processValue(values[0], ctx)).text;
    }

    // Auswahl merken → beim nächsten Mal vorausgewählt
    await saveSettings(mode === "blacklist" ? { ispBlacklistType: ctx.type } : { filterName: ctx.filterName });

    if (errors.length) {
      // Nichts als Spam markieren; nach dem Korrigieren erneut versuchen (Vorhandenes wird als Duplikat erkannt)
      setStatus(`${text}\n${t("multiErrors")}\n${errors.join("\n")}`, "err");
      $("ok").disabled = false;
      return;
    }

    if ($("mark").checked) {
      await markAsSpam(messageIds, state.settings);
      text += " " + (multi ? t("markedAsJunkMulti", String(messageIds.length)) : t("markedAsJunk"));
    }
    setStatus(text, "ok");
    closeSoon(multi ? 2500 : 1400);
  } catch (e) {
    console.error(e);
    setStatus(e.message || String(e), "err");
    $("ok").disabled = false;
  }
}

init().catch(e => setStatus(e.message || String(e), "err"));
