import React, { useRef, useEffect, useCallback } from 'react'
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import * as Haptics from 'expo-haptics'

interface WheelPickerProps {
  items: string[]
  selectedIndex: number
  onChangeIndex: (index: number) => void
  itemHeight?: number
  visibleItems?: number
  width?: number
}

const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedIndex,
  onChangeIndex,
  itemHeight = 50,
  visibleItems = 3,
  width = 90,
}) => {
  const flatListRef = useRef<FlatList>(null)
  const lastHapticIndex = useRef(-1)
  const padding = ((visibleItems - 1) / 2) * itemHeight

  // Scroll para o item selecionado ao montar ou quando selectedIndex muda externamente
  useEffect(() => {
    if (flatListRef.current && items.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: selectedIndex * itemHeight,
          animated: false,
        })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [selectedIndex, itemHeight, items.length])

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y
      const index = Math.round(y / itemHeight)
      const clamped = Math.max(0, Math.min(index, items.length - 1))
      if (clamped !== lastHapticIndex.current) {
        lastHapticIndex.current = clamped
        Haptics.selectionAsync()
      }
    },
    [itemHeight, items.length],
  )

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y
      const index = Math.round(y / itemHeight)
      const clamped = Math.max(0, Math.min(index, items.length - 1))
      onChangeIndex(clamped)
    },
    [itemHeight, items.length, onChangeIndex],
  )

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => {
      const isSelected = index === selectedIndex
      return (
        <View style={[styles.item, { height: itemHeight }]}>
          <Text
            style={[
              styles.itemText,
              isSelected ? styles.itemTextSelected : styles.itemTextFaded,
            ]}
          >
            {item}
          </Text>
        </View>
      )
    },
    [selectedIndex, itemHeight],
  )

  const getItemLayout = useCallback(
    (_: ArrayLike<string> | null | undefined, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight],
  )

  return (
    <View style={[styles.container, { width, height: itemHeight * visibleItems }]}>
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{
          paddingTop: padding,
          paddingBottom: padding,
        }}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
      />

      {/* Highlight do item selecionado — fundo transparente, só bordas */}
      <View
        style={[
          styles.highlightLine,
          { top: padding, height: itemHeight },
        ]}
      />

      {/* Fade topo */}
      <View style={[styles.fadeTop, { height: padding }]} />
      {/* Fade base */}
      <View style={[styles.fadeBottom, { height: padding }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 18,
    fontWeight: '400',
  },
  itemTextSelected: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 20,
  },
  itemTextFaded: {
    color: '#6B7280',
  },
  highlightLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
    zIndex: 1,
    pointerEvents: 'none',
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 2,
    pointerEvents: 'none',
  },
})

export default WheelPicker
