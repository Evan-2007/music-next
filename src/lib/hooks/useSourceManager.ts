import { useMemo } from 'react';
import { SourceManager } from '@/lib/sources/source-manager';

/**
 * Returns the SourceManager singleton instance.
 * Memoized to ensure consistent reference across renders.
 */
export function useSourceManager() {
  return useMemo(() => SourceManager.getInstance(), []);
}
