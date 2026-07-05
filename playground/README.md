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

**Landscape** — the toolbar's *Landscape* checkbox flips both mockups to a wide
viewport; the content reflows into it (auto-layout stretches/hugs rather than
rotating). A portrait screen taller than the landscape height clips at the
bottom, as it would on a device that doesn't re-flow for landscape.

**Safe areas** — screens inset content by each platform's safe-area top/bottom
(iOS 59/34, Android 28/24), and a faux status bar (9:41 + signal/wifi/battery)
is drawn in the top zone, so content clears the Dynamic Island / status bar and
the home indicator. Bottom sheets add the bottom inset to their card; full-bleed
charts still extend to the horizontal edges.

**Dark** — the *Dark* checkbox renders the same spec with each platform's dark
palette (Apple + Material 3). It's a color swap on top of the role/token system,
so every screen has a dark variant for free — good for chart-forward asset
views like the built-in `Asset` (NVDA) screen.

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
| `chart +0.23% \| bleed line` | full-bleed, line-only chart (options: `bleed`, `line`) |
| `quote NVDA \| Nasdaq \| $150.19 \| +0.34 (+0.23%)` | asset header: logo, ticker/exchange, big price, change, bookmark |
| `timeframe 1D \| 1W* \| 1M \| 3M \| 1Y \| All` | timeframe tabs; `*` marks the selected one (underlined) |
| `tabs Markets* \| Orders \| History \| PnL` | underline text tabs (alias of `timeframe`) |
| `account $400.00 \| +126% Today \| $380.00 Available` | balance card with hide-eye + change · available |
| `buttons Withdraw \| Deposit*` | button row; `*` = primary, others secondary |
| `statbar 24h Vol:$1.72B \| OI:$1.46B \| Funding:0.0072%` | row of stat pills |
| `position ETH \| LONG 25x \| $499 \| +12.3% \| entry \| market \| liq` | perps position card: logo, green/red direction pill, value, PnL, entry/market/liq |
| `posdetail $205.12 \| Long 2x \| +$2.01 (4%) \| $587.89 \| tp \| sl` | position manage card: size + pill, PnL, margin, take-profit, stop-loss |
| `tile XY100 \| $29,871.01 \| +0.85%` | small card (logo, ticker, price, change) for a carousel |
| `dapp Polymarket` | app-icon tile (rounded-square logo + label) |
| `bignum $6,100 \| -2.12%` | big centered value + sub-caption |
| `keypad` | numeric keypad (1-9, ., 0, ⌫) |
| `cardbig Bitcoin \| BTC \| $1.32T \| +2.4% [\| blue]` | always-dark asset card: logo, name + verified, value + ▲, change, sparkline (`blue` = brand variant) |

`grid` is a **container** (nest `cardbig` lines) that lays cards out in a
2-column grid — used by the post-order `Upsell` screen ("People have also
traded these assets").

| `back Back` | white back nav (chevron + label) for gradient heroes |
| `progress 45` | progress bar (rounded track + fill, no knob) |
| `level 8 \| +2% FEE CASHBACK \| 45` | rewards hero: laurel + level, progress, next-reward |

**Gradient heroes:** add `gradient` after a screen name — `screen Level | gradient`
— for a full-bleed blue gradient background (white status bar + text).

**Bottom sheets:** add `sheet` after a screen name — `screen Leverage | sheet` —
to render its content as a rounded card anchored to the bottom over a dimmed
scrim (with a grabber handle). Everything else about the screen works the same.

`carousel` is a **container** (nest `tile`/`dapp` lines under it), not a
composite. It renders a section header (title + optional `new` badge + chevron)
above a horizontally-scrolling row:

```text
carousel Trending Stocks | new
  tile XY100 | $29,871.01 | +0.85%
  tile CL | $80.14 | +0.35%
```
| `orderform BTC \| INR` | Buy/Sell tabs + amount + slider + total + button |
| `slider 25` | progress/percentage slider at 25% |
| `switch UPI \| on` | labeled row with an on/off toggle |
| `stats High:64,900 \| Low:61,200 \| Vol:1.2B` | row of stat tiles (label + value) |
| `stat Available \| ₹80,000` | single key/value row (spaced apart) |
| `stat Status \| Confirmed \| ok` | key/value with a green ✓ (use `ok`), or an icon name as the 3rd field |
| `sheethead Withdraw` | sheet header: title + close (×) |
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

## Icons & fonts

- **Icons** — [Phosphor](https://phosphoricons.com) (MIT), inlined as SVG in
  [`icons.js`](./icons.js). Action buttons, tab bars, headers, and the bookmark
  resolve to real vector icons by keyword (`buy`→plus, `wallet`→wallet, `‹`→back,
  etc.); anything unresolved falls back to the character you typed.
- **Fonts** — Inter and Geist Sans, embedded as base64 `@font-face` in
  [`fonts.css`](./fonts.css) (OFL) so they render identically everywhere,
  offline. The toolbar **Font** selector switches the mockups between **Inter**,
  **Geist**, and **System** (the platform SF/Roboto stacks). The playground UI
  itself is set in Geist.

Both are bundled build outputs (no runtime dependency, no network). To
regenerate after changing the icon list, re-run the small extractor that reads
`@phosphor-icons/core` and `@fontsource/*`.

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
