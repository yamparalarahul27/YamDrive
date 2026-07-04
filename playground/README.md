# Mobile Design Playground

Open [`index.html`](./index.html) in any browser — no build step, no device, no
adb. It renders a `layout.json` spec live inside **iPhone** and **Android**
mockups. This is the reverse of the capture tool: instead of
`APK screen → layout.json`, you author a spec and see it rendered.

The spec is the **same `layout.json` schema** the capture tool and Figma
importer use (see [`../figma-plugin/README.md`](../figma-plugin/README.md)), so
anything you build here can go straight into Figma via the plugin.

## Two ways to author

1. **Fully-styled spec** — set `fontSize`, `color`, `fills`, `cornerRadius`,
   etc. explicitly. Renders literally and identically in both mockups.
2. **Role-based spec** — name each node's semantic `role` and leave styling to
   platform guidelines. With **Apply Apple / Material guidelines** on, the same
   spec renders Apple-styled (HIG) in the iPhone and Material-styled (M3) on the
   Pixel. This is how you get consistent typography + spacing "for free".

## Design tokens ([`tokens.js`](./tokens.js))

Starting guidelines encoded once as tables:

- **iOS** — Apple [HIG](https://developer.apple.com/design/human-interface-guidelines/typography):
  SF type scale, 8pt spacing grid, 44pt tap target, system colors, systemBlue tint.
- **Android** — [Material 3](https://m3.material.io/styles/typography/type-scale-tokens):
  Roboto type scale, 4/8dp grid, 48dp touch target, M3 color roles, pill buttons.

`applyPlatformDefaults(spec, "ios" | "android")` returns a styled copy. A node's
`role` authoritatively applies that platform's type scale / component metrics;
an explicit `color` or `fills` you set still wins.

### Roles

| `role` (TEXT)  | Maps to (iOS / Material) |
| --- | --- |
| `display` | Large Title / Display Small |
| `title` | Title 1 / Headline Medium |
| `subtitle` | Subtitle, secondary color / Title Medium |
| `heading` | Headline / Title Large |
| `body` | Body / Body Large |
| `label` | 15pt medium / Label Large |
| `caption` | Caption, secondary / Body Small |
| `buttonText` | 17pt semibold, onPrimary / Label Large |
| `placeholder` | Body size, placeholder color |

| `role` (FRAME) | Applies |
| --- | --- |
| `screen` | white surface, platform screen margins + item spacing |
| `button` | platform height + radius, primary fill |
| `field` | platform height + radius, surfaceVariant fill |
| `card` | platform radius, surfaceVariant fill |
| `listItem` | platform row height |

Everything is a starting point — tweak the JSON and it re-renders as you type.
