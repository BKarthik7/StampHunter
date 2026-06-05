import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { StampFrame } from '../../components/stamp/StampFrame';
import { api, setToken } from '../../lib/api';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

interface Stamp {
  id:           string;
  imageUrl:     string;
  caption:      string | null;
  locationName: string | null;
  takenAt:      string;
  visibility:   'private' | 'public';
  tags:         { tag: string }[];
  user:         { id: string; username: string; displayName: string | null };
  _count:       { likes: number; comments: number };
}

interface Comment {
  id:        string;
  body:      string;
  createdAt: string;
  user:      { id: string; username: string; displayName: string | null };
}

export default function StampDetailScreen() {
  const { id }          = useLocalSearchParams<{ id: string }>();
  const { getToken }    = useAuth();
  const { user }        = useUser();

  const [stamp,       setStamp]       = useState<Stamp | null>(null);
  const [comments,    setComments]    = useState<Comment[]>([]);
  const [liked,       setLiked]       = useState(false);
  const [likeCount,   setLikeCount]   = useState(0);
  const [commentText, setCommentText] = useState('');
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);

  const isOwner = stamp?.user.username === user?.username;

  const load = useCallback(async () => {
    const token = await getToken();
    setToken(token);
    try {
      const [stampRes, commentRes] = await Promise.all([
        api.get(`/api/stamps/${id}`),
        api.get(`/api/stamps/${id}/comments`, { params: { limit: 20 } }),
      ]);
      setStamp(stampRes.data.stamp);
      setLikeCount(stampRes.data.stamp._count.likes);
      setComments(commentRes.data.comments);
    } catch {
      Alert.alert('Error', 'Could not load this stamp.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { load(); }, [load]);

  // ── Like ──────────────────────────────────────────────────────
  async function handleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount(c => next ? c + 1 : c - 1);
    try {
      if (next) await api.post(`/api/stamps/${id}/like`);
      else      await api.delete(`/api/stamps/${id}/like`);
    } catch { setLiked(!next); setLikeCount(c => next ? c - 1 : c + 1); }
  }

  // ── Comment ───────────────────────────────────────────────────
  async function handleComment() {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/api/stamps/${id}/comments`, { body: commentText });
      setComments(prev => [data.comment, ...prev]);
      setCommentText('');
    } finally { setSubmitting(false); }
  }

  // ── Delete stamp ──────────────────────────────────────────────
  function confirmDelete() {
    Alert.alert('Delete stamp', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await api.delete(`/api/stamps/${id}`);
          router.replace('/(tabs)/');
        },
      },
    ]);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.stampRed} />
    </View>
  );

  if (!stamp) return null;

  const takenDate = new Date(stamp.takenAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: stamp.caption ?? 'Stamp', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Stamp frame */}
        <View style={styles.frameWrap}>
          <StampFrame
            imageUrl={stamp.imageUrl}
            caption={stamp.caption ?? undefined}
            locationName={stamp.locationName ?? undefined}
            date={takenDate}
            size="card"
          />
        </View>

        {/* Tags */}
        {stamp.tags.length > 0 && (
          <View style={styles.tags}>
            {stamp.tags.map(t => (
              <View key={t.tag} style={styles.tag}>
                <Text style={styles.tagText}>{t.tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Meta */}
        <Text style={styles.meta}>
          {stamp.user.displayName ?? stamp.user.username}
          {stamp.locationName ? `  📍 ${stamp.locationName}` : ''}
          {`  ${takenDate}`}
        </Text>

        {/* Like + owner actions */}
        <View style={styles.actions}>
          {!isOwner && (
            <TouchableOpacity
              style={[styles.actionBtn, liked && styles.likedBtn]}
              onPress={handleLike}
            >
              <Text style={[styles.actionText, liked && styles.likedText]}>
                {liked ? '♥' : '♡'} {likeCount}
              </Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={confirmDelete}>
                <Text style={[styles.actionText, { color: Colors.error }]}>🗑 Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeading}>{comments.length} comment{comments.length !== 1 ? 's' : ''}</Text>

          {comments.map(c => (
            <View key={c.id} style={styles.comment}>
              <Text style={styles.commentAuthor}>{c.user.displayName ?? c.user.username} </Text>
              <Text style={styles.commentBody}>{c.body}</Text>
              <Text style={styles.commentDate}>{new Date(c.createdAt).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Comment input */}
      <View style={styles.commentBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment…"
          placeholderTextColor={Colors.muted}
          value={commentText}
          onChangeText={setCommentText}
          returnKeyType="send"
          onSubmitEditing={handleComment}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.sendBtnDisabled]}
          onPress={handleComment}
          disabled={!commentText.trim() || submitting}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.paper },
  content:    { padding: Spacing.md, paddingBottom: 100 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frameWrap:  { alignItems: 'center', marginBottom: Spacing.md },
  tags:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  tag:        { backgroundColor: Colors.paperDark, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:    { fontFamily: Typography.sansMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.ink },
  meta:       { fontFamily: Typography.sans, fontSize: 12, color: Colors.muted, marginBottom: Spacing.md },
  actions:    { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  actionBtn:  { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  likedBtn:   { borderColor: Colors.stampRed, backgroundColor: Colors.stampRedLight },
  actionText: { fontFamily: Typography.sansSemiBold, fontSize: 14, color: Colors.muted },
  likedText:  { color: Colors.stampRed },
  commentsSection: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  commentsHeading: { fontFamily: Typography.sansSemiBold, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  comment:    { marginBottom: Spacing.sm },
  commentAuthor: { fontFamily: Typography.sansSemiBold, fontSize: 13, color: Colors.ink },
  commentBody:   { fontFamily: Typography.sans, fontSize: 13, color: Colors.ink },
  commentDate:   { fontFamily: Typography.sans, fontSize: 11, color: Colors.muted, marginTop: 2 },
  commentBar: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.sm,
    padding:         Spacing.sm,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    backgroundColor: Colors.paper,
    paddingBottom:   Platform.OS === 'ios' ? 24 : Spacing.sm,
  },
  commentInput: {
    flex:            1,
    backgroundColor: Colors.white,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radius.card,
    padding:         10,
    fontFamily:      Typography.sans,
    fontSize:        14,
    color:           Colors.ink,
  },
  sendBtn:         { backgroundColor: Colors.stampRed, paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.card },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText:     { fontFamily: Typography.sansSemiBold, fontSize: 13, color: Colors.white },
});
