'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { clientApi, setClientToken } from '@/lib/client-api';

export interface Album {
  id:          string;
  name:        string;
  coverStampId: string | null;
  _count:      { stamps: number };
  stamps:      { stamp: { imageUrl: string; framedUrl?: string } }[];
}

export function useAlbums() {
  const { getToken }              = useAuth();
  const [albums,   setAlbums]   = useState<Album[]>([]);
  const [loading,  setLoading]  = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    setClientToken(token);
    try {
      const { data } = await clientApi.get('/api/albums');
      setAlbums(data.albums);
    } catch (err) {
      console.error('Failed to fetch albums:', err);
    } finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (name: string) => {
    const { data } = await clientApi.post('/api/albums', { name });
    setAlbums(prev => [data.album, ...prev]);
    return data.album as Album;
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    const { data } = await clientApi.patch(`/api/albums/${id}`, { name });
    setAlbums(prev => prev.map(a => a.id === id ? { ...a, name: data.album.name } : a));
  }, []);

  const remove = useCallback(async (id: string) => {
    await clientApi.delete(`/api/albums/${id}`);
    setAlbums(prev => prev.filter(a => a.id !== id));
  }, []);

  const addStamp = useCallback(async (albumId: string, stampId: string) => {
    await clientApi.post(`/api/albums/${albumId}/stamps`, { stampId });
    await refresh();
  }, [refresh]);

  const removeStamp = useCallback(async (albumId: string, stampId: string) => {
    await clientApi.delete(`/api/albums/${albumId}/stamps/${stampId}`);
    await refresh();
  }, [refresh]);

  return { albums, loading, refresh, create, rename, remove, addStamp, removeStamp };
}
