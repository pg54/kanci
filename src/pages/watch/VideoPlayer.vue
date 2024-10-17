<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { storeToRefs } from 'pinia'
import { useVirtualList } from '@vueuse/core'
import WordCard from './wordCard.vue'
import AnalyzePopup from './AnalyzePopup.vue' // 新增导入
import supabase from '~/api/supabase'

const videoStore = useVideoStore()

// 使用 store 中的值
const { videoSrc, subtitleSrc, seriesName, episode } = storeToRefs(videoStore)

const videoPlayer = ref(null)
const player = ref(null)
const subtitles = ref([])
const words = ref([])
const showChineseSubtitle = ref(false)
const currentChineseSubtitle = ref('')
const selectedWord = ref('')
const selectedStr = ref('')
const isWordCardVisible = ref(false)
const subtitleListHeight = ref('0px')
const showSubtitles = ref(true)
const showAnalyzePopup = ref(false) // 新增状态
const selectedChinese = ref('')

// 添加一个计算属性来创建单词到状态的映射
const wordStatusMap = computed(() => {
  const map = new Map()
  words.value.forEach((word) => {
    map.set(word.name.toLowerCase(), word.status)
  })
  return map
})

function updateWordStatus(word, status) {
  console.log('Updating word status:', word, status)
  const index = words.value.findIndex(item => item.name.toLowerCase() === word.toLowerCase())
  if (index !== -1) {
    words.value[index].status = status
  }
  else {
    // Add new word if it doesn't exist
    words.value.push({ name: word, status })
  }
  // Update the wordStatusMap
  // wordStatusMap.value.set(word.toLowerCase(), status)
}

async function getList() {
  try {
    const { data, error } = await supabase
      .from('word')
      .select('*')
      .eq('series_name', seriesName.value)
      .eq('episode', episode.value)

    if (error) {
      console.error('Supabase error:', error)
      return
    }
    console.log('Fetched words:', data.length)
    words.value = data
  }
  catch (e) {
    console.error('Unexpected error:', e)
  }
}

// 初始化 Video.js
onMounted(async () => {
  player.value = videojs(videoPlayer.value, {
    fluid: true,
    responsive: true,
  })

  player.value.ready(() => {
    const track = player.value.textTracks()[0]

    // 使用 oncuechange 事件
    track.oncuechange = () => {
      if (track.cues && track.cues.length > 0) {
        loadSubtitles(track).then(() => {
          initializeVirtualList()
        })
      }
    }

    // 监听时间更新以高亮当前字幕
    player.value.on('timeupdate', () => {
      const currentTime = player.value.currentTime()
      let activeSubtitle = null
      subtitles.value.forEach((item) => {
        if (currentTime >= item.startTime && currentTime <= item.endTime) {
          activeSubtitle = item
        }
      })
      if (activeSubtitle) {
        currentChineseSubtitle.value = activeSubtitle.chinese
        showChineseSubtitle.value = true
      }
      else {
        showChineseSubtitle.value = false
      }
    })
  })

  // 调用函数设置初始高度
  adjustSubtitleListHeight()
  // 监听窗口大小变化
  window.addEventListener('resize', adjustSubtitleListHeight)

  getList()
})

// 清理 Video.js 实例
onBeforeUnmount(() => {
  if (player.value) {
    player.value.dispose()
  }
  // 移除事件监听器
  window.removeEventListener('resize', adjustSubtitleListHeight)
})

// 判断字幕项是否为当前活动项
function isActive(item) {
  const currentTime = player.value ? player.value.currentTime() : 0
  return currentTime >= item.startTime && currentTime <= item.endTime
}

// 调整字幕列表高度（与原始代码中的功能类似）
function adjustSubtitleListHeight() {
  const videoContainer = document.getElementById('video-container')
  if (videoContainer) {
    const videoHeight = videoContainer.offsetHeight
    const windowHeight = window.innerHeight
    const toolbarHeight = 30 // Height of the toolbar
    subtitleListHeight.value = `${windowHeight - videoHeight - toolbarHeight}px`
  }
}

// 新增：将字幕加载逻辑抽取为单独的函数
async function loadSubtitles(track) {
  return new Promise((resolve) => {
    const cues = track.cues
    subtitles.value = []
    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i]
      const lines = cue.text.split('\n')
      const english = lines[1] || lines[0]
      const chinese = lines[0].replace(/[^\u4E00-\u9FA5]/g, '')
      subtitles.value.push({
        startTime: cue.startTime,
        endTime: cue.endTime,
        english,
        chinese,
        isPlaying: false,
      })
    }
    resolve()
  })
}

const canAdd = ref(true)
// 修改 handleWordClick 函数
async function handleWordClick(word, str, chinese, notFamiliar) {
  // Remove punctuation from the beginning and end of the word
  const singleWord = word.replace(/^[^\w\s]+|[^\w\s]+$/g, '')
    .replace(/'/g, '\'') // Normalize apostrophes
    .toLowerCase()

  // Handle contractions and possessives
  const finalWord = singleWord.replace(/('s|'t|'re|'ve|'m|'ll|'d)$/, '')

  selectedWord.value = finalWord
  selectedStr.value = str
  selectedChinese.value = chinese
  isWordCardVisible.value = true
  canAdd.value = !notFamiliar
}

function closeWordCard() {
  isWordCardVisible.value = false
}

// 虚拟列表设置
const containerRef = ref(null)
const { list, containerProps, wrapperProps } = useVirtualList(
  subtitles,
  {
    itemHeight: 50, // 估计每个字幕项的高度，根据实际情况调整
    overscan: 20, // 增加预渲染的项目数
  },
)

// 新增函数来初始化虚拟列表
function initializeVirtualList() {
  nextTick(() => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
      // 触发一次滚动事件，以确保内容被渲染
      containerRef.value.dispatchEvent(new Event('scroll'))
    }
  })
}

// 添加一个新的函数来处理英文句子的分割
function splitEnglishSentence(sentence) {
  // 这个正则表达式会匹配单词、缩写和标点符号
  return sentence.match(/\b[\w']+\b|[.,!?;:]/g) || []
}

function togglePlayPause(item) {
  const { startTime: time, isPlaying } = item.data
  if (isPlaying) {
    player.value.currentTime(time)
    player.value.pause()
  }
  else {
    player.value.currentTime(time)
    player.value.play()
  }
  item.data.isPlaying = !isPlaying
}

// New toolbar
function toggleSubtitles() {
  showSubtitles.value = !showSubtitles.value
  // 切换播放器的字幕
  player.value.textTracks()[0].mode = showSubtitles.value ? 'showing' : 'hidden'
}

function analyze() {
  showAnalyzePopup.value = !showAnalyzePopup.value
}

function openAI() {
  // Implement AI functionality
  console.log('AI button clicked')
}

function closeAnalyzePopup() {
  showAnalyzePopup.value = false
}

// Add this new ref for playback speed
const playbackSpeed = ref(1)

// Replace the toggleSubtitles function with this new function
function togglePlaybackSpeed() {
  playbackSpeed.value = playbackSpeed.value === 1 ? 0.5 : 1
  player.value.playbackRate(playbackSpeed.value)
}
</script>

<template>
  <div class="video-component">
    <div id="video-container">
      <video
        ref="videoPlayer"
        class="video-js"
        controls
        preload="auto"
        data-setup="{}"
      >
        <source :src="videoSrc" type="video/mp4">
        <track
          kind="captions"
          :src="subtitleSrc"
          srclang="en"
          label="English"
          default
        >
        <p class="vjs-no-js">
          要查看此视频，请启用JavaScript，并考虑升级到支持HTML5视频的浏览器
          <a href="https://videojs.com/html5-video-support/" target="_blank">
            支持HTML5视频的浏览器
          </a>
        </p>
      </video>
    </div>

    <div
      id="subtitle-list"
      ref="containerRef"
      v-bind="containerProps"
      :style="{ height: subtitleListHeight, overflowY: 'auto' }"
    >
      <div v-bind="wrapperProps">
        <div
          v-for="item in list"
          :key="item.index"
          class="subtitle-item"
          :class="[{ active: isActive(item.data) }]"
        >
          <div class="english-subtitle">
            <span
              v-for="(word, wordIndex) in splitEnglishSentence(item.data.english)"
              :key="wordIndex"
              class="word"
              :class="{
                notFamiliar: wordStatusMap.get(word.toLowerCase()) === 3,
                punctuation: /^[.,!?;:]$/.test(word),
              }"
              style="padding: 2px;"
              @click="!(/^[.,!?;:]$/.test(word)) && handleWordClick(word, item.data.english, item.data.chinese, wordStatusMap.get(word.toLowerCase()) === 3)"
            >
              {{ word }}
            </span>
          </div>
          <div>
            <button class="control-button" @click="togglePlayPause(item)">
              <div v-if="!item.data.isPlaying" i-carbon-play-filled-alt />
              <div v-else i-carbon-pause-outline-filled />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- New toolbar -->
    <div class="toolbar">
      <button class="toolbar-button" @click="togglePlaybackSpeed">
        {{ playbackSpeed }}x
      </button>
      <button class="toolbar-button" @click="analyze">
        <div i-carbon:application-virtual />
      </button>
      <button class="toolbar-button" @click="openAI">
        <div i-carbon:ai-governance-lifecycle />
      </button>
    </div>

    <!-- WordCard Popup -->
    <WordCard
      :visible="isWordCardVisible"
      :word="selectedWord"
      :sentence="selectedStr"
      :chinese="selectedChinese"
      :can-add="canAdd"
      @close="closeWordCard"
      @update-word-status="updateWordStatus"
    />

    <!-- AnalyzePopup -->
    <AnalyzePopup v-if="showAnalyzePopup" @close="closeAnalyzePopup" />
  </div>
</template>

<style scoped>
/* 重置样式 */
body,
html {
  margin: 0;
  padding: 0;
  height: 100%;
}

.video-component {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
}

#video-container {
  width: 100%;
  position: relative;
}

video {
  width: 100% !important;
  height: auto !important;
  max-height: 50vh; /* 限制视频高度为视口高度的50% */
}

#subtitle-list {
  width: 100%;
  box-sizing: border-box;
  margin-top: 0;
  border: 1px solid #ccc;
  padding: 10px;
  overflow-anchor: none; /* 防止滚动锚定影响虚拟列表 */
}

.subtitle-item {
  margin-bottom: 10px;
  padding: 5px;
  background-color: #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.english-subtitle {
  width: 86%;
  display: flex;
  flex-wrap: wrap;
}

.subtitle-item.active {
  background-color: #e0e0e0;
}

.jump-button,
.zh-button {
  background-color: #4caf50;
  border: none;
  color: white;
  padding: 5px 10px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 12px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 3px;
}

.zh-button {
  background-color: #008cba;
}

.word {
  margin-right: 4px;
  margin-bottom: 4px;
  cursor: pointer;
}

.recognize {
  background-color: #4caf50;
  color: white;
}

.notFamiliar {
  background-color: #ffc107;
  color: black;
}

.forget {
  background-color: #f44336;
  color: white;
}

.word.punctuation {
  margin-left: -2px;
  margin-right: 2px;
  cursor: default;
}

/* New toolbar styles */
.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background-color: #f0f0f0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 10px;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
}

.toolbar-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #333;
  padding: 5px;
  transition: color 0.3s ease;
}

.toolbar-button:hover {
  color: #007bff;
}

/* Adjust subtitle list to account for toolbar */
#subtitle-list {
  padding-bottom: 10px;
  margin-bottom: 40px; /* Same as toolbar height */
}
</style>
