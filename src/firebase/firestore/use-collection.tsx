
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, Query, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { useFirestore } from '../provider';

interface UseCollectionState<T> {
  data: T[] | null;
  loading: boolean;
}

export function useCollection<T>(path: string): UseCollectionState<T>;
export function useCollection<T>(query: Query | null): UseCollection_Internal<T>;
export function useCollection<T>(pathOrQuery: string | Query | null): UseCollectionState<T> {
  if (typeof pathOrQuery === 'string') {
    return useCollection_Internal(collection(useFirestore(), pathOrQuery));
  } else {
    return useCollection_Internal(pathOrQuery);
  }
}

interface UseCollection_Internal<T> {
  (query: Query<DocumentData> | null): UseCollectionState<T>;
}

function useCollection_Internal<T>(query: Query<DocumentData> | null): UseCollectionState<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(query, (snapshot: QuerySnapshot<DocumentData>) => {
      const result: T[] = [];
      snapshot.forEach((doc) => {
        result.push({ id: doc.id, ...doc.data() } as unknown as T);
      });
      setData(result);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching collection:", error);
      setData(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [query]);

  return { data, loading };
}
