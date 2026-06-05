import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ListRenderItem,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { StampFrame } from '../../components/stamp/StampFrame';
import { api, setToken } from '../../lib/api';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
// Masonry: 2-col on mobile
const COL_W = Math.floor((SCREEN_W - Spacing.md * 2 - 10) / 2);

interface Stamp {
  id:           string;
  imageUrl:     string;
  caption:      string | null;
  locationName: string | null;
  takenAt:      string;
  tags:         { tag: string }[];
  user:         { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  _count:       { likes: number; comments: number };
}

export default function ExploreScreen() {
  const { getToken }   = useAuth();
  const [stamps,       setStamps]      = useState<Stamp[]>([]);
  const [cursor,       setCursor]      = useState<string | null>(null);
  const [hasMore,      setHasMore]     = useState(true);
  const [loading,      setLoading]     = useState(false);
  const [tagFilter,    setTagFilter]   = useState('');
  const [followed,     setFollowed]    = useState<Record<string, boolean>>({});
  const booted = useRef(false);

  const load = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    const token = await getToken();
    setToken(token);
    try {
      const { data } = await api.get('/api/feed/explore', {
        params: {
          limit: 20,
          ...(reset ? {} : cursor ? { cursor } : {}),
          ...(tagFilter ? { tag: tagFilter } : {}),
        },
      });
      setStamps(prev => reset ? data.stamps : [...prev, ...data.stamps]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } finally { setLoading(false); }
  }, [cursor, tagFilter, loading, getToken]);

  useEffect(() => {
    booted.current = false;
    load(true);
  }, [tagFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    load(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFollow(username: string) {
    const next = !followed[username];
    setFollowed(prev => ({ ...prev, [username]: next }));
    try {
      if (next) await api.post(`/api/users/${username}/follow`);
      else      await api.delete(`/api/users/${username}/follow`);
    } catch { setFollowed(prev => ({ ...prev, [username]: !next })); }
  }

  const renderItem: ListRenderItem<Stamp> = ({ item, index }) => (
    <View style={[styles.item, index % 2 === 1 && { marginLeft: 10 }]}>
      <TouchableOpacity
        onPress={() => router.push(`/stamp/${item.id}` as any)}
        activeOpacity={0.85}
      >
        <StampFrame
          imageUrl={item.imageUrl}
          caption={item.caption ?? undefined}
          locationName={item.locationName ?? undefined}
          date={new Date(item.takenAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' })}
          size="thumb"
        />
      </TouchableOpacity>

      {/* Author + Follow */}
      <View style={styles.stampMeta}>
        <TouchableOpacity onPress={() => router.push(`/profile/${item.user.username}` as any)}>
          <Text style={styles.authorName} numberOfLines={1}>
            {item.user.displayName ?? item.user.username}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.followBtn, followed[item.user.username] && styles.followingBtn]}
          onPress={() => handleFollow(item.user.username)}
        >
          <Text style={[styles.followText, followed[item.user.username] && styles.followingText]}>
            {followed[item.user.username] ? '✓' : '+ Follow'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.counts}>♡ {item._count.likes}  💬 {item._count.comments}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by tag…"
          placeholderTextColor={Colors.muted}
          value={tagFilter}
          onChangeText={setTagFilter}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {tagFilter ? (
          <TouchableOpacity onPress={() => setTagFilter('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={stamps}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        onEndReached={() => { if (hasMore && !loading) load(); }}
        onEndReachedThreshold={0.4}
        onRefresh={() => { booted.current = false; load(true); }}
        refreshing={loading && stamps.length === 0}
        ListFooterComponent={
          loading && stamps.length > 0
            ? <ActivityIndicator color={Colors.stampRed} style={{ marginVertical: Spacing.lg }} />
            : null
        }
        ListEmptyComponent={
          !loading
            ? <Text style={styles.empty}>No stamps found.</Text>
            : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  filterBar: {
    flexDirection:   'row',
    alignItems:      'center',
    padding:         Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap:             Spacing.sm,
    backgroundColor: Colors.paper,
  },
  filterInput: {
    flex:            1,
    backgroundColor: Colors.white,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radius.card,
    padding:         Spacing.sm,
    fontFamily:      Typography.sans,
    fontSize:        14,
    color:           Colors.ink,
  },
  clearBtn:  { padding: Spacing.sm },
  clearText: { fontSize: 16, color: Colors.muted },
  grid:      { padding: Spacing.md, paddingBottom: Spacing.xl },
  item:      { width: COL_W, marginBottom: Spacing.md },
  stampMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  authorName: { fontFamily: Typography.sansMedium, fontSize: 11, color: Colors.muted, flex: 1 },
  followBtn:  { borderWidth: 1, borderColor: Colors.postmarkBlue, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  followingBtn: { borderColor: Colors.border, backgroundColor: Colors.paperDark },
  followText:   { fontFamily: Typography.sansSemiBold, fontSize: 10, color: Colors.postmarkBlue },
  followingText: { color: Colors.muted },
  counts:    { fontFamily: Typography.sans, fontSize: 10, color: Colors.muted, marginTop: 2 },
  empty:     { textAlign: 'center', fontFamily: Typography.sans, fontSize: 14, color: Colors.muted, padding: Spacing.xl },
});
