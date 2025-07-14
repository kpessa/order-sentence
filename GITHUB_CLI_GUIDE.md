# GitHub CLI Guide for Monitoring GitHub Actions

## Installation (Ubuntu/Debian)

Run these commands in your terminal:

```bash
# Add GitHub CLI repository
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null

# Update and install
sudo apt update
sudo apt install gh

# Authenticate (follow the prompts)
gh auth login
```

## Useful Commands for Your Project

### Check Recent Workflow Runs

```bash
# List all recent runs
gh run list

# List only failed runs
gh run list --status failure

# List runs for a specific workflow
gh run list --workflow=ci.yml
gh run list --workflow=deploy.yml
```

### View Specific Run Details

```bash
# Get the run ID from the list, then:
gh run view <RUN_ID>

# View logs for failed jobs only
gh run view <RUN_ID> --log-failed

# View all logs
gh run view <RUN_ID> --log

# Watch a run in progress
gh run watch <RUN_ID>
```

### Debug Failed Runs

```bash
# View specific job logs
gh run view <RUN_ID> --job <JOB_ID> --log

# Download artifacts from a run
gh run download <RUN_ID>

# Rerun failed jobs
gh run rerun <RUN_ID> --failed
```

### Workflow Management

```bash
# List all workflows
gh workflow list

# View workflow file
gh workflow view deploy.yml

# Disable/enable workflow
gh workflow disable deploy.yml
gh workflow enable deploy.yml

# Manually trigger workflow
gh workflow run deploy.yml
```

## Quick Debugging Script

Create this script as `check-actions.sh`:

```bash
#!/bin/bash

echo "=== Recent GitHub Actions Runs ==="
gh run list --limit 5

echo -e "\n=== Latest Failed Runs ==="
gh run list --status failure --limit 3

# Get the latest run ID
LATEST_RUN=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')

if [ ! -z "$LATEST_RUN" ]; then
    echo -e "\n=== Latest Run Details ==="
    gh run view $LATEST_RUN

    echo -e "\n=== View logs? (y/n) ==="
    read -r response
    if [[ "$response" == "y" ]]; then
        gh run view $LATEST_RUN --log-failed
    fi
fi
```

Make it executable:

```bash
chmod +x check-actions.sh
./check-actions.sh
```

## Alternative: Using GitHub API without CLI

If you can't install the GitHub CLI, you can check the latest run status:

```bash
# Get latest workflow runs (replace with your repo)
curl -s "https://api.github.com/repos/kpessa/order-sentence/actions/runs?per_page=5" | jq '.workflow_runs[] | {id: .id, status: .status, conclusion: .conclusion, name: .name, created_at: .created_at}'

# Get specific run details (replace RUN_ID)
curl -s "https://api.github.com/repos/kpessa/order-sentence/actions/runs/RUN_ID" | jq

# Get jobs for a run
curl -s "https://api.github.com/repos/kpessa/order-sentence/actions/runs/RUN_ID/jobs" | jq '.jobs[] | {name: .name, status: .status, conclusion: .conclusion}'
```

## Current Workflow Status

To check your current deployment status:

1. Visit: https://github.com/kpessa/order-sentence/actions
2. Look for the latest runs triggered by your commits
3. Click on any failed run to see detailed logs

The recent fixes should resolve:

- ✅ Node.js version (now using 20.x only)
- ✅ pnpm version (now using v9 to match lockfile)
- ✅ All deployment configuration is in place
