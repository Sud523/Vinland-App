import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Pre-hydration value must match `userInterfaceStyle` in app.json and what `expo export` embeds
 * in static HTML. Using `light` here causes a visible flash (light default shell → dark app)
 * for dark-first apps after hydration.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme ?? 'dark';
  }

  return 'dark';
}
