import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, ListRenderItem, Dimensions, TextInput,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { StampFrame } from '../../components/stamp/StampFrame';
import { api, setToken } from '../../lib/api';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const COL_W    = Math.floor((SCREEN_W - Spacing.md * 2 - 10) / 2);

interface Stamp {
  id: string; imageUrl: string; caption: string | null;
  locationName: string | null; takenAt: string;
}

export default function AlbumDetailScreen() {
  const { id }       = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();

  const [albumName, setAlbumName] = useState('');
  const [stamps,    setStamps]    = useState<Stamp[]>([]);
  const [cursor,    setCursor]    = useState<string | null>(null);
  const [hasMore,   setHasMore]   = useState(true);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [newName,   setNewName]   = useState('');
  const booted = useRef(false);

  const load = useCallback(async (reset = false) => {
    const token = await getToken();
    setToken(token);
    try {
      const [albumRes, stampsRes] = reset
        ? await Promise.all([
            api.get(`/api/albums/${id}`),
            api.get(`/api/albums/${id}/stamps`, { params: { limit: 20 } }),
          ])
        : [null, await api.get(`/api/albums/${id}/stamps`, { params: { limit: 20, cursor } })];
      if (albumRes) setAlbumName(albumRes.data.album.name);
      const newStamps = stampsRes.data.stamps ?? [];
      setStamps(prev => reset ? newStamps : [...prev, ...newStamps]);
      setCursor(stampsRes.data.nextCursor);
      setHasMore(!!stampsRes.data.nextCursor);
    } finally { setLoading(false); }
  }, [id, cursor, getToken]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    load(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRename() {
    await api.patch(`/api/albums/${id}`, { name: newName });
    setAlbumName(newName);
    setEditing(false);
  }

  async function handleRemoveStamp(stampId: string) {
    await api.delete(`/api/albums/${id}/stamps/${stampId}`);
    setStamps(prev => prev.filter(s => s.id !== stampId));
  }

  const renderItem: ListRenderItem<Stamp> = ({ item, index }) => (
    <View style={[styles.item, index % 2 === 1 && { marginLeft: 10 }]}>
      <TouchableOpacity onPress={() => router.push(`/stamp/${item.id}` as any)} activeOpacity={0.85}>
        <StampFrame
          imageUrl={item.imageUrl}
          caption={item.caption ?? undefined}
          size="thumb"
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveStamp(item.id)}>
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.header}>
      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.editInput}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            maxLength={80}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleRename}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditing(false)} style={{ padding: 6 }}>
            <Text style={{ color: Colors.muted, fontSize: 14 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{albumName}</Text>
          <TouchableOpacity onPress={() => { setNewName(albumName); setEditing(true); }}>
            <Text style={{ fontSize: 16, marginLeft: Spacing.sm }}>✏</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.stampRed} />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: albumName || 'Album', headerBackTitle: 'Albums' }} />
      <FlatList
        data={stamps}
        renderItem={renderItem}
        keyExtractor={s => s.id}
        numColumns={2}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={styles.grid}
        onEndReached={() => { if (hasMore && !loading) load(); }}
        onEndReachedThreshold={0.4}
        onRefresh={() => { booted.current = false; load(true); }}
        refreshing={loading}
        ListEmptyComponent={
          <Text style={styles.empty}>No stamps in this album. Add some from a stamp's detail screen.</Text>
        }
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid:   { padding: Spacing.md, paddingBottom: Spacing.xl },
  header: { marginBottom: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title:  { fontFamily: Typography.serif, fontSize: 24, color: Colors.ink, flex: 1 },
  editRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  editInput:{ flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.card, padding: 8, fontFamily: Typography.sans, fontSize: 15, color: Colors.ink },
  saveBtn:  { backgroundColor: Colors.stampRed, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.card },
  saveBtnText: { fontFamily: Typography.sansSemiBold, fontSize: 13, color: Colors.white },
  item:   { width: COL_W, marginBottom: Spacing.sm, position: 'relative' },
  removeBtn: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(26,26,26,0.6)',
    borderRadius: Radius.pill,
    width: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  empty: { fontFamily: Typography.sans, fontSize: 14, color: Colors.muted, textAlign: 'center', padding: Spacing.xl },
});
