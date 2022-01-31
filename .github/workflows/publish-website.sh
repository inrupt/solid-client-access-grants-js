#!/bin/bash

git config user.name $GITHUB_ACTOR
git config user.email $GITHUB_ACTOR@users.noreply.github.com
git remote add gh-pages-remote https://x-access-token:$GH_TOKEN@github.com/$GITHUB_REPOSITORY.git
git fetch --no-recurse-submodules
cd docs
git worktree add ./gh-pages gh-pages
cd gh-pages
git rm -r .
cp -r ../dist/. .
git add .
git commit --message="Deploying to GitHub Pages from $GITHUB_SHA"
git push gh-pages-remote gh-pages:gh-pages