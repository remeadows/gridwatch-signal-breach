#!/usr/bin/env bash
#
# apply-security-settings.sh
#
# Applies the repository security settings that CANNOT be expressed as
# committed files (they are GitHub repo/account toggles). Run this once with
# the GitHub CLI authenticated as a repo admin:
#
#   gh auth login        # if not already authenticated
#   ./scripts/apply-security-settings.sh
#
# Requirements: `gh` (GitHub CLI) authenticated with admin rights on the repo.
# Re-running is safe (idempotent) — each call sets the desired end state.

set -euo pipefail

# Run from the repository root so relative paths (e.g. the ruleset file)
# resolve no matter which directory the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/..")"

OWNER="${OWNER:-remeadows}"
REPO="${REPO:-gridwatch-signal-breach}"
SLUG="${OWNER}/${REPO}"
RULESET_FILE="${RULESET_FILE:-.github/rulesets/main-protection.json}"

echo ">> Applying security settings to ${SLUG}"

api() { gh api -H "Accept: application/vnd.github+json" "$@"; }

echo "-- Secret scanning + push protection (free on public repos)"
api --method PATCH "/repos/${SLUG}" \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled' \
  >/dev/null

echo "-- Dependabot vulnerability alerts"
api --method PUT "/repos/${SLUG}/vulnerability-alerts" >/dev/null

echo "-- Dependabot automated security fixes"
api --method PUT "/repos/${SLUG}/automated-security-fixes" >/dev/null

echo "-- Private vulnerability reporting"
api --method PUT "/repos/${SLUG}/private-vulnerability-reporting" >/dev/null

echo "-- Actions: default GITHUB_TOKEN read-only, block Actions creating/approving PRs"
api --method PUT "/repos/${SLUG}/actions/permissions/workflow" \
  -f 'default_workflow_permissions=read' \
  -F 'can_approve_pull_request_reviews=false' \
  >/dev/null

echo "-- GitHub Pages environment: restrict deployments to the main branch only"
api --method PUT "/repos/${SLUG}/environments/github-pages" \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true' \
  >/dev/null
# Add the allowed branch (ignore error if it already exists).
api --method POST "/repos/${SLUG}/environments/github-pages/deployment-branch-policies" \
  -f 'name=main' -f 'type=branch' >/dev/null 2>&1 || true

echo "-- Branch protection ruleset on the default branch (from ${RULESET_FILE})"
if [ -f "${RULESET_FILE}" ]; then
  existing_id="$(api "/repos/${SLUG}/rulesets" --jq '.[] | select(.name=="main-protection") | .id' 2>/dev/null | head -n1 || true)"
  if [ -n "${existing_id}" ]; then
    echo "   updating existing ruleset id=${existing_id}"
    api --method PUT "/repos/${SLUG}/rulesets/${existing_id}" --input "${RULESET_FILE}" >/dev/null
  else
    echo "   creating new ruleset"
    api --method POST "/repos/${SLUG}/rulesets" --input "${RULESET_FILE}" >/dev/null
  fi
else
  echo "   WARNING: ${RULESET_FILE} not found; skipping ruleset import"
fi

echo ">> Done. Note: account-level 2FA must still be enabled manually in your"
echo "   GitHub user settings — it is not a per-repository toggle."
