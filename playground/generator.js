"use strict";

// Turn a plain-text outline / ASCII sketch of a screen into a role-annotated
// layout.json spec. Deterministic and dependency-free so the playground stays a
// single static page. The emitted spec names each node's `role`, so the token
// layer (tokens.js) supplies platform-correct typography, color, and metrics.
//
// Exposes one global: specFromOutline(text) -> layout.json spec.
//
// Outline grammar (one element per line; 2-space indent = nesting):
//
//   screen Sign in            container: the root screen
//   title Welcome back        text roles: display|title|subtitle|heading|
//   subtitle Sign in ...                   body|label|caption
//   field Email address       a text field (placeholder = the text)
//   button Sign in            a primary button (label = the text)
//   card                      a grouping container (indent its children)
//   row / column              horizontal / vertical container
//   - Buy now                 a list item (bullet)
//
// Markdown-ish shortcuts also work at line start:
//   # x  -> title    ## x -> heading    ### x -> subtitle
//   > x  -> caption   [x] -> button      _ x  -> field    - x -> listItem

(function (global) {
  const DEVICE = { width: 393, height: 852 };
  const MARGIN = 16;      // geometry margin (tokens re-apply platform margins)
  const SPACING = 16;
  const PAD = 16;         // inner padding for fields/buttons

  const CONTAINERS = { screen: 1, card: 1, row: 1, column: 1, section: 1, group: 1, list: 1 };
  const TEXT_ROLES = { display: 1, title: 1, subtitle: 1, heading: 1, body: 1, label: 1, caption: 1 };
  const TEXT_HEIGHT = { display: 44, title: 42, heading: 32, subtitle: 26, body: 24, label: 22, caption: 18, placeholder: 24, buttonText: 24 };

  // --- line -> { role, content } ---------------------------------------------
  function classify(line) {
    const s = line.trim();
    // Markdown-ish shortcuts.
    let m;
    if ((m = s.match(/^###\s+(.*)$/))) return { role: "subtitle", content: m[1] };
    if ((m = s.match(/^##\s+(.*)$/))) return { role: "heading", content: m[1] };
    if ((m = s.match(/^#\s+(.*)$/))) return { role: "title", content: m[1] };
    if ((m = s.match(/^>\s+(.*)$/))) return { role: "caption", content: m[1] };
    if ((m = s.match(/^\[(.+)\]$/))) return { role: "button", content: m[1].trim() };
    if ((m = s.match(/^_+\s*(.*)$/))) return { role: "field", content: m[1].trim() };
    if ((m = s.match(/^[-*]\s+(.*)$/))) return { role: "listItem", content: m[1] };

    // Keyword prefix: "role rest" or "role: rest".
    const kw = s.match(/^([a-zA-Z]+)\s*:?\s*(.*)$/);
    if (kw) {
      const role = kw[1].toLowerCase();
      const content = kw[2];
      if (CONTAINERS[role]) return { role, content };
      if (TEXT_ROLES[role]) return { role, content };
      if (role === "button" || role === "field" || role === "listitem") {
        return { role: role === "listitem" ? "listItem" : role, content };
      }
    }
    // Fallback: plain body text.
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
  let uid = 0;
  function toSpecNode(node) {
    const name = (node.content || node.role).slice(0, 40) || node.role;

    if (TEXT_ROLES[node.role]) {
      return { type: "TEXT", role: node.role, name, x: 0, y: 0, width: 0, height: 0, characters: node.content || "", textAlign: "LEFT" };
    }
    if (node.role === "listItem") {
      return {
        type: "FRAME", role: "listItem", name, x: 0, y: 0, width: 0, height: 0,
        layout: { mode: "HORIZONTAL", paddingLeft: 0, paddingRight: 0, itemSpacing: 8, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "CENTER" },
        children: [{ type: "TEXT", role: "body", name, x: 0, y: 0, width: 0, height: 0, characters: node.content || "", textAlign: "LEFT" }]
      };
    }
    if (node.role === "button") {
      return {
        type: "FRAME", role: "button", name: name || "Button", x: 0, y: 0, width: 0, height: 0,
        layout: { mode: "HORIZONTAL", itemSpacing: 8, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" },
        children: [{ type: "TEXT", role: "buttonText", name, x: 0, y: 0, width: 0, height: 0, characters: node.content || "Button", textAlign: "CENTER" }]
      };
    }
    if (node.role === "field") {
      return {
        type: "FRAME", role: "field", name: name || "Field", x: 0, y: 0, width: 0, height: 0,
        layout: { mode: "HORIZONTAL", paddingLeft: PAD, paddingRight: PAD, itemSpacing: 8, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "CENTER" },
        children: [{ type: "TEXT", role: "placeholder", name, x: 0, y: 0, width: 0, height: 0, characters: node.content || "", textAlign: "LEFT" }]
      };
    }

    // Container.
    const mode = node.role === "row" ? "HORIZONTAL" : "VERTICAL";
    const spec = {
      type: "FRAME", role: node.role, name: name || node.role, x: 0, y: 0, width: 0, height: 0,
      layout: { mode, itemSpacing: SPACING, primaryAxisAlignItems: "MIN", counterAxisAlignItems: node.role === "screen" ? "MIN" : "MIN" },
      children: (node.children || []).map(toSpecNode)
    };
    return spec;
  }

  // --- geometry pass: assign x/y/width/height (auto-layout still reflows) -----
  function layoutNode(node, x, y, width) {
    node.x = x; node.y = y; node.width = width;

    if (node.type === "TEXT") { node.height = TEXT_HEIGHT[node.role] || 24; return node.height; }

    // Component frames with fixed height.
    if (node.role === "button" || node.role === "field") {
      node.height = 52;
      const inner = width - 2 * PAD;
      (node.children || []).forEach((c) => layoutNode(c, PAD, 15, inner > 0 ? inner : width));
      return node.height;
    }

    const lay = node.layout || { mode: "VERTICAL" };
    const isScreen = node.role === "screen";
    const padTop = isScreen ? 64 : 0;
    const innerX = MARGIN;
    const innerW = width - 2 * MARGIN;
    const children = node.children || [];

    if (lay.mode === "HORIZONTAL") {
      const n = children.length || 1;
      const cw = (innerW - SPACING * (n - 1)) / n;
      let cx = innerX, maxH = 0;
      children.forEach((c) => { const h = layoutNode(c, cx, padTop, cw); cx += cw + SPACING; maxH = Math.max(maxH, h); });
      node.height = isScreen ? DEVICE.height : padTop + maxH;
      return node.height;
    }

    let cy = padTop, last = 0;
    children.forEach((c) => { last = layoutNode(c, innerX, cy, innerW); cy += last + SPACING; });
    node.height = isScreen ? DEVICE.height : Math.max(0, cy - SPACING);
    return node.height;
  }

  function specFromOutline(text) {
    uid = 0;
    const parsed = parseOutline(text || "");
    let top = parsed.children;
    if (top.length === 0) throw new Error("Nothing to build — write at least one line.");

    // Use a single top-level `screen` as root; otherwise wrap everything.
    let rootNode;
    if (top.length === 1 && top[0].role === "screen") {
      rootNode = toSpecNode(top[0]);
    } else {
      rootNode = toSpecNode({ role: "screen", content: "Screen", children: top });
    }
    rootNode.role = "screen";
    // Let tokens apply platform screen margins; keep top padding + spacing here.
    rootNode.layout = Object.assign({ mode: "VERTICAL", paddingTop: 64, paddingBottom: 24, itemSpacing: SPACING, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN" }, rootNode.layout);
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
