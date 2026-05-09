/**
 * Maps workout_templates (+ sections + exercises) ↔ SavedWorkout[].
 */
import type { ExerciseDefinition, SavedWorkout } from '../../types';
import { supabase } from '../supabase';

type SectionType = 'warm_up' | 'workout' | 'cool_down';

type ExerciseRow = {
  sort_order: number;
  definition: ExerciseDefinition;
};

type SectionRow = {
  section_type: SectionType;
  sort_order: number;
  workout_template_exercises: ExerciseRow[] | null;
};

type TemplateRow = {
  id: string;
  legacy_client_id: string | null;
  title: string;
  description: string | null;
  workout_template_sections: SectionRow[] | null;
};

const SECTION_ORDER: SectionType[] = ['warm_up', 'workout', 'cool_down'];

function collectDefinitions(sec: SectionRow | undefined): ExerciseDefinition[] {
  if (sec == null) {
    return [];
  }
  const rows = sec.workout_template_exercises ?? [];
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => r.definition);
}

function templateToSavedWorkout(row: TemplateRow): SavedWorkout {
  const sections = row.workout_template_sections ?? [];
  const byType = new Map<SectionType, SectionRow>();
  for (const s of sections) {
    byType.set(s.section_type, s);
  }
  const warmUp = collectDefinitions(byType.get('warm_up'));
  const workout = collectDefinitions(byType.get('workout'));
  const coolDown = collectDefinitions(byType.get('cool_down'));

  const id = row.legacy_client_id ?? row.id;
  const sw: SavedWorkout = {
    id,
    title: row.title,
    warmUp,
    workout,
    coolDown,
  };
  if (row.description) {
    sw.description = row.description;
  }
  return sw;
}

export async function fetchSavedWorkouts(userId: string): Promise<SavedWorkout[]> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select(
      `
      id,
      legacy_client_id,
      title,
      description,
      workout_template_sections (
        section_type,
        sort_order,
        workout_template_exercises (
          sort_order,
          definition
        )
      )
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }
  const rows = (data ?? []) as TemplateRow[];
  return rows.map(templateToSavedWorkout);
}

export async function replaceSavedWorkouts(userId: string, workouts: SavedWorkout[]): Promise<void> {
  // Prefer the RPC: one server-side transaction, no partial writes.
  // Note: userId is intentionally ignored; the RPC uses auth.uid().
  const { error } = await supabase.rpc('replace_saved_workouts', {
    workouts: workouts as unknown,
  });
  if (error) {
    throw error;
  }
}
