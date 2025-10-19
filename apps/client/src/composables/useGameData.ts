import { ref } from 'vue'

const MANIFEST_URL = 'https://highspell.com:3002/assetsClient';

const npcDefinitions = ref<any>(null);
const worldEntities = ref<any>(null);
const isLoading = ref(false);

async function loadData() {
  if (isLoading.value || npcDefinitions.value) return;

  isLoading.value = true;
  console.log('Fetching game data...');

  try {
    const manifestRes = await fetch(MANIFEST_URL);
    const manifest = await manifestRes.json();

    const npcPath = manifest.data.files.defs.npcEntityDefs;
    const entitiesPath = manifest.data.files.defs.worldEntities;

    const [npcRes, entitiesRes] = await Promise.all([
      fetch(npcPath),
      fetch(entitiesPath)
    ]);

    if (!npcRes.ok) throw new Error(`Failed to fetch ${npcPath}`);
    if (!entitiesRes.ok) throw new Error(`Failed to fetch ${entitiesPath}`);

    npcDefinitions.value = await npcRes.json();
    worldEntities.value = await entitiesRes.json();

  } catch (err) {
    console.error("Failed to load game data:", err);
  } finally {
    isLoading.value = false;
  }
}

export function useGameData() {
  loadData();
  
  return { npcDefinitions, entitiesData: worldEntities, isLoading };
}