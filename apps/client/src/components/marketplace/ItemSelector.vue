<template>
  <div class="item-selector">
    <div class="selector-header" @click="toggleDropdown" :class="{ open: isOpen }">
      <div class="selected-item" v-if="selectedItem">
        <ItemIcon 
          :item-id="selectedItem._id" 
          :item-name="selectedItem.name"
          size="small"
        />
        <span>{{ capitalizeWords(selectedItem.name) }}</span>
        <span class="item-cost">({{ selectedItem.cost }} coins)</span>
      </div>
      <div class="placeholder" v-else>
        <Icon icon="mdi:package-variant" />
        <span>{{ placeholder }}</span>
      </div>
      <Icon icon="mdi:chevron-down" class="dropdown-arrow" />
    </div>
    
    <div v-if="isOpen" class="dropdown" @click.stop>
      <div class="search-container">
        <Icon icon="mdi:magnify" class="search-icon" />
        <input 
          ref="searchInput"
          v-model="searchQuery" 
          placeholder="Search items..."
          class="search-input"
          @click.stop
        />
      </div>
      
      <div class="items-list">
        <div 
          v-for="item in filteredItems" 
          :key="item._id"
          class="item-option"
          @click="selectItem(item)"
          :class="{ selected: modelValue === item._id }"
        >
          <ItemIcon 
            :item-id="item._id" 
            :item-name="item.name"
            size="small"
          />
          <div class="item-info">
            <span class="item-name">{{ capitalizeWords(item.name) }}</span>
            <span class="item-description">{{ item.description }}</span>
          </div>
          <span class="item-cost">{{ item.cost }} coins</span>
        </div>
        
        <div v-if="filteredItems.length === 0" class="no-results">
          <Icon icon="mdi:package-variant-closed" />
          <span>No items found</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Backdrop to close dropdown -->
  <div v-if="isOpen" class="dropdown-backdrop" @click="closeDropdown"></div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ItemIcon from './ItemIcon.vue'

interface Item {
  _id: number
  name: string
  description: string
  cost: number
  isTradeable: boolean
}

interface Props {
  modelValue: number | string
  items: Item[]
  placeholder?: string
}

interface Emits {
  (e: 'update:modelValue', value: number | string): void
  (e: 'change', item: Item | null): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select an item...'
})

const emit = defineEmits<Emits>()

const isOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement>()

const selectedItem = computed(() => {
  if (!props.modelValue) return null
  return props.items.find(item => item._id === Number(props.modelValue)) || null
})

const capitalizeWords = (str: string) => {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

const filteredItems = computed(() => {
  if (!searchQuery.value) return props.items
  
  const query = searchQuery.value.toLowerCase()
  return props.items.filter(item => 
    item.name.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query)
  )
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
}

const closeDropdown = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const selectItem = (item: Item) => {
  emit('update:modelValue', item._id)
  emit('change', item)
  closeDropdown()
}

// Close dropdown when clicking outside
watch(isOpen, (newValue) => {
  if (newValue) {
    document.addEventListener('click', closeDropdown)
  } else {
    document.removeEventListener('click', closeDropdown)
    searchQuery.value = ''
  }
})
</script>

<style scoped>
.item-selector {
  position: relative;
  width: 100%;
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 12px;
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  background-color: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 48px;
}

.selector-header:hover {
  border-color: var(--theme-accent-transparent-40);
}

.selector-header.open {
  border-color: var(--theme-accent);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.placeholder {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  color: var(--theme-text-muted);
}

.item-cost {
  color: var(--theme-text-secondary);
  font-size: 0.9rem;
}

.dropdown-arrow {
  color: var(--theme-text-secondary);
  transition: transform 0.3s ease;
}

.selector-header.open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--theme-background-soft);
  border: 1px solid var(--theme-accent);
  border-top: none;
  border-radius: 0 0 6px 6px;
  z-index: 1000;
  max-height: 300px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.search-container {
  position: relative;
  padding: 0.75rem;
  border-bottom: 1px solid var(--theme-border);
}

.search-icon {
  position: absolute;
  left: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--theme-text-secondary);
  font-size: 1.1rem;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 2.5rem;
  border: 1px solid var(--theme-border);
  border-radius: 4px;
  background-color: var(--theme-background-mute);
  color: var(--theme-text-primary);
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 2px var(--theme-accent-transparent-20);
}

.items-list {
  max-height: 200px;
  overflow-y: auto;
}

.item-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--theme-border);
}

.item-option:last-child {
  border-bottom: none;
}

.item-option:hover {
  background-color: var(--theme-background-mute);
}

.item-option.selected {
  background-color: var(--theme-accent-transparent-20);
  border-left: 3px solid var(--theme-accent);
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-name {
  font-weight: 500;
  color: var(--theme-text-primary);
}

.item-description {
  font-size: 0.85rem;
  color: var(--theme-text-secondary);
  font-style: italic;
}

.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--theme-text-muted);
  font-style: italic;
}

.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* Custom scrollbar for items list */
.items-list::-webkit-scrollbar {
  width: 6px;
}

.items-list::-webkit-scrollbar-track {
  background: var(--theme-background);
}

.items-list::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 3px;
}

.items-list::-webkit-scrollbar-thumb:hover {
  background: var(--theme-accent-transparent-40);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .dropdown {
    max-height: 250px;
  }
  
  .items-list {
    max-height: 150px;
  }
  
  .item-option {
    padding: 0.5rem;
  }
  
  .item-description {
    display: none;
  }
}
</style>
