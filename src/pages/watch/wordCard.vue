<script setup>
import { onMounted, ref } from 'vue'
import supabase from '~/api/supabase'

const props = defineProps({
  word: {
    type: String,
    required: true,
  },
  sentence: {
    type: String,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'updateWordStatus'])

const phonetic = ref('')
const audio = ref('')
const meanings = ref([])
const isLoading = ref(false)
const hasError = ref(false)

watch(() => props.word, async () => {
  isLoading.value = true
  hasError.value = false
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${props.word}`)
    const data = await response.json()
    if (data && data.length > 0) {
      const wordData = data[0]
      phonetic.value = wordData.phonetic || ''
      audio.value = wordData.phonetics.find(p => p.audio)?.audio || ''
      meanings.value = wordData.meanings.slice(0, 3)
    }
    else {
      hasError.value = true
    }
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

async function addWordToDatabase(status) {
  try {
    const { data, error } = await supabase
      .from('word')
      .insert([
        {
          name: props.word,
          sentence: props.sentence,
          status,
          score: 0,
          // user_id: user.id, // Add the user's ID to the insert
        },
      ])

    if (error)
      throw error
    console.log('Word added successfully:', data)
    // You might want to add some user feedback here
    emit('updateWordStatus', props.word, status)
  }
  catch (error) {
    console.error('Error adding word to database:', error)
    // You might want to add some error handling for the user here
  }
}

function handleRecognize() {
  addWordToDatabase(1)
  close()
}

function handleFamiliar() {
  addWordToDatabase(2)
  close()
}

function handleForget() {
  addWordToDatabase(3)
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
        <div class="word-header">
          <h2>{{ word }}</h2>
          <span class="phonetic">{{ phonetic }}</span>
          <button class="audio-button" @click="playAudio">
            <div i-carbon:ai-generate />
          </button>
        </div>
        <div class="meanings">
          <div v-for="(meaning, index) in meanings" :key="index" class="meaning">
            <h3>{{ meaning.partOfSpeech }}</h3>
            <ol>
              <li v-for="(definition, defIndex) in meaning.definitions[0]" :key="defIndex">
                {{ definition.definition }}
              </li>
            </ol>
          </div>
        </div>
        <div class="button-row">
          <button class="action-button recognize" @click="handleRecognize">
            认识
          </button>
          <button class="action-button familiar" @click="handleFamiliar">
            模糊
          </button>
          <button class="action-button forget" @click="handleForget">
            忘记
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
</style>
