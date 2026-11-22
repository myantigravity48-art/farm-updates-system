# Polish backlog

## Layout checks

Check these viewport widths in portrait: 320, 360, 375, 390, 412 and 430px; iPhone 16 at 440px; 667×375 and 844×390px in landscape; and 768 and 820px. Repeat on `/login`, `/`, `/farms`, a farm detail page, `/schedule`, `/alerts`, `/settings`, `/settings/lifecycle`, `/dev/emails` and `/dev/tokens`. No page should scroll horizontally. Only the bordered email preview regions on `/dev/emails` may scroll horizontally inside their own labelled containers.

In the browser console, find elements whose right edge extends beyond the viewport with:

```js
[...document.querySelectorAll('*')]
  .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
  .map((element) => `${element.tagName} ${String(element.className).slice(0, 70)} right=${Math.round(element.getBoundingClientRect().right)}`)
```

The development-only layout guard also warns with the three farthest overflowing elements after load and resize.

Do not work on this until every v1 feature is built and working (see `STATUS.md`). The polish pass comes last. Polishing screens that still say "Coming soon" wastes effort.

## Known issues to fix in the polish pass
- Schedule has no dedicated design. It reuses the Dashboard rows, StatusPill, Mark done panel, farm panel and shared shell; the page is intentionally plain until the polish pass.
- The Mark done panel and stage actions menu are intentionally plain. Polish their spacing and hierarchy after every v1 feature is built and working.
- Farms has no dedicated design export. The page currently reuses the shared cards, tokens and layout; give it a proper visual pass for both themes at desktop and mobile widths.
- Farm detail: the stage timeline and photo grid are plain. Polish them last, after every v1 feature works: spacing and hierarchy on the 8 stage rows, the done and next-up treatments, the empty notes and photos states, and the tile hover and focus states.
- Icons feel generic. Choose ONE icon family and apply it everywhere (candidates: Phosphor, Tabler, or Lucide at a different weight). Decide once.
- The app feels bland. Add depth, hierarchy and life while staying inside the tokens in `DESIGN.md`: surface layering, spacing rhythm, micro-interactions, considered empty states, and motion that respects reduced-motion settings.
- Settings: the Change password form is not centred and hangs to the left. Fix the layout and align it with the page's content width.
- Login: add the licensed photograph at `public/login-moss.jpg` (about 1600px wide, under 300 KB). The login panel picks it up automatically. Do not crop it from a design mockup, and check the licence first.
- The Alert settings design export still shows WhatsApp. Follow `DESIGN.md` (email only), not the export.
- The Alerts page is intentionally plain. Polish its layout and hierarchy after all v1 features are built and working.
- The Dashboard has no dedicated treatment for large numbers of farms beyond the 8-row caps: Needs attention and Farm progress stop at 8 rows each ("+ N more" / "View all N farms"), Coming up at 4, and there is no pagination or density handling for many farms. Revisit when 50+ farms are live.

## Skills for the polish pass
Install at project level, in `.agents/skills/` at the repo root, and only when the polish pass starts.
1. Impeccable (original repo: pbakaus/impeccable). Used for audit, critique, layout, typeset and polish.
2. An Apple design skill, for feel, motion and principles. Candidates: NutshellEngineering/apple-design-skill, justinwetch/HIGAgentSkills, raintree-technology/apple-hig-skills.
3. Optional, mechanical check: web-design-guidelines (vercel-labs/agent-skills), for accessibility, focus and interaction findings.

Rules for skills:
- Read each skill's SKILL.md and any scripts before installing. After installing, `git diff` should show only new files under `.agents/skills/`.
- Install only from the original repos. Many copies and forks exist.
- Check the agent can see the skill (in Codex, run `/skills`) before relying on it.
- If a skill's setup step (for example Impeccable's init or teach) wants to write PRODUCT.md or DESIGN.md at the repo root, do not let it. The files in `docs/` are the source of truth. Tell it to read them instead.

## Order of work
1. Everything committed. Create a branch named `polish`.
2. Audit first and change nothing. Run the Impeccable audit and critique, and the Vercel guidelines review. Write the findings to `docs/POLISH-FINDINGS.md`.
3. Fix by priority: layout, spacing and hierarchy first, then typography, then icons, then motion.
4. Use the Apple design skill for motion and feel once the structure is right.
5. Re-run the audits. Test both themes at 390, 900 and 1440 widths. All tests must still pass.

Rules for the pass: tokens only, no behaviour changes, one screen per commit.

## Completed in polish pass 3 (2026-11-22)

Eleven visible fixes, inferred from code and not yet verified in a browser:
1. Dashboard: under 1024px the order is Needs attention, the four metrics as a 2x2 summary, then progress, season and coming up; desktop is unchanged.
2. Farm cards: the status pill keeps its full phrase and drops to its own line instead of squeezing.
3. Alerts: recipient identity, switch and actions stack; long names and addresses wrap.
4. Alerts: the switch off state uses `bg-muted` for the track and `bg-text` for the thumb; the contrast test covers both themes.
5. Schedule: filters use one column on phones and a two-row grid from 768px, with the status chips on their own row.
6. Schedule: rows share a four-column grid from 1024px; below that they stack.
7. Shell: the truncated header email has a `title`; the settings link already announces the full address.
8. Stage timeline: a done stage with no date reads "No date recorded" and only adds "by {name}" when a name exists.
9. Numerals: one `.numeric` class replaces every `tabular-nums`; lifecycle month labels are 12px, the Mark done heading is 28px and the login title is 36px.
10. Type: Fraunces headings below 28px use 400 instead of 300; the 18px farm-name spans stay light.
11. Empty states: the dashboard "Nothing needs attention" box, the farm rail lines and the alerts notice use the shared `EmptyState`.

# Lifecycle editor

- The lifecycle page is plain and has no dedicated Stage template design export. Polish it later.
# Stage descriptions

Stage descriptions: the detail text for Land clearing (cut trees, gather weeds, isolate wood, burn weeds, clear log remnants) was removed from the stage name. Add a description column and show it as helper text under the stage name.
