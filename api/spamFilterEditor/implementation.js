/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Experiment-API „spamFilterEditor“.
 *
 * Bewusst klein gehalten: Sie ist der einzige Teil des Add-ons, der auf
 * Thunderbird-Interna (nsIMsgFilterList) zugreift. Alles andere nutzt die
 * offiziellen MailExtension-APIs.
 */

"use strict";

/* global ChromeUtils, Ci */

var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);
var { ExtensionUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionUtils.sys.mjs"
);
var { MailServices } = ChromeUtils.importESModule(
  "resource:///modules/MailServices.sys.mjs"
);

var { ExtensionError } = ExtensionUtils;

/* Übersetzung aus _locales; wird in getAPI() an die Erweiterung gebunden. */
var L = key => key;

/* global Cc, Services */
// Blendet den eingebauten Spam-Button der Nachrichten-Kopfzeile aus.
var HIDE_JUNK_SHEET = Services.io.newURI(
  "data:text/css," +
    encodeURIComponent(
      '@-moz-document url("about:message") { #hdrJunkButton { display: none !important; } }'
    )
);

function styleSheetService() {
  return Cc["@mozilla.org/content/style-sheet-service;1"].getService(
    Ci.nsIStyleSheetService
  );
}

function setJunkButtonHidden(hidden) {
  const sss = styleSheetService();
  const registered = sss.sheetRegistered(HIDE_JUNK_SHEET, sss.USER_SHEET);
  if (hidden && !registered) {
    sss.loadAndRegisterSheet(HIDE_JUNK_SHEET, sss.USER_SHEET);
  } else if (!hidden && registered) {
    sss.unregisterSheet(HIDE_JUNK_SHEET, sss.USER_SHEET);
  }
}

function attribFor(field) {
  switch (field) {
    case "sender":
      return Ci.nsMsgSearchAttrib.Sender;
    case "subject":
      return Ci.nsMsgSearchAttrib.Subject;
    case "body":
      return Ci.nsMsgSearchAttrib.Body;
  }
  throw new ExtensionError(L("expUnknownField", field));
}

function getFilterList(accountId) {
  const account = MailServices.accounts.getAccount(accountId);
  if (!account) {
    throw new ExtensionError(L("expAccountNotFound", accountId));
  }
  const server = account.incomingServer;
  if (!server || !server.canHaveFilters) {
    throw new ExtensionError(L("expNoFilterSupport", server ? server.prettyName : accountId));
  }
  const filterList = server.getFilterList(null);
  if (!filterList) {
    throw new ExtensionError(L("expFilterListFailed"));
  }
  return { filterList, server };
}

function* filters(filterList) {
  for (let i = 0; i < filterList.filterCount; i++) {
    yield filterList.getFilterAt(i);
  }
}

function termsOf(filter) {
  // Seit Thunderbird 9x ist searchTerms ein JS-Array.
  return Array.from(filter.searchTerms || []);
}

/**
 * Findet das about:message-Dokument (Kopfzeile mit Betreff/Absender) eines Tabs.
 *   Mail-Tab:            chromeBrowser → about:3pane → messageBrowser → about:message
 *   Nachricht im Tab:    chromeBrowser → about:message
 *   Nachrichtenfenster:  window.messageBrowser → about:message
 */
function aboutMessageOf(nativeTab) {
  let win =
    nativeTab?.chromeBrowser?.contentWindow ??
    nativeTab?.messageBrowser?.contentWindow ??
    null;
  if (win?.location?.href?.startsWith("about:3pane")) {
    win = win.messageBrowser?.contentWindow ?? null;
  }
  return win?.location?.href?.startsWith("about:message") ? win : null;
}

/*
 * Eigener Cookie-Speicher für die ISPConfig-Weboberfläche.
 *
 * Thunderbird wendet bei internen Anfragen die Cookie-Regeln des Hauptfensters an;
 * ist „Cookies akzeptieren“ abgeschaltet, wird das Sitzungs-Cookie von ISPConfig
 * verworfen – auch mit Ausnahme für den Server. Deshalb laufen die Anfragen ohne
 * Thunderbirds Cookie-Speicher (credentials: "omit"), und das Add-on merkt sich das
 * Sitzungs-Cookie selbst (nur im Arbeitsspeicher, nur für diesen Host).
 * Erkannt werden die eigenen Anfragen am Kopf X-Blacklist-Tools; er bleibt auch bei
 * Umleitungen erhalten, sodass auch das Cookie der Login-Umleitung (302) ankommt.
 */
var MARK_HEADER = "X-Blacklist-Tools";
var cookieJar = new Map(); // host -> Map(name -> value)

function isOurs(channel) {
  try {
    return channel.getRequestHeader(MARK_HEADER) === "1";
  } catch (e) {
    return false;
  }
}

function storeSetCookies(host, raw) {
  const jar = cookieJar.get(host) ?? new Map();
  for (const line of String(raw).split("\n")) {
    const [pair, ...attrs] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const expired =
      value === "" ||
      value === "deleted" ||
      attrs.some(a => {
        const [k, v] = a.split("=").map(x => x?.trim().toLowerCase());
        return (k === "max-age" && Number(v) <= 0) ||
          (k === "expires" && Date.parse(v) < Date.now());
      });
    if (expired) jar.delete(name);
    else jar.set(name, value);
  }
  cookieJar.set(host, jar);
}

var httpObserver = {
  observe(subject, topic) {
    if (!(subject instanceof Ci.nsIHttpChannel) || !isOurs(subject)) {
      return;
    }
    const host = subject.URI.host;
    if (topic === "http-on-modify-request") {
      const jar = cookieJar.get(host);
      if (jar?.size) {
        subject.setRequestHeader(
          "Cookie",
          [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
          false
        );
      }
    } else {
      let raw = "";
      try {
        raw = subject.getResponseHeader("Set-Cookie");
      } catch (e) {
        return; // keine Cookies in dieser Antwort
      }
      storeSetCookies(host, raw);
    }
  },
};

var observing = false;
function startObserving() {
  if (observing) return;
  Services.obs.addObserver(httpObserver, "http-on-modify-request");
  Services.obs.addObserver(httpObserver, "http-on-examine-response");
  observing = true;
}
function stopObserving() {
  if (!observing) return;
  Services.obs.removeObserver(httpObserver, "http-on-modify-request");
  Services.obs.removeObserver(httpObserver, "http-on-examine-response");
  observing = false;
}

function mainWindowFetch() {
  const win = Services.wm.getMostRecentWindow("mail:3pane");
  if (!win) {
    throw new ExtensionError(L("expNoMainWindow"));
  }
  return win.fetch.bind(win);
}

/*
 * ISPConfig-Passwort in Thunderbirds Passwortverwaltung. Eigener „Realm“, damit der
 * Eintrag unter Gespeicherte Passwörter erkennbar ist und nicht mit Browser-Logins
 * derselben Seite kollidiert.
 */
var LOGIN_REALM = "ISPConfig (Blacklist-Tools)";
// Frühere Namen des Add-ons; gespeicherte Passwörter werden beim ersten Zugriff umbenannt.
var OLD_LOGIN_REALMS = ["ISPConfig (Spam Toolbox)"];

function checkOrigin(origin) {
  const uri = Services.io.newURI(origin);
  if (uri.scheme !== "https") {
    throw new ExtensionError(L("expHttpsOnly"));
  }
  return uri.prePath;
}

/** Gespeicherte ISPConfig-Logins. Thunderbird 159 kennt nur noch die …Async-Funktionen. */
async function findIspLogins(origin) {
  const prePath = checkOrigin(origin);
  const found = await Services.logins.searchLoginsAsync({ origin: prePath, httpRealm: LOGIN_REALM });
  if (found.length) {
    return found;
  }
  // Einträge unter einem früheren Add-on-Namen übernehmen.
  for (const realm of OLD_LOGIN_REALMS) {
    for (const old of await Services.logins.searchLoginsAsync({ origin: prePath, httpRealm: realm })) {
      const login = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
      login.init(prePath, null, LOGIN_REALM, old.username, old.password, "", "");
      found.push(await Services.logins.addLoginAsync(login));
      await (Services.logins.removeLoginAsync?.(old) ?? Services.logins.removeLogin(old));
    }
  }
  return found;
}

/* global IOUtils, PathUtils */
function logPath() {
  return PathUtils.join(PathUtils.profileDir, "blacklist-tools.log");
}

/**
 * Thunderbird-interne Fehler (z. B. aus der Passwortverwaltung) kämen beim Add-on nur
 * als „An unexpected error occurred“ an. Deshalb jede Funktion so einpacken, dass
 * die eigentliche Meldung als ExtensionError weitergegeben wird.
 */
function withReadableErrors(functions) {
  const wrapped = {};
  for (const [name, fn] of Object.entries(functions)) {
    wrapped[name] = async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        if (e instanceof ExtensionError) throw e;
        console.error(`Blacklist-Tools: ${name}`, e);
        const text = e?.message || (typeof e === "string" ? e : "") || String(e?.result ?? e);
        throw new ExtensionError(`${name}: ${text}`);
      }
    };
  }
  return wrapped;
}

this.spamFilterEditor = class extends ExtensionCommon.ExtensionAPI {
  onShutdown(isAppShutdown) {
    stopObserving();
    cookieJar.clear();
    // Beim Deaktivieren/Deinstallieren den Original-Button wieder zeigen.
    if (!isAppShutdown) {
      setJunkButtonHidden(false);
    }
  }

  getAPI(context) {
    L = (key, ...subs) => context.extension.localizeMessage(key, subs.map(String));
    return { spamFilterEditor: withReadableErrors(this.functions(context)) };
  }

  functions(context) {
    return {
        async getHeaderSelection(tabId) {
          const tab = context.extension.tabManager.get(tabId);
          const win = aboutMessageOf(tab?.nativeTab);
          return win?.getSelection()?.toString().trim() ?? "";
        },

        async httpRequest(url, method, body) {
          if (!/^https:\/\//i.test(url)) {
            throw new ExtensionError(L("expHttpsOnly"));
          }
          startObserving();
          const headers = { [MARK_HEADER]: "1" };
          const init = { method, credentials: "omit", cache: "no-store", headers };
          if (body != null) {
            init.body = body;
            headers["Content-Type"] = "application/x-www-form-urlencoded";
          }
          let resp;
          try {
            resp = await mainWindowFetch()(url, init);
          } catch (e) {
            throw new ExtensionError(L("errUnreachable", e.message));
          }
          const host = Services.io.newURI(url).host;
          return {
            status: resp.status,
            url: resp.url,
            redirected: resp.redirected,
            via: "own cookie jar",
            text: await resp.text(),
            cookies: [...(cookieJar.get(host)?.keys() ?? [])],
          };
        },

        async setIspPassword(origin, username, password) {
          for (const old of await findIspLogins(origin)) {
            if (old.username === username || !password) {
              // removeLoginAsync ab neueren Versionen; Thunderbird 128 hat noch removeLogin.
              await (Services.logins.removeLoginAsync?.(old) ?? Services.logins.removeLogin(old));
            }
          }
          if (!password) return;
          const login = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
          login.init(checkOrigin(origin), null, LOGIN_REALM, username, password, "", "");
          await Services.logins.addLoginAsync(login);
        },

        async getIspPassword(origin, username) {
          return (await findIspLogins(origin)).find(l => l.username === username)?.password ?? "";
        },

        async hasIspPassword(origin, username) {
          return (await findIspLogins(origin)).some(l => l.username === username && l.password);
        },

        async writeLog(text) {
          await IOUtils.writeUTF8(logPath(), text, { mode: "appendOrCreate" });
          return logPath();
        },

        async clearLog() {
          await IOUtils.remove(logPath(), { ignoreAbsent: true });
        },

        async getLogPath() {
          return logPath();
        },

        async revealLog() {
          const exists = await IOUtils.exists(logPath());
          const file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
          file.initWithPath(exists ? logPath() : PathUtils.profileDir);
          if (exists) {
            file.launch(); // öffnet die Datei im Standard-Editor
          } else {
            file.reveal();
          }
          return exists;
        },

        /**
         * Setzt Hilfe-Tooltips auf die gerade angezeigten Menüeinträge des Add-ons.
         * Die menus-API kennt keine Tooltips; die Einträge tragen die ID
         * "<widgetId>-menuitem-_<menuItemId>" (ext-menus.js) und liegen je nach
         * Menü im Hauptfenster, in about:3pane oder in about:message.
         */
        async setMenuTooltips(tooltips) {
          const prefix = `${ExtensionCommon.makeWidgetId(context.extension.id)}-menuitem-_`;
          const documents = [];
          const collect = doc => {
            documents.push(doc);
            for (const browser of doc.querySelectorAll("browser")) {
              try {
                const inner = browser.contentDocument;
                if (inner && !documents.includes(inner)) collect(inner);
              } catch (e) {
                // Fremde/entfernte Inhalte überspringen
              }
            }
          };
          for (const win of Services.wm.getEnumerator(null)) {
            collect(win.document);
          }
          let count = 0;
          for (const doc of documents) {
            for (const [id, text] of Object.entries(tooltips || {})) {
              const el = doc.getElementById(prefix + id);
              if (el) {
                el.setAttribute("tooltiptext", String(text));
                count++;
              }
            }
          }
          return count;
        },

        async setNativeJunkButtonHidden(hidden) {
          setJunkButtonHidden(!!hidden);
        },

        async getFilterNames(accountId) {
          const { filterList } = getFilterList(accountId);
          return [...filters(filterList)].map(f => f.filterName);
        },

        async addCondition(accountId, filterName, field, value) {
          const text = String(value || "").trim();
          if (!text) {
            throw new ExtensionError(L("expEmptyText"));
          }

          const { filterList, server } = getFilterList(accountId);
          const filter = [...filters(filterList)].find(
            f => f.filterName === filterName
          );
          if (!filter) {
            throw new ExtensionError(L("expFilterNotFound", server.prettyName, filterName));
          }

          const attrib = attribFor(field);
          const op = Ci.nsMsgSearchOp.Contains;
          const terms = termsOf(filter);

          if (terms.some(t => t.matchAll)) {
            throw new ExtensionError(L("expMatchAll", filterName));
          }

          const lower = text.toLowerCase();
          const duplicate = terms.some(
            t =>
              t.attrib == attrib &&
              t.op == op &&
              String(t.value?.str ?? "").toLowerCase() == lower
          );
          if (duplicate) {
            return {
              added: false,
              duplicate: true,
              termCount: terms.length,
              accountName: server.prettyName,
            };
          }

          // Verknüpfung (UND/ODER) vom bestehenden Filter übernehmen,
          // damit „Mindestens eine Bedingung erfüllen“ erhalten bleibt.
          const booleanAnd = terms.length
            ? terms[terms.length - 1].booleanAnd
            : false;

          const term = filter.createTerm();
          term.attrib = attrib;
          term.op = op;
          term.booleanAnd = booleanAnd;
          const termValue = term.value;
          termValue.attrib = attrib;
          termValue.str = text;
          term.value = termValue;

          filter.appendTerm(term);
          filterList.saveToDefaultFile();

          return {
            added: true,
            duplicate: false,
            termCount: terms.length + 1,
            accountName: server.prettyName,
          };
        },
    };
  }
};
