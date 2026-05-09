/**
 * Root application shell: auth gate, migration gate, gesture handler, navigation,
 * Settings stack, first-launch onboarding overlay, StatusBar.
 */
import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { FirstLaunchOnboarding } from './components/FirstLaunchOnboarding';
import { LocalDataMigrationGate } from './components/LocalDataMigrationGate';
import { OutlinedNavBackButton } from './components/OutlinedNavBackButton';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import { DitherOverlay } from './components/ui/DitherOverlay';
import { V } from './constants/vinlandTheme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserPrefsProvider } from './context/UserPrefsContext';
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
    primary: V.runeGlow,
    background: V.bg,
    card: V.bg,
    text: V.text,
    border: V.borderMuted,
    notification: V.text,
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingRoot}>
          <ActivityIndicator size="large" color={V.runeGlow} />
        </View>
      </SafeAreaProvider>
    );
  }

  // Global pixel font: applies to all Text/TextInput unless overridden.
  // (React Navigation headers need explicit styles; we set those separately.)
  Text.defaultProps = Text.defaultProps ?? {};
  Text.defaultProps.style = [
    { fontFamily: V.fontPixel, fontWeight: '400' },
    // Preserve any existing defaults if present.
    Text.defaultProps.style,
  ];
  TextInput.defaultProps = TextInput.defaultProps ?? {};
  TextInput.defaultProps.style = [
    { fontFamily: V.fontPixel, fontWeight: '400' },
    TextInput.defaultProps.style,
  ];

  // Some screens set `fontWeight` heavily; on certain platforms this can cause custom-font
  // fallback. Patch Text rendering once to force our pixel font + normal weight.
  const textAny = Text as unknown as { __vinlandPatched?: boolean; render?: (...args: any[]) => any };
  if (!textAny.__vinlandPatched && typeof Text.render === 'function') {
    const oldRender = Text.render;
    Text.render = function render(...args: any[]) {
      const origin = oldRender.apply(this, args);
      return React.cloneElement(origin, {
        style: [{ fontFamily: V.fontPixel, fontWeight: '400' }, origin.props.style],
      });
    };
    textAny.__vinlandPatched = true;
  }

  return (
    <SafeAreaProvider>
      <RootErrorBoundary>
        <AppBootstrap />
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}

function AppBootstrap() {
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
        <ActivityIndicator size="large" color={V.runeGlow} />
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
          <DitherOverlay opacity={0.12} />
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
