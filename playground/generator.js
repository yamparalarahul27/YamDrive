"use strict";

// Turn a plain-text outline / ASCII sketch into role-annotated layout.json
// spec(s). Deterministic and dependency-free so the playground stays a single
// static page. The emitted spec names each node's `role`; the token layer
// (tokens.js) supplies platform-correct typography, color, and metrics.
//
// Globals:
//   specsFromOutline(text) -> [{ name, spec }]   (one per top-level `screen`)
//   specFromOutline(text)  -> spec               (first screen; back-compat)
//
// Simple roles: screen card row column section group | title subtitle heading
//   body label caption | field button | - listItem
// Composite roles (pipe-delimited fields), enough for a full exchange app:
//   appbar / header / balance / actions / segmented / chips / chip / asset /
//   tabbar / avatar / divider / spacer / chart / stats / stat / slider /
//   switch / banner / tag / trader / orderform
// Markdown shortcuts: # ## ### -> title/heading/subtitle, > -> caption,
//   [x] -> button, _ x -> field, - x -> list item.

(function (global) {
  const DEVICE = { width: 393, height: 852 };
  const MARGIN = 16, SPACING = 16, PAD = 16;

  const CONTAINERS = { screen: 1, card: 1, row: 1, column: 1, section: 1, group: 1, list: 1, carousel: 1, grid: 1 };
  const TEXT_ROLES = {
    display: 1, title: 1, subtitle: 1, heading: 1, body: 1, label: 1, caption: 1,
    amount: 1, value: 1, symbol: 1, positive: 1, negative: 1, neutral: 1
  };
  const COMPOSITES = {
    appbar: 1, header: 1, balance: 1, actions: 1, segmented: 1, chips: 1, chip: 1, asset: 1,
    tabbar: 1, avatar: 1, divider: 1, spacer: 1, chart: 1, stats: 1, stat: 1, slider: 1,
    switch: 1, banner: 1, tag: 1, trader: 1, orderform: 1, iconbtn: 1, quote: 1, timeframe: 1,
    account: 1, buttons: 1, tabs: 1, statbar: 1, position: 1, posdetail: 1, tile: 1, dapp: 1,
    keypad: 1, bignum: 1, receipthead: 1, sharebtn: 1, cardbig: 1,
    back: 1, progress: 1, level: 1, infocard: 1, sheethead: 1, profilecard: 1,
    permhead: 1, notifyart: 1, cta: 1
  };

  const TEXT_HEIGHT = {
    display: 44, title: 42, heading: 32, subtitle: 26, body: 24, label: 22, caption: 18,
    amount: 44, value: 24, symbol: 20, positive: 22, negative: 22, neutral: 22,
    placeholder: 24, buttonText: 24, avatarText: 22, actionGlyph: 26, tabLabelActive: 16,
    navTitle: 24, tagText: 18, statValue: 24, tfActive: 18, tfIdle: 18,
    longText: 18, shortText: 18, buttonTextAlt: 24
  };
  const COMPONENT_H = {
    button: 52, field: 52, listItem: 44, chip: 34, segmented: 40, appbar: 56, header: 56,
    tabbar: 72, iconBtn: 36, chart: 168, slider: 30, switch: 30, tag: 24, smallbtn: 34,
    key: 52, grabber: 5, progress: 10
  };
  const COMPONENT_SIZE = { avatar: 40, actionIcon: 56, iconBtn: 36, tabDot: 22, tabDotActive: 22, ghost: 36, appicon: 56 };

  const GLYPH = { buy: "+", sell: "−", send: "↑", receive: "↓", deposit: "↓", withdraw: "↑", transfer: "⇄", swap: "⇄", trade: "⇄", history: "↻", more: "⋯", "…": "⋯", "⋯": "⋯" };

  // --- builders --------------------------------------------------------------
  function txt(role, chars, align) {
    return { type: "TEXT", role, name: (String(chars || role)).slice(0, 40) || role, x: 0, y: 0, width: 0, height: 0, characters: chars == null ? "" : String(chars), textAlign: align || "LEFT" };
  }
  function frame(role, mode, extra, children) {
    return {
      type: "FRAME", role, name: role, x: 0, y: 0, width: 0, height: 0,
      layout: Object.assign({ mode: mode || "VERTICAL", itemSpacing: 0, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN" }, extra || {}),
      children: children || []
    };
  }
  function grow(node) { node.grow = true; return node; }
  function txtC(role, chars, color, align) { const t = txt(role, chars, align); t.color = color; return t; } // explicit color (theme-independent)
  function txtF(role, chars, color, family, align) { const t = txt(role, chars, align); if (color) t.color = color; if (family) t.fontFamily = family; return t; }
  function logoCircle(hex, size) { const a = frame("avatar", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, []); a.avatarSize = size; a.fills = [{ type: "SOLID", color: hex }]; return a; }
  function initials(s) { return String(s || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "•"; }
  function glyphFor(s) { const k = String(s || "").trim().toLowerCase(); return GLYPH[k] || initials(s).slice(0, 1); }
  function changeRole(s) { const t = String(s || "").trim(); if (t[0] === "-" || /^[▼↓]/.test(t)) return "negative"; if (t[0] === "+" || /^[▲↑]/.test(t)) return "positive"; return "neutral"; }
  function fields(s) { return String(s || "").split("|").map((x) => x.trim()); }

  // A Phosphor icon node. `name` is a logical icon/glyph the renderer resolves
  // via icons.js; `fallback` is drawn if it doesn't resolve (or icons.js absent).
  function iconNode(name, size, colorRole, fallback) {
    const n = frame("icon", "NONE", {}, []);
    n.icon = name; n.iconSize = size || 20; n.colorRole = colorRole || "onBackground"; n.fallback = fallback == null ? "" : fallback;
    return n;
  }
  function avatar(label, size) { const a = frame("avatar", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("avatarText", initials(label), "CENTER")]); if (size) a.avatarSize = size; return a; }
  function iconBtn(g) { return frame("iconBtn", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [iconNode(g, 20, "onBackground", g)]); }
  function ghost() { return frame("ghost", "NONE", {}, []); }
  function smallBtn(label) { return frame("smallbtn", "HORIZONTAL", { paddingLeft: 16, paddingRight: 16, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("buttonText", label || "", "CENTER")]); }
  // A LONG/SHORT · leverage pill, colored green/red by direction.
  function pill(dirField) {
    const parts = String(dirField || "").trim().split(/\s+/);
    const dir = (parts[0] || "LONG").toUpperCase();
    const lev = parts.slice(1).join(" ");
    const isShort = /short/i.test(dir);
    const label = dir + (lev ? " · " + lev : "");
    return frame(isShort ? "pillShort" : "pillLong", "HORIZONTAL", { paddingLeft: 10, paddingRight: 10, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt(isShort ? "shortText" : "longText", label, "CENTER")]);
  }

  // deterministic price series for a chart (no Math.random / Date)
  function chartPoints(seed, up) {
    let h = 2166136261;
    const s = String(seed) + (up ? "+" : "-");
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    const n = 28, pts = []; let v = 0.5;
    for (let i = 0; i < n; i++) {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h = h >>> 0;
      const r = (h / 4294967295) - 0.5;
      v += r * 0.2 + (up ? 0.012 : -0.012);
      v = Math.max(0.08, Math.min(0.92, v));
      pts.push(Number(v.toFixed(4)));
    }
    return pts;
  }

  // --- composites ------------------------------------------------------------
  function buildComposite(role, content) {
    const f = fields(content);
    switch (role) {
      case "appbar": {
        const trailing = f.slice(1).filter(Boolean).map((g) => iconBtn(GLYPH[g.toLowerCase()] || g));
        return frame("appbar", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [txt("heading", f[0] || ""), frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "CENTER" }, trailing)]);
      }
      case "header": {
        let left, title, right;
        if (f.length >= 2) { left = f[0]; title = f[1]; right = f[2] || ""; }
        else { left = "‹"; title = f[0] || ""; right = ""; }
        const l = left ? iconBtn(GLYPH[left.toLowerCase()] || left) : ghost();
        const r = right ? iconBtn(GLYPH[right.toLowerCase()] || right) : ghost();
        return frame("header", "HORIZONTAL", { primaryAxisAlignItems: "MIN", counterAxisAlignItems: "CENTER" }, [l, grow(txt("navTitle", title, "CENTER")), r]);
      }
      case "balance":
        return frame("balance", "VERTICAL", { itemSpacing: 6, counterAxisAlignItems: "MIN" }, [
          txt("caption", f[0] || "Balance"), txt("amount", f[1] || ""), txt(changeRole(f[2]), f[2] || "")
        ]);
      case "actions": {
        const cols = f.filter(Boolean).map((a) => frame("group", "VERTICAL", { itemSpacing: 8, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [
          frame("actionIcon", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [iconNode(a, 26, "onPrimary", glyphFor(a))]),
          txt("caption", a, "CENTER")
        ]));
        return frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "MIN" }, cols);
      }
      case "segmented": {
        const opts = f.filter(Boolean).map((o, i) => grow(frame(i === 0 ? "segmentSelected" : "segmentItem", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", o, "CENTER")])));
        return frame("segmented", "HORIZONTAL", { itemSpacing: 4, paddingTop: 4, paddingBottom: 4, paddingLeft: 4, paddingRight: 4, counterAxisAlignItems: "STRETCH" }, opts);
      }
      case "chips": {
        const chips = f.filter(Boolean).map((c) => frame("chip", "HORIZONTAL", { paddingLeft: 14, paddingRight: 14, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", c, "CENTER")]));
        return frame("group", "HORIZONTAL", { itemSpacing: 8, counterAxisAlignItems: "CENTER" }, chips);
      }
      case "chip":
        return frame("chip", "HORIZONTAL", { paddingLeft: 14, paddingRight: 14, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", f[0] || "", "CENTER")]);
      case "tag":
        return frame("tag", "HORIZONTAL", { paddingLeft: 10, paddingRight: 10, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("tagText", f[0] || "", "CENTER")]);
      case "iconbtn":
        return iconBtn(f[0] || "•");
      case "asset": {
        const left = frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "CENTER" }, [
          avatar(f[0]), frame("group", "VERTICAL", { itemSpacing: 2, counterAxisAlignItems: "MIN" }, [txt("value", f[1] || f[0] || ""), txt("symbol", f[0] || "")])
        ]);
        const right = frame("group", "VERTICAL", { itemSpacing: 2, counterAxisAlignItems: "MAX" }, [txt("value", f[2] || "", "RIGHT"), txt(changeRole(f[3]), f[3] || "", "RIGHT")]);
        return frame("listrow", "HORIZONTAL", { paddingTop: 8, paddingBottom: 8, primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [left, right]);
      }
      case "trader": {
        const roi = f[1] || "";
        const left = frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "CENTER" }, [
          avatar(f[0]), frame("group", "VERTICAL", { itemSpacing: 2, counterAxisAlignItems: "MIN" }, [txt("value", f[0] || ""), txt("symbol", "30D ROI")])
        ]);
        const right = frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "CENTER" }, [
          frame("group", "VERTICAL", { itemSpacing: 2, counterAxisAlignItems: "MAX" }, [txt(changeRole(roi), roi, "RIGHT"), txt("symbol", "PNL", "RIGHT")]),
          smallBtn(f[2] || "Copy")
        ]);
        return frame("listrow", "HORIZONTAL", { paddingTop: 8, paddingBottom: 8, primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [left, right]);
      }
      case "tabbar": {
        const tabs = f.filter(Boolean).map((tb, i) => frame("group", "VERTICAL", { itemSpacing: 5, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [
          iconNode(tb, 24, i === 0 ? "primary" : "onBackgroundSecondary", "•"), txt(i === 0 ? "tabLabelActive" : "caption", tb, "CENTER")
        ]));
        const bar = frame("tabbar", "HORIZONTAL", { paddingLeft: 18, paddingRight: 18, primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, tabs);
        return frame("group", "VERTICAL", { itemSpacing: 0, counterAxisAlignItems: "STRETCH" }, [frame("divider", "NONE", {}, []), bar]);
      }
      case "avatar": return avatar(f[0]);
      case "divider": return frame("divider", "NONE", {}, []);
      case "spacer": { const n = parseInt(f[0], 10); const sp = frame("spacer", "NONE", {}, []); sp.spacerSize = isNaN(n) ? 16 : n; return sp; }
      case "chart": {
        const up = changeRole(f[0]) !== "negative";
        const opts = (f[1] || "").toLowerCase().split(/\s+/);
        const c = frame("chart", "NONE", {}, []);
        c.up = up; c.points = chartPoints(content || "chart", up);
        c.lineOnly = opts.indexOf("line") >= 0;
        c.bleed = opts.indexOf("bleed") >= 0;
        return c;
      }
      case "quote": {
        // logo + ticker/exchange + big price + change + bookmark
        const idRow = frame("group", "HORIZONTAL", { itemSpacing: 6, counterAxisAlignItems: "CENTER" }, [txt("value", f[0] || ""), txt("symbol", f[1] || "")]);
        const priceRow = frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [
          frame("group", "HORIZONTAL", { itemSpacing: 10, counterAxisAlignItems: "CENTER" }, [txt("amount", f[2] || ""), txt(changeRole(f[3]), f[3] || "")]),
          iconNode("bookmark", 24, "onBackgroundSecondary", "☆")
        ]);
        return frame("group", "VERTICAL", { itemSpacing: 10, counterAxisAlignItems: "MIN" }, [avatar(f[0]), idRow, priceRow]);
      }
      case "timeframe": {
        const tabs = f.filter(Boolean).map((o) => {
          const sel = /\*$/.test(o);
          const label = o.replace(/\*$/, "").trim();
          const kids = [txt(sel ? "tfActive" : "tfIdle", label, "CENTER")];
          if (sel) kids.push(frame("tfmark", "NONE", {}, []));
          return frame("group", "VERTICAL", { itemSpacing: 5, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, kids);
        });
        return frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, tabs);
      }
      case "stats": {
        const tiles = f.filter(Boolean).map((it) => {
          const c = it.indexOf(":"); const label = c >= 0 ? it.slice(0, c).trim() : it; const val = c >= 0 ? it.slice(c + 1).trim() : "";
          return grow(frame("group", "VERTICAL", { itemSpacing: 3, counterAxisAlignItems: "MIN" }, [txt("caption", label), txt("value", val)]));
        });
        return frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "MIN" }, tiles);
      }
      case "stat": {
        let label, val;
        if (f.length >= 2) { label = f[0]; val = f[1]; }
        else { const c = (f[0] || "").indexOf(":"); label = c >= 0 ? f[0].slice(0, c).trim() : f[0]; val = c >= 0 ? f[0].slice(c + 1).trim() : ""; }
        // Optional 3rd field: "ok"/"confirmed" → green check + green value; else an icon name.
        const flag = (f[2] || "").trim().toLowerCase();
        let valNode;
        if (/^(ok|confirmed|success|done)$/.test(flag)) {
          valNode = frame("group", "HORIZONTAL", { itemSpacing: 5, counterAxisAlignItems: "CENTER" }, [iconNode("check-circle", 15, "#2FBF71"), txtC("value", val || "", "#2FBF71")]);
        } else if (flag) {
          valNode = frame("group", "HORIZONTAL", { itemSpacing: 5, counterAxisAlignItems: "CENTER" }, [iconNode(flag, 15, "onBackground", ""), txt("value", val || "", "RIGHT")]);
        } else {
          valNode = txt("value", val || "", "RIGHT");
        }
        return frame("group", "HORIZONTAL", { paddingTop: 4, paddingBottom: 4, primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [txt("caption", label || ""), valNode]);
      }
      case "sheethead":
        return frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [txt("heading", f[0] || ""), iconBtn("x")]);
      case "permhead": {
        // icon | title | subtitle — centered permission/onboarding header
        return frame("group", "VERTICAL", { itemSpacing: 14, counterAxisAlignItems: "STRETCH" }, [
          frame("group", "HORIZONTAL", { primaryAxisAlignItems: "CENTER" }, [iconNode(f[0] || "bell", 40, "onBackgroundSecondary")]),
          txt("title", f[1] || "", "CENTER"),
          txt("subtitle", f[2] || "", "CENTER")
        ]);
      }
      case "notifyart": {
        // title | time — a notification toast over a faded app grid (illustration)
        const line = () => { const b = frame("bar", "NONE", {}, []); b.fixedH = 8; b.cornerRadius = 4; b.fills = [{ type: "SOLID", color: "#E9E9EE" }]; return b; };
        const tIcon = frame("appsq", "NONE", {}, []); tIcon.fixedW = 34; tIcon.fixedH = 34; tIcon.cornerRadius = 9; tIcon.fills = [{ type: "SOLID", color: "#DADAE0" }];
        const tText = grow(frame("group", "VERTICAL", { itemSpacing: 8, counterAxisAlignItems: "STRETCH" }, [
          frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [txtC("value", f[0] || "Time to wind down", "#1D1D1F"), txtC("caption", f[1] || "3:51 PM", "#9A9AA0", "RIGHT")]),
          line(), line()
        ]));
        const toast = frame("idcard", "HORIZONTAL", { paddingTop: 12, paddingBottom: 12, paddingLeft: 12, paddingRight: 12, itemSpacing: 10, counterAxisAlignItems: "MIN" }, [tIcon, tText]);
        toast.fills = [{ type: "SOLID", color: "#FFFFFF" }]; toast.cornerRadius = 18; toast.stroke = "#ECECEF"; toast.strokeWeight = 1;
        const sq = () => { const s = frame("appsq", "NONE", {}, []); s.fixedH = 58; s.cornerRadius = 14; s.fills = [{ type: "SOLID", color: "#FFFFFF" }]; s.opacity = 0.7; return grow(s); };
        const row3 = () => frame("group", "HORIZONTAL", { itemSpacing: 14, counterAxisAlignItems: "STRETCH" }, [sq(), sq(), sq()]);
        const grid = frame("group", "VERTICAL", { itemSpacing: 14, counterAxisAlignItems: "STRETCH" }, [row3(), row3(), row3(), row3()]); grid.opacity = 0.9;
        return frame("group", "VERTICAL", { itemSpacing: 14, counterAxisAlignItems: "STRETCH" }, [toast, grid]);
      }
      case "cta": {
        const b = frame("cta", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txtC("buttonText", f[0] || "", "#FFFFFF", "CENTER")]);
        b.fills = [{ type: "SOLID", color: "#111214" }]; b.cornerRadius = 30; b.fixedH = 58;
        return b;
      }
      case "profilecard": {
        // name | tag1 | tag2  — lanyard/ID-badge card (bespoke olive styling)
        const ink = "#3E4A2A", green = "#8FA25B", pillBd = "#E1E4DA", slotC = "#E9EBE3";
        const serif = 'Georgia, "Times New Roman", serif';
        const mono = 'ui-monospace, Menlo, "Courier New", monospace';
        const slotBar = frame("group", "HORIZONTAL", { primaryAxisAlignItems: "CENTER" }, [(function () { const b = frame("idslot", "NONE", {}, []); b.fixedW = 74; b.fixedH = 13; b.cornerRadius = 7; b.fills = [{ type: "SOLID", color: slotC }]; return b; })()]);
        const seal = frame("idseal", "VERTICAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER", itemSpacing: 3 }, [logoCircle("#C4CDB2", 26), txtF("caption", "MEMBER", green, mono, "CENTER"), txtF("caption", "SINCE 2024", green, mono, "CENTER")]);
        seal.fixedW = 104; seal.fixedH = 104; seal.cornerRadius = 52; seal.stroke = "#E4E7DC"; seal.strokeWeight = 2;
        const topRow = frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "MIN" }, [logoCircle(ink, 58), seal]);
        const wordmark = txtF("amount", f[0] || "Markscout", ink, serif, "LEFT");
        const pillOf = (t) => { const p = frame("idpill", "HORIZONTAL", { paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txtF("label", t, green, mono, "CENTER")]); p.stroke = pillBd; p.strokeWeight = 1; p.cornerRadius = 22; return p; };
        const tags = frame("group", "HORIZONTAL", { itemSpacing: 10 }, [pillOf(f[1] || "ALPHA USER"), pillOf(f[2] || "#54801")]);
        const div = frame("divider", "NONE", {}, []); div.dashed = true; div.dashColor = "#CBD0C0";
        const info = frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "MIN" }, [
          frame("group", "VERTICAL", { itemSpacing: 3, counterAxisAlignItems: "MIN" }, [txtF("caption", "GLOBAL / UTC", green, mono), txtF("caption", "MEMBER SINCE OCT 25'", green, mono), txtF("caption", "09:45.16AM", green, mono)]),
          txtF("caption", "ACCOUNT ACTIVE", green, mono, "RIGHT")
        ]);
        const cust = frame("idbtn", "HORIZONTAL", { paddingTop: 12, paddingBottom: 12, paddingLeft: 20, paddingRight: 20, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txtF("label", "CUSTOMISE", ink, mono, "CENTER")]); cust.fills = [{ type: "SOLID", color: "#EAECE4" }]; cust.cornerRadius = 22;
        const qr = frame("qr", "NONE", {}, []); qr.qrSize = 104; qr.qrColor = ink;
        const bottom = frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "MAX" }, [cust, qr]);
        const card = frame("idcard", "VERTICAL", { paddingTop: 22, paddingBottom: 22, paddingLeft: 22, paddingRight: 22, itemSpacing: 22, counterAxisAlignItems: "STRETCH" }, [slotBar, topRow, wordmark, tags, div, info, bottom]);
        card.fills = [{ type: "SOLID", color: "#FFFFFF" }]; card.stroke = "#ECEEE9"; card.strokeWeight = 1; card.cornerRadius = 28;
        return card;
      }
      case "slider": { const p = parseInt(f[0], 10); const s = frame("slider", "NONE", {}, []); s.pct = isNaN(p) ? 50 : Math.max(0, Math.min(100, p)); return s; }
      case "switch": {
        const on = /^(on|true|yes|1)$/i.test((f[1] || "").trim());
        const sw = frame("switch", "NONE", {}, []); sw.on = on;
        return frame("listrow", "HORIZONTAL", { paddingTop: 8, paddingBottom: 8, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "CENTER" }, [grow(txt("body", f[0] || "", "LEFT")), sw]);
      }
      case "banner":
        return frame("banner", "VERTICAL", { paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14, itemSpacing: 2, counterAxisAlignItems: "MIN" }, [txt("label", (f.join(" · ")) || "")]);
      case "orderform": {
        const asset = f[0] || "BTC", quote = f[1] || "USDT";
        return frame("column", "VERTICAL", { itemSpacing: 12, counterAxisAlignItems: "STRETCH" }, [
          frame("segmented", "HORIZONTAL", { itemSpacing: 4, paddingTop: 4, paddingBottom: 4, paddingLeft: 4, paddingRight: 4, counterAxisAlignItems: "STRETCH" }, [
            grow(frame("segmentSelected", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", "Buy", "CENTER")])),
            grow(frame("segmentItem", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", "Sell", "CENTER")]))
          ]),
          frame("field", "HORIZONTAL", { paddingLeft: PAD, paddingRight: PAD, primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [txt("placeholder", "Amount", "LEFT"), txt("value", quote, "RIGHT")]),
          (function () { const s = frame("slider", "NONE", {}, []); s.pct = 25; return s; })(),
          buildComposite("stat", "Available | 0.00 " + quote),
          frame("button", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("buttonText", "Buy " + asset, "CENTER")])
        ]);
      }
      case "tabs":
        return buildComposite("timeframe", content);
      case "bignum": {
        // big centered value + optional sub-caption (e.g. $6,100 / -2.12%)
        return frame("group", "VERTICAL", { itemSpacing: 4, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [
          txt("amount", f[0] || "", "CENTER"), txt("caption", f[1] || "", "CENTER")
        ]);
      }
      case "receipthead": {
        // logo | title | tag  — centered trade-receipt header
        const logo = frame("appicon", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("avatarText", initials(f[0]), "CENTER")]);
        const kids = [logo, txt("title", f[1] || "", "CENTER")];
        if (f[2]) kids.push(frame("pillShort", "HORIZONTAL", { paddingLeft: 10, paddingRight: 10, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("shortText", f[2], "CENTER")]));
        return frame("group", "VERTICAL", { itemSpacing: 10, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, kids);
      }
      case "sharebtn":
        return frame("button", "HORIZONTAL", { itemSpacing: 8, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("buttonText", f[0] || "Share", "CENTER"), iconNode("export", 18, "onPrimary", "⬆")]);
      case "cardbig": {
        // name | symbol | value | change [| blue]  — always-dark asset card w/ sparkline
        const blue = /blue/i.test(f[4] || "");
        const white = "#FFFFFF", gray = "#9BA1A6", green = "#4ADE80", check = "#4DA2FF";
        const head = frame("group", "HORIZONTAL", { itemSpacing: 8, counterAxisAlignItems: "CENTER" }, [
          avatar(f[1] || f[0], 30),
          frame("group", "VERTICAL", { itemSpacing: 1, counterAxisAlignItems: "MIN" }, [
            frame("group", "HORIZONTAL", { itemSpacing: 4, counterAxisAlignItems: "CENTER" }, [txtC("value", f[0] || "", white), iconNode("verified", 14, check, "")]),
            txtC("caption", "$" + (f[1] || f[0] || ""), gray)
          ])
        ]);
        const valueRow = frame("group", "HORIZONTAL", { itemSpacing: 5, counterAxisAlignItems: "CENTER" }, [txtC("navTitle", f[2] || "", white), iconNode("arrow-up", 12, green, "▲")]);
        const chart = frame("chart", "NONE", {}, []); chart.up = true; chart.lineOnly = true; chart.chartHeight = 46; chart.points = chartPoints((f[0] || "") + (f[1] || ""), true);
        const card = frame("cardbig", "VERTICAL", { paddingTop: 14, paddingBottom: 14, paddingLeft: 14, paddingRight: 14, itemSpacing: 8, counterAxisAlignItems: "STRETCH" }, [head, valueRow, txtC("positive", f[3] || "", green), chart]);
        card.blue = blue;
        return card;
      }
      case "back":
        return frame("group", "HORIZONTAL", { itemSpacing: 6, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "CENTER" }, [iconNode("back", 22, "#FFFFFF"), txtC("navTitle", f[0] || "Back", "#FFFFFF")]);
      case "progress": {
        const p = parseInt(f[0], 10);
        const pr = frame("progress", "NONE", {}, []); pr.pct = isNaN(p) ? 50 : Math.max(0, Math.min(100, p)); pr.fixedW = 220;
        return pr;
      }
      case "level": {
        // levelNum | reward | pct  — rewards hero (white on gradient)
        const white = "#FFFFFF", faint = "rgba(255,255,255,0.8)";
        const leafR = iconNode("leaf", 64, "rgba(255,255,255,0.85)"); leafR.flip = true;
        const emblem = frame("group", "HORIZONTAL", { itemSpacing: 6, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [
          iconNode("leaf", 64, "rgba(255,255,255,0.85)"),
          frame("group", "VERTICAL", { itemSpacing: 0, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txtC("levelnum", f[0] || "1", white, "CENTER"), txtC("levellabel", "LEVEL", faint, "CENTER")]),
          leafR
        ]);
        const pct = parseInt(f[2], 10);
        const pr = frame("progress", "NONE", {}, []); pr.pct = isNaN(pct) ? 45 : pct; pr.fixedW = 220; pr.fillColor = white; pr.trackColor = "rgba(255,255,255,0.25)"; pr.barH = 10;
        const labels = frame("group", "VERTICAL", { itemSpacing: 4, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txtC("caption", "NEXT REWARD", faint, "CENTER"), txtC("value", f[1] || "", white, "CENTER")]);
        return frame("group", "VERTICAL", { itemSpacing: 18, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [emblem, pr, labels]);
      }
      case "infocard": {
        // icon | title | subtitle | statLabel | statValue
        const head = frame("group", "HORIZONTAL", { itemSpacing: 8, counterAxisAlignItems: "CENTER" }, [iconNode(f[0] || "trade", 22, "onBackground"), txt("heading", f[1] || "")]);
        const kids = [head];
        if (f[2]) kids.push(txt("subtitle", f[2]));
        if (f[3] || f[4]) kids.push(buildComposite("stat", (f[3] || "") + " | " + (f[4] || "")));
        return frame("card", "VERTICAL", { paddingTop: 16, paddingBottom: 16, paddingLeft: 16, paddingRight: 16, itemSpacing: 10, counterAxisAlignItems: "STRETCH" }, kids);
      }
      case "keypad": {
        const key = (label) => grow(frame("key", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("key", label, "CENTER")]));
        const rowOf = (a, b, c) => frame("group", "HORIZONTAL", { itemSpacing: 8 }, [key(a), key(b), key(c)]);
        return frame("group", "VERTICAL", { itemSpacing: 6, counterAxisAlignItems: "STRETCH" }, [rowOf("1", "2", "3"), rowOf("4", "5", "6"), rowOf("7", "8", "9"), rowOf(".", "0", "⌫")]);
      }
      case "tile": {
        // ticker | price | change [| lg]  — a card for a carousel; `lg` = big
        const big = /^(lg|big)$/i.test((f[3] || "").trim());
        const pad = big ? 16 : 12;
        const t = frame("tile", "VERTICAL", { paddingTop: pad, paddingBottom: pad, paddingLeft: pad, paddingRight: pad, itemSpacing: big ? 8 : 6, counterAxisAlignItems: "MIN" }, [
          avatar(f[0], big ? 48 : undefined), txt("caption", f[0] || ""), txt(big ? "navTitle" : "value", f[1] || ""), txt(changeRole(f[2]), f[2] || "")
        ]);
        t.fixedW = big ? 168 : 132;
        return t;
      }
      case "dapp": {
        const app = frame("appicon", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("avatarText", initials(f[0]), "CENTER")]);
        const d = frame("group", "VERTICAL", { itemSpacing: 6, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [app, txt("caption", f[0] || "", "CENTER")]);
        d.fixedW = 72;
        return d;
      }
      case "account": {
        // amount | change...Today | available  (balance card with hide-eye)
        const amountRow = frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [txt("amount", f[0] || ""), iconNode("eye-slash", 22, "onBackgroundSecondary", "◡")]);
        const subRow = frame("group", "HORIZONTAL", { itemSpacing: 8, counterAxisAlignItems: "CENTER" }, [txt(changeRole(f[1]), f[1] || ""), txt("caption", f[2] ? "· " + f[2] : "")]);
        return frame("card", "VERTICAL", { paddingTop: 16, paddingBottom: 16, paddingLeft: 16, paddingRight: 16, itemSpacing: 8, counterAxisAlignItems: "STRETCH" }, [amountRow, subRow]);
      }
      case "buttons": {
        const btns = f.filter(Boolean).map((b) => {
          const primary = /\*$/.test(b);
          const label = b.replace(/\*$/, "").trim();
          return grow(frame(primary ? "button" : "buttonSecondary", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt(primary ? "buttonText" : "buttonTextAlt", label, "CENTER")]));
        });
        return frame("group", "HORIZONTAL", { itemSpacing: 12 }, btns);
      }
      case "statbar": {
        const chips = f.filter(Boolean).map((it) => {
          const c = it.indexOf(":"); const label = c >= 0 ? it.slice(0, c).trim() : it; const val = c >= 0 ? it.slice(c + 1).trim() : "";
          return frame("chip", "HORIZONTAL", { paddingLeft: 12, paddingRight: 12, itemSpacing: 6, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("caption", label), txt("value", val)]);
        });
        return frame("group", "HORIZONTAL", { itemSpacing: 8, counterAxisAlignItems: "CENTER" }, chips);
      }
      case "position": {
        // symbol | LONG 25x | value | pnl | entry | market | liq
        const left = frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "CENTER" }, [
          avatar(f[0]), frame("group", "VERTICAL", { itemSpacing: 4, counterAxisAlignItems: "MIN" }, [txt("value", f[0] || ""), pill(f[1])])
        ]);
        const right = frame("group", "VERTICAL", { itemSpacing: 4, counterAxisAlignItems: "MAX" }, [txt("value", f[2] || "", "RIGHT"), txt(changeRole(f[3]), f[3] || "", "RIGHT")]);
        const head = frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "MIN" }, [left, right]);
        const stats = buildComposite("stats", "Entry:" + (f[4] || "") + " | Market:" + (f[5] || "") + " | Liq.:" + (f[6] || ""));
        return frame("card", "VERTICAL", { paddingTop: 16, paddingBottom: 16, paddingLeft: 16, paddingRight: 16, itemSpacing: 16, counterAxisAlignItems: "STRETCH" }, [head, stats]);
      }
      case "posdetail": {
        // size | dir lev | pnl | margin | tp | sl
        const col = (label, valNode, iconName) => {
          const lbl = iconName
            ? frame("group", "HORIZONTAL", { itemSpacing: 5, counterAxisAlignItems: "CENTER" }, [txt("caption", label), iconNode(iconName, 14, "onBackgroundSecondary", "")])
            : txt("caption", label);
          return grow(frame("group", "VERTICAL", { itemSpacing: 3, counterAxisAlignItems: "MIN" }, [lbl, valNode]));
        };
        const sizeRow = frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "CENTER" }, [txt("amount", f[0] || ""), pill(f[1])]);
        const row1 = frame("group", "HORIZONTAL", { itemSpacing: 16 }, [col("PnL", txt(changeRole(f[2]), f[2] || "")), col("Margin (Isolated)", txt("value", f[3] || ""), "caret-right")]);
        const row2 = frame("group", "HORIZONTAL", { itemSpacing: 16 }, [col("Take Profit", txt("value", f[4] || ""), "pencil"), col("Stop Loss", txt("value", f[5] || ""), "pencil")]);
        return frame("card", "VERTICAL", { paddingTop: 16, paddingBottom: 16, paddingLeft: 16, paddingRight: 16, itemSpacing: 16, counterAxisAlignItems: "STRETCH" }, [txt("caption", "Size"), sizeRow, row1, row2]);
      }
      default: return null;
    }
  }

  // --- line -> { role, content } ---------------------------------------------
  function classify(line) {
    const s = line.trim();
    let m;
    if ((m = s.match(/^###\s+(.*)$/))) return { role: "subtitle", content: m[1] };
    if ((m = s.match(/^##\s+(.*)$/))) return { role: "heading", content: m[1] };
    if ((m = s.match(/^#\s+(.*)$/))) return { role: "title", content: m[1] };
    if ((m = s.match(/^>\s+(.*)$/))) return { role: "caption", content: m[1] };
    if ((m = s.match(/^\[(.+)\]$/))) return { role: "button", content: m[1].trim() };
    if ((m = s.match(/^_+\s*(.*)$/))) return { role: "field", content: m[1].trim() };
    if ((m = s.match(/^[-*]\s+(.*)$/))) return { role: "listItem", content: m[1] };
    const kw = s.match(/^([a-zA-Z]+)\s*:?\s*(.*)$/);
    if (kw) {
      const role = kw[1].toLowerCase(), content = kw[2];
      if (COMPOSITES[role]) return { role, content, composite: true };
      if (CONTAINERS[role]) return { role, content };
      if (TEXT_ROLES[role]) return { role, content };
      if (role === "button" || role === "field") return { role, content };
      if (role === "listitem") return { role: "listItem", content };
    }
    return { role: "body", content: s };
  }

  function parseOutline(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const root = { role: "__root", content: "", depth: -1, children: [] };
    const stack = [root];
    for (const raw of lines) {
      const indent = (raw.match(/^[ \t]*/)[0] || "").replace(/\t/g, "  ").length;
      const depth = Math.floor(indent / 2);
      const node = Object.assign(classify(raw), { depth, children: [] });
      while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return root;
  }

  function toSpecNode(node) {
    if (node.composite) { const built = buildComposite(node.role, node.content); if (built) return built; }
    // A titled section with a horizontally scrolling row of cards.
    if (node.role === "carousel") {
      const cf = fields(node.content);
      const flags = cf.slice(1).map((s) => s.toLowerCase());
      const leftKids = [];
      if (flags.indexOf("new") >= 0) leftKids.push(frame("pillShort", "HORIZONTAL", { paddingLeft: 8, paddingRight: 8, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("shortText", "New", "CENTER")]));
      leftKids.push(txt("heading", cf[0] || ""));
      const header = frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [
        frame("group", "HORIZONTAL", { itemSpacing: 8, counterAxisAlignItems: "CENTER" }, leftKids),
        iconNode("caret-right", 20, "onBackgroundSecondary", ">")
      ]);
      const body = frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "MIN" }, (node.children || []).map(toSpecNode));
      body.scrollX = true;
      return frame("group", "VERTICAL", { itemSpacing: 12, counterAxisAlignItems: "STRETCH" }, [header, body]);
    }
    // A 2-column grid: children chunked into rows of two, each half-width.
    if (node.role === "grid") {
      const items = (node.children || []).map(toSpecNode);
      const rows = [];
      for (let i = 0; i < items.length; i += 2) {
        rows.push(frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "STRETCH" }, items.slice(i, i + 2).map(grow)));
      }
      return frame("group", "VERTICAL", { itemSpacing: 12, counterAxisAlignItems: "STRETCH" }, rows);
    }
    const name = (node.content || node.role).slice(0, 40) || node.role;
    if (TEXT_ROLES[node.role]) return txt(node.role, node.content || "", "LEFT");
    if (node.role === "listItem") return frame("listItem", "HORIZONTAL", { itemSpacing: 8, counterAxisAlignItems: "CENTER" }, [txt("body", node.content || "", "LEFT")]);
    if (node.role === "button") return frame("button", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("buttonText", node.content || "Button", "CENTER")]);
    if (node.role === "field") return frame("field", "HORIZONTAL", { paddingLeft: PAD, paddingRight: PAD, counterAxisAlignItems: "CENTER" }, [txt("placeholder", node.content || "", "LEFT")]);
    const mode = node.role === "row" ? "HORIZONTAL" : "VERTICAL";
    const counter = mode === "VERTICAL" ? "STRETCH" : "CENTER";
    const kids = (node.children || []).map(toSpecNode);
    if (mode === "HORIZONTAL") kids.forEach((k) => { k.grow = true; });
    const spec = frame(node.role, mode, { itemSpacing: SPACING, counterAxisAlignItems: counter }, kids);
    spec.name = name || node.role;
    return spec;
  }

  // --- geometry --------------------------------------------------------------
  function layoutChildren(node, x, width) {
    const lay = node.layout || { mode: "VERTICAL" };
    const isScreen = node.role === "screen";
    const padL = isScreen ? MARGIN : (lay.paddingLeft || 0);
    const padR = isScreen ? MARGIN : (lay.paddingRight || 0);
    const padT = isScreen ? 12 : (lay.paddingTop || 0);
    const padB = isScreen ? 24 : (lay.paddingBottom || 0);
    const gap = lay.itemSpacing || 0;
    const innerX = x + padL, innerW = Math.max(0, width - padL - padR);
    const children = node.children || [];
    if (lay.mode === "HORIZONTAL") {
      const n = children.length || 1, cw = (innerW - gap * (n - 1)) / n;
      let cx = innerX, maxH = 0;
      children.forEach((c) => { const h = layoutNode(c, cx, padT, cw); cx += cw + gap; maxH = Math.max(maxH, h); });
      return padT + maxH + padB;
    }
    let cy = padT, last = 0;
    children.forEach((c) => { last = layoutNode(c, innerX, cy, innerW); cy += last + gap; });
    return Math.max(padT, cy - gap) + padB;
  }

  function layoutNode(node, x, y, width) {
    node.x = x; node.y = y; node.width = width;
    if (node.fixedW) { node.width = node.fixedW; width = node.fixedW; }
    if (node.type === "TEXT") { node.height = TEXT_HEIGHT[node.role] || 24; return node.height; }
    if (node.role === "spacer") { node.height = node.spacerSize || 16; return node.height; }
    if (node.role === "divider") { node.height = 1; return node.height; }
    if (node.role === "tfmark") { node.width = 16; node.height = 3; return node.height; }
    if (node.role === "icon") { node.width = node.height = node.iconSize || 20; return node.height; }
    if (node.role === "avatar" && node.avatarSize) { node.width = node.height = node.avatarSize; layoutChildren(node, x, node.avatarSize); return node.height; }
    if (node.role === "qr") { node.width = node.height = node.qrSize || 100; return node.height; }
    const size = COMPONENT_SIZE[node.role];
    if (size != null) { node.width = size; layoutChildren(node, x, size); node.height = size; return node.height; }
    const content = layoutChildren(node, x, width);
    const fixed = COMPONENT_H[node.role];
    node.height = node.role === "screen" ? DEVICE.height : (node.fixedH != null ? node.fixedH : (fixed != null ? fixed : content));
    return node.height;
  }

  // --- Semantic rhythm ---------------------------------------------------------
  // Context-aware gaps between siblings instead of one flat itemSpacing:
  // related content sits tight (heading→content 8, list rows 8), sections
  // separate wide (→heading 24), nav bars get room (20). Gaps are inserted as
  // real spacer frames so the emitted layout.json stays schema-pure, and an
  // authored `spacer` line always wins (no auto-gap next to it).
  function gapBetween(prev, next) {
    if (!prev || !next) return 0;
    if (prev.role === "spacer" || next.role === "spacer") return 0;
    const prevText = prev.type === "TEXT" ? prev.role : null;
    const nextText = next.type === "TEXT" ? next.role : null;
    if (prev.role === "appbar" || prev.role === "header") return 20;
    if (nextText === "heading" || nextText === "title") return 24; // section break
    if (prevText === "heading" || prevText === "title" || prevText === "subtitle" || prevText === "caption") return 8;
    if (prev.role === "listrow" && next.role === "listrow") return 8;
    return 16;
  }
  function rhythmize(children) {
    const out = [];
    for (let i = 0; i < children.length; i++) {
      if (i > 0) {
        const g = gapBetween(children[i - 1], children[i]);
        if (g > 0) { const sp = frame("spacer", "NONE", {}, []); sp.spacerSize = g; sp.name = "·gap"; out.push(sp); }
      }
      out.push(children[i]);
    }
    return out;
  }

  function finishScreen(rootNode, name, sheet, gradient, bg) {
    rootNode.role = "screen";
    if (gradient && !sheet) rootNode.gradient = ["#3E8FFF", "#7FB5FF"]; // top → bottom blue
    if (bg && !sheet && !gradient) rootNode.fills = [{ type: "SOLID", color: bg }]; // custom page background
    if (sheet) {
      // Bottom sheet: a dimmed scrim with a rounded card anchored to the bottom.
      const content = rhythmize(rootNode.children || []);
      const grabber = frame("grabber", "NONE", {}, []); grabber.fixedW = 40;
      const handle = frame("group", "HORIZONTAL", { primaryAxisAlignItems: "CENTER" }, [grabber]);
      if (content.length) { const sp = frame("spacer", "NONE", {}, []); sp.spacerSize = 16; content.unshift(sp); }
      const card = frame("sheet", "VERTICAL", { paddingTop: 14, paddingBottom: 24, paddingLeft: 20, paddingRight: 20, itemSpacing: 0, counterAxisAlignItems: "STRETCH" }, [handle].concat(content));
      rootNode.children = [card];
      rootNode.sheet = true; // scrim: skip safe-area padding in tokens
      rootNode.layout = { mode: "VERTICAL", paddingTop: 0, paddingBottom: 0, itemSpacing: 0, primaryAxisAlignItems: "MAX", counterAxisAlignItems: "STRETCH" };
      rootNode.fills = [{ type: "SOLID", color: "rgba(0,0,0,0.45)" }]; // scrim (pre-set so tokens keep it)
    } else {
      // Leave top/bottom padding for tokens to fill with safe-area insets.
      // Rhythm replaces the flat itemSpacing with per-pair semantic gaps.
      rootNode.children = rhythmize(rootNode.children || []);
      rootNode.layout = Object.assign({ mode: "VERTICAL", primaryAxisAlignItems: "MIN", counterAxisAlignItems: "STRETCH" }, rootNode.layout);
      rootNode.layout.itemSpacing = 0;
      delete rootNode.layout.paddingLeft; delete rootNode.layout.paddingRight;
      delete rootNode.layout.paddingTop; delete rootNode.layout.paddingBottom;
    }
    layoutNode(rootNode, 0, 0, DEVICE.width);
    rootNode.width = DEVICE.width; rootNode.height = DEVICE.height;
    return { schemaVersion: 1, source: "outline", name: name || "Screen", device: { width: DEVICE.width, height: DEVICE.height }, root: rootNode };
  }

  function specsFromOutline(text) {
    const parsed = parseOutline(text || "");
    const top = parsed.children;
    if (top.length === 0) throw new Error("Nothing to build — write at least one line.");

    // Split into screens at each top-level `screen` node.
    const hasScreens = top.some((n) => n.role === "screen");
    if (!hasScreens) {
      const spec = finishScreen(toSpecNode({ role: "screen", content: "Screen", children: top }), "Screen");
      return [{ name: spec.name, spec }];
    }
    const groups = []; let cur = null; const stray = [];
    for (const n of top) {
      if (n.role === "screen") {
        const cf = fields(n.content);
        const flags = cf.slice(1);
        const sheet = flags.some((x) => /sheet/i.test(x));
        const gradient = flags.some((x) => /gradient/i.test(x));
        const bg = flags.find((x) => /^#[0-9a-fA-F]{3,8}$/.test(x)) || null;
        cur = { name: cf[0] || "Screen", node: n, sheet, gradient, bg };
        groups.push(cur);
      } else if (cur) cur.node.children.push(n);
      else stray.push(n);
    }
    if (stray.length && groups.length) groups[0].node.children = stray.concat(groups[0].node.children);
    return groups.map((g) => ({ name: g.name, spec: finishScreen(toSpecNode(g.node), g.name, g.sheet, g.gradient, g.bg) }));
  }

  function specFromOutline(text) { const list = specsFromOutline(text); return Array.isArray(list) && list.length ? (list[0].spec || list[0]) : null; }

  global.specsFromOutline = function (t) { return specsFromOutline(t); };
  global.specFromOutline = specFromOutline;
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = { specsFromOutline: globalThis.specsFromOutline, specFromOutline: globalThis.specFromOutline };
}
