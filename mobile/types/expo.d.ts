/**
 * Pulls in Expo's ambient declarations (CSS side-effect imports, the Metro
 * require shims, react-native-web types).
 *
 * Expo generates an equivalent `expo-env.d.ts` on `expo start`, but that file
 * is git-ignored — this committed copy keeps `tsc --noEmit` green on a fresh
 * clone before the dev server has ever run.
 */

/// <reference types="expo/types" />
