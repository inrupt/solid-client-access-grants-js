<!-- When fixing a bug: -->

This PR fixes #<issue ID>.

- [ ] I've added a unit test to test for potential regressions of this bug.
- [ ] The changelog has been updated, if applicable.
- [ ] Commits in this PR are minimal and [have descriptive commit messages](https://chris.beams.io/posts/git-commit/).

<!-- When adding a new feature: -->

# New feature description

# Checklist

- [ ] All acceptance criteria are met.
- [ ] Relevant documentation, if any, has been written/updated.
- [ ] The changelog has been updated, if applicable.
- [ ] New functions/types have been exported in `index.ts`, if applicable.
- [ ] New modules (i.e. new `.ts` files) are listed in the `exports` field in `package.json`, if applicable.
- [ ] New modules (i.e. new `.ts` files) are listed in the `typedocOptions.entryPoints` field in `tsconfig.json`, if applicable.
- [ ] Commits in this PR are minimal and [have descriptive commit messages](https://chris.beams.io/posts/git-commit/).

<!-- When cutting a release: -->

This PR bumps the version to <version number>.

# Release steps:

1. Inspecting the `CHANGELOG.md` to determine if the release was major, minor or patch. Make sure you align with the rest of the team first.
2. Use `npm version --no-git-tag-version <major|minor|patch>` to update `package.json`.
3. Update the `CHANGELOG.md` has been updated to show version and release date.
4. Add any `@since X.Y.Z` annotations if there have been any added or deprecated APIs.
5. Commit the changes as `release: prepare vX.Y.Z` on a branch named `release/X.Y.Z`
6. Create a PR, once CI passes, merge as a squash merge.
7. Create and publish the release via GitHub, this will create the tag and trigger the npm publish.
