<template>
  <!-- Unified Control Panel -->
  <div class="control-panel unified-controls">
    <!-- Search Section (Always Visible) -->
    <div class="control-section search-section">
      <div class="search-input-container">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search locations, NPCs..."
          class="search-input"
          @input="handleSearch"
        />
        <button @click="toggleControlsExpansion" class="controls-toggle" :class="{ active: isControlsExpanded }">
          <span class="controls-toggle-icon">{{ isControlsExpanded ? '▲' : '▼' }}</span>
        </button>
      </div>
      
      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="search-results">
        <div 
          v-for="result in searchResults.slice(0, 6)" 
          :key="result.id"
          @click="goToLocation(result)"
          class="search-result-item"
        >
          <span class="result-icon">{{ result.icon }}</span>
          <span class="result-name">{{ result.name }}</span>
          <span class="result-layer">{{ result.layer }}</span>
        </div>
      </div>
    </div>

    <!-- Collapsible Controls Area -->
    <div v-if="isControlsExpanded" class="collapsible-controls">
      <!-- Layer Selection Section -->
      <div class="control-section">
        <div class="section-header">
          <h3 class="section-title">Map Layers</h3>
        </div>
        <div class="layer-buttons">
          <button 
            v-for="layer in layers" 
            :key="layer.id"
            @click="$emit('layerChanged', layer.id)"
            :class="['layer-btn', { active: selectedLayer === layer.id }]"
          >
            {{ layer.name }}
          </button>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="control-section">
        <div class="section-header">
          <h3 class="section-title">Filters</h3>
          <div class="filter-summary">{{ visibleCategoriesCount }}/{{ markerCategories.length }} active</div>
        </div>
        <div class="filter-tags">
          <button 
            v-for="category in markerCategories" 
            :key="category.name"
            @click="toggleMarkerCategory(category.name)"
            :class="['filter-tag', { active: category.visible }]"
            :data-category="category.name"
          >
            <span class="filter-icon">{{ category.icon }}</span>
            <span class="filter-name">{{ category.name }}</span>
            <span class="marker-count">{{ category.count }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import locations from '@/assets/map/Locations.json'
import npcs from '@/assets/map/NPCs.json'
import { useGameData } from '@/composables/useGameData'

// Props
interface Props {
  selectedLayer: string
  layers: Array<{
    id: string
    name: string
    icon: string
    color: string
    description: string
  }>
  markerCategories: Array<{
    name: string
    icon: string
    visible: boolean
    count: number
  }>
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  layerChanged: [layerId: string]
  searchLocationSelected: [result: any]
  markerCategoryToggled: [categoryName: string, visible: boolean]
  searchQueryChanged: [query: string]
}>()

const { npcDefinitions, entitiesData } = useGameData()

// Reactive state
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const isControlsExpanded = ref(false) // Start collapsed for space efficiency

// All searchable items
let searchableItems: any[] = []

// Computed properties
const visibleCategoriesCount = computed(() => {
  return props.markerCategories.filter(cat => cat.visible).length
})

// Enhanced search with better filtering and result grouping
const handleSearch = () => {
  const query = searchQuery.value.trim()
  
  // Emit search query change to parent (MapView)
  emit('searchQueryChanged', query)
  
  if (!query) {
    searchResults.value = []
    return
  }
  
  const queryLower = query.toLowerCase()
  const results = searchableItems
    .filter(item => {
      const nameMatch = item.name.toLowerCase().includes(queryLower)
      const typeMatch = item.type?.toLowerCase().includes(queryLower)
      const layerMatch = item.layer.toLowerCase().includes(queryLower)
      return nameMatch || typeMatch || layerMatch
    })
    .map(item => ({
      ...item,
      // Calculate relevance score for better sorting
      relevance: calculateRelevance(item, query)
    }))
    .sort((a, b) => {
      // Sort by relevance first, then by type priority, then alphabetically
      if (b.relevance !== a.relevance) return b.relevance - a.relevance
      
      const typePriority = { 
        location: 5, 
        shop: 4, 
        npc: 3, 
        tree: 2, 
        obelisk: 2, 
        bank: 2, 
        ore: 1, 
        fire: 1, 
        resource: 0 
      }
      const aPriority = typePriority[a.type as keyof typeof typePriority] || 0
      const bPriority = typePriority[b.type as keyof typeof typePriority] || 0
      
      if (bPriority !== aPriority) return bPriority - aPriority
      return a.name.localeCompare(b.name)
    })
    .slice(0, 12) // Show more results
  
  searchResults.value = results
}

const calculateRelevance = (item: any, query: string): number => {
  const name = item.name.toLowerCase()
  let score = 0
  
  // Exact match gets highest score
  if (name === query) score += 100
  // Start of name match gets high score
  else if (name.startsWith(query)) score += 80
  // Word boundary match gets medium score  
  else if (name.includes(' ' + query)) score += 60
  // Contains match gets base score
  else if (name.includes(query)) score += 40
  
  // Boost important types
  if (item.type === 'location') score += 20
  if (item.type === 'shop') score += 15
  if (item.type === 'npc') score += 10
  if (item.type === 'tree') score += 8
  if (item.type === 'obelisk') score += 8
  if (item.type === 'bank') score += 8
  if (item.type === 'ore') score += 5
  if (item.type === 'fire') score += 5
  
  // Boost current layer
  if (item.layer === props.selectedLayer) score += 10
  
  return score
}

// Removed unused clearSearch function

const goToLocation = (result: any) => {
  emit('searchLocationSelected', result)
  // Don't clear search - let the user keep their search results visible
}

const toggleMarkerCategory = (categoryName: string) => {
  const category = props.markerCategories.find(cat => cat.name === categoryName)
  if (!category) return
  
  category.visible = !category.visible
  emit('markerCategoryToggled', categoryName, category.visible)
}

const toggleControlsExpansion = () => {
  isControlsExpanded.value = !isControlsExpanded.value
}

// Initialize searchable items
const initializeSearchableItems = (defs: any, entities: any) => {
  searchableItems = []
  
  // Add locations
  locations.locations.forEach((location: any) => {
    const layer = location.labelType === 0 ? 'Underworld' : 
                  location.labelType === 1 ? 'Overworld' : 'Sky'
    searchableItems.push({
      id: `location-${location.name}`,
      name: location.name,
      icon: '📍',
      layer,
      x: location.x + 512.5,
      y: location.y + 512.5,
      type: 'location'
    })
  })
  
  // Add NPCs
  npcs.npcs.forEach((npc: any) => {
    const npcDef = defs.find((def: any) => npc.npcdef_id === def._id)
    if (npcDef?.name) {
      const layer = npc.mapLevel === 0 ? 'Underworld' : 
                    npc.mapLevel === 1 ? 'Overworld' : 'Sky'
      const name = typeof npcDef.name === 'string' ? 
        npcDef.name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()) : ''
      
      searchableItems.push({
        id: `npc-${npc.x}-${npc.y}`,
        name,
        icon: npc.shopdef_id ? '🏪' : npc.isAlwaysAggroOverride ? '😈' : 
              npcDef.combat ? '⚔️' : '👤',
        layer,
        x: npc.x + 512.5,
        y: npc.y + 512.5,
        type: 'npc'
      })
    }
  })
  
  // Add world entities (trees, obelisks, ores, etc.)
  const worldEntities = (entities as any) || []
  worldEntities.forEach((entity: any) => {
    // Skip treestumps and burnt trees entirely - they shouldn't appear in search
    if (entity.type.includes('stump') || entity.type.includes('burnt')) {
      return
    }
    
    const layer = entity.lvl === 0 ? 'Underworld' : 
                  entity.lvl === 1 ? 'Overworld' : 'Sky'
    
    let icon = '📍'
    let category = 'resource'
    let name = entity.type
    
    // Determine icon, category, and formatted name based on entity type
    if (entity.type.includes('tree') || entity.type.includes('cherryblossom')) {
      icon = '🌳'
      category = 'tree'
      name = entity.type.replace('tree', ' Tree').replace('blossom', ' Blossom')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('obelisk')) {
      icon = '🗿'
      category = 'obelisk'
      name = entity.type.replace('obelisk', ' Obelisk')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('rocks')) {
      icon = '🪨'
      category = 'ore'
      name = entity.type.replace('rocks', ' Rock')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('bank')) {
      icon = '💰'
      category = 'bank'
      name = entity.type.replace('bank', ' Bank').replace('chest', ' Chest')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('fire')) {
      icon = '🔥'
      category = 'fire'
      name = entity.type.replace('fire', ' Fire')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('smithingsource')) {
      icon = '🔨'
      category = 'anvil'
      name = 'Anvil'
    } else if (entity.type.includes('smeltingsource')) {
      icon = '🏭'
      category = 'furnace'
      name = 'Furnace'
    } else if (entity.type.includes('kiln')) {
      icon = '⚱️'
      category = 'kiln'
      name = 'Kiln'
    } else if (entity.type.includes('heatsource')) {
      icon = '🍳'
      category = 'stove'
      name = 'Stove'
    } else if (entity.type.includes('fishing')) {
      icon = '🎣'
      category = 'fishing'
      name = entity.type.replace('fishing', ' Fishing')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('pumpkin')) {
      icon = '🎃'
      category = 'harvestable'
      name = entity.type.replace('pumpkin', ' Pumpkin')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('corn')) {
      icon = '🌽'
      category = 'harvestable'
      name = entity.type.replace('corn', ' Corn')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('potatoes')) {
      icon = '🥔'
      category = 'harvestable'
      name = entity.type.replace('potatoes', ' Potatoes')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('onion')) {
      icon = '🧅'
      category = 'harvestable'
      name = entity.type.replace('onion', ' Onion')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('flax')) {
      icon = '🌾'
      category = 'harvestable'
      name = entity.type.replace('flax', ' Flax')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('carrot')) {
      icon = '🥕'
      category = 'harvestable'
      name = entity.type.replace('carrot', ' Carrot')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('redmushroom')) {
      icon = '🍄'
      category = 'harvestable'
      name = entity.type.replace('redmushroom', 'Red Mushroom')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('plant') && entity.type !== 'plant') {
      icon = '🌿'
      category = 'harvestable'
      name = entity.type.replace('plant', ' Plant')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('strawberries')) {
      icon = '🍓'
      category = 'harvestable'
      name = entity.type.replace('strawberries', 'Strawberries')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    } else if (entity.type.includes('watermelon')) {
      icon = '🍉'
      category = 'harvestable'
      name = entity.type.replace('watermelon', 'Watermelon')
      name = name.replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase()).trim()
    }
    
    // Add to searchable items
    searchableItems.push({
      id: `entity-${entity.x}-${entity.z}-${entity.type}`,
      name,
      icon,
      layer,
      x: entity.x + 512.5,
      y: entity.z + 512.5,
      type: category
    })
  })
}

onMounted(() => {
  watch([npcDefinitions, entitiesData], ([newDefs, newEntities]) => {
    if (newDefs && newEntities) {
      initializeSearchableItems(newDefs, newEntities);
    }
  }, { immediate: true });
})
</script>

<style scoped>
/* Using consistent website theme colors */

/* Unified control panel */
.unified-controls {
  background: rgba(26, 26, 26, 0.96);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--theme-border);
  overflow: hidden;
  transition: all 0.3s ease;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

/* Control sections */
.control-section {
  border-bottom: 1px solid var(--theme-border-light);
  padding: 0;
}

.control-section:last-child {
  border-bottom: none;
}

.section-header {
  padding: 8px 16px 4px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--theme-accent);
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(26, 26, 26, 0.98);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--theme-border-light);
}

.section-icon {
  font-size: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  color: var(--theme-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-content {
  padding: 16px;
}

/* Layer controls - Compressed */
.layer-buttons {
  display: flex;
  flex-direction: row;
  gap: 6px;
  padding: 8px 16px 12px 16px;
}

.layer-btn {
  padding: 8px 12px;
  border: 2px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;
  font-weight: 600;
  color: var(--theme-text-primary);
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex: 1;
  white-space: nowrap;
  justify-content: center;
}

.layer-btn:hover {
  border-color: var(--theme-accent);
  background: var(--theme-accent-transparent-10);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.layer-btn.active {
  border-color: var(--theme-accent);
  background: var(--theme-accent);
  color: var(--theme-text-dark);
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

/* Search panel - Compressed */
.search-section {
  border-bottom: none; /* Remove border since we're integrating with collapsible area */
}

.search-input-container {
  position: relative;
  margin-bottom: 6px;
  padding: 8px 16px 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid var(--theme-border);
  border-radius: 8px;
  font-size: 13px;
  transition: all 0.3s ease;
  background: var(--theme-background-mute);
  color: var(--theme-text-primary);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-input:focus {
  outline: none;
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-accent-transparent-10), inset 0 2px 4px rgba(0, 0, 0, 0.1);
  background: var(--theme-background-soft);
}

.search-input::placeholder {
  color: var(--theme-text-muted);
}

.controls-toggle {
  background: var(--theme-background-mute);
  border: 2px solid var(--theme-border);
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--theme-text-muted);
  font-size: 12px;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.controls-toggle:hover {
  border-color: var(--theme-accent);
  background: var(--theme-accent-transparent-10);
  color: var(--theme-accent);
}

.controls-toggle.active {
  border-color: var(--theme-accent);
  background: var(--theme-accent);
  color: var(--theme-text-dark);
}

.controls-toggle-icon {
  font-weight: bold;
}

.search-results {
  max-height: 180px;
  overflow-y: auto;
  padding: 0 16px 12px;
}

/* Collapsible Controls Area */
.collapsible-controls {
  border-top: 1px solid var(--theme-border-light);
  animation: slideDown 0.3s ease-out;
  background: rgba(20, 20, 20, 0.5);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 500px;
  }
}

.filter-summary {
  font-size: 11px;
  color: var(--theme-text-muted);
  font-weight: 600;
  background: var(--theme-accent-transparent-10);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid var(--theme-accent-transparent-20);
}

/* Section Headers */
.section-header {
  padding: 8px 16px 4px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--theme-accent);
  background: rgba(26, 26, 26, 0.98);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--theme-border-light);
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  color: var(--theme-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--theme-border-light);
  color: var(--theme-text-primary);
  border-radius: 6px;
  margin-bottom: 4px;
  background: var(--theme-background-mute);
}

.search-result-item:hover {
  background: var(--theme-accent-transparent-10);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-result-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.result-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.result-name {
  flex: 1;
  font-weight: 500;
  color: var(--theme-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-layer {
  font-size: 11px;
  color: var(--theme-text-dark);
  background: var(--theme-accent-transparent-60);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

/* Markers section */
.toggle-all-btn {
  padding: 8px 16px;
  font-size: 12px;
  background: var(--theme-accent);
  border: none;
  border-radius: 8px;
  color: var(--theme-text-dark);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 700;
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.toggle-all-btn:hover {
  background: var(--theme-accent-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Filter controls with enhanced category indicators - Compressed */
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 16px 12px 16px;
}

.filter-tag {
  padding: 6px 10px;
  border: 2px solid var(--theme-border);
  border-radius: 20px;
  background: var(--theme-background-mute);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 11px;
  font-weight: 500;
  color: var(--theme-text-muted);
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-tag:hover {
  border-color: var(--theme-accent-transparent-40);
  background: var(--theme-accent-transparent-10);
  color: var(--theme-text-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.filter-tag.active {
  border-color: var(--theme-accent-transparent-40);
  background: var(--theme-accent-transparent-10);
  color: var(--theme-text-primary);
  font-weight: 600;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
}

/* Category-specific colors for better contrast */
.filter-tag[data-category="Banks"] {
  --category-color: #ffd700;
  --category-bg: rgba(255, 215, 0, 0.1);
  --category-border: rgba(255, 215, 0, 0.3);
}

.filter-tag[data-category="Shops"] {
  --category-color: #00ff7f;
  --category-bg: rgba(0, 255, 127, 0.1);
  --category-border: rgba(0, 255, 127, 0.3);
}

.filter-tag[data-category="NPCs"] {
  --category-color: #87ceeb;
  --category-bg: rgba(135, 206, 235, 0.1);
  --category-border: rgba(135, 206, 235, 0.3);
}

.filter-tag[data-category="Attackable NPCs"] {
  --category-color: #ff6347;
  --category-bg: rgba(255, 99, 71, 0.1);
  --category-border: rgba(255, 99, 71, 0.3);
}

.filter-tag[data-category="Aggro NPCs"] {
  --category-color: #ff1493;
  --category-bg: rgba(255, 20, 147, 0.1);
  --category-border: rgba(255, 20, 147, 0.3);
}

.filter-tag[data-category="Trees"] {
  --category-color: #90ee90;
  --category-bg: rgba(144, 238, 144, 0.1);
  --category-border: rgba(144, 238, 144, 0.3);
}

.filter-tag[data-category="Obelisks"] {
  --category-color: #dda0dd;
  --category-bg: rgba(221, 160, 221, 0.1);
  --category-border: rgba(221, 160, 221, 0.3);
}

.filter-tag[data-category="Ores"] {
  --category-color: #d2691e;
  --category-bg: rgba(210, 105, 30, 0.1);
  --category-border: rgba(210, 105, 30, 0.3);
}

.filter-tag[data-category="Fires"] {
  --category-color: #ff4500;
  --category-bg: rgba(255, 69, 0, 0.1);
  --category-border: rgba(255, 69, 0, 0.3);
}

.filter-tag[data-category="Anvils"] {
  --category-color: #c0c0c0;
  --category-bg: rgba(192, 192, 192, 0.1);
  --category-border: rgba(192, 192, 192, 0.3);
}

.filter-tag[data-category="Furnaces"] {
  --category-color: #ff8c00;
  --category-bg: rgba(255, 140, 0, 0.1);
  --category-border: rgba(255, 140, 0, 0.3);
}

.filter-tag[data-category="Kilns"] {
  --category-color: #cd853f;
  --category-bg: rgba(205, 133, 63, 0.1);
  --category-border: rgba(205, 133, 63, 0.3);
}

.filter-tag[data-category="Stoves"] {
  --category-color: #ffa500;
  --category-bg: rgba(255, 165, 0, 0.1);
  --category-border: rgba(255, 165, 0, 0.3);
}

.filter-tag[data-category="Fishing Spots"] {
  --category-color: #00bfff;
  --category-bg: rgba(0, 191, 255, 0.1);
  --category-border: rgba(0, 191, 255, 0.3);
}

.filter-tag[data-category="Harvestables"] {
  --category-color: #adff2f;
  --category-bg: rgba(173, 255, 47, 0.1);
  --category-border: rgba(173, 255, 47, 0.3);
}

.filter-tag[data-category="Locations"] {
  --category-color: #ffffff;
  --category-bg: rgba(255, 255, 255, 0.1);
  --category-border: rgba(255, 255, 255, 0.3);
}

.filter-tag.active[data-category] {
  background: var(--category-bg);
  border-color: var(--category-border);
  color: var(--category-color);
}

.filter-icon {
  font-size: 14px;
}

.filter-name {
  font-size: 11px;
  white-space: nowrap;
}

.marker-count {
  background: var(--theme-accent-transparent-20);
  color: var(--theme-accent);
  padding: 1px 4px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  text-align: center;
}

/* Responsive Design */
@media (max-width: 768px) {
  .unified-controls {
    border-radius: 8px;
    margin: 0;
    max-height: calc(100vh - 80px);
    width: 100%;
    box-sizing: border-box;
  }

  .search-input-container {
    padding: 6px 12px 0 12px;
    flex-wrap: wrap;
    gap: 6px;
  }

  .search-input {
    padding: 8px 12px;
    font-size: 14px;
  }

  .controls-toggle {
    min-width: 30px;
    height: 30px;
  }

  .search-results {
    padding: 0 12px 8px;
    max-height: 120px;
  }

  .layer-buttons {
    padding: 6px 12px 8px 12px;
    gap: 4px;
  }

  .layer-btn {
    padding: 10px 8px;
    font-size: 12px;
  }

  .section-header {
    padding: 6px 12px 3px 12px;
  }

  .section-title {
    font-size: 13px;
  }

  .filter-tags {
    padding: 0 12px 12px;
    gap: 6px;
  }

  .filter-tag {
    padding: 8px 10px;
    font-size: 11px;
  }

  .filter-icon {
    font-size: 14px;
  }

  .filter-name {
    font-size: 11px;
  }

  .marker-count {
    font-size: 9px;
    min-width: 14px;
  }

  .controls-toggle {
    min-width: 28px;
    height: 28px;
    padding: 4px 6px;
  }

  .search-result-item {
    padding: 8px 10px;
    gap: 8px;
  }

  .result-icon {
    font-size: 14px;
  }

  .result-name {
    font-size: 12px;
  }

  .result-layer {
    font-size: 10px;
    padding: 2px 6px;
  }
}

@media (max-width: 480px) {
  .unified-controls {
    border-radius: 6px;
    max-height: calc(100vh - 60px);
    width: 100%;
    box-sizing: border-box;
  }

  .layer-buttons {
    flex-direction: column;
    gap: 4px;
    padding: 6px 8px 8px 8px;
  }

  .layer-btn {
    padding: 12px 8px;
    font-size: 13px;
    width: 100%;
  }

  .search-input-container {
    padding: 4px 8px 0 8px;
    flex-wrap: wrap;
    gap: 4px;
  }

  .search-input {
    padding: 10px 12px;
    font-size: 16px; /* Prevents zoom on iOS */
  }

  .section-header {
    padding: 6px 8px 3px 8px;
  }

  .filter-tags {
    padding: 0 8px 8px;
    gap: 4px;
  }

  .filter-tag {
    padding: 10px 8px;
    min-height: 44px; /* Touch-friendly size */
  }

  .controls-toggle {
    min-width: 36px;
    height: 36px;
    padding: 6px 8px;
    font-size: 14px;
  }

  .search-results {
    padding: 0 8px 6px;
  }

  .search-result-item {
    padding: 12px 8px;
    min-height: 44px;
  }
}

/* Landscape orientation optimizations */
@media (max-width: 768px) and (orientation: landscape) {
  .layer-buttons {
    flex-direction: row;
  }

  .layer-btn {
    padding: 8px 6px;
    font-size: 11px;
  }

  .filter-tags {
    gap: 4px;
  }

  .filter-tag {
    padding: 6px 8px;
    min-height: auto;
  }
}
</style>
