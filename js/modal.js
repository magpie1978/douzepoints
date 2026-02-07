// ------------------------------------------------------------
// 🎬 VIDEO MODAL (PLAYBACK ONLY – NO TRACKING)
// ------------------------------------------------------------

(function () {

  // Prevent duplicate modal definition
  if (window.openVideoModal) return;

  // ----------------------------------------------------------
  // Ensure modal container exists
  // ----------------------------------------------------------
  function ensureModalContainer() {

    let container =
      document.getElementById("modal-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "modal-container";
      document.body.appendChild(container);
    }

    return container;
  }

  // ----------------------------------------------------------
  // Open Video Modal
  // ----------------------------------------------------------
  window.openVideoModal =
  function (arg1, arg2) {

    // Support both call formats
    let url, entry;

    if (typeof arg1 === "object" && arg1 !== null) {
      url = arg1.url;
      entry = arg1.entry;
    } else {
      url = arg1;
      entry = arg2;
    }

    if (!url) {
      console.warn("[MODAL] No URL provided.");
      return;
    }

    const container =
      ensureModalContainer();

    // Modal shell
    container.innerHTML = `
      <div class="video-modal-overlay"
           id="videoModalOverlay">

        <div class="video-modal">

          <button class="modal-close"
                  id="modalCloseBtn">✕</button>

          <div class="video-frame-wrapper"
               id="videoFrameWrapper"></div>

        </div>
      </div>
    `;

    const wrapper =
      document.getElementById(
        "videoFrameWrapper"
      );

    if (!wrapper) return;

    // --------------------------------------------------------
    // FULL VIDEO RENDER LOGIC
    // --------------------------------------------------------
    let embedUrl = url;

    // -----------------------------
    // Google Drive
    // -----------------------------
    if (embedUrl.includes("drive.google.com")) {

      let fileId = null;

      const dMatch =
        embedUrl.match(/\/d\/([^/]+)/);

      if (dMatch) fileId = dMatch[1];

      if (!fileId) {
        const idParam =
          new URL(embedUrl)
            .searchParams.get("id");

        if (idParam) fileId = idParam;
      }

      if (fileId) {
        embedUrl =
          `https://drive.google.com/file/d/${fileId}/preview`;
      }

      wrapper.innerHTML = `
        <iframe
          src="${embedUrl}"
          allow="autoplay"
          allowfullscreen
          frameborder="0"
          class="video-iframe">
        </iframe>
      `;

    // -----------------------------
    // MP4 videos
    // -----------------------------
    } else if (embedUrl.match(/\.mp4($|\?)/i)) {

      wrapper.innerHTML = `
        <video
          src="${embedUrl}"
          controls
          autoplay
          playsinline
          class="video-player">
        </video>
      `;

    // -----------------------------
    // YouTube embeds
    // -----------------------------
    } else if (
      embedUrl.includes("youtube.com") ||
      embedUrl.includes("youtu.be")
    ) {

      let videoId = null;

      if (embedUrl.includes("youtu.be")) {
        videoId =
          embedUrl.split("/").pop();
      } else {
        videoId =
          new URL(embedUrl)
            .searchParams.get("v");
      }

      if (videoId) {
        embedUrl =
          `https://www.youtube.com/embed/${videoId}`;
      }

      wrapper.innerHTML = `
        <iframe
          src="${embedUrl}"
          allow="autoplay; encrypted-media"
          allowfullscreen
          frameborder="0"
          class="video-iframe">
        </iframe>
      `;

    // -----------------------------
    // Generic iframe fallback
    // -----------------------------
    } else {

      wrapper.innerHTML = `
        <iframe
          src="${embedUrl}"
          allowfullscreen
          frameborder="0"
          class="video-iframe">
        </iframe>
      `;
    }

    // --------------------------------------------------------
    // Close modal logic
    // --------------------------------------------------------
    const overlay =
      document.getElementById(
        "videoModalOverlay"
      );

    const closeBtn =
      document.getElementById(
        "modalCloseBtn"
      );

    function closeModal() {
      container.innerHTML = "";
      document.removeEventListener(
        "keydown",
        escHandler
      );
    }

    function escHandler(e) {
      if (e.key === "Escape") {
        closeModal();
      }
    }

    if (overlay) {
      overlay.addEventListener(
        "click",
        (e) => {
          if (e.target === overlay) {
            closeModal();
          }
        }
      );
    }

    if (closeBtn) {
      closeBtn.addEventListener(
        "click",
        closeModal
      );
    }

    document.addEventListener(
      "keydown",
      escHandler
    );
  };

})();
