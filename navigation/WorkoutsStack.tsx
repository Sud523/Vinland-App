/**
 * Native stack over the workout library list and create/edit form (`WorkoutForm`).
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StyleSheet } from 'react-native';

import { OutlinedNavBackButton } from '../components/OutlinedNavBackButton';
import { SettingsHeaderButton } from '../components/SettingsHeaderButton';
import { V } from '../constants/vinlandTheme';
import {
  headerTitleBarContainerStyle,
  headerTitleBarStyle,
  smoothStackTransition,
} from './headerNav';
import WorkoutFormScreen from '../screens/WorkoutFormScreen';
import WorkoutExportPreviewScreen from '../screens/WorkoutExportPreviewScreen';
import WorkoutsListScreen from '../screens/WorkoutsListScreen';
import type { WorkoutsStackParamList } from './types';

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

const layoutStyles = StyleSheet.create({
  headerLeftIos: {
    paddingLeft: 8,
    paddingRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightIos: {
    paddingRight: 10,
    paddingLeft: 6,
    alignItems: 'center',
  },
});

const headerChrome = {
  headerStyle: {
    backgroundColor: V.bg,
    borderBottomWidth: V.outlineWidth,
    borderBottomColor: V.tabBarBorder,
  },
  headerTitleStyle: headerTitleBarStyle,
  headerTitleContainerStyle: headerTitleBarContainerStyle,
  headerTintColor: V.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: V.bg },
  ...(Platform.OS === 'ios'
    ? {
        headerLeftContainerStyle: layoutStyles.headerLeftIos,
        headerRightContainerStyle: layoutStyles.headerRightIos,
      }
    : {}),
};

export default function WorkoutsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...headerChrome,
        presentation: 'card',
        ...smoothStackTransition,
        ...(Platform.OS === 'ios' ? { fullScreenGestureEnabled: true } : {}),
      }}>
      <Stack.Screen
        name="WorkoutsList"
        component={WorkoutsListScreen}
        options={{
          title: 'Workouts',
          ...Platform.select({
            ios: {
              unstable_headerRightItems: () => [
                {
                  type: 'custom' as const,
                  hidesSharedBackground: true,
                  element: <SettingsHeaderButton />,
                },
              ],
            },
            default: {
              headerRight: () => <SettingsHeaderButton />,
            },
          }),
        }}
      />
      <Stack.Screen
        name="WorkoutForm"
        component={WorkoutFormScreen}
        options={({ navigation, route }) => ({
          title: route.params?.editId ? 'Edit Workout' : 'New Workout',
          headerBackVisible: false,
          headerTitleAlign: 'left',
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
                      label="Workouts"
                    />
                  ),
                },
              ],
            },
            default: {
              headerLeft: () => (
                <OutlinedNavBackButton
                  compact
                  onPress={() => navigation.goBack()}
                  label="Workouts"
                />
              ),
            },
          }),
          headerLeftContainerStyle: {
            paddingLeft: Platform.OS === 'ios' ? 8 : 6,
            paddingRight: 6,
            alignItems: 'center',
            justifyContent: 'center',
          },
        })}
      />
      <Stack.Screen
        name="WorkoutExportPreview"
        component={WorkoutExportPreviewScreen}
        options={({ navigation }) => ({
          title: 'Export',
          headerBackVisible: false,
          headerTitleAlign: 'left',
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
                    <OutlinedNavBackButton compact onPress={() => navigation.goBack()} />
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
        })}
      />
    </Stack.Navigator>
  );
}
