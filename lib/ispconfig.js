/*
 * Einträge in die ISPConfig „E-Mail-Blacklist“ (mail_blacklist / Postfix mail_access).
 *
 * Zwei Anmeldearten:
 *   "panel"  – normales Kunden-Login der Weboberfläche. Das Add-on füllt das
 *              Formular „Neuen Blacklist Eintrag hinzufügen“ aus (inkl. CSRF-Token).
 *   "remote" – ISPConfig-Remote-API (/remote/json.php). Benötigt einen
 *              Remote-Benutzer, den nur der Admin/Hoster anlegen kann.
 */

"use strict";

const IspConfig = {
  base(settings) {
    if (!ispOrigin(settings.ispUrl)) {
      throw new Error(t("errMissingUrl"));
    }
    return String(settings.ispUrl || "")
      .trim()
      .replace(/\/+$/, "")
      .replace(/\/(login\/)?index\.php$/i, "");
  },

  /**
   * Stellt Benutzer und Passwort bereit. Das Passwort kommt aus der Thunderbird-
   * Passwortverwaltung, außer es wurde gerade in den Einstellungen eingetippt.
   */
  async requireCredentials(settings) {
    if (!settings.ispPassword && settings.ispUser) {
      settings.ispPassword = await readIspPassword(settings.ispUrl, settings.ispUser);
    }
    if (!settings.ispUser || !settings.ispPassword) {
      throw new Error(t("errMissingCredentials"));
    }
  },

  /**
   * Panel-Anfragen laufen über die Experiment-API: ISPConfig setzt sein
   * Sitzungs-Cookie mit „SameSite=Lax“, und Thunderbird schickt es bei normalen
   * Add-on-Anfragen (Herkunft moz-extension://) nicht mit – der Login ginge sofort
   * wieder verloren. Die Remote-API braucht keine Cookies und nutzt fetch direkt.
   */
  /** Wird von den öffentlichen Funktionen aus settings.debugLog gesetzt. */
  logging: false,

  async log(lines) {
    if (!this.logging) return;
    const stamp = new Date().toISOString();
    const text = [].concat(lines).map(l => `${stamp}  ${l}`).join("\n") + "\n";
    await browser.spamFilterEditor.writeLog(text).catch(e => console.warn("Blacklist-Tools: log", e));
  },

  /** Passwort, Sitzungs-ID und CSRF-Werte nie ins Log schreiben. */
  mask(text) {
    return String(text ?? "").replace(
      /((?:password|phpsessid|_csrf_key|_csrf_id)=)[^&'"\s]*/gi,
      "$1***"
    );
  },

  pageSummary(doc) {
    const err = doc.querySelector(".alert-danger, .box_error, #errorMsg");
    return (
      `title "${doc.title}", password field: ${doc.querySelector('input[name="password"]') ? "yes" : "no"}` +
      `, form token: ${doc.querySelector('[name="_csrf_id"]') ? "yes" : "no"}` +
      (err ? `, error: "${err.textContent.trim()}"` : "")
    );
  },

  async fetchHtml(url, init = {}) {
    let status, finalUrl, text;
    if (init.credentials !== "omit") {
      const body = init.body == null ? undefined : String(init.body);
      const method = init.method || "GET";
      let res;
      try {
        res = await browser.spamFilterEditor.httpRequest(url, method, body);
      } catch (e) {
        await this.log(`${method} ${this.mask(url)} → ERROR ${e.message}`);
        throw e;
      }
      ({ status, url: finalUrl, text } = res);
      const doc = new DOMParser().parseFromString(text, "text/html");
      await this.log([
        `${method} ${this.mask(url)}` + (body ? `  data: ${this.mask(body)}` : ""),
        `   → HTTP ${status}, ${res.redirected ? `redirected to ${this.mask(finalUrl)}` : "no redirect"}, ${text.length} chars, ${res.via}`,
        `   → session cookies: ${res.cookies.length ? res.cookies.join(", ") : "NONE"}`,
        `   → ${this.pageSummary(doc)}`,
      ]);
    } else {
      let resp;
      try {
        resp = await fetch(url, { cache: "no-store", ...init });
      } catch (e) {
        throw new Error(t("errUnreachable", e.message));
      }
      ({ status, url: finalUrl } = resp);
      text = await resp.text();
    }
    if (status < 200 || status > 299) {
      throw new Error(t("errHttp", status));
    }
    return { url: finalUrl, text, doc: new DOMParser().parseFromString(text, "text/html") };
  },

  // ---------------------------------------------------------------- Panel ---

  /** Liefert das (leere) Formular „Neuer Blacklist-Eintrag“; meldet sich bei Bedarf an. */
  async panelForm(settings, { forceLogin = false } = {}) {
    const editUrl = `${this.base(settings)}/mail/mail_blacklist_edit.php`;
    if (!forceLogin) {
      const page = await this.fetchHtml(editUrl);
      // Die Seite ist ein HTML-Fragment ohne <form>; die Felder liegen direkt im Dokument.
      if (page.doc.querySelector('[name="_csrf_id"]')) {
        return page.doc;
      }
    }

    await this.requireCredentials(settings);
    const body = new URLSearchParams({
      username: settings.ispUser,
      password: settings.ispPassword,
      s_mod: "login",
      s_pg: "index",
    });
    const login = await this.fetchHtml(`${this.base(settings)}/login/index.php`, {
      method: "POST",
      body,
    });
    const loginError = login.doc.querySelector(".alert-danger, .alert-error, .box_error, .error, #errorMsg");
    if (/\/login\//.test(login.url) && login.doc.querySelector('input[name="password"]')) {
      await this.log("Login considered failed: back on the login page after submitting.");
      throw new Error(
        loginError ? t("errLoginFailed", loginError.textContent.trim()) : t("errLoginLost")
      );
    }

    const page = await this.fetchHtml(editUrl);
    if (!page.doc.querySelector('[name="_csrf_id"]')) {
      throw new Error(t("errNoForm"));
    }
    return page.doc;
  },

  /** Sucht in der Blacklist nach genau dieser Adresse und diesem Typ. */
  async panelExists(settings, address, type) {
    const base = this.base(settings);
    const q = new URLSearchParams({ search_source: address, search_type: type });
    const page = await this.fetchHtml(`${base}/mail/mail_blacklist_list.php?${q}`);
    // Suchfilter wieder zurücksetzen, damit die Liste im Panel nicht gefiltert bleibt.
    // Abwarten! Läuft die Anfrage parallel zum nächsten Formularabruf, kann sie beim
    // Speichern der PHP-Sitzung dessen CSRF-Token überschreiben („CSRF-Versuch blockiert“).
    await this.fetchHtml(`${base}/mail/mail_blacklist_list.php?search_source=&search_type=`).catch(() => {});
    const wanted = address.toLowerCase();
    return [...page.doc.querySelectorAll("tbody tr")].some(tr =>
      [...tr.querySelectorAll("td")].some(td => td.textContent.trim().toLowerCase() === wanted)
    );
  },

  async panelAdd(settings, address, type) {
    await this.panelForm(settings); // stellt sicher, dass wir angemeldet sind
    if (await this.panelExists(settings, address, type)) {
      return { added: false, duplicate: true };
    }
    try {
      return await this.panelSave(settings, address, type);
    } catch (e) {
      if (!e.csrf) throw e;
      await this.log("CSRF token rejected – retrying once with a fresh form.");
      return this.panelSave(settings, address, type);
    }
  },

  /** Holt ein frisches Formular (neues CSRF-Token) und speichert den Eintrag. */
  async panelSave(settings, address, type) {
    const form = await this.panelForm(settings);

    const data = new URLSearchParams();
    for (const el of form.querySelectorAll("input[name], select[name], textarea[name]")) {
      if (el.type === "checkbox" || el.type === "radio") {
        continue;
      }
      if (el.tagName === "SELECT") {
        const opt = el.querySelector("option[selected]") || el.querySelector("option");
        data.set(el.name, opt ? opt.getAttribute("value") ?? opt.textContent : "");
      } else {
        data.set(el.name, el.getAttribute("value") ?? "");
      }
    }
    data.set("source", address);
    data.set("type", type);
    data.set("active", "y");
    data.set("access", data.get("access") || "REJECT");

    const result = await this.fetchHtml(`${this.base(settings)}/mail/mail_blacklist_edit.php`, {
      method: "POST",
      body: data,
    });
    const error = result.doc.querySelector(".alert-danger, #errorMsg");
    if (error && error.textContent.trim()) {
      const err = new Error(t("errIsp", error.textContent.trim()));
      // ISPConfig meldet den Token-Fehler je nach Sprache; „csrf“ steht immer drin.
      err.csrf = /csrf/i.test(error.textContent);
      throw err;
    }
    if (!(await this.panelExists(settings, address, type))) {
      throw new Error(t("errNotSaved"));
    }
    return { added: true, duplicate: false };
  },

  // --------------------------------------------------------------- Remote ---

  async call(settings, method, payload) {
    const { text } = await this.fetchHtml(`${this.base(settings)}/remote/json.php?${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
    });
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(t("errBadResponse", method));
    }
    await this.log(`Remote-API ${method} → ${data.code}${data.code !== "ok" ? `: ${data.message}` : ""}`);
    if (data.code !== "ok") {
      throw new Error(t("errIspMethod", method, data.message || data.code));
    }
    return data.response;
  },

  async remoteAdd(settings, address, type, mailbox) {
    await this.requireCredentials(settings);
    const sid = await this.call(settings, "login", {
      username: settings.ispUser,
      password: settings.ispPassword,
    });
    try {
      const users = await this.call(settings, "mail_user_get", {
        session_id: sid,
        primary_id: { email: mailbox },
      });
      const mailUser = Array.isArray(users) ? users[0] : users;
      if (!mailUser?.server_id) {
        throw new Error(t("errMailboxNotFound", mailbox));
      }
      let clientId = settings.ispClientId ? Number(settings.ispClientId) : 0;
      if (!settings.ispClientId) {
        clientId = Number(
          await this.call(settings, "client_get_id", { session_id: sid, sys_userid: mailUser.sys_userid }).catch(() => 0)
        );
      }
      const existing = await this.call(settings, "mail_blacklist_get", {
        session_id: sid,
        primary_id: { source: address, type },
      }).catch(() => []);
      if (Array.isArray(existing) && existing.length) {
        return { added: false, duplicate: true };
      }
      await this.call(settings, "mail_blacklist_add", {
        session_id: sid,
        client_id: clientId || 0,
        params: { server_id: mailUser.server_id, source: address, type, access: "REJECT", active: "y" },
      });
      return { added: true, duplicate: false };
    } finally {
      this.call(settings, "logout", { session_id: sid }).catch(() => {});
    }
  },

  async remoteSession(settings, fn) {
    await this.requireCredentials(settings);
    const sid = await this.call(settings, "login", {
      username: settings.ispUser,
      password: settings.ispPassword,
    });
    try {
      return await fn(sid);
    } finally {
      this.call(settings, "logout", { session_id: sid }).catch(() => {});
    }
  },

  // ------------------------------------------------- Liste / Löschen -------

  /** Panel: Listen-Suchfelder per POST setzen (wie das Suchformular der Oberfläche). */
  async panelListPost(settings, limit) {
    const body = new URLSearchParams({
      search_limit: String(limit),
      search_active: "",
      search_server_id: "",
      search_source: "",
      search_type: "",
    });
    return this.fetchHtml(`${this.base(settings)}/mail/mail_blacklist_list.php`, { method: "POST", body });
  },

  async panelList(settings) {
    await this.panelForm(settings); // stellt sicher, dass wir angemeldet sind
    const page = await this.panelListPost(settings, 999999999);
    // Ansicht im Panel wieder auf die Standardgröße zurücksetzen (abwarten, siehe panelExists).
    await this.panelListPost(settings, 15).catch(() => {});

    const entries = [];
    for (const tr of page.doc.querySelectorAll("tbody tr")) {
      const cells = [...tr.querySelectorAll("td")].map(td => td.textContent.trim());
      const link = tr.querySelector('[data-load-content*="mail_blacklist_edit.php?id="]');
      const id = link?.getAttribute("data-load-content").match(/id=(\d+)/)?.[1];
      const delHref = tr.querySelector('a[href*="mail_blacklist_del.php"]')?.getAttribute("href") || "";
      const deleteUrl = delHref.match(/'(mail\/mail_blacklist_del\.php\?[^']+)'/)?.[1];
      if (!id || cells.length < 4) continue;
      entries.push({
        id,
        active: this.parseActive(cells[0]),
        activeText: cells[0],
        server: cells[1],
        source: cells[2],
        type: cells[3].toLowerCase(),
        deleteUrl,
      });
    }
    return entries;
  },

  async panelDelete(settings, entry) {
    if (!entry.deleteUrl) {
      throw new Error(t("errNoDeleteLink"));
    }
    const result = await this.fetchHtml(`${this.base(settings)}/${entry.deleteUrl}`);
    const error = result.doc.querySelector(".alert-danger, #errorMsg");
    if (error && error.textContent.trim()) {
      throw new Error(t("errIsp", error.textContent.trim()));
    }
  },

  async remoteList(settings) {
    return this.remoteSession(settings, async sid => {
      const rows = await this.call(settings, "mail_blacklist_get", { session_id: sid, primary_id: -1 });
      return (Array.isArray(rows) ? rows : [rows]).filter(Boolean).map(r => ({
        id: String(r.access_id ?? r.id),
        active: r.active === "y",
        server: String(r.server_id),
        source: r.source,
        type: String(r.type).toLowerCase(),
      }));
    });
  },

  async remoteDelete(settings, entry) {
    return this.remoteSession(settings, sid =>
      this.call(settings, "mail_blacklist_delete", { session_id: sid, primary_id: Number(entry.id) })
    );
  },

  /**
   * Die Spalte „Aktiv“ zeigt ISPConfig in der Sprache des Panels an.
   * true/false bei bekannten Wörtern, sonst null (Text wird dann unverändert angezeigt).
   */
  parseActive(text) {
    const word = String(text).trim().toLowerCase();
    if (/^(y|yes|ja|oui|s[ií]|sim|tak|ano|igen|da|evet|kyllä)$/.test(word)) return true;
    if (/^(n|no|nein|non|não|nao|nie|ne|nem|hayır|ei)$/.test(word)) return false;
    return null;
  },

  // ----------------------------------------------------------- Öffentlich ---

  /** Alle Einträge der E-Mail-Blacklist: [{ id, source, type, active, … }] */
  async listBlacklist(settings) {
    await this.begin(settings, "load blacklist");
    return settings.ispAuthMode === "remote" ? this.remoteList(settings) : this.panelList(settings);
  },

  async deleteFromBlacklist(settings, entry) {
    await this.begin(settings, `delete: ${entry.source} (${entry.type})`);
    return settings.ispAuthMode === "remote"
      ? this.remoteDelete(settings, entry)
      : this.panelDelete(settings, entry);
  },

  async begin(settings, action) {
    this.logging = !!settings.debugLog;
    await this.log(`===== ${action} · ${this.connectionLabel(settings)} · Thunderbird ${(await browser.runtime.getBrowserInfo()).version}`);
  },

  /** Beschreibung der aktiven Verbindung für die Oberfläche. */
  connectionLabel(settings) {
    let host = settings.ispUrl;
    try {
      host = new URL(settings.ispUrl).host;
    } catch (e) {
      // URL so anzeigen, wie sie eingetragen ist
    }
    return t(settings.ispAuthMode === "remote" ? "connRemote" : "connPanel", settings.ispUser || "?", host || "?");
  },

  /** type: "recipient" | "sender" */
  async addToBlacklist(settings, address, type, mailbox) {
    await this.begin(settings, `add: ${address} (${type})`);
    return settings.ispAuthMode === "remote"
      ? this.remoteAdd(settings, address, type, mailbox)
      : this.panelAdd(settings, address, type);
  },

  /** Nur prüfen, ob die Anmeldung klappt. */
  async test(settings) {
    await this.begin(settings, "test connection");
    if (settings.ispAuthMode === "remote") {
      await this.requireCredentials(settings);
      const sid = await this.call(settings, "login", { username: settings.ispUser, password: settings.ispPassword });
      this.call(settings, "logout", { session_id: sid }).catch(() => {});
      return t("testRemoteOk");
    }
    const form = await this.panelForm(settings, { forceLogin: true });
    const server = form.querySelector('select[name="server_id"] option');
    return t("testPanelOk", server?.textContent.trim() || "?");
  },
};
