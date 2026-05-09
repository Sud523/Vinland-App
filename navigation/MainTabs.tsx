/**
 * Bottom tab navigator for the five primary surfaces (Home, Workouts stack, Week, Timer, Stats).
 * Workouts hides the tab header because the nested stack supplies its own.
 */
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';

import { SettingsHeaderButton } from '../components/SettingsHeaderButton';
import { V } from '../constants/vinlandTheme';
import HomeScreen from '../screens/HomeScreen';
import WorkoutsStack from './WorkoutsStack';
import StatsScreen from '../screens/StatsScreen';
import TimerScreen from '../screens/TimerScreen';
import WeeklyScreen from '../screens/WeeklyScreen';

export type MainTabParamList = {
  Home: undefined;
  Workouts: undefined;
  Week: undefined;
  Timer: undefined;
  Stats: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: V.bg,
          borderBottomWidth: V.outlineWidth,
          borderBottomColor: V.tabBarBorder,
        },
        headerTitleStyle: { color: V.text, fontWeight: '700', fontFamily: V.fontPixel, fontSize: 12 },
        headerTintColor: V.text,
        headerShadowVisible: false,
        headerRight: () => <SettingsHeaderButton />,
        tabBarActiveTintColor: V.runeGlow,
        tabBarInactiveTintColor: V.textDim,
        tabBarLabelStyle: {
          fontSize: 8,
          lineHeight: 12,
          fontFamily: V.fontPixel,
          marginBottom: Platform.OS === 'ios' ? 2 : 6,
        },
        tabBarStyle: {
          backgroundColor: V.tabBarBg,
          borderTopColor: V.tabBarBorder,
          borderTopWidth: V.outlineWidth,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 12 : 10,
          height: Platform.OS === 'ios' ? 104 : 78,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsStack}
        options={{
          headerShown: false,
          title: 'Workouts',
          tabBarLabel: 'Workouts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Week"
        component={WeeklyScreen}
        options={{
          title: 'Week',
          tabBarLabel: 'Week',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Timer"
        component={TimerScreen}
        options={{
          title: 'Timer',
          tabBarLabel: 'Timer',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="timer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Stats',
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
