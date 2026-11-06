/* Fenster „ISPConfig-Blacklist anzeigen“: suchen, blättern, löschen, hinzufügen. */

"use strict";

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const typeLabel = type => (type === "recipient" ? t("typeRecipient") : type === "sender" ? t("typeSender") : type);

const state = {
  settings: null,
  entries: [],
  page: 0,
  pending: null, // id des Eintrags, dessen Löschen bestätigt werden muss
  busy: false,
};

function setStatus(text, kind = "") {
  $("status").textContent = text;
  $("status").className = kind;
}

function setBusy(busy) {
  state.busy = busy;
  for (const el of document.querySelectorAll("button, select")) el.disabled = busy;
  if (!busy) render();
}

function filtered() {
  const q = $("query").value.trim().toLowerCase();
  return q ? state.entries.filter(e => e.source.toLowerCase().includes(q)) : state.entries;
}

function pageSize() {
  return Number($("pageSize").value) || Infinity;
}

function highlight(td, text, q) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) {
    td.textContent = text;
    return;
  }
  const mark = document.createElement("mark");
  mark.textContent = text.slice(i, i + q.length);
  td.append(text.slice(0, i), mark, text.slice(i + q.length));
}

function render() {
  const list = filtered();
  const size = pageSize();
  const pages = Math.max(1, Math.ceil(list.length / size));
  state.page = Math.min(Math.max(0, state.page), pages - 1);
  const start = size === Infinity ? 0 : state.page * size;
  const visible = list.slice(start, start + size);
  const q = $("query").value.trim().toLowerCase();

  const tbody = $("rows");
  tbody.replaceChildren();
  if (!visible.length) {
    const tr = tbody.insertRow();
    const td = tr.insertCell();
    td.colSpan = 4;
    td.className = "empty";
    td.textContent = state.entries.length ? t("mgNoMatch") : t("mgEmpty");
  }
  for (const entry of visible) {
    const tr = tbody.insertRow();
    if (entry.active === false) tr.className = "inactive";
    const addr = tr.insertCell();
    addr.className = "addr";
    highlight(addr, entry.source, q);
    tr.insertCell().textContent = typeLabel(entry.type);
    tr.insertCell().textContent =
      entry.active === true ? t("yes") : entry.active === false ? t("no") : entry.activeText ?? "?";
    const act = tr.insertCell();
    act.className = "act";
    const btn = document.createElement("button");
    btn.type = "button";
    const confirming = state.pending === entry.id;
    btn.textContent = confirming ? t("btnConfirmDelete") : t("btnDelete");
    btn.className = confirming ? "confirm" : "";
    btn.disabled = state.busy;
    btn.addEventListener("click", () => onDelete(entry));
    act.append(btn);
  }

  $("pageInfo").textContent =
    list.length !== state.entries.length
      ? t("mgPageInfoFiltered", state.page + 1, pages, list.length, state.entries.length)
      : t("mgPageInfo", state.page + 1, pages, list.length);
  $("first").disabled = $("prev").disabled = state.busy || state.page === 0;
  $("last").disabled = $("next").disabled = state.busy || state.page >= pages - 1;

  const q2 = $("query").value.trim().toLowerCase();
  const exists = state.entries.some(e => e.source.toLowerCase() === q2 && e.type === $("type").value);
  $("add").disabled = state.busy || !q2 || exists;
  $("add").title = exists ? t("mgExists") : t("mgAddTitle");
}

async function load() {
  setBusy(true);
  setStatus(t("mgLoading"));
  try {
    const entries = await IspConfig.listBlacklist(state.settings);
    entries.sort((a, b) => a.source.localeCompare(b.source, "de", { sensitivity: "base" }));
    state.entries = entries;
    setStatus(t("mgLoaded", entries.length), "ok");
  } catch (e) {
    setStatus(e.message || String(e), "err");
  } finally {
    setBusy(false);
  }
}

async function onDelete(entry) {
  if (state.pending !== entry.id) {
    state.pending = entry.id; // erster Klick: Bestätigung anfordern
    render();
    return;
  }
  state.pending = null;
  setBusy(true);
  setStatus(t("mgDeleting", entry.source));
  try {
    await IspConfig.deleteFromBlacklist(state.settings, entry);
    await load();
    const still = state.entries.some(e => e.id === entry.id);
    setStatus(t(still ? "mgStillThere" : "mgDeleted", entry.source), still ? "err" : "ok");
  } catch (e) {
    setStatus(e.message || String(e), "err");
    setBusy(false);
  }
}

async function onAdd(event) {
  event.preventDefault();
  const address = $("query").value.trim();
  const type = $("type").value;
  if (!address) return;

  const own = await ownAddresses();
  if (type === "recipient" && own.has(address.toLowerCase()) && state.pending !== `add:${address}`) {
    state.pending = `add:${address}`;
    setStatus(t("mgOwnWarning"), "err");
    return;
  }
  state.pending = null;

  setBusy(true);
  setStatus(t("mgAdding", address));
  try {
    let mailbox = state.settings.ispMailbox;
    if (!mailbox && params.get("messageId")) {
      const msg = await browser.messages.get(Number(params.get("messageId")));
      mailbox = await accountEmail(msg.folder.accountId);
    }
    if (!mailbox) {
      const def = await browser.accounts.getDefault(false).catch(() => null);
      mailbox = def?.identities?.[0]?.email || "";
    }
    const result = await IspConfig.addToBlacklist(state.settings, address, type, mailbox);
    await saveSettings({ ispBlacklistType: type });
    await load();
    setStatus(result.duplicate ? t("mgWasPresent", address) : t("mgAdded", address, typeLabel(type)), "ok");
  } catch (e) {
    setStatus(e.message || String(e), "err");
    setBusy(false);
  }
}

async function init() {
  localizePage();
  state.settings = await loadSettings();
  $("conn").textContent = IspConfig.connectionLabel(state.settings);
  $("type").value = state.settings.ispBlacklistType;

  try {
    const saved = await browser.storage.local.get("managePageSize");
    if (saved.managePageSize !== undefined) $("pageSize").value = String(saved.managePageSize);
  } catch (e) {
    // Standard behalten
  }

  $("query").addEventListener("input", () => {
    state.page = 0;
    state.pending = null;
    render();
  });
  $("type").addEventListener("change", render);
  $("pageSize").addEventListener("change", () => {
    state.page = 0;
    browser.storage.local.set({ managePageSize: $("pageSize").value }).catch(() => {});
    render();
  });
  $("first").addEventListener("click", () => { state.page = 0; render(); });
  $("prev").addEventListener("click", () => { state.page--; render(); });
  $("next").addEventListener("click", () => { state.page++; render(); });
  $("last").addEventListener("click", () => { state.page = Infinity; render(); });
  $("reload").addEventListener("click", load);
  $("addForm").addEventListener("submit", onAdd);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (state.pending) {
        state.pending = null;
        render();
      } else {
        window.close();
      }
    }
  });

  $("query").focus();
  await load();
}

init().catch(e => setStatus(e.message || String(e), "err"));
