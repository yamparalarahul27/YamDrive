"use strict";

// Turn a plain-text outline / ASCII sketch of a screen into a role-annotated
// layout.json spec. Deterministic and dependency-free so the playground stays a
// single static page. The emitted spec names each node's `role`, so the token
// layer (tokens.js) supplies platform-correct typography, color, and metrics.
//
// Exposes one global: specFromOutline(text) -> layout.json spec.
//
// Simple roles (one value): screen card row column section group | title
//   subtitle heading body label caption | field button | - listItem
//
// Composite roles (pipe-delimited fields) build a whole subtree from one line —
// enough to lay out a real financial product screen:
//   appbar   Title | icon | icon
//   balance  Label | $12,405.32 | +5.2%      (hero total; +/- colors the change)
//   actions  Buy | Sell | Send | Receive     (row of circular action buttons)
//   segmented Overview | Assets | Activity    (first item selected)
//   chips    All | Gainers | Losers
//   asset    BTC | Bitcoin | $64,230 | +2.4%  (list row: avatar, name, price, change)
//   tabbar   Home | Markets | Trade | Wallet  (bottom nav, first selected)
//   avatar   BTC        divider        spacer 24
//
// Markdown-ish shortcuts at line start: # ## ### -> title/heading/subtitle,
// > -> caption, [x] -> button, _ x -> field, - x -> list item.

(function (global) {
  const DEVICE = { width: 393, height: 852 };
  const MARGIN = 16;      // geometry margin (tokens re-apply platform margins)
  const SPACING = 16;
  const PAD = 16;

  const CONTAINERS = { screen: 1, card: 1, row: 1, column: 1, section: 1, group: 1, list: 1 };
  const TEXT_ROLES = {
    display: 1, title: 1, subtitle: 1, heading: 1, body: 1, label: 1, caption: 1,
    amount: 1, value: 1, symbol: 1, positive: 1, negative: 1, neutral: 1
  };
  const COMPOSITES = { appbar: 1, balance: 1, actions: 1, segmented: 1, chips: 1, asset: 1, tabbar: 1, avatar: 1, divider: 1, spacer: 1, chip: 1, iconbtn: 1 };

  const TEXT_HEIGHT = {
    display: 44, title: 42, heading: 32, subtitle: 26, body: 24, label: 22, caption: 18,
    amount: 44, value: 24, symbol: 20, positive: 22, negative: 22, neutral: 22,
    placeholder: 24, buttonText: 24, avatarText: 22, actionGlyph: 26, tabLabelActive: 16
  };
  // Fixed component heights (geometry only; tokens override in guideline mode).
  const COMPONENT_H = { button: 52, field: 52, listItem: 44, chip: 34, segmented: 40, appbar: 56, tabbar: 72, iconBtn: 36 };
  const COMPONENT_SIZE = { avatar: 40, actionIcon: 56, iconBtn: 36, tabDot: 22, tabDotActive: 22 };

  const GLYPH = { buy: "+", sell: "−", send: "↑", receive: "↓", swap: "⇄", trade: "⇄", deposit: "↓", withdraw: "↑", more: "⋯", "…": "⋯", "⋯": "⋯" };

  // --- small builders --------------------------------------------------------
  function txt(role, chars, align) {
    return { type: "TEXT", role, name: (chars || role).slice(0, 40) || role, x: 0, y: 0, width: 0, height: 0, characters: chars == null ? "" : String(chars), textAlign: align || "LEFT" };
  }
  function frame(role, mode, extra, children) {
    return {
      type: "FRAME", role, name: role, x: 0, y: 0, width: 0, height: 0,
      layout: Object.assign({ mode: mode || "VERTICAL", itemSpacing: 0, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN" }, extra || {}),
      children: children || []
    };
  }
  function initials(s) { return String(s || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "•"; }
  function glyphFor(s) { const k = String(s || "").trim().toLowerCase(); return GLYPH[k] || initials(s).slice(0, 1); }
  function changeRole(s) { const t = String(s || "").trim(); if (t[0] === "-" || /^▼|↓/.test(t)) return "negative"; if (t[0] === "+" || /^▲|↑/.test(t)) return "positive"; return "neutral"; }
  function fields(s) { return String(s || "").split("|").map((x) => x.trim()); }

  function avatar(label) {
    return frame("avatar", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("avatarText", initials(label), "CENTER")]);
  }

  // --- composite line -> spec subtree ----------------------------------------
  function buildComposite(role, content) {
    const f = fields(content);
    switch (role) {
      case "appbar": {
        const trailing = f.slice(1).filter(Boolean).map((g) =>
          frame("iconBtn", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", g === "" ? "⋯" : (GLYPH[g.toLowerCase()] || g), "CENTER")]));
        const kids = [txt("heading", f[0] || "")];
        kids.push(frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "CENTER" }, trailing));
        return frame("appbar", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, kids);
      }
      case "balance":
        return frame("balance", "VERTICAL", { itemSpacing: 6, counterAxisAlignItems: "MIN" }, [
          txt("caption", f[0] || "Balance"),
          txt("amount", f[1] || ""),
          txt(changeRole(f[2]), f[2] || "")
        ]);
      case "actions": {
        const cols = f.filter(Boolean).map((a) =>
          frame("group", "VERTICAL", { itemSpacing: 8, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [
            frame("actionIcon", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("actionGlyph", glyphFor(a), "CENTER")]),
            txt("caption", a, "CENTER")
          ]));
        return frame("group", "HORIZONTAL", { primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "MIN" }, cols);
      }
      case "segmented": {
        const opts = f.filter(Boolean).map((o, i) => {
          const seg = frame(i === 0 ? "segmentSelected" : "segmentItem", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", o, "CENTER")]);
          seg.grow = true; // options share the track width equally
          return seg;
        });
        return frame("segmented", "HORIZONTAL", { itemSpacing: 4, paddingTop: 4, paddingBottom: 4, paddingLeft: 4, paddingRight: 4, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "STRETCH" }, opts);
      }
      case "chips": {
        const chips = f.filter(Boolean).map((c) =>
          frame("chip", "HORIZONTAL", { paddingLeft: 14, paddingRight: 14, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", c, "CENTER")]));
        return frame("group", "HORIZONTAL", { itemSpacing: 8, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "CENTER" }, chips);
      }
      case "chip":
        return frame("chip", "HORIZONTAL", { paddingLeft: 14, paddingRight: 14, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", f[0] || "", "CENTER")]);
      case "iconbtn":
        return frame("iconBtn", "HORIZONTAL", { primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("label", f[0] || "•", "CENTER")]);
      case "asset": {
        const left = frame("group", "HORIZONTAL", { itemSpacing: 12, counterAxisAlignItems: "CENTER" }, [
          avatar(f[0]),
          frame("group", "VERTICAL", { itemSpacing: 2, counterAxisAlignItems: "MIN" }, [txt("value", f[1] || f[0] || ""), txt("symbol", f[0] || "")])
        ]);
        const right = frame("group", "VERTICAL", { itemSpacing: 2, counterAxisAlignItems: "MAX" }, [
          txt("value", f[2] || "", "RIGHT"),
          txt(changeRole(f[3]), f[3] || "", "RIGHT")
        ]);
        return frame("listrow", "HORIZONTAL", { paddingTop: 8, paddingBottom: 8, primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, [left, right]);
      }
      case "tabbar": {
        const tabs = f.filter(Boolean).map((tb, i) =>
          frame("group", "VERTICAL", { itemSpacing: 5, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [
            frame(i === 0 ? "tabDotActive" : "tabDot", "HORIZONTAL", {}, []),
            txt(i === 0 ? "tabLabelActive" : "caption", tb, "CENTER")
          ]));
        const bar = frame("tabbar", "HORIZONTAL", { paddingLeft: 24, paddingRight: 24, primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER" }, tabs);
        return frame("group", "VERTICAL", { itemSpacing: 0, counterAxisAlignItems: "STRETCH" }, [frame("divider", "NONE", {}, []), bar]);
      }
      case "avatar":
        return avatar(f[0]);
      case "divider":
        return frame("divider", "NONE", {}, []);
      case "spacer": {
        const n = parseInt(f[0], 10);
        const sp = frame("spacer", "NONE", {}, []);
        sp.spacerSize = isNaN(n) ? 16 : n;
        return sp;
      }
      default:
        return null;
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
      const role = kw[1].toLowerCase();
      const content = kw[2];
      if (COMPOSITES[role]) return { role, content, composite: true };
      if (CONTAINERS[role]) return { role, content };
      if (TEXT_ROLES[role]) return { role, content };
      if (role === "button" || role === "field") return { role, content };
      if (role === "listitem") return { role: "listItem", content };
    }
    return { role: "body", content: s };
  }

  // --- text -> nested outline nodes via indentation --------------------------
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

  // --- outline node -> spec node ---------------------------------------------
  function toSpecNode(node) {
    if (node.composite) {
      const built = buildComposite(node.role, node.content);
      if (built) return built;
    }
    const name = (node.content || node.role).slice(0, 40) || node.role;

    if (TEXT_ROLES[node.role]) {
      return txt(node.role, node.content || "", "LEFT");
    }
    if (node.role === "listItem") {
      return frame("listItem", "HORIZONTAL", { itemSpacing: 8, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "CENTER" }, [txt("body", node.content || "", "LEFT")]);
    }
    if (node.role === "button") {
      return frame("button", "HORIZONTAL", { itemSpacing: 8, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }, [txt("buttonText", node.content || "Button", "CENTER")]);
    }
    if (node.role === "field") {
      return frame("field", "HORIZONTAL", { paddingLeft: PAD, paddingRight: PAD, itemSpacing: 8, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "CENTER" }, [txt("placeholder", node.content || "", "LEFT")]);
    }
    // Container. Vertical stacks stretch children to fill the width; a `row`
    // lays children horizontally and grows them to share the width equally.
    const mode = node.role === "row" ? "HORIZONTAL" : "VERTICAL";
    const counter = mode === "VERTICAL" ? "STRETCH" : "CENTER";
    const kids = (node.children || []).map(toSpecNode);
    if (mode === "HORIZONTAL") kids.forEach((k) => { k.grow = true; });
    const spec = frame(node.role, mode, { itemSpacing: SPACING, primaryAxisAlignItems: "MIN", counterAxisAlignItems: counter }, kids);
    spec.name = name || node.role;
    return spec;
  }

  // --- geometry pass ---------------------------------------------------------
  function layoutChildren(node, x, width) {
    const lay = node.layout || { mode: "VERTICAL" };
    const isScreen = node.role === "screen";
    const padL = isScreen ? MARGIN : (lay.paddingLeft || 0);
    const padR = isScreen ? MARGIN : (lay.paddingRight || 0);
    const padT = isScreen ? 64 : (lay.paddingTop || 0);
    const padB = isScreen ? 24 : (lay.paddingBottom || 0);
    const gap = lay.itemSpacing || 0;
    const innerX = x + padL;
    const innerW = Math.max(0, width - padL - padR);
    const children = node.children || [];

    if (lay.mode === "HORIZONTAL") {
      const n = children.length || 1;
      const cw = (innerW - gap * (n - 1)) / n;
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
    if (node.type === "TEXT") { node.height = TEXT_HEIGHT[node.role] || 24; return node.height; }
    if (node.role === "spacer") { node.height = node.spacerSize || 16; return node.height; }
    if (node.role === "divider") { node.height = 1; return node.height; }

    const size = COMPONENT_SIZE[node.role];
    if (size != null) {
      node.width = size;
      layoutChildren(node, x, size); // center the single glyph/initials
      node.height = size;
      return node.height;
    }

    const content = layoutChildren(node, x, width);
    const fixed = COMPONENT_H[node.role];
    node.height = node.role === "screen" ? DEVICE.height : (fixed != null ? fixed : content);
    return node.height;
  }

  function specFromOutline(text) {
    const parsed = parseOutline(text || "");
    const top = parsed.children;
    if (top.length === 0) throw new Error("Nothing to build — write at least one line.");

    let rootNode;
    if (top.length === 1 && top[0].role === "screen") rootNode = toSpecNode(top[0]);
    else rootNode = toSpecNode({ role: "screen", content: "Screen", children: top });

    rootNode.role = "screen";
    rootNode.layout = Object.assign({ mode: "VERTICAL", paddingTop: 56, paddingBottom: 24, itemSpacing: SPACING, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "STRETCH" }, rootNode.layout);
    delete rootNode.layout.paddingLeft;
    delete rootNode.layout.paddingRight;

    layoutNode(rootNode, 0, 0, DEVICE.width);
    rootNode.width = DEVICE.width;
    rootNode.height = DEVICE.height;

    const name = (top.length === 1 && top[0].role === "screen" && top[0].content) ? top[0].content : "Screen";
    return { schemaVersion: 1, source: "outline", name, device: { width: DEVICE.width, height: DEVICE.height }, root: rootNode };
  }

  global.specFromOutline = specFromOutline;
})(typeof window !== "undefined" ? window : globalThis);

if (typeof module !== "undefined" && module.exports) {
  module.exports = { specFromOutline: globalThis.specFromOutline };
}
