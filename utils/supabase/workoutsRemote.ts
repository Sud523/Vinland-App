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
  const { error: delErr } = await supabase.from('workout_templates').delete().eq('user_id', userId);
  if (delErr) {
    throw delErr;
  }

  for (const w of workouts) {
    const { data: tmpl, error: tErr } = await supabase
      .from('workout_templates')
      .insert({
        user_id: userId,
        legacy_client_id: w.id,
        title: w.title,
        description: w.description ?? null,
      })
      .select('id')
      .single();

    if (tErr || tmpl == null) {
      throw tErr ?? new Error('Insert workout_templates failed');
    }

    const templateId = tmpl.id as string;

    const blocks: { exercises: ExerciseDefinition[]; type: SectionType }[] = [
      { type: 'warm_up', exercises: w.warmUp },
      { type: 'workout', exercises: w.workout },
      { type: 'cool_down', exercises: w.coolDown },
    ];

    for (let si = 0; si < blocks.length; si++) {
      const block = blocks[si];
      const { data: secRow, error: sErr } = await supabase
        .from('workout_template_sections')
        .insert({
          template_id: templateId,
          section_type: block.type,
          sort_order: SECTION_ORDER.indexOf(block.type),
        })
        .select('id')
        .single();

      if (sErr || secRow == null) {
        throw sErr ?? new Error('Insert section failed');
      }

      const sectionId = secRow.id as string;
      const exRows = block.exercises.map((def, ei) => ({
        section_id: sectionId,
        sort_order: ei,
        definition: def,
      }));

      if (exRows.length > 0) {
        const { error: eErr } = await supabase.from('workout_template_exercises').insert(exRows);
        if (eErr) {
          throw eErr;
        }
      }
    }
  }
}
