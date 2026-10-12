# Farm updates system

A responsive shell for recurring farm-work reminders. This task includes the theme, navigation, route placeholders, and temporary farm list only.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development token reference is at `/dev/tokens`.

## Routes

- `/` — Dashboard placeholder
- `/farms` and `/farms/[id]` — Farm placeholders
- `/schedule` — Schedule placeholder
- `/alerts` — Alerts placeholder
- `/settings` — Settings placeholder

The farm records in `src/mocks/farms.ts` are temporary and will be replaced by database records.
