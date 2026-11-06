/* Wird in jede angezeigte Nachricht geladen und liefert auf Anfrage den markierten Text. */
"use strict";

browser.runtime.onMessage.addListener(message => {
  if (message?.cmd === "spamTools.getSelection") {
    const text = window.getSelection()?.toString() ?? "";
    return Promise.resolve(text.trim());
  }
  return undefined;
});
