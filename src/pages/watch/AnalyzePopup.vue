<script setup>
import { storeToRefs } from 'pinia'
import clipboardCopy from 'clipboard-copy'
import supabase from '~/api/supabase'

const emit = defineEmits(['close'])

const videoStore = useVideoStore()
const { seriesName } = storeToRefs(videoStore)

const wordsStr = ref('')

function close() {
  emit('close')
}

function copyContent() {
  clipboardCopy(wordsStr.value.replace(/<br\/>/g, '\n'))
    .then(() => {
      alert('Content copied to clipboard!')
    })
    .catch((err) => {
      console.error('Failed to copy content:', err)
      alert('Failed to copy content. Please try again.')
    })
}

onMounted(async () => {
  const { data, error } = await supabase
    .from('word')
    .select('*')
    .eq('series_name', seriesName.value)
    .order('episode')
    .order('name')

  if (error) {
    console.error('Supabase error:', error)
    return
  }

  const wordsByEpisode = data.reduce((acc, word) => {
    if (!acc[word.episode]) {
      acc[word.episode] = []
    }
    acc[word.episode].push(word.name)
    return acc
  }, {})

  wordsStr.value = Object.entries(wordsByEpisode)
    .map(([episode, words]) => `#episode${episode}<br/>${words.join('<br/>')}`)
    .join('<br/>')
})
</script>

<template>
  <div class="analyze-popup">
    <button class="copy-button" @click="copyContent">
      Copy Content
    </button>
    <div class="analyze-content" v-html="wordsStr" />
  </div>
</template>

<style scoped>
.analyze-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 40px; /* 留出 toolbar 的空间 */
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.analyze-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 80%;
  max-height: 80%;
  overflow-y: auto;
}

.copy-button {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.copy-button:hover {
  background-color: #45a049;
}
</style>
