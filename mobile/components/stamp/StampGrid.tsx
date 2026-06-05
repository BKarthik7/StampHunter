import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, Text, StyleSheet,
  ActivityIndicator, ListRenderItem, Dimensions,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { StampFrame } from '../stamp/StampFrame';
import { api, setToken } from '../../lib/api';
import { Colors, Spacing, Typography } from '../../constants/theme';

const SCREEN_W  = Dimensions.get('window').width;
const COL_GAP   = 10;
const COLS      = 2;
const THUMB_W   = Math.floor((SCREEN_W - Spacing.md * 2 - COL_GAP) / COLS);

export interface StampItem {
  id:           string;
  imageUrl:     string;
  caption:      string | null;
  locationName: string | null;
  takenAt:      string;
  tags:         { tag: string }[];
}

interface StampGridProps {
  /** If provided, only shows stamps for that user (public). Omit for own stamps. */
  username?: string;
}

export function StampGrid({ username }: StampGridProps) {
  const { getToken } = useAuth();
  const [stamps,  setStamps]  = useState<StampItem[]>([]);
  const [cursor,  setCursor]  = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const booted = useRef(false);

  const fetchPage = useCallback(async (nextCursor?: string | null) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      setToken(token);
      const endpoint = username ? `/api/users/${username}/stamps` : '/api/stamps';
      const { data } = await api.get(endpoint, {
        params: { limit: 20, ...(nextCursor ? { cursor: nextCursor } : {}) },
      });
      setStamps(prev => nextCursor ? [...prev, ...data.stamps] : data.stamps);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch {
      setError('Could not load stamps. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }, [getToken, username, loading]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    fetchPage(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderItem: ListRenderItem<StampItem> = ({ item, index }) => (
    <TouchableOpacity
      onPress={() => router.push(`/stamp/${item.id}` as any)}
      activeOpacity={0.85}
      style={[
        styles.item,
        { marginLeft: index % 2 === 0 ? 0 : COL_GAP },
      ]}
    >
      <StampFrame
        imageUrl={item.imageUrl}
        caption={item.caption ?? undefined}
        locationName={item.locationName ?? undefined}
        date={new Date(item.takenAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: '2-digit',
        })}
        size="thumb"
      />
    </TouchableOpacity>
  );

  const ListEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>✉</Text>
      <Text style={styles.emptyTitle}>Your archive awaits.</Text>
      <Text style={styles.emptyBody}>
        Tap the <Text style={{ color: Colors.stampRed, fontFamily: Typography.sansSemiBold }}>+</Text> button below to stamp your first memory.
      </Text>
    </View>
  );

  const ListFooter = () =>
    loading && stamps.length > 0 ? (
      <ActivityIndicator color={Colors.stampRed} style={{ marginVertical: Spacing.lg }} />
    ) : null;

  return (
    <FlatList
      data={stamps}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      numColumns={COLS}
      contentContainerStyle={styles.grid}
      ListEmptyComponent={loading ? null : <ListEmpty />}
      ListFooterComponent={<ListFooter />}
      onEndReached={() => { if (hasMore && !loading) fetchPage(cursor); }}
      onEndReachedThreshold={0.4}
      onRefresh={() => { booted.current = false; fetchPage(null); }}
      refreshing={loading && stamps.length === 0}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: Spacing.md,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.xl,
    flexGrow:          1,
  },
  item: {
    marginBottom: COL_GAP,
    width:        THUMB_W,
  },
  empty: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: Spacing.xl,
    paddingTop:        80,
  },
  emptyIcon: {
    fontSize:     64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily:   Typography.serif,
    fontSize:     26,
    color:        Colors.ink,
    textAlign:    'center',
    marginBottom: Spacing.sm,
  },
  emptyBody: {
    fontFamily:   Typography.sans,
    fontSize:     15,
    color:        Colors.muted,
    textAlign:    'center',
    lineHeight:   22,
  },
});
