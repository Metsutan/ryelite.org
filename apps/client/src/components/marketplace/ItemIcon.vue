<template>
  <div 
    :class="['item-icon', size]" 
    :style="spriteStyle"
    :title="itemName"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import itemSpritesheet from '@/assets/marketplace/itemspritesheet.png'

interface Props {
  itemId: number
  size?: 'small' | 'medium' | 'large'
  itemName?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  itemName: ''
})

const spriteStyle = computed(() => {
  // Calculate sprite position based on itemId
  // 20 items per row, each sprite is 2.25rem apart
  const baseSize = 2.25 // rem
  const itemsPerRow = 20
  
  const row = Math.floor((props.itemId - 1) / itemsPerRow)
  const col = (props.itemId - 1) % itemsPerRow
  
  // Size multipliers for different icon sizes
  const sizeMultiplier: Record<'small' | 'medium' | 'large', number> = {
    small: 1.5 / baseSize,
    medium: 1,
    large: 3 / baseSize
  }
  
  const multiplier = sizeMultiplier[props.size]
  const spriteSize = baseSize * multiplier
  
  const backgroundPositionX = -(col * spriteSize)
  const backgroundPositionY = -(row * spriteSize)
  const backgroundSizeWidth = itemsPerRow * spriteSize
  
  return {
    backgroundImage: `url('${itemSpritesheet}')`,
    backgroundPosition: `${backgroundPositionX}rem ${backgroundPositionY}rem`,
    backgroundSize: `${backgroundSizeWidth}rem auto`,
    backgroundRepeat: 'no-repeat',
    '--col': col,
    '--row': row
  }
})
</script>

<style scoped>
.item-icon {
  display: inline-block;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  border-radius: 4px;
}

.item-icon.small {
  width: 1.5rem;
  height: 1.5rem;
}

.item-icon.medium {
  width: 2.25rem;
  height: 2.25rem;
}

.item-icon.large {
  width: 3rem;
  height: 3rem;
}
</style>
