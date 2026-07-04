"use strict";

// Design-token tables + a resolver that fills a layout.json spec's styling
// from Apple (HIG) and Google (Material 3) starting guidelines.
//
// The idea: you author ONE structural spec that names each node's semantic
// `role` ("title", "body", "button", "field", ...) instead of raw px/weights.
// applyPlatformDefaults(spec, "ios" | "android") returns a styled copy where
// every unset style property is filled from that platform's tokens. So a single
// spec renders Apple-styled in an iPhone and Material-styled on a Pixel.
//
// Loaded as a classic script (works over file://) — exposes two globals:
//   MOBILE_TOKENS          the raw token tables (inspect / reuse)
//   applyPlatformDefaults  (spec, platform) -> styled spec copy
//
// Precedence: an explicit value already on a node always wins. Tokens only
// FILL what a role leaves unspecified, so hand-tuned specs stay untouched.

(function (global) {
  // Neutral color roles, resolved per platform below.
  // ios: system label / secondaryLabel / systemBlue / systemGray6 / placeholderText
  // android (M3 baseline): onSurface / onSurfaceVariant / primary / surfaceVariant
  const IOS = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    // HIG type scale (points / weight). https://developer.apple.com/design/human-interface-guidelines/typography
    type: {
      display:    { fontSize: 34, fontWeight: 700, color: "onBackground" }, // Large Title
      title:      { fontSize: 28, fontWeight: 700, color: "onBackground" }, // Title 1
      subtitle:   { fontSize: 17, fontWeight: 400, color: "onBackgroundSecondary" },
      heading:    { fontSize: 17, fontWeight: 600, color: "onBackground" }, // Headline
      body:       { fontSize: 17, fontWeight: 400, color: "onBackground" },
      label:      { fontSize: 15, fontWeight: 500, color: "onBackground" },
      caption:    { fontSize: 12, fontWeight: 400, color: "onBackgroundSecondary" },
      buttonText: { fontSize: 17, fontWeight: 600, color: "onPrimary" },
      placeholder:{ fontSize: 17, fontWeight: 400, color: "placeholder" }
    },
    color: {
      onBackground: "#1D1D1F",
      onBackgroundSecondary: "#6E6E73",
      primary: "#0A84FF",
      onPrimary: "#FFFFFF",
      surfaceVariant: "#F2F2F7",
      placeholder: "#8E8E93",
      outline: "#D1D1D6"
    },
    // Component metrics (points). 8pt spacing grid; 44pt minimum tap target.
    metrics: {
      grid: 8,
      screenMargin: 16,
      itemSpacing: 16,
      tapTarget: 44,
      button:   { height: 50, radius: 12 },
      field:    { height: 44, radius: 10 },
      card:     { radius: 12 },
      listItem: { height: 44, radius: 0 }
    }
  };

  const ANDROID = {
    fontFamily: 'Roboto, "Roboto Flex", "Noto Sans", sans-serif',
    // Material 3 type scale (sp / weight). https://m3.material.io/styles/typography/type-scale-tokens
    type: {
      display:    { fontSize: 36, fontWeight: 400, color: "onBackground" }, // Display Small
      title:      { fontSize: 28, fontWeight: 400, color: "onBackground" }, // Headline Medium
      subtitle:   { fontSize: 16, fontWeight: 500, color: "onBackgroundSecondary" }, // Title Medium
      heading:    { fontSize: 22, fontWeight: 400, color: "onBackground" }, // Title Large
      body:       { fontSize: 16, fontWeight: 400, color: "onBackground" }, // Body Large
      label:      { fontSize: 14, fontWeight: 500, color: "onBackground" }, // Label Large
      caption:    { fontSize: 12, fontWeight: 400, color: "onBackgroundSecondary" }, // Body Small
      buttonText: { fontSize: 14, fontWeight: 500, color: "onPrimary" }, // Label Large
      placeholder:{ fontSize: 16, fontWeight: 400, color: "placeholder" }
    },
    color: {
      onBackground: "#1C1B1F",
      onBackgroundSecondary: "#49454F",
      primary: "#6750A4",
      onPrimary: "#FFFFFF",
      surfaceVariant: "#E7E0EC",
      placeholder: "#79747E",
      outline: "#79747E"
    },
    // Material metrics (dp). 4/8dp grid; 48dp minimum touch target; full-radius buttons.
    metrics: {
      grid: 8,
      screenMargin: 16,
      itemSpacing: 16,
      tapTarget: 48,
      button:   { height: 48, radius: 24 },  // fully rounded
      field:    { height: 56, radius: 4 },   // filled text field
      card:     { radius: 12 },
      listItem: { height: 56, radius: 0 }
    }
  };

  const TOKENS = { ios: IOS, android: ANDROID };

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function resolveColor(t, roleOrHex) {
    if (!roleOrHex) return roleOrHex;
    return t.color[roleOrHex] || roleOrHex; // pass through raw hex
  }

  // Apply a TEXT node's role. Tagging a role means "use this platform's type
  // scale", so font size/weight follow the scale; an explicit color still wins.
  function styleText(node, t) {
    const scale = node.role && t.type[node.role];
    if (!scale) return;
    node.fontSize = scale.fontSize;
    node.fontWeight = scale.fontWeight;
    if (node.color == null) node.color = resolveColor(t, scale.color);
  }

  // Apply a FRAME's role. Component metrics (height, radius) are the guideline
  // and override authored geometry; fills only fill when the author left none.
  function styleFrame(node, t, isRoot) {
    const hasFill = Array.isArray(node.fills) && node.fills.length > 0;
    const setFill = (roleOrHex) => {
      if (!hasFill) node.fills = [{ type: "SOLID", color: resolveColor(t, roleOrHex) }];
    };

    switch (node.role) {
      case "button":
        node.height = t.metrics.button.height;
        node.cornerRadius = t.metrics.button.radius;
        setFill("primary");
        break;
      case "field":
        node.height = t.metrics.field.height;
        node.cornerRadius = t.metrics.field.radius;
        setFill("surfaceVariant");
        break;
      case "card":
        node.cornerRadius = t.metrics.card.radius;
        setFill("surfaceVariant");
        break;
      case "listItem":
        node.height = t.metrics.listItem.height;
        break;
      default:
        break;
    }

    if (isRoot || node.role === "screen") {
      if (!hasFill) node.fills = [{ type: "SOLID", color: "#FFFFFF" }];
      // Apply platform screen margins + spacing only where the author left gaps.
      const lay = node.layout;
      if (lay && (lay.mode === "VERTICAL" || lay.mode === "HORIZONTAL")) {
        const m = t.metrics.screenMargin;
        if (lay.paddingLeft == null) lay.paddingLeft = m;
        if (lay.paddingRight == null) lay.paddingRight = m;
        if (lay.itemSpacing == null) lay.itemSpacing = t.metrics.itemSpacing;
      }
    }
  }

  function walk(node, t, isRoot) {
    if (!node || typeof node !== "object") return;
    if (node.type === "TEXT") { styleText(node, t); return; }
    // FRAME
    styleFrame(node, t, isRoot);
    if (Array.isArray(node.children)) node.children.forEach((c) => walk(c, t, false));
  }

  // Return a styled deep copy of `spec` for the given platform ("ios"|"android").
  function applyPlatformDefaults(spec, platform) {
    const t = TOKENS[platform];
    if (!t || !spec || !spec.root) return spec;
    const out = clone(spec);
    out.platform = platform;
    out.fontFamily = t.fontFamily;
    walk(out.root, t, true);
    return out;
  }

  global.MOBILE_TOKENS = TOKENS;
  global.applyPlatformDefaults = applyPlatformDefaults;
})(typeof window !== "undefined" ? window : globalThis);

// CommonJS export so the same tables can be reused by Node tooling later.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MOBILE_TOKENS: globalThis.MOBILE_TOKENS, applyPlatformDefaults: globalThis.applyPlatformDefaults };
}
