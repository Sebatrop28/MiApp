import { useEffect, useState } from 'react';

import { subscribeToFollowing } from '@/services/profiles';

/** uids que sigue esta cuenta; `null` mientras carga. */
export function useFollowing(uid: string | undefined): { following: string[] | null; error: string | null } {
  const [state, setState] = useState<{ uid: string; following: string[] | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeToFollowing(
      uid,
      (following) => setState({ uid, following, error: null }),
      (error) => setState({ uid, following: [], error }),
    );
  }, [uid]);

  return state && state.uid === uid ? state : { following: null, error: null };
}
