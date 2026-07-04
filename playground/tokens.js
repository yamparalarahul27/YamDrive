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
      placeholder:{ fontSize: 17, fontWeight: 400, color: "placeholder" },
      amount:     { fontSize: 40, fontWeight: 700, color: "onBackground" }, // hero balance
      value:      { fontSize: 17, fontWeight: 600, color: "onBackground" }, // list trailing value
      symbol:     { fontSize: 13, fontWeight: 400, color: "onBackgroundSecondary" },
      positive:   { fontSize: 15, fontWeight: 600, color: "positive" },
      negative:   { fontSize: 15, fontWeight: 600, color: "negative" },
      neutral:    { fontSize: 15, fontWeight: 600, color: "onBackgroundSecondary" },
      avatarText: { fontSize: 15, fontWeight: 700, color: "onPrimary" },
      actionGlyph:{ fontSize: 22, fontWeight: 600, color: "onPrimary" },
      tabLabelActive: { fontSize: 11, fontWeight: 600, color: "primary" },
      navTitle:   { fontSize: 17, fontWeight: 600, color: "onBackground" },
      tagText:    { fontSize: 12, fontWeight: 600, color: "primary" },
      tfActive:   { fontSize: 13, fontWeight: 700, color: "onBackground" },
      tfIdle:     { fontSize: 13, fontWeight: 500, color: "onBackgroundSecondary" }
    },
    light: {
      background: "#FFFFFF",
      onBackground: "#1D1D1F",
      onBackgroundSecondary: "#6E6E73",
      primary: "#0A84FF",
      onPrimary: "#FFFFFF",
      surfaceVariant: "#F2F2F7",
      placeholder: "#8E8E93",
      outline: "#D1D1D6",
      positive: "#34C759",
      negative: "#FF3B30",
      segmentSel: "#FFFFFF",
      infoBg: "#EAF3FF"
    },
    dark: {
      background: "#000000",
      onBackground: "#F5F5F7",
      onBackgroundSecondary: "#98989D",
      primary: "#0A84FF",
      onPrimary: "#FFFFFF",
      surfaceVariant: "#1C1C1E",
      placeholder: "#8E8E93",
      outline: "#38383A",
      positive: "#30D158",
      negative: "#FF453B",
      segmentSel: "#2C2C2E",
      infoBg: "#0E2A47"
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
      listItem: { height: 44, radius: 0 },
      appbar:   { height: 52 },
      tabbar:   { height: 64 },
      chip:     { height: 34, radius: 17 },
      segmented:{ height: 36, radius: 9 },
      avatar:   { size: 40, radius: 20 },
      actionIcon:{ size: 56, radius: 28 },
      iconBtn:  { size: 36, radius: 18 },
      tabDot:   { size: 22, radius: 11 },
      divider:  { thickness: 1 },
      header:   { height: 52 },
      chart:    { height: 168 },
      slider:   { height: 30, track: 4, knob: 22 },
      switch:   { width: 46, height: 28, knob: 24 },
      tag:      { height: 24, radius: 6 },
      banner:   { radius: 12 },
      smallbtn: { height: 34, radius: 8 }
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
      placeholder:{ fontSize: 16, fontWeight: 400, color: "placeholder" },
      amount:     { fontSize: 40, fontWeight: 400, color: "onBackground" }, // Display
      value:      { fontSize: 16, fontWeight: 500, color: "onBackground" },
      symbol:     { fontSize: 14, fontWeight: 400, color: "onBackgroundSecondary" },
      positive:   { fontSize: 14, fontWeight: 600, color: "positive" },
      negative:   { fontSize: 14, fontWeight: 600, color: "negative" },
      neutral:    { fontSize: 14, fontWeight: 600, color: "onBackgroundSecondary" },
      avatarText: { fontSize: 14, fontWeight: 600, color: "onPrimary" },
      actionGlyph:{ fontSize: 22, fontWeight: 500, color: "onPrimary" },
      tabLabelActive: { fontSize: 12, fontWeight: 600, color: "primary" },
      navTitle:   { fontSize: 20, fontWeight: 500, color: "onBackground" },
      tagText:    { fontSize: 12, fontWeight: 600, color: "primary" },
      tfActive:   { fontSize: 13, fontWeight: 700, color: "onBackground" },
      tfIdle:     { fontSize: 13, fontWeight: 500, color: "onBackgroundSecondary" }
    },
    light: {
      background: "#FFFFFF",
      onBackground: "#1C1B1F",
      onBackgroundSecondary: "#49454F",
      primary: "#6750A4",
      onPrimary: "#FFFFFF",
      surfaceVariant: "#E7E0EC",
      placeholder: "#79747E",
      outline: "#CAC4D0",
      positive: "#2E7D32",
      negative: "#B3261E",
      segmentSel: "#E8DEF8",
      infoBg: "#EADDFF"
    },
    dark: {
      background: "#141218",
      onBackground: "#E6E1E5",
      onBackgroundSecondary: "#CAC4D0",
      primary: "#D0BCFF",
      onPrimary: "#381E72",
      surfaceVariant: "#2B2930",
      placeholder: "#938F99",
      outline: "#48454E",
      positive: "#7FD98B",
      negative: "#F2B8B5",
      segmentSel: "#4A4458",
      infoBg: "#332D41"
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
      listItem: { height: 56, radius: 0 },
      appbar:   { height: 56 },
      tabbar:   { height: 80 },
      chip:     { height: 32, radius: 8 },
      segmented:{ height: 48, radius: 100 },
      avatar:   { size: 40, radius: 20 },
      actionIcon:{ size: 56, radius: 16 },
      iconBtn:  { size: 40, radius: 20 },
      tabDot:   { size: 24, radius: 12 },
      divider:  { thickness: 1 },
      header:   { height: 56 },
      chart:    { height: 168 },
      slider:   { height: 30, track: 4, knob: 22 },
      switch:   { width: 52, height: 32, knob: 26 },
      tag:      { height: 24, radius: 8 },
      banner:   { radius: 12 },
      smallbtn: { height: 34, radius: 18 }
    }
  };

  const TOKENS = { ios: IOS, android: ANDROID };

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function resolveColor(pal, roleOrHex) {
    if (!roleOrHex) return roleOrHex;
    return pal[roleOrHex] || roleOrHex; // pass through raw hex
  }

  // Apply a TEXT node's role. Tagging a role means "use this platform's type
  // scale", so font size/weight follow the scale; an explicit color still wins.
  function styleText(node, t, pal) {
    const scale = node.role && t.type[node.role];
    if (!scale) return;
    node.fontSize = scale.fontSize;
    node.fontWeight = scale.fontWeight;
    if (node.color == null) node.color = resolveColor(pal, scale.color);
  }

  // Apply a FRAME's role. Component metrics (height, radius) are the guideline
  // and override authored geometry; fills only fill when the author left none.
  // `pal` is the active light/dark color palette.
  function styleFrame(node, t, pal, isRoot) {
    const hasFill = Array.isArray(node.fills) && node.fills.length > 0;
    const setFill = (roleOrHex) => {
      if (!hasFill) node.fills = [{ type: "SOLID", color: resolveColor(pal, roleOrHex) }];
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
      case "appbar":
        node.height = t.metrics.appbar.height;
        break;
      case "tabbar":
        node.height = t.metrics.tabbar.height;
        setFill("background");
        break;
      case "chip":
        node.height = t.metrics.chip.height;
        node.cornerRadius = t.metrics.chip.radius;
        setFill("surfaceVariant");
        break;
      case "segmented":
        node.height = t.metrics.segmented.height;
        node.cornerRadius = t.metrics.segmented.radius;
        setFill("surfaceVariant");
        break;
      case "segmentSelected":
        node.cornerRadius = Math.max(0, t.metrics.segmented.radius - 2);
        setFill("segmentSel");
        break;
      case "avatar":
        node.width = node.height = t.metrics.avatar.size;
        node.cornerRadius = t.metrics.avatar.radius;
        setFill("primary");
        break;
      case "actionIcon":
        node.width = node.height = t.metrics.actionIcon.size;
        node.cornerRadius = t.metrics.actionIcon.radius;
        setFill("primary");
        break;
      case "iconBtn":
        node.width = node.height = t.metrics.iconBtn.size;
        node.cornerRadius = t.metrics.iconBtn.radius;
        setFill("surfaceVariant");
        break;
      case "tabDot":
        node.width = node.height = t.metrics.tabDot.size;
        node.cornerRadius = t.metrics.tabDot.radius;
        setFill("surfaceVariant");
        break;
      case "tabDotActive":
        node.width = node.height = t.metrics.tabDot.size;
        node.cornerRadius = t.metrics.tabDot.radius;
        setFill("primary");
        break;
      case "divider":
        node.height = t.metrics.divider.thickness;
        setFill("outline");
        break;
      case "header":
        node.height = t.metrics.header.height;
        break;
      case "ghost":
        node.width = node.height = t.metrics.iconBtn.size;
        break;
      case "smallbtn":
        node.height = t.metrics.smallbtn.height;
        node.cornerRadius = t.metrics.smallbtn.radius;
        setFill("primary");
        break;
      case "tag":
        node.height = t.metrics.tag.height;
        node.cornerRadius = t.metrics.tag.radius;
        setFill("infoBg");
        break;
      case "banner":
        node.cornerRadius = t.metrics.banner.radius;
        setFill("infoBg");
        break;
      case "chart":
        node.height = node.bleed ? 240 : t.metrics.chart.height;
        node.lineColor = node.up === false ? pal.negative : pal.positive;
        if (node.bleed) node.bleedMargin = t.metrics.screenMargin;
        break;
      case "slider":
        node.height = t.metrics.slider.height;
        node.trackH = t.metrics.slider.track;
        node.knobSize = t.metrics.slider.knob;
        node.fillColor = pal.primary;
        node.trackColor = pal.outline;
        break;
      case "switch":
        node.width = t.metrics.switch.width;
        node.height = t.metrics.switch.height;
        node.knobSize = t.metrics.switch.knob;
        node.onColor = pal.primary;
        node.offColor = pal.outline;
        node.knobColor = pal.onPrimary;
        break;
      case "tfmark":
        node.width = 16;
        node.height = 3;
        node.cornerRadius = 2;
        setFill("primary");
        break;
      default:
        break;
    }

    if (isRoot || node.role === "screen") {
      if (!hasFill) node.fills = [{ type: "SOLID", color: resolveColor(pal, "background") }];
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

  function walk(node, t, pal, isRoot) {
    if (!node || typeof node !== "object") return;
    if (node.type === "TEXT") { styleText(node, t, pal); return; }
    // FRAME
    styleFrame(node, t, pal, isRoot);
    if (Array.isArray(node.children)) node.children.forEach((c) => walk(c, t, pal, false));
  }

  // Return a styled deep copy of `spec` for the given platform ("ios"|"android")
  // and theme ("light"|"dark", default light).
  function applyPlatformDefaults(spec, platform, theme) {
    const t = TOKENS[platform];
    if (!t || !spec || !spec.root) return spec;
    const pal = theme === "dark" ? t.dark : t.light;
    const out = clone(spec);
    out.platform = platform;
    out.theme = theme === "dark" ? "dark" : "light";
    out.fontFamily = t.fontFamily;
    walk(out.root, t, pal, true);
    return out;
  }

  global.MOBILE_TOKENS = TOKENS;
  global.applyPlatformDefaults = applyPlatformDefaults;
})(typeof window !== "undefined" ? window : globalThis);

// CommonJS export so the same tables can be reused by Node tooling later.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MOBILE_TOKENS: globalThis.MOBILE_TOKENS, applyPlatformDefaults: globalThis.applyPlatformDefaults };
}
