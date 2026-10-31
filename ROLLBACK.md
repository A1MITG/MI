# MI rollback points

Newest first. Each point is a git tag (and a matching branch) on GitHub, so it can be restored on any PC.
To restore one, stop the server, run the commands in this MI folder, then `npm start`.

| Date | Restore point | What it is | How to roll back |
|------|---------------|------------|------------------|
| 2026-10-31 | tag `restore/2026-10-31-before-tile-nav` (= `3f6e68a`) | Fixed four tiles with filter buttons, before tiles became section navigation (merged as `57e200a`). | `git revert -m 1 57e200a` and push, or `git checkout restore/2026-10-31-before-tile-nav` to view; restart the server. |
| 2026-10-31 | tag `restore/2026-10-31-before-saved-runs` (= `5c5d388`) | Four tiles, before runs were saved as HTML (merged as `ccaf549`). Saved runs in `runs/` are not in git and survive a rollback. | `git revert -m 1 ccaf549` and push, or `git checkout restore/2026-10-31-before-saved-runs` to view; restart the server. |
| 2026-10-31 | tag `restore/2026-10-31-before-four-tiles` (= `fc42887`) | Five sections (where things stand, strategic moves, disruption watch, future of work, trend setter), before regrouping into four tiles (merged as `5e71841`). | `git revert -m 1 5e71841` and push, or `git checkout restore/2026-10-31-before-four-tiles` to view; restart the server. |
| 2026-10-31 | tag `restore/2026-10-31-before-company` (= `c36f201`) | Before the Continuum Lab company section and manifesto (merged as `cef7357`). | `git revert -m 1 cef7357` and push, or `git checkout restore/2026-10-31-before-company` to view. |
| 2026-10-31 | tag `restore/2026-10-31-before-search` (= `b3b9db4`, branch `rollback/2026-10-31-before-search`) | Vantage-360 look, one OpenAI call per query, four section cards, no web search. | See below. |
| 2026-10-31 | branch `rollback/pre-vantage-restyle` (= `3ae847b`, this PC only) | The original dark purple page. | `git checkout rollback/pre-vantage-restyle` |

## Roll back to "before search"

Just look at it (no change to main):

```bash
git checkout restore/2026-10-31-before-search
npm start
```

Go back to the latest with `git checkout main`.

Undo it on main for good (keeps history, safe to push):

```bash
git checkout main
git revert -m 1 8f020e5
git push origin main
```

`8f020e5` is the merge that added web search. Your `.env` keys are not in git, so a rollback never touches them.

A plain file copy of the same version is also on this PC at
`C:\Projects\AI_Factory\vantage-point-backups\2026-10-31_mi-before-search`.
