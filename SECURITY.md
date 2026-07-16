# Security Policy

## Reporting a Vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, report privately through GitHub's Private Vulnerability Reporting:

1. Go to the **Security** tab of this repository.
2. Click **Report a vulnerability**.
3. Describe the issue, steps to reproduce, and impact.

You can expect an initial response within a few days. Once a fix is
available, the advisory will be published and credit given to the reporter
(unless anonymity is requested).

## Scope

GridWatch: Signal Breach is a static-first client-side browser game. The core
game has no backend and remains fully playable offline. Its one sanctioned
network feature is an optional Supabase leaderboard using OAuth, player handles,
score rows, and server-side deterministic replay validation. The browser receives
only a publishable key; the service-role key must remain in the Edge Function
runtime. The most relevant security concerns are therefore:

- Supply-chain issues in build/dev dependencies or GitHub Actions.
- Client-side issues such as DOM-based XSS in rendering or input handling.
- Supabase Auth/session handling, RLS and RPC privileges, handle/user ownership,
  Edge Function CORS, replay-validation bypasses, and service-role exposure.
- Compatibility failures that validate a run with a different simulation than
  the client used or mix incomparable score rulesets.

Reports about the deployed Cloudflare Pages site or the build pipeline are in
scope. Findings that require a non-default browser configuration or that
depend on a compromised local machine are generally out of scope.

## Supported Versions

Only the latest version deployed from the `main` branch is supported.
