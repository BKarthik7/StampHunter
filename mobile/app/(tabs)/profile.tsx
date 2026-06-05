import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, FlatList, ListRenderItem, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useUser, useAuth } from '@clerk/expo';
import { StampFrame } from '../../components/stamp/StampFrame';
import { api, setToken } from '../../lib/api';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const COL_GAP  = 10;
const COLS     = 2;
const THUMB_W  = Math.floor((SCREEN_W - Spacing.md * 2 - COL_GAP) / COLS);

interface UserProfile {
  id:             string;
  username:       string;
  displayName:    string | null;
  bio:            string | null;
  avatarUrl:      string | null;
  isVerified:     boolean;
  stampCount:     number;
  followerCount:  number;
  followingCount: number;
}

interface Stamp {
  id: string; imageUrl: string; caption: string | null;
  locationName: string | null; takenAt: string;
}

export default function ProfileScreen() {
  const { user: clerkUser } = useUser();
  const { getToken, signOut } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stamps,  setStamps]  = useState<Stamp[]>([]);
  const [cursor,  setCursor]  = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const booted = useRef(false);

  const username = clerkUser?.username;

  const loadProfile = useCallback(async () => {
    if (!username) return;
    const token = await getToken();
    setToken(token);
    try {
      const { data } = await api.get(`/api/users/${username}`);
      setProfile(data.user);
    } catch { /* show stub if user hasn't synced yet */ }
    setLoading(false);
  }, [username, getToken]);

  const loadStamps = useCallback(async (reset = false) => {
    if (!username) return;
    try {
      const { data } = await api.get(`/api/stamps`, {
        params: { limit: 20, ...(!reset && cursor ? { cursor } : {}) },
      });
      setStamps(prev => reset ? data.stamps : [...prev, ...data.stamps]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch {}
  }, [username, cursor]);

  useEffect(() => {
    if (booted.current || !username) return;
    booted.current = true;
    loadProfile();
    loadStamps(true);
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderStamp: ListRenderItem<Stamp> = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.stampItem, index % 2 === 1 && { marginLeft: COL_GAP }]}
      onPress={() => router.push(`/stamp/${item.id}` as any)}
      activeOpacity={0.85}
    >
      <StampFrame
        imageUrl={item.imageUrl}
        caption={item.caption ?? undefined}
        size="thumb"
      />
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View>
      {/* Avatar + stats */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {/* Expo Image avatar would go here — placeholder for now */}
          <Text style={styles.avatarPlaceholder}>
            {(clerkUser?.username ?? '?')[0].toUpperCase()}
          </Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Stamps',    value: profile?.stampCount     ?? '–' },
            { label: 'Followers', value: profile?.followerCount  ?? '–' },
            { label: 'Following', value: profile?.followingCount ?? '–' },
          ].map(s => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Name + bio */}
      <View style={styles.nameBio}>
        <Text style={styles.displayName}>
          {profile?.displayName ?? clerkUser?.username ?? '…'}
          {profile?.isVerified ? ' ✓' : ''}
        </Text>
        <Text style={styles.username}>@{clerkUser?.username}</Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.gridHeading}>My Stamps</Text>
    </View>
  );

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.stampRed} />
    </View>
  );

  return (
    <FlatList
      data={stamps}
      renderItem={renderStamp}
      keyExtractor={item => item.id}
      numColumns={COLS}
      ListHeaderComponent={<ListHeader />}
      contentContainerStyle={styles.content}
      onEndReached={() => { if (hasMore) loadStamps(); }}
      onEndReachedThreshold={0.4}
      onRefresh={() => { booted.current = false; loadProfile(); loadStamps(true); }}
      refreshing={loading}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:  { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatar:  {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.paperDark,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  avatarPlaceholder: { fontFamily: Typography.serif, fontSize: 32, color: Colors.ink },

  statsRow:  { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat:      { alignItems: 'center' },
  statValue: { fontFamily: Typography.serif, fontSize: 22, fontWeight: '700', color: Colors.ink },
  statLabel: { fontFamily: Typography.sans, fontSize: 11, color: Colors.muted, marginTop: 2 },

  nameBio:     { marginBottom: Spacing.md },
  displayName: { fontFamily: Typography.serif, fontSize: 22, color: Colors.ink },
  username:    { fontFamily: Typography.sans, fontSize: 13, color: Colors.muted, marginTop: 2 },
  bio:         { fontFamily: Typography.sans, fontSize: 14, color: Colors.ink, marginTop: 6, lineHeight: 20 },

  signOutBtn: {
    alignSelf:       'flex-start',
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radius.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom:    Spacing.lg,
  },
  signOutText: { fontFamily: Typography.sansMedium, fontSize: 13, color: Colors.ink },

  gridHeading: { fontFamily: Typography.serifSemiBold, fontSize: 18, color: Colors.ink, marginBottom: Spacing.md },
  stampItem:   { width: THUMB_W, marginBottom: COL_GAP },
});
