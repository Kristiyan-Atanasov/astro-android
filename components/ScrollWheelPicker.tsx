// components/ScrollWheelPicker.tsx
// Dark snap-wheel picker used on onboarding date/time screens.
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export type WheelOption = {
  value: string;
  label: string;
};

type Props = {
  options: WheelOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  enabled?: boolean;
};

export default function ScrollWheelPicker({
  options,
  selectedValue,
  onChange,
  enabled = true,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const isDragging = useRef(false);
  const selectedIndex = useMemo(() => {
    const idx = options.findIndex((o) => o.value === selectedValue);
    return idx >= 0 ? idx : 0;
  }, [options, selectedValue]);

  useEffect(() => {
    if (isDragging.current) return;
    const y = selectedIndex * ITEM_HEIGHT;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
  }, [selectedIndex, options.length]);

  const commitOffset = (offsetY: number) => {
    if (!options.length) return;
    const raw = Math.round(offsetY / ITEM_HEIGHT);
    const index = Math.max(0, Math.min(options.length - 1, raw));
    const next = options[index]?.value;
    if (next != null && next !== selectedValue) {
      onChange(next);
    }
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDragging.current = false;
    commitOffset(e.nativeEvent.contentOffset.y);
  };

  const onScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Short drags sometimes skip momentum end — commit from drag end too.
    commitOffset(e.nativeEvent.contentOffset.y);
  };

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.selectionBand} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled
        scrollEnabled={enabled}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
        onScrollBeginDrag={() => {
          isDragging.current = true;
        }}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={onScrollEndDrag}
      >
        {options.map((option) => {
          const selected = option.value === selectedValue;
          return (
            <View key={option.value} style={styles.item}>
              <Text style={[styles.itemText, selected && styles.itemTextSelected]}>
                {option.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" style={styles.fadeTop} />
      <View pointerEvents="none" style={styles.fadeBottom} />
    </View>
  );
}

export const WHEEL_ITEM_HEIGHT = ITEM_HEIGHT;
export const WHEEL_VISIBLE_HEIGHT = WHEEL_HEIGHT;

const styles = StyleSheet.create({
  wrap: {
    height: WHEEL_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  selectionBand: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: 'rgba(87, 124, 251, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(178, 131, 237, 0.35)',
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 20,
    fontFamily: 'SFProDisplay-Regular',
  },
  itemTextSelected: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.35,
    backgroundColor: 'rgba(28, 30, 38, 0.72)',
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.35,
    backgroundColor: 'rgba(28, 30, 38, 0.72)',
  },
});
