/**
 * Foto de identificación del sujeto (#44) vía API autenticada (blob URL).
 */

import { useEffect, useState } from 'react';
import { apiFetchBlobUrl } from '@/api/client';

export function useSubjectPhotoUrl(
  subjectId: string | null | undefined,
  hasPhoto: boolean,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      if (!subjectId || !hasPhoto) {
        setUrl(null);
        return;
      }
      const next = await apiFetchBlobUrl(`/api/subjects/${encodeURIComponent(subjectId)}/photo`);
      if (cancelled) {
        if (next) URL.revokeObjectURL(next);
        return;
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = next;
      setUrl(next);
    };

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [subjectId, hasPhoto]);

  return url;
}
