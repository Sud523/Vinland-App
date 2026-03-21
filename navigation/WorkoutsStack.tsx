import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StyleSheet } from 'react-native';

import { OutlinedNavBackButton } from '../components/OutlinedNavBackButton';
import { SettingsHeaderButton } from '../components/SettingsHeaderButton';
import { V } from '../constants/vinlandTheme';
import WorkoutFormScreen from '../screens/WorkoutFormScreen';
import WorkoutsListScreen from '../screens/WorkoutsListScreen';
import type { WorkoutsStackParamList } from './types';

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

const layoutStyles = StyleSheet.create({
  headerLeftIos: {
    paddingLeft: 8,
    paddingRight: 6,
    alignItems: 'center',
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
  headerTitleStyle: { color: V.text, fontWeight: '600' as const, fontSize: 17 },
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
        animation: 'default',
        presentation: 'card',
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
          title: route.params?.editId ? 'Edit workout' : 'New workout',
          headerBackVisible: false,
          headerTitleAlign: 'left',
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
            paddingRight: 8,
            alignItems: 'center',
          },
        })}
      />
    </Stack.Navigator>
  );
}
