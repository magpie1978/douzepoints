export function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

export function openModalStrict(videoUrl, entry) {

  if (!videoUrl) {
    console.error("[video] Missing video URL", entry);
    return;
  }

  // Google Analytics
  if (typeof gtag === "function") {
    gtag("event","video_play",{
      song_title: entry?.Song || "",
      artist: entry?.Artist || "",
      edition_year: entry?.Year || "",
      country: entry?.Country || ""
    });
  }

  if (window.openVideoModal) {
    window.openVideoModal({url: videoUrl, entry});
  }
}
