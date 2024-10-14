import { defineStore } from 'pinia'

export const useVideoStore = defineStore('video', () => {
  const videoSrc = ref<string | null>(null)
  const subtitleSrc = ref<string | null>(null)

  function setVideoSrc(src: string | null) {
    videoSrc.value = src
  }

  function setSubtitleSrc(src: string | null) {
    subtitleSrc.value = src
  }

  return {
    videoSrc,
    subtitleSrc,
    setVideoSrc,
    setSubtitleSrc,
  }
})
