# Polish backlog

Do not work on this until every v1 feature is built and working (see `STATUS.md`). The polish pass comes last. Polishing screens that still say "Coming soon" wastes effort.

## Known issues to fix in the polish pass
- Farms has no dedicated design export. The page currently reuses the shared cards, tokens and layout; give it a proper visual pass for both themes at desktop and mobile widths.
- Icons feel generic. Choose ONE icon family and apply it everywhere (candidates: Phosphor, Tabler, or Lucide at a different weight). Decide once.
- The app feels bland. Add depth, hierarchy and life while staying inside the tokens in `DESIGN.md`: surface layering, spacing rhythm, micro-interactions, considered empty states, and motion that respects reduced-motion settings.
- Settings: the Change password form is not centred and hangs to the left. Fix the layout and align it with the page's content width.
- Login: add the licensed photograph at `public/login-moss.jpg` (about 1600px wide, under 300 KB). The login panel picks it up automatically. Do not crop it from a design mockup, and check the licence first.
- The Alert settings design export still shows WhatsApp. Follow `DESIGN.md` (email only), not the export.

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
