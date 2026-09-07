import { Tabs } from 'expo-router';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { showActionHint } from '@/lib/action-hint';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenListeners={({ route }) => ({ tabLongPress: () => showActionHint(route.name === 'index' ? 'Map' : route.name === 'plan' ? 'Ride Plan' : 'Trip') })}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
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
          tabBarIcon: ({ color, size }) => <Icon name="map-outline" color={typeof color === 'string' ? color : theme.text} size={size} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Ride Plan', tabBarIcon: ({ color, size }) => <Icon name="motorbike" color={typeof color === 'string' ? color : theme.text} size={size} /> }}
      />
      <Tabs.Screen
        name="itinerary"
        options={{
          title: 'Trip',
          tabBarIcon: ({ color, size }) => (
            <Icon name="format-list-numbered" color={typeof color === 'string' ? color : theme.text} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
