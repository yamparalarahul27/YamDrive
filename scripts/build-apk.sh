#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -d /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ]]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
  export PATH="$JAVA_HOME/bin:$PATH"
fi
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
case "${1:-universal}" in
  universal) apk_architectures=armeabi-v7a,arm64-v8a; apk_name=yamdrive-test ;;
  arm32) apk_architectures=armeabi-v7a; apk_name=yamdrive-arm32 ;;
  arm64) apk_architectures=arm64-v8a; apk_name=yamdrive-arm64 ;;
  *) printf 'Usage: %s [universal|arm32|arm64]\n' "$0" >&2; exit 1 ;;
esac
npx expo prebuild --platform android --no-install
(cd android && ./gradlew assembleRelease "-PreactNativeArchitectures=$apk_architectures" \
  -Pandroid.enableMinifyInReleaseBuilds=true -Pandroid.enableShrinkResourcesInReleaseBuilds=true --max-workers=2 --console=plain)
mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk "dist/$apk_name.apk"
printf '\nAPK: %s/dist/%s.apk\n' "$PWD" "$apk_name"
