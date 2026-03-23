import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FirstLaunchOnboarding } from './components/FirstLaunchOnboarding';
import { OutlinedNavBackButton } from './components/OutlinedNavBackButton';
import { UserPrefsProvider } from './context/UserPrefsContext';
import { V } from './constants/vinlandTheme';
import {
  headerTitleBarContainerStyle,
  headerTitleBarStyle,
  rootStackCardTransition,
} from './navigation/headerNav';
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

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <UserPrefsProvider>
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                ...rootStackCardTransition,
              }}>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  title: 'Settings',
                  headerBackVisible: false,
                  ...rootStackCardTransition,
                  headerLeft: () => (
                    <OutlinedNavBackButton compact onPress={() => navigation.goBack()} />
                  ),
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
                    borderBottomWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                  },
                  headerTintColor: V.text,
                  headerTitleStyle: headerTitleBarStyle,
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
