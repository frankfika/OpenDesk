# OpenDesk Code Review Reports

This directory contains code-review reports for OpenDesk. Reports are organized
by date and scope, with the latest review at the top.

## Latest Review

| Date | Scope | Report | Author |
|------|-------|--------|--------|
| 2026-07-11 | Full project scan (v0.4.2 → v0.7.0+) | [`2026-07-11-full-review.md`](./2026-07-11-full-review.md) | Mavis |

## Historical Reviews (v0.1.0 baseline)

The following reports were produced during the v0.1.0 multi-agent review pass
(see [`plan.md`](./plan.md) for the original plan). They are kept for reference
but are largely superseded by the 2026-07-11 review:

- `OpenDesk_Review_Report.md` — aggregate report from the 5-agent review pass
- `architecture_review.md` — architecture & module boundaries
- `feature_review.md` — feature implementation vs `docs/PRODUCT.md` spec
- `ux_review.md` — UX / UI / a11y / visual consistency
- `security_performance_review.md` — Electron security & runtime performance
- `state_review.md` — Zustand store design & persistence

## Reading Order

If you are new to this project, read the reports in this order:

1. `2026-07-11-full-review.md` (latest, top-down)
2. `OpenDesk_Review_Report.md` (original v0.1.0 cross-cutting summary)
3. The five individual dimension reports — only if the aggregate flags
   something in your area of work

## Severity Legend

Reports use these tags to indicate how urgently an issue should be fixed:

- **C** — Critical: data loss, security hole, broken core flow. Fix this
  release-blocking.
- **H** — High: a real bug or strong design smell; user-visible or harms
  maintainability. Fix in the next sprint.
- **M** — Medium: a smell or refactor that compounds over time. Fix when
  touching nearby code.
- **L** — Low: a nit or nice-to-have. Pick up opportunistically.
- **I** — Info: observation, not a defect. Document for posterity.

## Filing a New Review

When adding a new review report:

1. Name it `YYYY-MM-DD-<scope>.md` (e.g. `2026-07-11-full-review.md`).
2. Add a row to the **Latest Review** table at the top of this README.
3. Group findings by severity (C / H / M / L / I) and by module.
4. Include an "Executive Summary" section at the top so the reader knows in
   30 seconds whether the project is shippable.
