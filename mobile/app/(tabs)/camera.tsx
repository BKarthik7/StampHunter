import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Linking, ActivityIndicator, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { StampFrame } from '../../components/stamp/StampFrame';
import { StampPunch } from '../../components/stamp/StampPunch';
import { api, setToken } from '../../lib/api';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';

type Step = 'pick' | 'camera' | 'preview' | 'form' | 'punching' | 'done';
type Visibility = 'private' | 'public';

export default function CameraScreen() {
  const { getToken }          = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef             = useRef<CameraView>(null);

  const [step,       setStep]       = useState<Step>('pick');
  const [imageUri,   setImageUri]   = useState<string | null>(null);
  const [caption,    setCaption]    = useState('');
  const [tags,       setTags]       = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [uploading,  setUploading]  = useState(false);
  const [punchGo,    setPunchGo]    = useState(false);

  // ── Choose entry method ────────────────────────────────────────
  async function handleOpenCamera() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera access denied',
          'Enable camera access in Settings to take photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    setStep('camera');
  }

  async function handlePickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.9,
      allowsEditing: true,
      aspect:     [3, 4],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStep('preview');
    }
  }

  // ── Take photo ─────────────────────────────────────────────────
  async function handleTakePhoto() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
    if (photo?.uri) {
      setImageUri(photo.uri);
      setStep('preview');
    }
  }

  // ── Submit → punch → upload ────────────────────────────────────
  function handleStampIt() {
    setStep('punching');
    setPunchGo(true);
  }

  const handlePunchComplete = useCallback(async () => {
    // Punch animation finished — fire the API call
    setUploading(true);
    try {
      const token = await getToken();
      setToken(token);

      // Build FormData for multipart upload
      const form = new FormData();
      form.append('image', {
        uri:  imageUri!,
        name: 'stamp.jpg',
        type: 'image/jpeg',
      } as any);
      if (caption)    form.append('caption',    caption);
      if (tags)       form.append('tags',       tags);
      form.append('visibility', visibility);

      await api.post('/api/stamps', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStep('done');
      setTimeout(() => {
        // Reset state and go back to collection
        setImageUri(null); setCaption(''); setTags('');
        setVisibility('private'); setPunchGo(false);
        router.replace('/(tabs)/');
      }, 1000);
    } catch (err: any) {
      Alert.alert(
        'Upload failed',
        err?.response?.data?.error?.message ?? 'Something went wrong. Please try again.',
      );
      setStep('form');
      setPunchGo(false);
    } finally {
      setUploading(false);
    }
  }, [imageUri, caption, tags, visibility, getToken]);

  // ── Render ─────────────────────────────────────────────────────

  // Step: pick
  if (step === 'pick') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Stamp a Memory</Text>
        <View style={styles.pickOptions}>
          <TouchableOpacity style={styles.pickBtn} onPress={handleOpenCamera} activeOpacity={0.8}>
            <Text style={styles.pickIcon}>📷</Text>
            <Text style={styles.pickLabel}>Take Photo</Text>
          </TouchableOpacity>
          <View style={styles.pickDivider} />
          <TouchableOpacity style={styles.pickBtn} onPress={handlePickFromLibrary} activeOpacity={0.8}>
            <Text style={styles.pickIcon}>🖼️</Text>
            <Text style={styles.pickLabel}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step: camera
  if (step === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.ink }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('pick')}>
            <Text style={styles.cancelText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shutterBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <View style={{ width: 44 }} />
        </View>
      </View>
    );
  }

  // Step: preview
  if (step === 'preview' && imageUri) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.paper }}
        contentContainerStyle={styles.centeredContent}
      >
        <Text style={styles.title}>Preview</Text>
        <StampFrame imageUrl={imageUri} size="card" />
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={() => { setImageUri(null); setStep('pick'); }}
          >
            <Text style={styles.btnGhostText}>← Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => setStep('form')}
          >
            <Text style={styles.btnPrimaryText}>Looks good →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Step: form
  if (step === 'form' && imageUri) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: Colors.paper }}
          contentContainerStyle={styles.centeredContent}
          keyboardShouldPersistTaps="handled"
        >
          <StampFrame
            imageUrl={imageUri}
            caption={caption || undefined}
            size="card"
          />

          {/* Caption */}
          <View style={styles.field}>
            <Text style={styles.label}>Caption</Text>
            <TextInput
              style={styles.input}
              placeholder="Add a caption…"
              placeholderTextColor={Colors.muted}
              value={caption}
              onChangeText={setCaption}
              maxLength={500}
              multiline
            />
          </View>

          {/* Tags */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Tags <Text style={styles.labelHint}>(comma-separated)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="travel, sunset, food…"
              placeholderTextColor={Colors.muted}
              value={tags}
              onChangeText={setTags}
              autoCapitalize="none"
            />
          </View>

          {/* Visibility */}
          <View style={styles.field}>
            <Text style={styles.label}>Visibility</Text>
            <View style={styles.row}>
              {(['private', 'public'] as Visibility[]).map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.btn,
                    { flex: 1 },
                    visibility === v ? styles.btnPrimary : styles.btnGhost,
                    v === 'public' ? { marginLeft: Spacing.sm } : {},
                  ]}
                  onPress={() => setVisibility(v)}
                >
                  <Text style={visibility === v ? styles.btnPrimaryText : styles.btnGhostText}>
                    {v === 'private' ? '🔒 Private' : '🌍 Public'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* CTA */}
          <View style={[styles.row, { marginTop: Spacing.sm }]}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() => setStep('preview')}
            >
              <Text style={styles.btnGhostText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { flex: 2 }]}
              onPress={handleStampIt}
            >
              <Text style={styles.btnPrimaryText}>Stamp It ✉</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Step: punching
  if ((step === 'punching' || step === 'done') && imageUri) {
    return (
      <View style={[styles.container, styles.centeredContent]}>
        <StampPunch
          isAnimating={punchGo}
          onComplete={handlePunchComplete}
        >
          <StampFrame
            imageUrl={imageUri}
            caption={caption || undefined}
            size="card"
          />
        </StampPunch>
        {uploading && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color={Colors.stampRed} size="small" />
            <Text style={styles.uploadingText}>Saving to your collection…</Text>
          </View>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.paper,
  },
  title: {
    fontFamily:      Typography.serif,
    fontSize:        26,
    color:           Colors.ink,
    textAlign:       'center',
    marginBottom:    Spacing.lg,
    paddingTop:      Spacing.lg,
  },
  centeredContent: {
    alignItems:       'center',
    padding:          Spacing.md,
    paddingBottom:    Spacing.xl,
    flexGrow:         1,
    justifyContent:   'center',
  },
  pickOptions: {
    flex:             1,
    flexDirection:    'row',
    paddingHorizontal: Spacing.md,
    gap:              Spacing.md,
    alignItems:       'center',
    justifyContent:   'center',
  },
  pickBtn: {
    flex:             1,
    backgroundColor:  Colors.paperDark,
    borderRadius:     Radius.card,
    borderWidth:      1,
    borderColor:      Colors.border,
    padding:          Spacing.xl,
    alignItems:       'center',
    gap:              Spacing.sm,
  },
  pickIcon:  { fontSize: 40 },
  pickLabel: { fontFamily: Typography.sansMedium, fontSize: 14, color: Colors.ink, textAlign: 'center' },
  pickDivider: { width: 1, height: 60, backgroundColor: Colors.border },

  // Camera controls
  cameraControls: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom:   48,
    paddingTop:      Spacing.md,
    backgroundColor: Colors.ink,
  },
  cancelBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText:  { color: Colors.white, fontSize: 22 },
  shutterBtn:  {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.white },

  // Shared buttons
  row:   { flexDirection: 'row', gap: Spacing.sm, width: '100%', marginTop: Spacing.md },
  btn:   { flex: 1, paddingVertical: 12, borderRadius: Radius.card, alignItems: 'center' },
  btnPrimary:     { backgroundColor: Colors.stampRed },
  btnPrimaryText: { fontFamily: Typography.sansSemiBold, fontSize: 14, color: Colors.white },
  btnGhost:       { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border },
  btnGhostText:   { fontFamily: Typography.sansSemiBold, fontSize: 14, color: Colors.ink },

  // Form
  field:     { width: '100%', marginTop: Spacing.md },
  label:     { fontFamily: Typography.sansMedium, fontSize: 13, color: Colors.ink, marginBottom: 6 },
  labelHint: { fontFamily: Typography.sans, color: Colors.muted, fontWeight: '400' as any },
  input: {
    backgroundColor: Colors.white,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radius.card,
    padding:         Spacing.sm + 2,
    fontFamily:      Typography.sans,
    fontSize:        15,
    color:           Colors.ink,
  },

  // Uploading
  uploadingRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    marginTop:      Spacing.lg,
  },
  uploadingText: {
    fontFamily: Typography.sans,
    fontSize:   14,
    color:      Colors.muted,
  },
});
