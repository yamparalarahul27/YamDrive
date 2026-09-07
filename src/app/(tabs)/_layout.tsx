import { Tabs } from 'expo-router';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <Icon name="map-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="itinerary"
        options={{
          title: 'Trip',
          tabBarIcon: ({ color, size }) => (
            <Icon name="format-list-numbered" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
