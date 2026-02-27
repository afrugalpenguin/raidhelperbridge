# Release Checklist

Before each release:

- [ ] Update `CHANGELOG.md` (use `**vX.Y.Z**` bold text, no `###` subheadings)
- [ ] Commit with message: `chore(release): bump version to X.Y.Z`
- [ ] Create and push tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] GitHub Actions will auto-package and upload to CurseForge + create a GitHub Release

## Setup

- **CurseForge project ID**: Replace `000000` in `.github/workflows/release.yml` once the project is created
- **CF_API_KEY secret**: Add your CurseForge API token as a repository secret in GitHub Settings > Secrets

## Version Tagging Rules

Follow [Semantic Versioning](https://semver.org/):

| Type | When to use | Example |
|------|-------------|---------|
| **Major** (X.0.0) | Breaking changes, import string format changes, saved variable resets | 1.0.0 → 2.0.0 |
| **Minor** (X.Y.0) | New features, new UI sections, significant enhancements | 1.0.0 → 1.1.0 |
| **Patch** (X.Y.Z) | Bug fixes, small tweaks, data updates | 1.0.1 → 1.0.2 |

## Tag Format

Always prefix with `v`: `v1.0.0`

## Quick Release Commands

```bash
# After committing the version bump:
git tag v1.0.0
git push origin v1.0.0
```
