import { AccessibilityInfo, Alert, Platform, ToastAndroid } from 'react-native';

/** Long-press help for compact actions; does not run the action. */
export function showActionHint(label: string) {
  if (Platform.OS === 'android') ToastAndroid.show(label, ToastAndroid.SHORT);
  else Alert.alert(label);
  AccessibilityInfo.announceForAccessibility(label);
}
