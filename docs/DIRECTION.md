# Design direction for the polish pass

Read this together with `DESIGN.md` (tokens, which still win on any conflict) and `POLISH.md` (the backlog).

## Goal
When the owner opens the app it should feel calm, confident and well made, like a precise tool, not a template. Most people will open it on a phone, as an installed web app (PWA). Design phone first, then widen.

## Principles
1. **Quiet confidence.** Few things on screen, generously spaced, one accent colour (the moss green). Group with space before borders. Fewer boxes.
2. **One thing to read first.** Dashboard: what needs attention. Farm detail: the next job. Schedule: what is coming. Size, weight and position carry the hierarchy, not colour.
3. **Numbers are the heroes.** Large Fraunces Light numerals, tabular figures, with a short label.
4. **Phone first.** Tap targets 44px or more, bottom sheets on phones, thumb-reachable actions, nothing that needs hover.
5. **Motion with purpose.** Motion confirms an action or explains a change. 120 to 240ms. Ease-out only, never ease-in. Animate transform and opacity only. Press feedback on buttons (a slight scale down). Respect prefers-reduced-motion. No bounce, no looping animation.
6. **Dark and light are equal.** Every polish change is checked in both.
7. **Status is never colour alone.** Always icon plus text.

## Targets (adjust only with a written reason)
- Type scale (px): 12, 14, 16 (body), 18, 22, 28, 36 to 44 (hero numerals). Body line height 1.5, headings 1.1 to 1.25. Weights: Geist 400 and 500, Fraunces 300 and 400.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48. Gaps between sections: at least 24 on phones, 32 to 40 on desktop. Use the same gap between sibling blocks everywhere.
- Radius: 14 for cards, 10 for controls, fully round for pills. Borders 1px at low contrast.
- Depth: layers by lightness (background, surface, raised). Shadows only on menus, popovers and sheets. Focus ring: 2px, primary colour, 2px offset.
- Icons: ONE outline family at one stroke weight, sizes 20 and 24. The audit proposes the family (candidates: Phosphor regular or light, Lucide at a thinner stroke) with a short reason. Replace every icon with it.
- States: every interactive element has default, hover (desktop only), pressed, focus-visible, disabled and loading.
- Loading and empty: skeletons that match the layout. Every empty state has one friendly line and one action.

## What "premium" means here (written references, nothing to copy)
- Restraint of a dark developer dashboard with a single green accent.
- Typographic discipline: few sizes, strong alignment, generous line height.
- Calm hierarchy and large numbers, as in a good weather or notes app.
- Spacing that makes lists easy to scan, as in a good task app.

## Anti-goals
No gradients or glows, no emoji, no stock illustration, no decorative charts, no second accent colour, no animation over 300ms, no bounce or spring on routine actions, no shadows on cards.

## Rules for the pass
- Audit first and change nothing. Findings go to `POLISH-FINDINGS.md`, ordered by impact.
- Fix by priority: layout and spacing, then hierarchy and type, then icons, then states, then motion.
- Tokens only. Never change behaviour. One screen per commit. Both themes. Test at 320, 390, 768 and 1440 widths.
- The email colours in `email-theme.ts` are separate and are not part of this pass.
- Keep `DESIGN.md` updated if a token changes, and say why in the commit message.
