#!/usr/bin/env bash
# bump-version-android.sh
# Usage:
#   ./bump-version-android.sh              — bumps patch (1.0 → 1.1) and increments versionCode
#   ./bump-version-android.sh 2.0          — sets versionName to 2.0 and increments versionCode
#   ./bump-version-android.sh 2.0 42       — sets both explicitly

set -e

GRADLE="android/app/build.gradle"

# Read current values
CURRENT_CODE=$(grep -E '^\s+versionCode ' "$GRADLE" | grep -oE '[0-9]+')
CURRENT_NAME=$(grep -E '^\s+versionName ' "$GRADLE" | grep -oE '"[^"]+"' | tr -d '"')

echo "Current: versionName=$CURRENT_NAME  versionCode=$CURRENT_CODE"

# Determine new versionName
if [ -n "$1" ]; then
    NEW_NAME="$1"
else
    # Auto-bump the last segment (e.g. 1.0 → 1.1, 1.0.3 → 1.0.4)
    BASE="${CURRENT_NAME%.*}"
    PATCH="${CURRENT_NAME##*.}"
    if [ "$BASE" = "$PATCH" ]; then
        # Single number like "1" — just bump it
        NEW_NAME=$((PATCH + 1))
    else
        NEW_NAME="${BASE}.$((PATCH + 1))"
    fi
fi

# Determine new versionCode
if [ -n "$2" ]; then
    NEW_CODE="$2"
else
    NEW_CODE=$((CURRENT_CODE + 1))
fi

echo "New:     versionName=$NEW_NAME  versionCode=$NEW_CODE"

# Apply changes
sed -i "s/versionCode $CURRENT_CODE/versionCode $NEW_CODE/" "$GRADLE"
sed -i "s/versionName \"$CURRENT_NAME\"/versionName \"$NEW_NAME\"/" "$GRADLE"

echo "Done — $GRADLE updated."
