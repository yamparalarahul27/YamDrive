# Mobile Design Playground

Open [`index.html`](./index.html) in any browser — no build step, no device, no
adb. It renders a `layout.json` spec live inside **iPhone** and **Android**
mockups. This is the reverse of the capture tool: instead of
`APK screen → layout.json`, you author a spec and see it rendered.

The spec is the **same `layout.json` schema** the capture tool and Figma
importer use (see [`../figma-plugin/README.md`](../figma-plugin/README.md)), so
anything you build here can go straight into Figma via the plugin.

## Two tabs

- **Describe** — write a short indented outline of the screen (grammar below).
  It's parsed to a role-based `layout.json` by [`generator.js`](./generator.js)
  and rendered live. This is the fastest way in.
- **layout.json** — edit the generated (or pasted) spec directly for fine
  control. The two tabs stay in sync.

## Multiple screens

Start a new screen with a top-level `screen Name` line; everything indented
under it belongs to that screen. When an outline defines more than one screen, a
picker bar appears above the mockups to switch between them. The default example
is an end-to-end crypto-exchange flow (Home/Lite, Markets, Coin, spot Buy,
Futures/Pro, Earn/Coin Sets, Bonus, Wallet, Deposit) with INR, 1% TDS, KYC and
UPI context, and a Lite→Pro progressive-disclosure toggle.

## Two ways to author

1. **Fully-styled spec** — set `fontSize`, `color`, `fills`, `cornerRadius`,
   etc. explicitly. Renders literally and identically in both mockups.
2. **Role-based spec** — name each node's semantic `role` and leave styling to
   platform guidelines. With **Apply Apple / Material guidelines** on, the same
   spec renders Apple-styled (HIG) in the iPhone and Material-styled (M3) on the
   Pixel. This is how you get consistent typography + spacing "for free". The
   Describe tab always emits role-based specs.

## Describe grammar

One element per line; **2-space indentation nests** a child under its parent.

```text
screen Sign in            container: the root screen (optional; auto-wrapped)
  title Welcome back      text roles: display title subtitle heading
  subtitle Continue                    body label caption
  field Email address     text field — the text is its placeholder
  button Sign in          primary button — the text is its label
  card                    grouping container (indent its children)
    heading Account
    - Name                list item (bullet)
  row                     lay children out horizontally
    [ Cancel ]
    [ Save ]
```

Markdown-ish shortcuts at line start also work:

| Write | Becomes |
| --- | --- |
| `# Title` | `title` |
| `## Section` | `heading` |
| `### Sub` | `subtitle` |
| `> Note` | `caption` |
| `[Label]` | `button` |
| `_ Placeholder` | `field` |
| `- Item` | list item |

Containers (`screen`, `card`, `row`, `column`, `section`, `group`) hug their
content; `button`/`field`/`listItem` take the platform's component height. A
`row`'s children grow to share its width equally.

## Composite components (pipe-delimited)

Pack a whole subtree into one line with `|`-separated fields. Enough to lay out
a real financial product (e.g. a crypto exchange):

| Write | Renders |
| --- | --- |
| `appbar Portfolio \| ⋯` | top bar: title + trailing icon buttons |
| `balance Total \| $12,405.32 \| +5.2%` | hero balance; the change is colored by its sign |
| `actions Buy \| Sell \| Send \| Receive` | row of circular action buttons with glyphs |
| `segmented Overview \| Assets \| Activity` | segmented control (first selected) |
| `chips All \| Gainers \| Losers` | row of filter chips |
| `asset BTC \| Bitcoin \| $64,230 \| +2.4%` | list row: avatar, name/symbol, price, colored change |
| `tabbar Home \| Markets \| Trade \| Wallet` | bottom nav with divider (first selected) |
| `header ‹ \| Title \| ☆` | detail nav bar: back, centered title, action |
| `chart +2.4%` | price sparkline; sign sets the line color |
| `orderform BTC \| INR` | Buy/Sell tabs + amount + slider + total + button |
| `slider 25` | progress/percentage slider at 25% |
| `switch UPI \| on` | labeled row with an on/off toggle |
| `stats High:64,900 \| Low:61,200 \| Vol:1.2B` | row of stat tiles (label + value) |
| `stat Available \| ₹80,000` | single key/value row (spaced apart) |
| `banner 1% TDS on sells \| KYC verified` | tinted info banner (`\|` joins with ·) |
| `tag 10x` | small pill badge |
| `avatar BTC` | circular initials badge |
| `divider` | hairline rule |
| `spacer 24` | fixed vertical gap of 24 |

The `chart` sparkline is a lightweight placeholder — deterministic, no live
data. Swap it for a real series later; it's isolated in the renderer's
`drawChart`.

**Change coloring:** a value starting with `+` renders in the platform's
positive color (green), `-` in the negative color (red), anything else neutral.
Action glyphs are inferred for `buy/sell/send/receive/swap/more`, else the first
letter. The default Describe example is a full crypto portfolio screen.

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
