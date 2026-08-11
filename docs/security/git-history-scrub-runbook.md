# Git History Scrub — Runbook (User-Executed)

**Status:** OPTIONAL — required only if making the repo public and you want
to remove personally-identifiable material from git history.

**⚠️ Destructive:** rewrites every commit SHA. If the repo has been cloned or
pushed anywhere, all consumers must rebase or re-clone.

## What might need scrubbing

| Item | Where | Commit(s) |
|------|-------|-----------|
| `public/support-qr.png` (PromptPay QR with bank link) | tracked file | `b40ae46` and any commit that touched it |
| Committer email `panuwat.sa@allcoco.co.th` | commit metadata | every commit |
| Committer name `Panuwat Sakuntem` | commit metadata | every commit |

## Prerequisites

Install `git-filter-repo` (the modern replacement for `git filter-branch`):

    pip install git-filter-repo
    # or on macOS: brew install git-filter-repo

## Procedure

**Step 1 — Backup**

    cd E:/Coword
    cp -r Lotto Lotto.bak-YYYYMMDD

**Step 2 — Remove the QR image from all history**

    cd Lotto
    git filter-repo --path public/support-qr.png --invert-paths

The QR file is gone from every past commit. It remains in the working tree
(untracked) — re-add it later if you still want it in HEAD but not in
history:

    git add public/support-qr.png
    git commit -m "feat(assets): re-add PromptPay QR post-history-scrub"

**Step 3 (optional) — Rewrite committer identity**

Create a `mailmap` file:

    # .mailmap
    Public Name <public@example.com> Panuwat Sakuntem <panuwat.sa@allcoco.co.th>

Then:

    git filter-repo --mailmap .mailmap

Every past commit's author/committer becomes `Public Name <public@example.com>`.

**Step 4 — Force-push (only if remote exists)**

    git push --force-with-lease origin main

⚠️ If anyone else has cloned this repo, they must:

    git fetch origin
    git reset --hard origin/main

Their local unmerged work will need to be rebased.

**Step 5 — Verify**

    git log --all --format="%an <%ae>" | sort -u
    # should show only the public identity

    git log --all --full-history --diff-filter=A -- public/support-qr.png
    # should be empty (or only the post-scrub re-add)

## Alternative: don't scrub, rotate

If scrubbing feels too heavy, an equivalent-security path is:
1. Retire the PromptPay account tied to `support-qr.png`
2. Generate a new QR for a new account
3. Replace the file in HEAD

The old QR remains in history but no longer links to an active account.
