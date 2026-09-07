import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Optional line under the title, e.g. coordinates or a result count. */
  subtitle?: string;
  children: ReactNode;
  /** Pinned below the scrollable body — action buttons live here. */
  footer?: ReactNode;
};

/**
 * Bottom sheet built on the platform Modal. Deliberately dependency-free: a
 * gesture-driven sheet library would be the upgrade if these ever need to be
 * draggable or have snap points.
 */
export function Sheet({ visible, onClose, title, subtitle, children, footer }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const landscape = width > height;

  return (
    <Modal
      visible={visible}
      supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
      transparent
      animationType="slide"
      statusBarTranslucent
      // Android hardware back button.
      onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.scrim }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={styles.backdrop}
          onPress={onClose}
        />
        <KeyboardAvoidingView style={landscape ? { width: Math.min(480, width - insets.left - insets.right), alignSelf: 'flex-end', marginRight: insets.right } : undefined} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={[
              styles.sheet,
              {
                maxHeight: height - insets.top - 8,
                backgroundColor: theme.background,
                borderColor: theme.border,
                paddingBottom: insets.bottom + Spacing.three,
              },
            ]}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText type="smallBold" style={styles.title}>
                  {title}
                </ThemedText>
                {subtitle ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {subtitle}
                  </ThemedText>
                ) : null}
              </View>
              <IconButton name="close" accessibilityLabel="Close" onPress={onClose} size={20} />
            </View>

            {landscape ? <ScrollView style={{ flexShrink: 1 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">{children}</ScrollView> : children}

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    paddingTop: Spacing.two,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
