import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.sage[600],
        tabBarInactiveTintColor: colors.paper[400],
        tabBarStyle: {
          backgroundColor: colors.paper.white,
          borderTopWidth: 1,
          borderTopColor: colors.paper[100],
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.label,
          fontWeight: fontWeight.semibold,
          letterSpacing: 0.3,
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size + 1}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: '학습',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'library' : 'library-outline'}
              size={size + 1}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="test"
        options={{
          title: '테스트',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'bulb' : 'bulb-outline'}
              size={size + 1}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size + 1}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
