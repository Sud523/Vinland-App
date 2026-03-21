import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FirstLaunchOnboarding } from './components/FirstLaunchOnboarding';
import { OutlinedNavBackButton } from './components/OutlinedNavBackButton';
import { UserPrefsProvider } from './context/UserPrefsContext';
import { V } from './constants/vinlandTheme';
import MainTabs from './navigation/MainTabs';
import type { RootStackParamList } from './navigation/types';
import SettingsScreen from './screens/SettingsScreen';

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
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <UserPrefsProvider>
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'default',
                presentation: 'card',
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
                  animation: 'default',
                  presentation: 'card',
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
                    paddingRight: 8,
                    alignItems: 'center',
                  },
                  headerTitleAlign: 'left',
                  headerStyle: {
                    backgroundColor: V.bg,
                  },
                  headerTintColor: V.text,
                  headerTitleStyle: {
                    color: V.text,
                    fontWeight: '600',
                    fontSize: 17,
                  },
                  contentStyle: { backgroundColor: V.bg },
                  headerShadowVisible: false,
                })}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <FirstLaunchOnboarding />
          <StatusBar style="light" />
        </UserPrefsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: V.bg,
  },
});
