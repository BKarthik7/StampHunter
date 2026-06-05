import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  RoundedRect,
  Circle,
  Group,
  rect,
  rrect,
  ClipDef,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing } from '../../constants/theme';

// ─── Size Variants ──────────────────────────────────────────────
const SIZE_MAP = {
  thumb: 160,
  card: 340,
  detail: 420,
} as const;

type StampSize = keyof typeof SIZE_MAP;

// ─── Stamp Geometry ─────────────────────────────────────────────
const PERF_DIAMETER = 12;        // circle diameter
const PERF_RADIUS = PERF_DIAMETER / 2;
const PERF_GAP = 14;             // center-to-center spacing
const BORDER_WIDTH = 2;          // outer rect stroke
const INNER_MARGIN = PERF_RADIUS; // photo inset from outer edge
const BOTTOM_STRIP_HEIGHT = 48;   // caption/meta strip height

interface StampFrameProps {
  imageUrl?: string;
  caption?: string;
  locationName?: string;
  date?: string;
  size?: StampSize;
  style?: object;
}

export function StampFrame({
  imageUrl,
  caption,
  locationName,
  date,
  size = 'card',
  style,
}: StampFrameProps) {
  const width = SIZE_MAP[size];

  // Aspect ratio: 3:4 portrait (inner photo area)
  const innerPhotoW = width - INNER_MARGIN * 2;
  const innerPhotoH = (innerPhotoW * 4) / 3;
  const height = innerPhotoH + INNER_MARGIN * 2 + BOTTOM_STRIP_HEIGHT;

  // ─── Perforated border circle positions ─────────────────────
  const perfCircles = useMemo(() => {
    const circles: { cx: number; cy: number }[] = [];

    // Top & bottom edges — distribute circles horizontally
    const hCount = Math.floor(width / PERF_GAP);
    const hStep = width / hCount;
    for (let i = 0; i < hCount; i++) {
      const cx = hStep * i + hStep / 2;
      circles.push({ cx, cy: 0 });           // top
      circles.push({ cx, cy: height });       // bottom
    }

    // Left & right edges — distribute circles vertically
    const vCount = Math.floor(height / PERF_GAP);
    const vStep = height / vCount;
    for (let i = 0; i < vCount; i++) {
      const cy = vStep * i + vStep / 2;
      circles.push({ cx: 0, cy });            // left
      circles.push({ cx: width, cy });        // right
    }

    return circles;
  }, [width, height]);

  const photoX = INNER_MARGIN;
  const photoY = INNER_MARGIN;
  const photoWidth = width - INNER_MARGIN * 2;
  const photoHeight = innerPhotoH;

  return (
    <View style={[{ width }, style]}>
      {/* Skia canvas for the perforated border */}
      <Canvas style={{ width, height: INNER_MARGIN * 2 + innerPhotoH + BOTTOM_STRIP_HEIGHT }}>
        {/* Outer background — paper color */}
        <RoundedRect
          x={0}
          y={0}
          width={width}
          height={height}
          r={2}
          color={Colors.paper}
        />

        {/* Perforated circles (bisect the outer edge) */}
        {perfCircles.map((c, i) => (
          <Circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={PERF_RADIUS}
            color={Colors.white}
          />
        ))}

        {/* Inner photo background (white) */}
        <RoundedRect
          x={photoX}
          y={photoY}
          width={photoWidth}
          height={photoHeight}
          r={0}
          color={Colors.white}
        />

        {/* Bottom strip background */}
        <RoundedRect
          x={photoX}
          y={photoY + photoHeight}
          width={photoWidth}
          height={BOTTOM_STRIP_HEIGHT}
          r={0}
          color={Colors.white}
        />
      </Canvas>

      {/* Photo layer — positioned absolutely over the canvas */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.photo,
            {
              width: photoWidth,
              height: photoHeight,
              left: photoX,
              top: photoY,
            },
          ]}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.photoPlaceholder,
            { width: photoWidth, height: photoHeight, left: photoX, top: photoY },
          ]}
        />
      )}

      {/* Bottom strip — caption + location + date */}
      <View
        style={[
          styles.strip,
          {
            width: photoWidth,
            left: photoX,
            top: photoY + photoHeight,
            height: BOTTOM_STRIP_HEIGHT,
          },
        ]}
      >
        {caption ? (
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
        <View style={styles.meta}>
          {locationName ? (
            <Text style={styles.metaText} numberOfLines={1}>
              📍 {locationName}
            </Text>
          ) : null}
          {date ? (
            <Text style={styles.metaText}>{date}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    position: 'absolute',
  },
  photoPlaceholder: {
    position: 'absolute',
    backgroundColor: Colors.paperDark,
  },
  strip: {
    position: 'absolute',
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.ink,
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.muted,
    flexShrink: 1,
  },
});
