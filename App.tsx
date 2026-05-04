/**
 * Root application shell: auth gate, migration gate, gesture handler, navigation,
 * Settings stack, first-launch onboarding overlay, StatusBar.
 */
import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './context/AuthContext';
import { FirstLaunchOnboarding } from './components/FirstLaunchOnboarding';
import { LocalDataMigrationGate } from './components/LocalDataMigrationGate';
import { OutlinedNavBackButton } from './components/OutlinedNavBackButton';
import { UserPrefsProvider } from './context/UserPrefsContext';
import { V } from './constants/vinlandTheme';
import {
  headerTitleBarContainerStyle,
  headerTitleBarStyle,
  smoothStackTransition,
} from './navigation/headerNav';
import MainTabs from './navigation/MainTabs';
import type { RootStackParamList } from './navigation/types';
import AuthScreen from './screens/AuthScreen';
import SettingsScreen from './screens/SettingsScreen';
import SupabaseConfigErrorScreen from './screens/SupabaseConfigErrorScreen';
import { isSupabaseConfigured } from './utils/supabase';

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: V.accent,
    background: V.bg,
    card: V.bg,
    text: V.text,
    border: V.borderMuted,
    notification: V.text,
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  if (!isSupabaseConfigured) {
    return <SupabaseConfigErrorScreen />;
  }

  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={V.accent} />
      </View>
    );
  }

  if (session == null) {
    return <AuthScreen />;
  }

  return (
    <UserPrefsProvider>
      <LocalDataMigrationGate>
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <NavigationContainer theme={navTheme}>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  presentation: 'card',
                  ...smoothStackTransition,
                  ...(Platform.OS === 'ios' ? { fullScreenGestureEnabled: true } : {}),
                }}>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={({ navigation }) => ({
                    headerShown: true,
                    title: 'Settings',
                    headerBackVisible: false,
                    presentation: 'card',
                    ...smoothStackTransition,
                    ...Platform.select({
                      ios: {
                        fullScreenGestureEnabled: true,
                        unstable_headerLeftItems: () => [
                          {
                            type: 'custom' as const,
                            hidesSharedBackground: true,
                            element: (
                              <OutlinedNavBackButton
                                compact
                                onPress={() => navigation.goBack()}
                              />
                            ),
                          },
                        ],
                      },
                      default: {
                        headerLeft: () => (
                          <OutlinedNavBackButton compact onPress={() => navigation.goBack()} />
                        ),
                      },
                    }),
                    headerLeftContainerStyle: {
                      paddingLeft: Platform.OS === 'ios' ? 8 : 6,
                      paddingRight: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    headerTitleAlign: 'left',
                    headerTitleContainerStyle: headerTitleBarContainerStyle,
                    headerStyle: {
                      backgroundColor: V.bg,
                    },
                    headerTintColor: V.text,
                    headerTitleStyle: headerTitleBarStyle,
                    contentStyle: { backgroundColor: V.bg },
                    headerShadowVisible: false,
                  })}
                />
              </Stack.Navigator>
            </NavigationContainer>
            <FirstLaunchOnboarding />
            <StatusBar style="light" />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </LocalDataMigrationGate>
    </UserPrefsProvider>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: V.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
    backgroundColor: V.bg,
  },
});
