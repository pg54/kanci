<script setup>
import { storeToRefs } from 'pinia'
import supabase from '~/api/supabase'
import { deepseek } from '~/api/deepseek'

const props = defineProps({
  word: {
    type: String,
    required: true,
  },
  sentence: {
    type: String,
    required: true,
  },
  chinese: {
    type: String,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
  canAdd: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['close', 'updateWordStatus'])

const videoStore = useVideoStore()

// 使用 store 中的值
const { seriesName, episode } = storeToRefs(videoStore)

const phonetic = ref('')
const audio = ref('')
const meanings = ref([])
const isLoading = ref(false)
const hasError = ref(false)

const jsonContent = ref({})

const isDeepseekLoading = ref(false)

async function getWordData(word) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${props.word}`)
  const data = await response.json()
  if (data && data.length > 0) {
    const wordData = data[0]
    phonetic.value = wordData.phonetic || ''
    audio.value = wordData.phonetics.find(p => p.audio)?.audio || ''
    meanings.value = wordData.meanings.slice(0, 3)
  }
}

watch(() => props.word, async () => {
  isLoading.value = true
  hasError.value = false
  try {
    console.log('props.word', props.word)
  }
  catch (error) {
    console.error('Error fetching word data:', error)
    hasError.value = true
  }
  finally {
    isLoading.value = false
  }
})

function playAudio() {
  if (audio.value) {
    new Audio(audio.value).play()
  }
}

function close() {
  emit('close')
}

async function handleDeepseek() {
  isDeepseekLoading.value = true
  try {
    const content = await deepseek(props.sentence, props.chinese, props.word)

    // 使用正则表达式提取 JSON 部分
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)

    if (jsonMatch && jsonMatch[1]) {
      try {
        jsonContent.value = JSON.parse(jsonMatch[1])
      }
      catch (error) {
        console.error('Error parsing JSON:', error)
      }
    }
  }
  catch (error) {
    console.error('Error fetching deepseek content:', error)
  }
  finally {
    isDeepseekLoading.value = false
  }
}

async function handleMemorize() {
  const { data, error } = await supabase
    .from('word')
    .insert([
      {
        name: props.word,
        sentence: props.sentence,
        status: 3,
        episode: episode.value,
        series_name: seriesName.value,
        // user_id: user.id, // Add the user's ID to the insert
      },
    ])

  if (error)
    throw error
  console.log('Word added successfully:', data)
  // You might want to add some user feedback here
  emit('updateWordStatus', props.word, 3)
  close()
}
</script>

<template>
  <div v-if="visible" class="word-card-overlay">
    <div class="word-card">
      <button class="close-button" @click.stop="close">
        <div i-carbon:close-filled />
      </button>
      <div v-if="isLoading" class="loading">
        加载中...
      </div>
      <div v-else-if="hasError" class="error">
        无法获取单词信息
      </div>
      <template v-else>
        <div mb-2>
          <p mb-1 text-xl>
            {{ word }}
          </p>
          <p>{{ sentence }}</p>
          <p>{{ chinese }}</p>
        </div>
        <div class="deepsek-content" :class="{ loading: isDeepseekLoading }">
          <div v-if="isDeepseekLoading" class="loading-text">
            加载中...
          </div>
          <div v-for="(value, key) in jsonContent" v-else :key="key" my-1>
            <strong>{{ key }}:</strong> {{ value }}
          </div>
        </div>
        <div class="button-row">
          <button class="action-button recognize" @click="handleDeepseek">
            deepseek
          </button>
          <button v-if="canAdd" class="action-button familiar" @click="handleMemorize">
            加入记忆
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.word-card-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.word-card {
  position: relative;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 16px;
  max-width: 400px;
  margin: 0 auto;
  background: #fff;
}

.word-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.word-header h2 {
  margin-right: 8px;
}

.phonetic {
  color: #666;
}

.audio-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  color: #4a4a4a;
}

.meanings {
  margin-bottom: 16px;
}

.meaning h3 {
  color: #4a4a4a;
  margin-bottom: 8px;
}

.button-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.action-button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.recognize {
  background-color: #4caf50;
  color: white;
}

.familiar {
  background-color: #ffc107;
  color: black;
}

.forget {
  background-color: #f44336;
  color: white;
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  color: #4a4a4a;
}

.loading,
.error {
  text-align: center;
  padding: 20px;
  font-size: 1.2em;
  color: #666;
}

.error {
  color: #f44336;
}

.deepsek-content.loading {
  position: relative;
  min-height: 50px;
}

.loading-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
