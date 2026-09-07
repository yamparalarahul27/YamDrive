import { useFloatingNavigation } from '@/hooks/use-floating-navigation';
import { Tabs } from 'expo-router';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { showActionHint } from '@/lib/action-hint';

export default function TabsLayout() {
  const theme = useTheme();
  const dock = useFloatingNavigation();

  return (
    <Tabs
      screenListeners={({ route }) => ({ tabLongPress: () => showActionHint(route.name === 'index' ? 'Home' : route.name === 'map' ? 'Map' : route.name === 'plan' ? 'Ride Plan' : 'Trip') })}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIconStyle: { flex: 1 },
        tabBarActiveTintColor: '#F4C430',
        tabBarInactiveTintColor: '#D3D5D1',
        tabBarHideOnKeyboard: true,
        tabBarStyle: dock.style,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Icon name="home" color={typeof color === 'string' ? color : theme.text} size={size} /> }} />
      <Tabs.Screen
        name="map"
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
