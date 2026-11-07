"use strict";

const $ = id => document.getElementById(id);
// ispPassword wird nicht in storage.local gespeichert, sondern in der Passwortverwaltung.
const TEXT_FIELDS = ["filterAccountId", "filterName", "ispUrl", "ispAuthMode", "ispUser", "ispBlacklistType", "ispMailbox", "ispClientId"];
const CHECK_FIELDS = ["hideNativeJunkButton", "markAfterFilter", "spamMarkRead", "spamMoveToJunk", "markAfterBlacklist", "debugLog"];

function setStatus(text, kind = "") {
  $("status").textContent = text;
  $("status").className = kind;
}

function updateRemoteRows() {
  const remote = $("ispAuthMode").value === "remote";
  document.querySelectorAll(".remote-only").forEach(el => el.classList.toggle("hidden", !remote));
}

function readForm() {
  const values = {};
  for (const k of TEXT_FIELDS) values[k] = $(k).value.trim();
  for (const k of CHECK_FIELDS) values[k] = $(k).checked;
  values.ispPassword = $("ispPassword").value; // nur wenn gerade eingetippt
  return values;
}

/** Match-Pattern für die Remote-API (enthält keinen Port; gilt für alle Ports des Hosts). */
function originPattern(url) {
  const origin = ispOrigin(url);
  if (!origin) throw new Error(t("errHttps"));
  return `https://${new URL(origin).hostname}/*`;
}

/** Zeigt im Passwortfeld an, ob bereits ein Passwort gespeichert ist. */
async function updatePasswordPlaceholder() {
  const origin = ispOrigin($("ispUrl").value);
  const user = $("ispUser").value.trim();
  let saved = false;
  if (origin && user) {
    saved = await browser.spamFilterEditor.hasIspPassword(origin, user).catch(() => false);
  }
  $("ispPassword").placeholder = saved ? t("optPasswordSaved") : "";
}

async function loadFilterNames() {
  const list = $("filterNames");
  list.replaceChildren();
  let accountId = $("filterAccountId").value;
  if (!accountId) {
    const def = await browser.accounts.getDefault(false).catch(() => null);
    accountId = def?.id;
  }
  if (!accountId) return;
  try {
    const names = await browser.spamFilterEditor.getFilterNames(accountId);
    for (const n of names) list.append(new Option(n, n));
    $("filterHint").textContent = t("optFilterCount", names.length);
  } catch (e) {
    $("filterHint").textContent = e.message;
  }
}

async function init() {
  localizePage();
  await migrateIspPassword().catch(e => console.error(e));

  const accounts = await browser.accounts.list(false);
  for (const a of accounts) {
    if (a.type === "none" && !a.identities?.length) continue;
    $("filterAccountId").append(new Option(a.name, a.id));
  }

  const s = await loadSettings();
  for (const k of TEXT_FIELDS) $(k).value = s[k] ?? "";
  for (const k of CHECK_FIELDS) $(k).checked = !!s[k];

  $("ispAuthMode").addEventListener("change", updateRemoteRows);
  $("ispUrl").addEventListener("change", updatePasswordPlaceholder);
  $("ispUser").addEventListener("change", updatePasswordPlaceholder);
  $("logPath").textContent = await browser.spamFilterEditor.getLogPath().catch(() => "?");
  $("revealLog").addEventListener("click", async () => {
    try {
      const exists = await browser.spamFilterEditor.revealLog();
      if (!exists) setStatus(t("optNoLog"), "err");
    } catch (e) {
      setStatus(e.message, "err");
    }
  });
  $("clearLog").addEventListener("click", async () => {
    await browser.spamFilterEditor.clearLog();
    setStatus(t("optLogCleared"), "ok");
  });
  updateRemoteRows();
  updatePasswordPlaceholder();
  $("filterAccountId").addEventListener("change", loadFilterNames);
  $("donate").addEventListener("click", () => openDonatePage().catch(e => console.error(e)));
  await loadFilterNames();
}

$("form").addEventListener("submit", event => {
  event.preventDefault();
  const values = readForm();

  // Die Remote-API wird direkt vom Add-on angesprochen und braucht eine Host-Berechtigung.
  // permissions.request muss direkt in der Benutzeraktion aufgerufen werden.
  let permission = Promise.resolve(true);
  if (values.ispAuthMode === "remote" && values.ispUrl) {
    try {
      permission = browser.permissions.request({ origins: [originPattern(values.ispUrl)] });
    } catch (e) {
      setStatus(e.message, "err");
      return;
    }
  } else if (values.ispUrl && !ispOrigin(values.ispUrl)) {
    setStatus(t("errHttps"), "err");
    return;
  }

  permission
    .then(async granted => {
      await saveSettings(values);
      if (values.ispPassword) {
        await storeIspPassword(values.ispUrl, values.ispUser, values.ispPassword);
        $("ispPassword").value = "";
      }
      await updatePasswordPlaceholder();
      setStatus(t(granted ? "optSaved" : "optSavedNoPermission"), granted ? "ok" : "err");
    })
    .catch(e => setStatus(e.message, "err"));
});

$("test").addEventListener("click", async () => {
  const values = { ...(await loadSettings()), ...readForm() };
  setStatus(t("optTesting"));
  try {
    setStatus(await IspConfig.test(values), "ok");
  } catch (e) {
    setStatus(e.message || String(e), "err");
  }
});

init().catch(e => setStatus(e.message, "err"));
