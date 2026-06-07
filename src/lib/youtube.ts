export function extraerYouTubeId(input: string): string {
  const s = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s
  let m = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (m) return m[1]
  m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (m) return m[1]
  m = s.match(/embed\/([a-zA-Z0-9_-]{11})/)
  if (m) return m[1]
  return s
}

export function getEmbedUrl(youtubeUrl: string): string {
  return `https://www.youtube.com/embed/${extraerYouTubeId(youtubeUrl)}?rel=0&modestbranding=1`
}

export function getThumbnailUrl(youtubeUrl: string): string {
  return `https://img.youtube.com/vi/${extraerYouTubeId(youtubeUrl)}/maxresdefault.jpg`
}
