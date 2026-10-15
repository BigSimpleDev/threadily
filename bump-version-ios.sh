#!/usr/bin/env bash
# bump-version-ios.sh
# Usage:
#   ./bump-version-ios.sh              — bumps patch (1.0 → 1.1) and increments build number
#   ./bump-version-ios.sh 2.0          — sets MARKETING_VERSION to 2.0 and increments build number
#   ./bump-version-ios.sh 2.0 42       — sets both explicitly

set -e

PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"

# Read current values (there are two entries in the pbxproj — both get updated)
CURRENT_BUILD=$(grep -E 'CURRENT_PROJECT_VERSION = ' "$PBXPROJ" | head -1 | grep -oE '[0-9]+')
CURRENT_VERSION=$(grep -E 'MARKETING_VERSION = ' "$PBXPROJ" | head -1 | grep -oE '[0-9]+\.[0-9.]+')

echo "Current: MARKETING_VERSION=$CURRENT_VERSION  CURRENT_PROJECT_VERSION=$CURRENT_BUILD"

# Determine new MARKETING_VERSION
if [ -n "$1" ]; then
    NEW_VERSION="$1"
else
    BASE="${CURRENT_VERSION%.*}"
    PATCH="${CURRENT_VERSION##*.}"
    if [ "$BASE" = "$PATCH" ]; then
        NEW_VERSION=$((PATCH + 1))
    else
        NEW_VERSION="${BASE}.$((PATCH + 1))"
    fi
fi

# Determine new CURRENT_PROJECT_VERSION
if [ -n "$2" ]; then
    NEW_BUILD="$2"
else
    NEW_BUILD=$((CURRENT_BUILD + 1))
fi

echo "New:     MARKETING_VERSION=$NEW_VERSION  CURRENT_PROJECT_VERSION=$NEW_BUILD"

# Apply changes (sed -i '' for macOS compatibility)
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT_BUILD;/CURRENT_PROJECT_VERSION = $NEW_BUILD;/g" "$PBXPROJ"
sed -i '' "s/MARKETING_VERSION = $CURRENT_VERSION;/MARKETING_VERSION = $NEW_VERSION;/g" "$PBXPROJ"

echo "Done — $PBXPROJ updated."
