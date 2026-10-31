# MI rollback points

Newest first. Each point is a git tag (and a matching branch) on GitHub, so it can be restored on any PC.
To restore one, stop the server, run the commands in this MI folder, then `npm start`.

| Date | Restore point | What it is | How to roll back |
|------|---------------|------------|------------------|
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
git revert -m 1 <merge commit of feat/web-search-future-study>
git push origin main
```

`git log --oneline --merges -5` shows the merge commit. Your `.env` keys are not in git, so a rollback never touches them.

A plain file copy of the same version is also on this PC at
`C:\Projects\AI_Factory\vantage-point-backups\2026-10-31_mi-before-search`.
