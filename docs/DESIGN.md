# Design

Screen exports are in `design/` at the repo root. This file is the source of truth for tokens and rules. Where an export disagrees with this file, this file wins.

## Mood
Deep forest at dusk with a moss glow; warm bone in light mode. Calm, glanceable, premium. Dark is the hero mode and light mode is a full equal. Surfaces are flat: 1px borders, no gradients, no glows, no drop shadows (only menus and popovers may have one). No emoji.

## Tokens
Define as CSS variables. Dark is the default theme. Light overrides under the theme switch (for example `.light` or `[data-theme="light"]`). Never hard-code colours in components.

```css
:root, .dark {
  --bg: #0A110D;
  --surface: #111B15;
  --raised: #182420;
  --border: #24332B;
  --text: #E6EEE8;
  --muted: #8FA095;
  --primary: #7BC144;
  --on-primary: #0A110D;
  --due-soon: #E0A526;
  --overdue: #D9694A;
}
.light {
  --bg: #F4F3EC;
  --surface: #FFFFFF;
  --raised: #ECEBE2;
  --border: #E2E1D6;
  --text: #14201A;
  --muted: #5E6B62;
  --primary: #2B6B3A;
  --on-primary: #FFFFFF;
  --due-soon: #B97C0C;
  --overdue: #B3402A;
}
```

## Status system
- On track = `--primary` with a circle-check icon
- Due soon = `--due-soon` with a clock icon
- Overdue = `--overdue` with an alert-circle icon
- Done = `--muted` with a check icon

Status is never shown by colour alone: always icon plus text. Tint backgrounds for pills and badges at about 18% of the status colour. Rows with a status edge use a 4px left edge with square corners.

## Type
- Fraunces Light (300): page titles, farm names, large numerals
- Geist 400 and 500: all UI
- Tabular numerals for dates and counts
- Body 16px minimum, labels 14px minimum
- Sentence case everywhere

## Shape and spacing
8px grid. Cards radius 14, controls radius 10, pills fully round. 1px borders using `--border`. Icons: outline, 1.5px stroke, 20 to 22px (Lucide or Tabler).

## Layout
- Desktop (1024 and up): 72px icon rail (Dashboard, Farms, Schedule, Alerts; Settings pinned at the bottom), then a 248px farm panel (search, farm list with status dots, Add farm), then the main area.
- Mobile (under 768): the rail becomes a bottom tab bar, the farm panel becomes the Farms tab, cards go single column, tap targets 44px or more.
- Phase 2 adds Costs and Workers to the rail. On mobile the tab bar then holds Dashboard, Farms, Costs, Workers, More (Schedule, Alerts, Settings under More).

## Signature element: season timeline
A 12-month strip. The dry season is shown in `--raised`, the planting window in `--primary` at about 38% opacity, and a "today" marker in `--text`. Built from the `season_windows` data, not hard-coded.

## Charts
Only the season timeline and the 8-segment stage progress bars in v1. Phase 2 may add simple horizontal bars and one segmented bar for costs. No line charts, pies or donuts.

## Accessibility
WCAG AA contrast in both modes. Visible focus rings. Status never by colour alone. Money is never coloured red or green (phase 2).

## Voice
Verb-first buttons. No "please", no "successfully", no exclamation marks. Errors say what happened and what to do. One primary button per screen.

## Screens
Designed for v1: Dashboard, Farm detail, Add farm (and bulk add), Mark done, Alert settings, Stage template.
Not yet designed: Login, and the phase 2 screens (Costs overview, Add expense, Workers, Worker detail, Record payment).
Every screen has desktop (1440) and mobile (390) in both modes.

Wordmark: "Farm updates system". The mock exports may still show the old placeholder "Farm Reminder". All mock data in the exports is placeholder.
