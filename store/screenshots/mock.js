/*
 * Nur für Store-Screenshots: ersetzt die Thunderbird-APIs durch Beispieldaten,
 * damit die echten Seiten des Add-ons im Browser dargestellt werden können.
 * MESSAGES wird von make.py eingefügt.
 */
"use strict";

const SAMPLE_SETTINGS = {
  ispUrl: "https://ispconfig.example.com:8080",
  ispAuthMode: "panel",
  ispUser: "demo-client",
  ispBlacklistType: "recipient",
  filterName: "Spam",
};

const SAMPLE_MESSAGE = {
  id: 1,
  subject: "Your invoice #48213 is ready",
  author: "Billing Team <billing@invoice-notice.example>",
  folder: { id: "f1", accountId: "account1" },
};

function sampleBlacklist() {
  const recipients = [
    "amazon-old@mail.example.com", "conference2019@mail.example.com", "forum-signup@mail.example.com",
    "hotel-booking@mail.example.com", "newsletter-a@mail.example.com", "newsletter-b@mail.example.com",
    "online-shop@mail.example.com", "raffle@mail.example.com", "shop-2021@mail.example.com",
    "survey@mail.example.com", "test-account@mail.example.com", "trade-fair@mail.example.com",
    "travel-deals@mail.example.com", "webinar@mail.example.com", "wifi-login@mail.example.com",
  ];
  const senders = ["promo@deals.example.net", "noreply@lottery.example.org", "spam.example"];
  const list = [
    ...recipients.map((source, i) => ({ id: String(100 + i), source, type: "recipient", active: true })),
    ...senders.map((source, i) => ({ id: String(200 + i), source, type: "sender", active: true })),
  ];
  // Weitere Einträge für eine realistische Gesamtzahl (liegen alphabetisch auf späteren Seiten)
  const words = ["zoo", "yoga", "xmas", "workshop", "warranty", "video", "vacation", "update", "tickets", "taxi",
    "streaming", "sports", "software", "sale", "rewards", "recipes", "printer", "pizza", "photos", "parking"];
  words.forEach((w, i) => {
    list.push({ id: String(300 + i), source: `${w}@mail.example.com`, type: "recipient", active: i % 7 !== 3 });
  });
  return list;
}

function subst(msg, subs) {
  let text = msg.message;
  for (const [name, ph] of Object.entries(msg.placeholders || {})) {
    const n = Number(ph.content.slice(1)) - 1;
    text = text.replace(new RegExp(`\\$${name}\\$`, "gi"), subs[n] ?? "");
  }
  return text;
}

window.browser = {
  i18n: {
    getMessage: (key, subs = []) => (MESSAGES[key] ? subst(MESSAGES[key], subs) : key),
    getUILanguage: () => "en",
  },
  storage: {
    local: {
      get: async () => ({ ...SAMPLE_SETTINGS, managePageSize: "15" }),
      set: async () => {},
      remove: async () => {},
    },
  },
  runtime: { getBrowserInfo: async () => ({ version: "140.0" }) },
  accounts: {
    list: async () => [{ id: "account1", name: "you@example.com", type: "imap", identities: [{ email: "you@example.com" }] }],
    get: async () => ({ id: "account1", identities: [{ email: "you@example.com" }] }),
    getDefault: async () => ({ id: "account1", identities: [{ email: "you@example.com" }] }),
  },
  messages: {
    get: async () => SAMPLE_MESSAGE,
    getFull: async () => ({ headers: { "delivered-to": ["shop-2023@mail.example.com"], to: ["shop-2023@mail.example.com"] } }),
  },
  messengerUtilities: {
    parseMailboxString: async text => {
      const m = String(text).match(/^(.*?)\s*<([^>]+)>$/);
      return [m ? { name: m[1], email: m[2] } : { name: "", email: String(text).trim() }];
    },
  },
  windows: { getCurrent: async () => ({ id: 1 }), remove: async () => {} },
  spamFilterEditor: {
    getFilterNames: async () => ["Spam", "Newsletters", "Invoices"],
    getIspPassword: async () => "x",
    hasIspPassword: async () => true,
    getLogPath: async () => "…/blacklist-tools.log",
  },
};
