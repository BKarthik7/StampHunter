import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Modal, KeyboardAvoidingView,
  Platform, ListRenderItem,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { api, setToken } from '../../lib/api';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

export interface Album {
  id:           string;
  name:         string;
  _count:       { stamps: number };
  stamps:       { stamp: { imageUrl: string } }[];
}

/**
 * Hook to manage albums state for mobile.
 */
export function useAlbums() {
  const { getToken }               = useAuth();
  const [albums,  setAlbums]      = useState<Album[]>([]);
  const [loading, setLoading]     = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    setToken(token);
    try {
      const { data } = await api.get('/api/albums');
      setAlbums(data.albums);
    } finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useCallback(async (name: string) => {
    const { data } = await api.post('/api/albums', { name });
    setAlbums(prev => [data.album, ...prev]);
    return data.album as Album;
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    await api.patch(`/api/albums/${id}`, { name });
    setAlbums(prev => prev.map(a => a.id === id ? { ...a, name } : a));
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/api/albums/${id}`);
    setAlbums(prev => prev.filter(a => a.id !== id));
  }, []);

  const addStamp = useCallback(async (albumId: string, stampId: string) => {
    await api.post(`/api/albums/${albumId}/stamps`, { stampId });
    refresh();
  }, [refresh]);

  return { albums, loading, refresh, create, rename, remove, addStamp };
}

// ─── Create / Rename Modal ────────────────────────────────────────
export function AlbumNameModal({
  visible,
  mode,
  initialName = '',
  onConfirm,
  onClose,
}: {
  visible:      boolean;
  mode:         'create' | 'rename';
  initialName?: string;
  onConfirm:    (name: string) => Promise<void>;
  onClose:      () => void;
}) {
  const [name,    setName]    = useState(initialName);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setName(initialName); }, [initialName, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>
            {mode === 'create' ? 'New Album' : 'Rename Album'}
          </Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Album name…"
            placeholderTextColor={Colors.muted}
            value={name}
            onChangeText={setName}
            maxLength={80}
            autoFocus
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.confirmBtn, (!name.trim() || loading) && { opacity: 0.5 }]}
              disabled={!name.trim() || loading}
              onPress={async () => {
                setLoading(true);
                try { await onConfirm(name.trim()); onClose(); }
                finally { setLoading(false); }
              }}
            >
              <Text style={styles.confirmText}>
                {loading ? '…' : mode === 'create' ? 'Create' : 'Rename'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add-to-Album picker Modal ────────────────────────────────────
export function AddToAlbumModal({
  visible,
  albums,
  stampId,
  onAdd,
  onClose,
}: {
  visible:  boolean;
  albums:   Album[];
  stampId:  string;
  onAdd:    (albumId: string) => Promise<void>;
  onClose:  () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const renderItem: ListRenderItem<Album> = ({ item }) => (
    <TouchableOpacity
      style={[styles.albumPickerRow, loading === item.id && { opacity: 0.5 }]}
      disabled={loading !== null}
      onPress={async () => {
        setLoading(item.id);
        try { await onAdd(item.id); onClose(); }
        finally { setLoading(null); }
      }}
    >
      <Text style={styles.albumPickerName}>📁 {item.name}</Text>
      <Text style={styles.albumPickerCount}>{item._count.stamps} stamps</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={[styles.modal, { maxHeight: '70%' }]}>
          <Text style={styles.modalTitle}>Add to Album</Text>
          {albums.length === 0 ? (
            <Text style={{ fontFamily: Typography.sans, fontSize: 14, color: Colors.muted, marginBottom: Spacing.md }}>
              No albums yet. Create one from your collection.
            </Text>
          ) : (
            <FlatList
              data={albums}
              keyExtractor={a => a.id}
              renderItem={renderItem}
              style={{ width: '100%' }}
            />
          )}
          <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn, { width: '100%', marginTop: Spacing.sm }]} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Albums screen (tab or standalone) ───────────────────────────
export default function AlbumsScreen() {
  const { albums, loading, create, rename, remove, refresh } = useAlbums();
  const [showCreate, setShowCreate] = useState(false);
  const [renaming,   setRenaming]   = useState<Album | null>(null);

  function confirmDelete(album: Album) {
    Alert.alert(
      'Delete album',
      `"${album.name}" will be deleted. Stamps won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove(album.id) },
      ]
    );
  }

  const renderItem: ListRenderItem<Album> = ({ item }) => (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => router.push(`/album/${item.id}` as any)}
      activeOpacity={0.85}
    >
      {/* Cover */}
      <View style={styles.albumCover}>
        {item.stamps[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <View style={[styles.albumCover, { backgroundColor: Colors.paperDark }]} />
        ) : (
          <Text style={{ fontSize: 32, opacity: 0.3 }}>📁</Text>
        )}
        <View style={styles.albumBadge}>
          <Text style={styles.albumBadgeText}>{item._count.stamps}</Text>
        </View>
      </View>

      {/* Info row */}
      <View style={styles.albumInfo}>
        <Text style={styles.albumName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.albumActions}>
          <TouchableOpacity onPress={() => setRenaming(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.albumActionText}>✏</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.albumActionText, { color: Colors.error }]}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading && albums.length === 0 ? (
        <ActivityIndicator color={Colors.stampRed} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={albums}
          keyExtractor={a => a.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.grid}
          onRefresh={refresh}
          refreshing={loading}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.heading}>Albums</Text>
              <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.newBtnText}>+ New</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No albums yet. Tap + New to create one.</Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <AlbumNameModal
        visible={showCreate}
        mode="create"
        onConfirm={async (name) => { await create(name); }}
        onClose={() => setShowCreate(false)}
      />
      <AlbumNameModal
        visible={!!renaming}
        mode="rename"
        initialName={renaming?.name ?? ''}
        onConfirm={async (name) => { if (renaming) await rename(renaming.id, name); }}
        onClose={() => setRenaming(null)}
      />
    </View>
  );
}

const CARD_W = 160;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  grid:      { padding: Spacing.md, paddingBottom: Spacing.xl },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  heading:   { fontFamily: Typography.serifSemiBold, fontSize: 22, color: Colors.ink },
  newBtn:    { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.card, paddingHorizontal: 14, paddingVertical: 7 },
  newBtnText:{ fontFamily: Typography.sansSemiBold, fontSize: 13, color: Colors.ink },

  albumCard:   { width: CARD_W, marginRight: Spacing.md, marginBottom: Spacing.md },
  albumCover:  {
    width: CARD_W, height: 190,
    backgroundColor: Colors.paperDark,
    borderWidth: 2, borderColor: Colors.ink, borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  albumBadge: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(26,26,26,0.7)', borderRadius: Radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  albumBadgeText: { fontFamily: Typography.sansSemiBold, fontSize: 11, color: Colors.white },
  albumInfo:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  albumName:      { fontFamily: Typography.sansMedium, fontSize: 13, color: Colors.ink, flex: 1 },
  albumActions:   { flexDirection: 'row', gap: 4 },
  albumActionText:{ fontSize: 14 },
  empty: { fontFamily: Typography.sans, fontSize: 14, color: Colors.muted, textAlign: 'center', padding: Spacing.xl },

  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  modal: {
    backgroundColor: Colors.white,
    borderRadius:    Radius.modal,
    padding:         Spacing.lg,
    width:           '100%',
    maxWidth:        360,
    alignItems:      'flex-start',
  },
  modalTitle: { fontFamily: Typography.serif, fontSize: 20, color: Colors.ink, marginBottom: Spacing.md },
  modalInput: {
    width: '100%',
    backgroundColor: Colors.paper,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.card,
    padding: Spacing.sm + 2,
    fontFamily: Typography.sans, fontSize: 15, color: Colors.ink,
    marginBottom: Spacing.md,
  },
  modalBtns:   { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  modalBtn:    { flex: 1, paddingVertical: 12, borderRadius: Radius.card, alignItems: 'center' },
  cancelBtn:   { borderWidth: 1, borderColor: Colors.border },
  cancelText:  { fontFamily: Typography.sansSemiBold, fontSize: 14, color: Colors.ink },
  confirmBtn:  { backgroundColor: Colors.stampRed },
  confirmText: { fontFamily: Typography.sansSemiBold, fontSize: 14, color: Colors.white },

  albumPickerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, width: '100%' },
  albumPickerName:  { fontFamily: Typography.sansMedium, fontSize: 14, color: Colors.ink },
  albumPickerCount: { fontFamily: Typography.sans, fontSize: 12, color: Colors.muted },
});
