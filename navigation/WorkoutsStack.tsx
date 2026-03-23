import { createStackNavigator } from '@react-navigation/stack';
import { Platform, StyleSheet } from 'react-native';

import { OutlinedNavBackButton } from '../components/OutlinedNavBackButton';
import { SettingsHeaderButton } from '../components/SettingsHeaderButton';
import { V } from '../constants/vinlandTheme';
import {
  headerTitleBarContainerStyle,
  headerTitleBarStyle,
  rootStackCardTransition,
} from './headerNav';
import WorkoutFormScreen from '../screens/WorkoutFormScreen';
import WorkoutsListScreen from '../screens/WorkoutsListScreen';
import type { WorkoutsStackParamList } from './types';

const Stack = createStackNavigator<WorkoutsStackParamList>();

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
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitleStyle: headerTitleBarStyle,
  headerTitleContainerStyle: headerTitleBarContainerStyle,
  headerTintColor: V.text,
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
        ...rootStackCardTransition,
        ...headerChrome,
      }}>
      <Stack.Screen
        name="WorkoutsList"
        component={WorkoutsListScreen}
        options={{
          title: 'Workouts',
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Stack.Screen
        name="WorkoutForm"
        component={WorkoutFormScreen}
        options={({ navigation, route }) => ({
          title: route.params?.editId ? 'Edit workout' : 'New workout',
          headerBackVisible: false,
          headerTitleAlign: 'left',
          ...rootStackCardTransition,
          headerLeft: () => (
            <OutlinedNavBackButton
              compact
              onPress={() => navigation.goBack()}
              label="Workouts"
            />
          ),
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
