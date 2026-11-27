# Glass UI Redesign Spec

Visual reference: [`prototype/index.html`](prototype/index.html) (open it in a
browser; it is a static mock, not part of the app build).

This spec covers a visual-only redesign. Behavior, data flow, and public
interfaces stay exactly as they are.

## Hard Constraints

- Do not modify `src/services/`, `src/hooks/`, `src/store/`, `src/providers/`,
  `src/utils/`, `src-tauri/`, or `crates/` as part of this redesign.
- Do not change component props, exported names, routes, i18n keys, or
  IPC/command calls. Only styling and presentational JSX structure may change.
- Keep MUI 9 + Emotion. Do not add a UI library, CSS framework, or icon set.
- Every surface must keep working when the user's custom theme colors
  (`theme_setting`) override the defaults.

## Design Tokens

| Token          | Light                      | Dark                       |
| -------------- | -------------------------- | -------------------------- |
| primary        | `#2563EB`                  | `#6096FF`                  |
| success        | `#16A34A`                  | `#34D399`                  |
| warning        | `#D97706`                  | `#FBBF24`                  |
| error          | `#DC2626`                  | `#F87171`                  |
| text primary   | `#0F172A`                  | `#F1F5F9`                  |
| text secondary | `#475569`                  | `#94A3B8`                  |
| window surface | `rgba(246,248,252,.52)`    | `rgba(14,17,24,.55)`       |
| glass          | `rgba(255,255,255,.52)`    | `rgba(30,34,44,.45)`       |
| glass strong   | `rgba(255,255,255,.78)`    | `rgba(44,50,64,.70)`       |
| edge (border)  | `rgba(255,255,255,.70)`    | `rgba(255,255,255,.10)`    |
| hairline       | `rgba(15,23,42,.08)`       | `rgba(255,255,255,.07)`    |
| muted fill     | `rgba(15,23,42,.05)`       | `rgba(255,255,255,.05)`    |
| top highlight  | `rgba(255,255,255,.85)`    | `rgba(255,255,255,.12)`    |

- Radius: window 16px, cards 14px, controls 10px, chips 999px.
- Blur: window `blur(36px) saturate(170%)`, cards `blur(20px) saturate(150%)`,
  popovers/menus/dialogs use glass strong with `blur(24px)`.
- Shadow: cards `0 8px 24px -12px rgba(10,20,45,.25)` plus
  `inset 0 1px 0 <top highlight>`. No colored glows, no gradients on surfaces.
- Numbers (speeds, latency, traffic) use tabular figures
  (`font-variant-numeric: tabular-nums`).

## Implementation Order

Land each step as its own PR.

1. **Theme layer** – extend the `createTheme` call in
   `src/pages/_layout/hooks/use-custom-theme.ts` with `components.*.styleOverrides`
   for `MuiPaper`, `MuiCard`, `MuiDialog`, `MuiMenu`, `MuiPopover`, `MuiDrawer`,
   `MuiButton`, `MuiSwitch`, `MuiChip`, `MuiListItemButton`, `MuiTooltip`,
   `MuiTextField`/`MuiOutlinedInput`. Add the token values above to
   `defaultTheme` / `defaultDarkTheme` in `src/pages/_theme.tsx` and expose the
   glass tokens as CSS variables next to the existing `--background-color` etc.
2. **Layout shell** – sidebar, title bar, and content background in
   `src/pages/_layout.tsx` and `src/components/layout/`. Reuse the existing
   `--user-background-image` as the wallpaper behind the glass window.
3. **Pages, one per PR** – Home, Proxies, Profiles, Connections, Rules, Logs,
   Settings, following the prototype layout for each.
4. **Native window material (optional, last)** – Tauri transparent window with
   macOS vibrancy / Windows Mica. Requires `src-tauri` config changes and is out
   of scope for the visual-only steps above.

## Platform and Performance Rules

- Linux WebKitGTK may render `backdrop-filter` poorly. Guard with
  `@supports not (backdrop-filter: blur(1px))` and fall back to the opaque
  glass-strong color.
- Never apply `backdrop-filter` to individual rows in virtualized or long lists
  (Connections, Logs, Rules, proxy groups). Blur the container only.
- Check text contrast in both modes against a bright and a dark wallpaper; body
  text must stay at WCAG AA (4.5:1).
