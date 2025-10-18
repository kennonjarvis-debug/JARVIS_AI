#!/bin/bash
set -euo pipefail

# Semantic Version Bump Script
# Usage: ./version-bump.sh <major|minor|patch> [message]
# Example: ./version-bump.sh minor "Add new features"

VERSION_TYPE="${1:-patch}"
MESSAGE="${2:-Version bump}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get current version from package.json
get_current_version() {
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        jq -r '.version' "$PROJECT_ROOT/package.json"
    else
        echo "0.0.0"
    fi
}

# Bump version number
bump_version() {
    local CURRENT_VERSION="$1"
    local BUMP_TYPE="$2"

    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

    case "$BUMP_TYPE" in
        major)
            MAJOR=$((MAJOR + 1))
            MINOR=0
            PATCH=0
            ;;
        minor)
            MINOR=$((MINOR + 1))
            PATCH=0
            ;;
        patch)
            PATCH=$((PATCH + 1))
            ;;
        *)
            log_error "Invalid version type: $BUMP_TYPE"
            exit 1
            ;;
    esac

    echo "${MAJOR}.${MINOR}.${PATCH}"
}

# Update package.json version
update_package_json() {
    local NEW_VERSION="$1"

    if [ -f "$PROJECT_ROOT/package.json" ]; then
        TEMP_FILE=$(mktemp)
        jq ".version = \"$NEW_VERSION\"" "$PROJECT_ROOT/package.json" > "$TEMP_FILE"
        mv "$TEMP_FILE" "$PROJECT_ROOT/package.json"
        log_success "Updated package.json to $NEW_VERSION"
    fi
}

# Generate changelog entry
generate_changelog_entry() {
    local VERSION="$1"
    local DATE=$(date +"%Y-%m-%d")

    cat <<EOF

## [$VERSION] - $DATE

### Added
- $MESSAGE

### Changed
- Version bump to $VERSION

### Fixed
- Bug fixes and improvements

EOF
}

# Update CHANGELOG.md
update_changelog() {
    local VERSION="$1"
    local CHANGELOG="$PROJECT_ROOT/CHANGELOG.md"

    if [ ! -f "$CHANGELOG" ]; then
        cat > "$CHANGELOG" <<EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF
    fi

    # Generate new entry
    NEW_ENTRY=$(generate_changelog_entry "$VERSION")

    # Insert after header
    TEMP_FILE=$(mktemp)
    awk -v entry="$NEW_ENTRY" '
        NR==1,/^$/ {print; if (/^$/) {print entry; done=1} next}
        {print}
    ' "$CHANGELOG" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$CHANGELOG"

    log_success "Updated CHANGELOG.md"
}

# Get git commit messages since last tag
get_commits_since_last_tag() {
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

    if [ -z "$LAST_TAG" ]; then
        # No tags yet, get all commits
        git log --pretty=format:"- %s (%h)" --no-merges
    else
        # Get commits since last tag
        git log "${LAST_TAG}..HEAD" --pretty=format:"- %s (%h)" --no-merges
    fi
}

# Generate detailed changelog
generate_detailed_changelog() {
    local VERSION="$1"
    local DATE=$(date +"%Y-%m-%d")
    local COMMITS=$(get_commits_since_last_tag)

    cat <<EOF

## [$VERSION] - $DATE

### Changes
$COMMITS

EOF
}

# Create git tag
create_git_tag() {
    local VERSION="$1"
    local TAG="v${VERSION}"

    # Check if tag already exists
    if git rev-parse "$TAG" >/dev/null 2>&1; then
        log_error "Tag $TAG already exists"
        exit 1
    fi

    # Generate detailed changelog for tag
    DETAILED_CHANGES=$(generate_detailed_changelog "$VERSION")

    # Create annotated tag
    git tag -a "$TAG" -m "Release $VERSION

$DETAILED_CHANGES"

    log_success "Created git tag: $TAG"
}

# Generate release notes
generate_release_notes() {
    local VERSION="$1"
    local RELEASE_NOTES="$PROJECT_ROOT/RELEASE_NOTES_${VERSION}.md"

    cat > "$RELEASE_NOTES" <<EOF
# Release Notes - Version $VERSION

**Release Date:** $(date +"%Y-%m-%d")

## Overview
$MESSAGE

## What's Changed
$(get_commits_since_last_tag)

## Installation

\`\`\`bash
npm install jarvis@$VERSION
\`\`\`

## Docker

\`\`\`bash
docker pull ghcr.io/jarvis-ai/jarvis:v$VERSION
\`\`\`

## Upgrade Instructions

### From Previous Version

1. Backup your database
2. Update dependencies: \`npm install\`
3. Run migrations: \`npm run migrate\`
4. Restart services

### Breaking Changes
- None in this release

### Deprecations
- None in this release

## Contributors
$(git log --format='%aN' $(git describe --tags --abbrev=0)..HEAD | sort -u)

## Full Changelog
https://github.com/jarvis-ai/jarvis/compare/v$(get_current_version)...v$VERSION
EOF

    log_success "Generated release notes: $RELEASE_NOTES"
}

# Commit changes
commit_changes() {
    local VERSION="$1"

    git add package.json CHANGELOG.md

    git commit -m "chore(release): version $VERSION

$MESSAGE

🤖 Generated with version-bump script"

    log_success "Committed version changes"
}

# Push changes and tags
push_changes() {
    local VERSION="$1"

    log_info "Pushing changes to remote..."

    # Push commits
    git push origin $(git branch --show-current)

    # Push tags
    git push origin "v${VERSION}"

    log_success "Pushed changes and tags to remote"
}

# Verify git state
verify_git_state() {
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        log_error "Uncommitted changes detected. Please commit or stash them first."
        exit 1
    fi

    # Check if we're on a protected branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
        log_error "Cannot bump version on $CURRENT_BRANCH branch directly"
        log_error "Please create a release branch first"
        exit 1
    fi

    log_success "Git state verified"
}

# Main function
main() {
    log_info "========================================="
    log_info "Version Bump Script"
    log_info "Bump Type: $VERSION_TYPE"
    log_info "========================================="

    # Verify git state
    verify_git_state

    # Get current version
    CURRENT_VERSION=$(get_current_version)
    log_info "Current version: $CURRENT_VERSION"

    # Calculate new version
    NEW_VERSION=$(bump_version "$CURRENT_VERSION" "$VERSION_TYPE")
    log_info "New version: $NEW_VERSION"

    # Confirm version bump
    read -p "Bump version from $CURRENT_VERSION to $NEW_VERSION? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Aborted"
        exit 0
    fi

    # Update package.json
    update_package_json "$NEW_VERSION"

    # Update changelog
    update_changelog "$NEW_VERSION"

    # Generate release notes
    generate_release_notes "$NEW_VERSION"

    # Commit changes
    commit_changes "$NEW_VERSION"

    # Create git tag
    create_git_tag "$NEW_VERSION"

    log_success "========================================="
    log_success "Version bumped to $NEW_VERSION"
    log_success "========================================="

    # Ask about pushing
    read -p "Push changes to remote? (yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        push_changes "$NEW_VERSION"
    else
        log_info "Changes committed locally. Push manually when ready:"
        log_info "  git push origin $(git branch --show-current)"
        log_info "  git push origin v${NEW_VERSION}"
    fi
}

# Run main function
main
