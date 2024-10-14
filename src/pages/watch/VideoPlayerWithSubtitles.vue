<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { storeToRefs } from 'pinia'
import { useVirtualList } from '@vueuse/core'
import WordCard from './wordCard.vue'
import supabase from '~/api/supabase'

const videoStore = useVideoStore()

// 使用 store 中的值
const { videoSrc, subtitleSrc } = storeToRefs(videoStore)

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

    if (error) {
      console.error('Supabase error:', error)
      return
    }
    console.log('Fetched words:', data)
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

// 跳转到指定时间
function jumpTo(time) {
  if (player.value) {
    player.value.currentTime(time)
    player.value.play()
  }
}

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
    subtitleListHeight.value = `${windowHeight - videoHeight}px`
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
      })
    }
    resolve()
  })
}

// 修改 handleWordClick 函数
function handleWordClick(word, str) {
  // Remove punctuation from the beginning and end of the word
  const singleWord = word.replace(/^[^\w\s]+|[^\w\s]+$/g, '')
    .replace(/'/g, '\'') // Normalize apostrophes
    .toLowerCase()

  // Handle contractions and possessives
  const finalWord = singleWord.replace(/('s|'t|'re|'ve|'m|'ll|'d)$/, '')

  selectedWord.value = finalWord
  selectedStr.value = str
  isWordCardVisible.value = true
}

function closeWordCard() {
  isWordCardVisible.value = false
  // selectedWord.value = ''
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
              v-for="(word, wordIndex) in item.data.english.split(' ')"
              :key="wordIndex"
              class="word"
              :class="{
                recognize: wordStatusMap.get(word.toLowerCase()) === 1,
                familiar: wordStatusMap.get(word.toLowerCase()) === 2,
                forget: wordStatusMap.get(word.toLowerCase()) === 3,
              }"
              style="padding: 2px;"
              @click="handleWordClick(word, item.data.english)"
            >
              {{ word }}
            </span>
          </div>
          <div>
            <button class="jump-button" @click="jumpTo(item.data.startTime)">
              Jump
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- WordCard Popup -->
    <WordCard
      :visible="isWordCardVisible"
      :word="selectedWord"
      :sentence="selectedStr"
      @close="closeWordCard"
      @update-word-status="updateWordStatus"
    />
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

.familiar {
  background-color: #ffc107;
  color: black;
}

.forget {
  background-color: #f44336;
  color: white;
}
</style>
