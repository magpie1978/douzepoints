// ------------------------------------------------------------
// 🎬 VIDEO MODAL + VIEW TRACKING
// ------------------------------------------------------------

(function () {

  // Prevent duplicate modal creation
  if (window.openVideoModal) return;

  // ----------------------------------------------------------
  // 🧱 Create modal container if not present
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
  // 🎬 Open modal
  // ----------------------------------------------------------
  //window.openVideoModal =
  //async function ({ url, entry }) {

  window.openVideoModal =
async function (arg1, arg2) {

  // Support both call formats
  let url, entry;

  if (typeof arg1 === "object") {
    url = arg1.url;
    entry = arg1.entry;
  } else {
    url = arg1;
    entry = arg2;
  }
    const container =
      ensureModalContainer();

    // Modal HTML
    container.innerHTML = `
      <div class="video-modal-overlay" id="videoModalOverlay">

        <div class="video-modal">

          <button class="modal-close" id="modalCloseBtn">
            ✕
          </button>

          <div class="video-frame-wrapper" id="videoFrameWrapper">
          </div>

        </div>
      </div>
    `;

    const wrapper =
      document.getElementById("videoFrameWrapper");

    if (!wrapper) return;

    // --------------------------------------------------------
    // 📺 Render video source
    // --------------------------------------------------------

    if (url.includes("drive.google.com")) {

      // Google Drive iframe
      wrapper.innerHTML = `
        <iframe
          src="${url}"
          allow="autoplay"
          allowfullscreen
          frameborder="0"
          class="video-iframe">
        </iframe>
      `;

    } else if (url.match(/\.mp4($|\?)/i)) {

      // MP4 video
      wrapper.innerHTML = `
        <video
          src="${url}"
          controls
          autoplay
          class="video-player">
        </video>
      `;

    } else {

      // Generic iframe fallback
      wrapper.innerHTML = `
        <iframe
          src="${url}"
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
    // ❌ Close modal handlers
    // --------------------------------------------------------

    const overlay =
      document.getElementById("videoModalOverlay");

    const closeBtn =
      document.getElementById("modalCloseBtn");

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
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      });
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
