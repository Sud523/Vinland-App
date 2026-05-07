import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

import { exerciseSummaryLines, savedWorkoutLabel } from './workouts';
import type { ExerciseDefinition, SavedWorkout } from '../types';

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugifyFileName(input: string): string {
  const cleaned = input
    .trim()
    .replaceAll(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replaceAll(/\s+/g, ' ');
  if (!cleaned) {
    return 'workout';
  }
  return cleaned.length > 64 ? cleaned.slice(0, 64).trim() : cleaned;
}

function exerciseHtml(ex: ExerciseDefinition): string {
  const lines = exerciseSummaryLines(ex);
  const isOptional = ex.optional === true;
  const kind = ex.kind ?? 'weighted';

  const metaBadges: string[] = [];
  if (kind === 'cardio') metaBadges.push('Cardio');
  if (kind === 'circuit') metaBadges.push('Circuit');
  if (isOptional) metaBadges.push('Optional');

  return [
    `<div class="ex">`,
    `<div class="exHead">`,
    `<div class="exTitle">${escapeHtml(ex.name)}</div>`,
    metaBadges.length > 0
      ? `<div class="badges">${metaBadges
          .map((b) => `<span class="badge">${escapeHtml(b)}</span>`)
          .join('')}</div>`
      : `<div></div>`,
    `</div>`,
    `<ul class="lines">`,
    ...lines.map((l) => `<li>${escapeHtml(l)}</li>`),
    ...(ex.notes && ex.notes.trim().length > 0
      ? [`<li class="notes">Notes: ${escapeHtml(ex.notes.trim())}</li>`]
      : []),
    `</ul>`,
    `</div>`,
  ].join('');
}

function sectionHtml(label: string, exercises: ExerciseDefinition[]): string {
  if (!exercises || exercises.length === 0) {
    return '';
  }
  return [
    `<section class="section">`,
    `<div class="sectionTitle">${escapeHtml(label)}</div>`,
    `<div class="exList">`,
    ...exercises.map(exerciseHtml),
    `</div>`,
    `</section>`,
  ].join('');
}

function workoutToHtml(w: SavedWorkout): string {
  const title = savedWorkoutLabel(w);
  const desc = w.description?.trim();
  const hasDesc = !!desc;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        --ink: #0b0b0c;
        --muted: rgba(11, 11, 12, 0.68);
        --hair: rgba(11, 11, 12, 0.18);
        --paper: #ffffff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 28px 28px 36px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        background: var(--paper);
        color: var(--ink);
      }
      .header {
        border: 2px solid var(--ink);
        padding: 18px 18px 14px;
      }
      .title {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.2px;
        margin: 0;
      }
      .subtitle {
        margin-top: 8px;
        font-size: 13px;
        color: var(--muted);
        line-height: 18px;
        white-space: pre-wrap;
      }
      .section {
        margin-top: 18px;
      }
      .sectionTitle {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.9px;
        text-transform: uppercase;
        margin-bottom: 10px;
      }
      .exList { display: flex; flex-direction: column; gap: 10px; }
      .ex {
        border: 1px solid var(--ink);
        padding: 12px 12px 10px;
      }
      .exHead {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .exTitle {
        font-size: 16px;
        font-weight: 800;
        margin-bottom: 6px;
      }
      .badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
      .badge {
        font-size: 11px;
        padding: 2px 7px;
        border: 1px solid var(--hair);
        color: var(--muted);
        border-radius: 999px;
        line-height: 16px;
      }
      ul.lines {
        margin: 0;
        padding-left: 18px;
      }
      ul.lines li {
        font-size: 13px;
        line-height: 18px;
        margin: 2px 0;
        color: var(--ink);
      }
      ul.lines li.notes {
        color: var(--muted);
      }
      .footer {
        margin-top: 18px;
        padding-top: 12px;
        border-top: 1px solid var(--hair);
        color: var(--muted);
        font-size: 11px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1 class="title">${escapeHtml(title)}</h1>
      ${hasDesc ? `<div class="subtitle">${escapeHtml(desc!)}</div>` : ``}
    </div>
    ${sectionHtml('Warm up', w.warmUp)}
    ${sectionHtml('Workout', w.workout)}
    ${sectionHtml('Cool down', w.coolDown)}
    <div class="footer">Exported from Vinland</div>
  </body>
</html>`;
}

export async function downloadWorkoutPdf(w: SavedWorkout): Promise<void> {
  const html = workoutToHtml(w);
  if (Platform.OS === 'web') {
    // Web can still export via the browser print dialog ("Save as PDF").
    try {
      await Print.printAsync({ html });
    } catch {
      // Alert is unreliable on web; still attempt to surface something in dev.
      Alert.alert('Couldn’t export PDF', 'Your browser blocked the print dialog.');
    }
    return;
  }

  try {
    const fileName = `${slugifyFileName(savedWorkoutLabel(w))}.pdf`;
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Saved', `PDF created at:\n${uri}`);
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Save workout PDF',
      ...({ filename: fileName } as unknown as Record<string, string>),
    });
  } catch {
    Alert.alert(
      'Couldn’t export PDF',
      'Try again in a moment. If it keeps failing, restart the app.',
    );
  }
}

