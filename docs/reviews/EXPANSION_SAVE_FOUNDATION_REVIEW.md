# Save foundation review — 2026-09-13

Scope: `b72235e..67e75b8`, 19 files; CodeRabbit CLI 0.7.6, authenticated
normal-host execution. Completed with five findings. This is local review,
not a GitHub approval, production save test or deployment.

| Finding | Disposition |
| --- | --- |
| Major: mutable PostgreSQL CI image | Fixed. Official PostgreSQL 16 multi-platform digest is pinned in `.github/ci/Dockerfile`. Docker Dependabot tracks this actual CI image source; CI builds/runs it without published host ports. |
| Minor: stale claim that cloud-save code does not exist | Fixed. Plan distinguishes implemented foundations from missing gameplay/navigation integration and actual two-device QA. |
| Trivial: migration-owned transaction | Fixed. Migration contains no transaction control; the local SQL harness wraps application in a transaction, as the migration runner should. Function bodies/grants are unchanged. |
| Major: repeated checkpoint replays | Fixed. Deeply frozen canonical saves/checkpoints carry private weak-set membership for internal reuse. Mutable/deserialized objects always undergo complete validation. |
| Trivial: repeated checkpoint replays, duplicate | Same fix as above, including sync, API acknowledgment and local-storage hops. |

Verification: red/green reuse regression; all 100 boundaries across 25 levels;
immutable nested commands; mutable external input is not trusted on a later call;
sync/API/type checks and build; disposable PostgreSQL migration/isolation/grant
tests rerun successfully. No production database writes. Docker is not installed
on this Mac, so the container startup portion remains a GitHub CI check; SQL
behavior is verified with native PostgreSQL 16 locally.

Image provenance: [official Docker Hub PostgreSQL 16 tag metadata](https://hub.docker.com/v2/repositories/library/postgres/tags/16)
returned digest `sha256:f1c3376c26f2609ab9f29f71f824103fe2fcd8ee0346485cb6122a4f93df6f94`.
Dependabot's [Docker support](https://docs.docker.com/scout/integrations/source-code-management/github/)
provides scheduled tag/digest PRs for the Dockerfile; do not assume the existing
GitHub Actions updater manages service-image references.

Follow-up review of all ten corrective files completed with zero findings.
No rejected findings. GitHub CI/required approvals remain separate gates.
