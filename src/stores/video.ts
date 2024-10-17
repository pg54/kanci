import { defineStore } from 'pinia'

export const useVideoStore = defineStore('video', () => {
  const videoSrc = ref<string | null>(null)
  const subtitleSrc = ref<string | null>(null)
  const episode = ref<string | null>(null)
  const seriesName = ref<string | null>(null)

  function setVideoSrc(src: string | null) {
    videoSrc.value = src
  }

  function setSubtitleSrc(src: string | null) {
    subtitleSrc.value = src
  }

  function setEpisode(ep: string | null) {
    episode.value = ep
  }

  function setSeriesName(name: string | null) {
    seriesName.value = name
  }

  return {
    videoSrc,
    subtitleSrc,
    episode,
    seriesName,
    setVideoSrc,
    setSubtitleSrc,
    setEpisode,
    setSeriesName,
  }
})
