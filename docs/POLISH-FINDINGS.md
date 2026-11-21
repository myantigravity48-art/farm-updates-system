# Polish audit findings

## 1. Summary

**Audit mode:** code-only. No screen was verified visually. The permitted design-skill set did not include the computer-control workflow, and the Impeccable `context`, `audit`, and `critique` commands could not start because their engine is not installed locally and would need a prohibited network download and cache write. Every finding below is therefore labelled **inferred from code**; visual verification remains required at 320, 390, 768, and 1440px in both themes.

**Counts:** P0 0 · P1 6 · P2 5.

The five changes most likely to make the product feel more premium are:

1. Give sections a calmer, consistent 24px mobile / 32px desktop rhythm instead of the prevalent 16px stacks.
2. Make `--due-soon` accessible in light mode before using it for meaningful text.
3. Add one deliberate interaction-state system: focus, desktop-only hover, pressed feedback, disabled, loading and skeleton/empty states.
4. Standardise the existing Lucide icons at a 1.5px outline stroke and replace the one text-glyph add icon.
5. Finish PWA metadata and mobile browser behaviour so the installed experience is intentional rather than merely responsive.

The shell has sound foundations: 44px minimum controls, dynamic viewport units, safe-area padding in the bottom bar and sheet, widespread `min-w-0`, and status labels paired with icons. The concern is not a broken layout observed in a browser; it is an inconsistent last 15% of system-level polish inferred from implementation.

## 2. Contrast table and icon inventory with the recommended icon family

Ratios were calculated from the exact CSS token hex values in `docs/DESIGN.md` using WCAG relative luminance. “Fail” means below 4.5:1 for text or below 3:1 for large text/icons.

| Theme | Token / foreground | On background | On surface | Result |
| --- | --- | ---: | ---: | --- |
| Dark | `--text` | 16.16 | 14.91 | Pass |
| Dark | `--muted` | 6.94 | 6.40 | Pass |
| Dark | `--primary` | 8.69 | 8.02 | Pass |
| Dark | `--on-primary` on `--primary` | 8.69 | — | Pass |
| Dark | `--due-soon` | 8.72 | 8.04 | Pass |
| Dark | `--overdue` | 5.52 | 5.09 | Pass |
| Light | `--text` | 15.09 | 16.78 | Pass |
| Light | `--muted` | 5.03 | 5.59 | Pass |
| Light | `--primary` | 5.78 | 6.43 | Pass |
| Light | `--on-primary` on `--primary` | 5.78 | — | Pass |
| Light | `--due-soon` | 3.17 | 3.53 | **Fail for normal text; pass for large text/icons** |
| Light | `--overdue` | 5.12 | 5.70 | Pass |

Status colours on `--raised` were also checked where rows/pills use that layer: dark due-soon 7.30 and overdue 4.63 pass; light due-soon 2.95 fails even for a large icon, while overdue 4.76 passes. Because `--due-soon` is used for 14px labels and 15–18px icons, this is an accessibility defect in light mode, not simply a visual preference.

**Recommended family:** retain **Lucide**, standardised at **1.5px outline** (20px control/navigation icons; 24px only where a control needs it). It is already the sole SVG library, reads quiet and technical rather than decorative, and matches the specified outline direction without a dependency or visual migration.

| Icon(s) | Library | File:line |
| --- | --- | --- |
| `Bell`, `CalendarDays`, `LayoutDashboard`, `Leaf`, `Search`, `Settings`, `Sprout` | Lucide | `src/components/app-shell.tsx:5` |
| `Moon`, `Sun` | Lucide | `src/components/theme-toggle.tsx:3` |
| `AlertCircle`, `CalendarOff`, `Check`, `CircleCheck`, `Clock3` | Lucide | `src/components/status-pill.tsx:1` |
| `AlertCircle`, `Eye`, `EyeOff` | Lucide | `src/components/auth/login-form.tsx:4` |
| `AlertCircle`, `Check` | Lucide | `src/components/auth/change-password-form.tsx:3` |
| `AlertCircle` | Lucide | `src/components/auth/config-error.tsx:1` |
| `AlertCircle`, `Check`, `X` | Lucide | `src/components/ui/toast.tsx:3` |
| `X` | Lucide | `src/components/ui/modal.tsx:3` |
| `AlertCircle`, `Check`, `ChevronRight`, `Clock3` | Lucide | `src/components/dashboard/dashboard-screen.tsx:4` |
| `ArrowLeft`, `Leaf`, `Plus`, `Trash2` | Lucide | `src/components/farms/farm-dialog.tsx:3` |
| `Leaf` | Lucide | `src/components/farms/edit-farm-dialog.tsx:3` |
| `ChevronRight` | Lucide | `src/components/farms/farm-detail-header.tsx:2` |
| `MoreHorizontal` | Lucide | `src/components/farms/stage-timeline.tsx:4` |
| `ImageOff`, `ImagePlus` | Lucide | `src/components/farms/photos-panel.tsx:6` |
| `ChevronLeft`, `ChevronRight`, `ImageOff`, `X` | Lucide | `src/components/farms/photo-lightbox.tsx:5` |
| `Check`, `ImagePlus` | Lucide | `src/components/mark-done/mark-done-provider.tsx:6` |
| `Check` | Lucide | `src/components/schedule/schedule-screen.tsx:5` |
| `AlertCircle`, `Mail`, `Minus`, `Plus` | Lucide | `src/components/alerts/alerts-screen.tsx:5` |
| `ChevronRight`, `Clock3`, `Leaf` | Lucide | `src/components/settings/lifecycle-screen.tsx:4` |
| `LogOut` | Lucide | `src/app/(app)/settings/page.tsx:8` |
| `+` text glyph (not an icon component) | None | `src/components/app-shell.tsx:119` |

## 3. Findings, ordered by impact

### F-001 — **P1** — Light-theme due-soon status does not meet the required contrast

- **Screen:** shell, dashboard, schedule, status pills, lifecycle and alerts
- **Evidence:** **inferred from code**. `--due-soon` is `#B97C0C` in light mode and is used as status text and icon colour; it measures 3.17:1 on `--bg`, 3.53:1 on `--surface`, and 2.95:1 on `--raised`. See `src/app/globals.css:18`, `src/components/status-pill.tsx:26`, `src/components/dashboard/dashboard-screen.tsx:31` and `src/components/schedule/schedule-screen.tsx:20`.
- **What is wrong:** a semantic status is below AA when rendered as normal-size text and sometimes below the 3:1 non-text threshold.
- **Why it matters:** DIRECTION principle 6 requires light and dark to be equal; `docs/DESIGN.md` requires WCAG AA.
- **Exact proposed fix:** darken only the light-mode `--due-soon` token until it is at least 4.5:1 against `--bg`, `--surface`, and `--raised`; continue using the same token for the 18% tint. Recheck every status-pill and status-edge treatment in both themes.
- **Files and lines:** `src/app/globals.css:18`; `docs/DESIGN.md:28-41`.
- **Effort:** S. **Behaviour risk:** none. **Skill:** impeccable audit; apple-design.

### F-002 — **P1** — Shared section rhythm is denser than the design direction

- **Screen:** dashboard, farms, schedule, alerts, settings, farm detail
- **Evidence:** **inferred from code**. Equal-level blocks repeatedly use `gap-4`, `space-y-4`, `mb-5`, or `mb-6`: dashboard `src/components/dashboard/dashboard-screen.tsx:142-145`; farms grid `src/components/farms/farms-screen.tsx:67`; schedule groups `src/components/schedule/schedule-screen.tsx:145`; detail tabs `src/components/farms/farm-detail-tabs.tsx:71`.
- **What is wrong:** the implementation has good local spacing but no shared Section/Stack convention. The prevalent 16px gap makes large cards feel assembled rather than deliberately grouped, contrary to the requested 24px minimum mobile section gap and 32–40px desktop gap.
- **Why it matters:** DIRECTION principle 1 calls for quiet confidence and grouping with space before borders; the spacing scale says equal sibling levels should have equal gaps.
- **Exact proposed fix:** introduce a shared layout convention using existing scale values: 24px between peer sections on phone (`gap-6` / `mt-6`), 32px at 768px+ (`min-[768px]:gap-8` / `mt-8`); retain 16px only within cards and 8–12px for tightly related controls. Apply the convention to shell page headers and all top-level card stacks before per-screen tuning.
- **Files and lines:** `src/components/dashboard/dashboard-screen.tsx:142-145`; `src/components/farms/farms-screen.tsx:61-68`; `src/components/schedule/schedule-screen.tsx:145`; `src/components/page-header.tsx:3`.
- **Effort:** M. **Behaviour risk:** low. **Skill:** impeccable critique; emil-design-eng.

### F-003 — **P1** — The interaction-state system is incomplete and hover is not desktop-gated

- **Screen:** shell, all navigation, cards, buttons, rows, dialogs and sheets
- **Evidence:** **inferred from code**. Many interactions have a `hover:` style but no `active:` press feedback; for example `src/components/ui/button.tsx:6-11`, `src/components/app-shell.tsx:69`, `src/components/farms/farm-card.tsx:11`, and `src/components/schedule/schedule-screen.tsx:37`. The only motion is opacity/button and switch colour/transform; no `prefers-reduced-motion` rule exists in `src/app/globals.css`.
- **What is wrong:** default and disabled states are widespread, but pressed states are absent, focus treatment is inconsistently declared locally, hover is available on coarse pointers, and loading commonly changes copy only rather than preserving layout with a skeleton.
- **Why it matters:** DIRECTION principles 4 and 5 require phone-first, 44px touch targets and purposeful feedback. Hover is neither useful nor reliable as a mobile affordance.
- **Exact proposed fix:** define shared state classes/tokens: desktop hover only under `@media (hover: hover) and (pointer: fine)`, `:active { transform: scale(.97) }` with a 120–160ms transform/opacity transition, the existing 2px/2px-offset focus ring, and a reduced-motion branch that keeps opacity feedback but removes transform. Use `aria-busy` plus layout-matched skeleton blocks for route/data loading; do not animate layout properties.
- **Files and lines:** `src/app/globals.css:28-32`; `src/components/ui/button.tsx:6-11`; `src/components/alerts/alerts-screen.tsx:281`; `src/components/mark-done/mark-done-provider.tsx:224`.
- **Effort:** M.. **Behaviour risk:** low. **Skill:** improve-animations; find-animation-opportunities; mobile-native.

### F-004 — **P1** — PWA metadata and browser-chrome treatment are missing

- **Screen:** installed/mobile shell and login
- **Evidence:** **inferred from code**. Root metadata includes only title and description (`src/app/layout.tsx:11-14`). There is no manifest, theme colour, standalone display treatment, explicit status-bar styling, overscroll policy, or button selection policy found in `src`/`public`. Positive existing work: `min-h-dvh` occurs in shell/login and safe-area padding occurs in the bottom nav and drawer (`src/components/app-shell.tsx:61,144`; `src/components/ui/modal.tsx:98`).
- **What is wrong:** the app can respond like a phone UI but has not declared the installed-app/browser behaviour that makes it feel intentional.
- **Why it matters:** DIRECTION principle 4 says the owner will primarily use an installed PWA; mobile-native guidance treats browser chrome, safe areas and overscroll as product surface, not deployment detail.
- **Exact proposed fix:** add token-backed `themeColor` metadata for both themes, a web manifest with `display: standalone`, matching background colour and icons, safe-area-aware top/bottom padding where fixed UI exists, `overscroll-behavior-y: none` only if pull-to-refresh is intentionally rejected, and `user-select: none` on buttons/controls only (never body/text). Verify installed dark and light variants on a physical phone.
- **Files and lines:** `src/app/layout.tsx:11-25`; `src/app/globals.css:28-32`; `src/components/app-shell.tsx:144`.
- **Effort:** M. **Behaviour risk:** low. **Skill:** mobile-native; apple-design.

### F-005 — **P1** — Dashboard hierarchy has four equal KPI cards before the actionable list

- **Screen:** `/`
- **Evidence:** **inferred from code**. Four same-weight KPI cards lead the route at `src/components/dashboard/dashboard-screen.tsx:128-133`; “Needs attention,” the stated primary task, follows at line 142. The cards use status colour for two figures and neutral treatment for two figures.
- **What is wrong:** the first visual decision is “which metric should I inspect?” rather than “what requires action now?” The dashboard's most useful block is visually delayed.
- **Why it matters:** DIRECTION principle 2 says the dashboard must make what needs attention the one thing to read first; principle 3 says numbers are heroes, but not at the cost of action hierarchy.
- **Exact proposed fix:** preserve all four values but make `Needs attention` the first, dominant block; group the remaining metrics into a quieter two-by-two summary after it at 320/390 and beside it only at wider widths. Use `text-4xl`/`text-5xl` only for the single primary count; retain `text-2xl`/`text-3xl` equivalents from the listed scale for secondary values.
- **Files and lines:** `src/components/dashboard/dashboard-screen.tsx:14-35,128-149`.
- **Effort:** M. **Behaviour risk:** none. **Skill:** impeccable critique; emil-design-eng.

### F-006 — **P1** — Recipient rows have no robust long-value strategy

- **Screen:** `/alerts`, Edit recipient
- **Evidence:** **inferred from code**. Recipient name, address and optional phone are all `truncate` inside the only text column, while four actions compete in the same wrapping row (`src/components/alerts/alerts-screen.tsx:266-273`). Inputs allow names up to 60 characters and addresses up to 254 (`src/components/alerts/alerts-screen.tsx:223-229`).
- **What is wrong:** at 320px, a realistic long non-Latin name or long address is hidden without a full-value affordance while Edit, Remove, test-send and the switch consume most of the row. It is also difficult to distinguish recipients with similar prefixes.
- **Why it matters:** DIRECTION principle 4 requires phone-first clarity; break-ui guidance says identity values that users need to distinguish should wrap or expose the full value, never silently truncate.
- **Exact proposed fix:** make each recipient a small stacked row: identity text first with `overflow-wrap:anywhere` (or two-line clamp plus an accessible full-value `title`/detail), then the switch and a compact overflow actions menu. Keep one primary task per screen; destructive removal stays visually secondary and confirmed.
- **Files and lines:** `src/components/alerts/alerts-screen.tsx:223-229,266-273`.
- **Effort:** M. **Behaviour risk:** low. **Skill:** break-ui; impeccable critique.

### F-007 — **P2** — Icon sizing/stroke treatment and the add affordance are inconsistent

- **Screen:** shell, dashboard, status treatments, dialogs
- **Evidence:** **inferred from code**. Lucide strokes range from 1.5 to 1.7 (for example `src/components/app-shell.tsx:70`, `src/components/status-pill.tsx:26`, `src/components/dashboard/dashboard-screen.tsx:46`); the shell's Add farm uses a literal `+` rather than its installed `Plus` icon (`src/components/app-shell.tsx:119`).
- **What is wrong:** the system is nearly standardised but not quite; the result risks a generic, uneven rhythm across dense controls.
- **Why it matters:** DIRECTION calls for one outline family, one stroke weight and 20/24px sizes. Small icon inconsistencies are especially visible in a sparse interface.
- **Exact proposed fix:** retain Lucide at 1.5px; create an icon wrapper or local `iconProps` convention for 20px controls, 24px only for prominent primary actions, and swap the text plus for `Plus` at 20px. Keep semantic aria labels on icon-only buttons.
- **Files and lines:** `src/components/app-shell.tsx:5,70,119`; `src/components/status-pill.tsx:26`; `src/components/dashboard/dashboard-screen.tsx:46`; inventory above.
- **Effort:** S. **Behaviour risk:** none. **Skill:** apple-design; impeccable audit.

### F-008 — **P2** — The 60+ farm path is functional but visually unbounded

- **Screen:** farm panel, `/farms`, schedule farm filter
- **Evidence:** **inferred from code**. The shell renders the filtered farms list in full (`src/components/app-shell.tsx:90-111`), Farms renders all cards (`src/components/farms/farms-screen.tsx:67-70`), and Schedule renders every farm as a native select option (`src/components/schedule/schedule-screen.tsx:119-122`). Product scope anticipates 50+ farms.
- **What is wrong:** code protects wrapping and scrolling, but no density or navigation strategy limits the visual and scanning burden with 60+ entries. The Farms route will become an extensive card wall and the native select becomes hard to scan on a phone.
- **Why it matters:** DIRECTION principle 1 asks for fewer boxes and calm scanning; break-ui treats collection length as data, not an exceptional condition.
- **Exact proposed fix:** retain the searchable rail, add a clear `/farms` search/filter and compact-list option before 50+ farms, and replace the schedule select with a searchable picker only if it can be done with existing primitives (no dependency without approval). Keep cards at one-column phone / two-column tablet / three-column desktop and add sensible empty/no-results states.
- **Files and lines:** `src/components/app-shell.tsx:90-111`; `src/components/farms/farms-screen.tsx:67-70`; `src/components/schedule/schedule-screen.tsx:119-122`.
- **Effort:** L. **Behaviour risk:** medium. **Skill:** break-ui; emil-design-eng.

### F-009 — **P2** — Empty and loading states lack a single reusable premium pattern

- **Screen:** dashboard, farms, schedule, farm detail panels, Mark done panel, alerts
- **Evidence:** **inferred from code**. Empty states range from helpful and actioned (`src/components/farms/farms-screen.tsx:47-57`, `src/components/schedule/schedule-screen.tsx:135-143`) to a plain line (`src/components/farms/notes-panel.tsx:143`, `src/components/farms/photos-panel.tsx:88`); Mark done loading is a single text line (`src/components/mark-done/mark-done-provider.tsx:224`).
- **What is wrong:** the baseline copy is clear, but structure, action availability and loading shape differ enough that the product reads as separately built routes.
- **Why it matters:** DIRECTION asks for every empty state to include one friendly line and one action, and skeletons that match layout.
- **Exact proposed fix:** make a shared EmptyState with optional one secondary action and a shared Skeleton pattern that mirrors the destination card/row geometry; use 24px interior gaps, border-dashed only for intentionally empty collection containers, and `aria-busy`/status text while loading.
- **Files and lines:** `src/components/farms/farms-screen.tsx:47-57`; `src/components/schedule/schedule-screen.tsx:135-143`; `src/components/farms/notes-panel.tsx:143`; `src/components/farms/photos-panel.tsx:88`; `src/components/mark-done/mark-done-provider.tsx:224`.
- **Effort:** M. **Behaviour risk:** none. **Skill:** impeccable audit; emil-design-eng.

### F-010 — **P2** — Type-scale exceptions dilute the stated discipline

- **Screen:** shell, farm detail, lifecycle, Mark done
- **Evidence:** **inferred from code**. The authorised scale is 12, 14, 16, 18, 22, 28 and 36–44px. Code also uses `text-[11px]` on the lifecycle timeline (`src/components/settings/lifecycle-screen.tsx:38`), `text-[32px]` login title (`src/app/(auth)/login/page.tsx:22`), and `text-3xl` (30px default) in the Mark done title (`src/components/mark-done/mark-done-provider.tsx:217`).
- **What is wrong:** these exceptions are not documented as intentional and weaken the otherwise sparse type system. `11px` is particularly risky for a timeline label on a phone.
- **Why it matters:** DIRECTION targets a short, disciplined scale and a 14px minimum for labels; premium density comes from repeating a small set of sizes.
- **Exact proposed fix:** use 12px only for the compact timeline month labels with adequate line height, 28px for sheet headings, and 36px for page/login title where hierarchy warrants it; document any true exception in `docs/DESIGN.md` before implementation.
- **Files and lines:** `src/components/settings/lifecycle-screen.tsx:38`; `src/app/(auth)/login/page.tsx:22`; `src/components/mark-done/mark-done-provider.tsx:217`.
- **Effort:** S. **Behaviour risk:** none. **Skill:** impeccable typesetting guidance; emil-design-eng.

### F-011 — **P2** — Photo lightbox and sheets need visual confirmation for safe-area/edge cases

- **Screen:** photo lightbox, Add farm, bulk add, Mark done, Edit stage, Edit recipient
- **Evidence:** **inferred from code**. The generic drawer reserves bottom safe-area padding (`src/components/ui/modal.tsx:98`), but the photo lightbox implements its own full-screen surface (`src/components/farms/photo-lightbox.tsx:118-216`) and no top safe-area padding is declared. Dialog composition varies between full-height modal and independently structured lightbox.
- **What is wrong:** implementation is thoughtful but not sufficiently shared to guarantee that all sheets preserve 44px controls, image framing, keyboard avoidance and notch clearance at 320px / landscape.
- **Why it matters:** DIRECTION principle 4 requires phone-first, thumb-reachable, bottom-sheet behaviour; mobile-native calls out safe areas and 100dvh as device-specific correctness.
- **Exact proposed fix:** establish a Sheet shell contract (header, scroll body, sticky footer, top/bottom safe-area), make the lightbox use its safe-area insets, and visually test long captions, absent captions, failed images and the 320px landscape height before changing layout.
- **Files and lines:** `src/components/ui/modal.tsx:75-112`; `src/components/farms/photo-lightbox.tsx:118-216`; `src/components/farms/farm-dialog.tsx:107-183`; `src/components/mark-done/mark-done-provider.tsx:211-276`.
- **Effort:** M. **Behaviour risk:** low. **Skill:** mobile-native; apple-design; break-ui.

## 4. Quick wins

1. Correct the light `--due-soon` token and re-run the contrast table.
2. Standardise Lucide `strokeWidth={1.5}` and sizes 20/24.
3. Replace the shell’s `+` glyph with the existing Lucide `Plus` icon.
4. Add an `:active` press treatment to the shared Button.
5. Gate hover visuals behind `(hover: hover) and (pointer: fine)`.
6. Add a reduced-motion branch before introducing any new motion.
7. Promote lifecycle month labels from 11px to the documented 12px minimum.
8. Change Mark done's 30px title to the documented 28px sheet-heading size.
9. Give plain Notes and Photos empties one secondary action.
10. Add an accessible full-value affordance to truncated recipient identity fields.

## 5. Systemic fixes versus per-screen fixes

| Systemic fix | Findings | Scope |
| --- | --- | --- |
| `PageHeader`, `Section`, `Card`, `Row` spacing contract | F-002, F-005, F-009 | Shared top-level rhythm; 24px phone / 32px desktop peer sections; 16px within cards. |
| Shared interaction-state styles | F-003 | Button, links, cards, rows, switches, menu items and icon controls. |
| Icon wrapper / `iconProps` convention | F-007 | One Lucide family, 1.5px outline, controlled 20/24px sizes. |
| `EmptyState` and `Skeleton` primitives | F-009 | Collection, panel and loading states across routes. |
| PWA/mobile browser baseline | F-004, F-011 | Manifest/metadata, themes, safe areas, overscroll decision, selection policy. |
| Dashboard re-hierarchy | F-005 | Dashboard only. |
| Recipient action layout | F-006 | Alerts only. |
| 60+ farm scaling behaviour | F-008 | Farm panel, Farms and Schedule filter. |

## 6. Batch plan

| Batch | Finding IDs | Files | Acceptance checks |
| --- | --- | --- | --- |
| 1. Shared layout and spacing | F-002, F-009 | `src/components/page-header.tsx`, dashboard, farms, schedule, alerts, settings, farm-detail components | 24px peer gaps at 320/390; 32px at 768/1440; no horizontal scroll; cards only where they group meaningful content. |
| 2. Type and numerals | F-010, F-005 | `src/app/(auth)/login/page.tsx`, Mark done, lifecycle, dashboard | Only documented sizes; labels at least 12px and normal labels 14px; all counts/dates use tabular figures; one dashboard focal point. |
| 3. Icons | F-007 | Every file in the icon inventory | Lucide only; 1.5px stroke; 20/24px sizes; icon-only controls retain accessible labels; no text-glyph icon remains. |
| 4. States, loading and empty | F-003, F-006, F-009 | `globals.css`, `ui/button.tsx`, `alerts-screen.tsx`, farms/detail panels, Mark done | Default, focus-visible, desktop hover, pressed, disabled and loading seen for each interactive primitive; recipient long values remain distinguishable; empty states offer one action where applicable. |
| 5. Motion | F-003 | `globals.css`, `ui/button.tsx`, switch and sheet/dialog primitives | Transform/opacity only; 120–240ms, ease-out; pressed scale .97; no layout animation; reduced-motion respected; no movement on high-frequency rows. |
| 6. PWA and mobile-native fixes | F-004, F-011 | `src/app/layout.tsx`, `src/app/globals.css`, manifest/icons as approved, modal/lightbox | Installed dark/light experience has matching theme colour and standalone mode; no accidental pull-to-refresh if intentionally blocked; safe areas at top/bottom; no input zoom; 320px portrait and landscape sheet/lightbox checks pass. |
| 7. Per-screen touches: dashboard and farms | F-005, F-008 | dashboard, `farms-screen.tsx`, `farm-card.tsx`, `app-shell.tsx` | Needs attention reads first; 60 farms remains scannable; long and non-Latin farm/stage names wrap without obscuring actions. |
| 8. Per-screen touches: schedule, alerts, settings and detail | F-006, F-008, F-011 | schedule, alerts, lifecycle, stage timeline, photo lightbox | Filters/actions remain thumb-usable at 320px; all done/unscheduled/no-farms states are clear; long recipient fields and photo metadata remain usable; both themes checked. |

## 7. Decisions I need from the owner

1. **Icon family:** approve retaining Lucide at 1.5px rather than a migration. **Recommendation:** approve; it is already everywhere and matches the brief.
2. **Light due-soon colour:** approve a darker light-mode token to meet AA. **Recommendation:** approve; accessibility is not optional.
3. **Dashboard priority:** should “Needs attention” lead before the KPI grid? **Recommendation:** yes, while retaining all four metrics as a quieter summary.
4. **60+ farms:** should Farms receive a compact-list/search mode before launch, or is card-only acceptable until the farm count grows? **Recommendation:** ship shared search now; defer a density switch until the count approaches 50.
5. **PWA boundary:** should pull-to-refresh be disabled in standalone mode? **Recommendation:** yes, if and only if it is replaced by an explicit refresh path and tested on physical devices.

## 8. Owner decisions

1. **Icon family: not decided.** It will be chosen by a side-by-side comparison in a later batch. Until then keep Lucide, and put every icon behind one wrapper component (allowed in the batch that the plan assigns it to).
2. **Light-mode due-soon colour: approved.** Replace it with a darker value that reaches at least 4.5:1 for text on the light background, on the surface, and on its own 18% tint (the pill background). The email theme uses the same colour, so it gets the same change.
3. **Dashboard: approved for widths under 1024px only.** "Needs attention" first, then the four metrics as a compact summary. Desktop (1024 and up) stays as designed.
4. **60+ farms: approved.** Ship shared search now; no density switch until about 25 farms.
5. **Pull-to-refresh: rejected.** Do not disable it. Only add `overscroll-behavior: contain` inside sheets, dialogs and drawers.
