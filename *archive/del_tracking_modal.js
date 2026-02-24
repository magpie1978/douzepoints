// ------------------------------------------------------------
// 🎬 VIDEO MODAL + VIEW TRACKING (FULLY COMPLIANT)
// ------------------------------------------------------------

(function () {

  // Prevent duplicate modal definition
  if (window.openVideoModal) return;

  // ----------------------------------------------------------
  // 🧱 Ensure modal container exists
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
  // 📊 Track modal open as a view
  // ----------------------------------------------------------
  async function trackModalOpen(entry) {

    try {

      if (!window.supabaseClient) {
        console.warn("[VIEW] Supabase client missing.");
        return;
      }

      const { data } =
        await window.supabaseClient.auth.getSession();

      const user = data?.session?.user;

      if (!user) {
        console.warn("[VIEW] No active session.");
        return;
      }

      const videoId =
        entry?.Video_Lookup ||
        entry?.video_lookup ||
        null;

      if (!videoId) {
        console.warn("[VIEW] No video lookup ID.");
        return;
      }

      const { error } =
        await window.supabaseClient
          .from("video_views")
          .insert({
            user_id: user.id,
            video_lookup: videoId,
            opened_at: new Date().toISOString()
          });

      if (error) {
        console.error("[VIEW INSERT ERROR]", error);
      } else {
        console.log("[VIEW LOGGED]", videoId);
      }

    } catch (err) {
      console.error("[VIEW TRACK FAIL]", err);
    }
  }

  // ----------------------------------------------------------
  // 🎬 Open Video Modal
  // ----------------------------------------------------------
  window.openVideoModal =
  async function (arg1, arg2) {

    // --------------------------------------------------------
    // 🔄 Support both call formats
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // 🧱 Build modal shell
    // --------------------------------------------------------
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
    // 📺 FULL VIDEO RENDER LOGIC
    // --------------------------------------------------------
    let embedUrl = url;

    // -----------------------------
    // Google Drive
    // -----------------------------
    if (embedUrl.includes("drive.google.com")) {

      let fileId = null;

      // /file/d/ID/
      const dMatch =
        embedUrl.match(/\/d\/([^/]+)/);

      if (dMatch) fileId = dMatch[1];

      // ?id=ID
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
    // MP4 / HTML5 video
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
    // YouTube embed
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
    // 📊 Track modal open
    // --------------------------------------------------------
    await trackModalOpen(entry);

    // --------------------------------------------------------
    // ❌ Close modal logic
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
