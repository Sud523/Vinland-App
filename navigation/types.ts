/**
 * Shared React Navigation param lists for the native stacks declared in App and WorkoutsStack.
 */
export type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
};

export type WorkoutsStackParamList = {
  WorkoutsList: undefined;
  WorkoutForm: { editId?: string };
  WorkoutExportPreview: { workoutId: string };
};
