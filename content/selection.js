/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Wird in jede angezeigte Nachricht geladen und liefert auf Anfrage den markierten Text. */
"use strict";

browser.runtime.onMessage.addListener(message => {
  if (message?.cmd === "spamTools.getSelection") {
    const text = window.getSelection()?.toString() ?? "";
    return Promise.resolve(text.trim());
  }
  return undefined;
});
