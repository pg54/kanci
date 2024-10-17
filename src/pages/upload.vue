<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const router = useRouter()
const videoStore = useVideoStore()

const { videoSrc, subtitleSrc, episode, seriesName } = storeToRefs(videoStore)

// 新增：用于存储文件名
const videoFileName = ref('')
const subtitleFileName = ref('')

function handleVideoSelect(event) {
  const file = event.target.files[0]
  if (file) {
    videoStore.setVideoSrc(URL.createObjectURL(file))
    videoFileName.value = file.name // 设置视频文件名

    // 提取视频文件名中的剧集信息
    const episodeRegex = /S(\d+)E(\d+)/
    const match = file.name.match(episodeRegex)
    console.log('match', match)
    if (match[0]) {
      videoStore.setEpisode(match[0])
    }
  }
}

// Add this function to convert SRT to VTT
function convertSrtToVtt(srtContent) {
  const vttContent = `WEBVTT\n\n${srtContent
    .replace(/\{[^}]*\}/g, '')
    .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')}`
  return vttContent
}

function handleSubtitleSelect(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      const vttContent = convertSrtToVtt(content)
      videoStore.setSubtitleSrc(URL.createObjectURL(new Blob([vttContent], { type: 'text/vtt' })))
      subtitleFileName.value = file.name // 设置字幕文件名
    }
    reader.readAsText(file)
  }
}

// 修改：移除自动跳转，改为通过按钮触发
function loadAndNavigate() {
  if (videoSrc.value && subtitleSrc.value) {
    router.push('/watch')
  }
  else {
    alert('请选择视频和字幕文件')
  }
}

onMounted(() => {
  videoStore.setSeriesName('TBBT')
})
</script>

<template>
  <div class="container">
    <div id="file-inputs" class="file-inputs">
      <input v-model="seriesName" text-center type="text" placeholder="剧名">
      <span class="file-name" text-center>{{ episode }}</span>
      <label class="file-input-label">
        <input type="file" accept="mp4/*" class="file-input" @change="handleVideoSelect">
        <span class="file-input-text">选择视频</span>
      </label>
      <span v-if="videoFileName" class="file-name">{{ videoFileName }}</span>

      <label class="file-input-label">
        <input type="file" accept=".srt,.vtt" class="file-input" @change="handleSubtitleSelect">
        <span class="file-input-text">选择字幕</span>
      </label>
      <span v-if="subtitleFileName" class="file-name">{{ subtitleFileName }}</span>

      <button class="load-button" @click="loadAndNavigate">
        加载
      </button>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.file-inputs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-input-label {
  display: inline-block;
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  cursor: pointer;
  border-radius: 5px;
  text-align: center;
}

.file-input {
  display: none;
}

.file-input-text {
  font-size: 16px;
}

.file-name {
  margin-top: 0.5rem;
  font-size: 14px;
  color: #666;
}

.load-button {
  margin-top: 1rem;
  padding: 10px 20px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.load-button:hover {
  background-color: #1976d2;
}
</style>
