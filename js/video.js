console.log("video cargado");

const video = document.getElementById("goku");
const plane = document.querySelector("a-plane");

if (video) {
  const esIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  prepareVideoForIOS(video);

  let markerVisible = false;

  function playArVideo() {
    if (!markerVisible) return;
    stripVideoControls(video);
    video.muted = true;
    video.play().catch(() => {});
    if (esIOS) suppressMediaSession();
  }

  function bindMarkerPlayback() {
    const marker = document.querySelector('a-marker');
    if (!marker) return;

    marker.addEventListener('markerFound', () => {
      markerVisible = true;
      playArVideo();
    });

    marker.addEventListener('markerLost', () => {
      markerVisible = false;
      video.pause();
    });
  }

  const scene = document.querySelector('a-scene');
  if (scene) {
    scene.addEventListener('loaded', () => {
      bindMarkerPlayback();
      document.querySelectorAll('video').forEach(prepareVideoForIOS);
    });
  }

  if (esIOS) suppressMediaSession();

  const params = new URLSearchParams(window.location.search);
  const themeId = params.get('tema') || 1;
  const currentTheme = themesData[themeId] || themesData[1];
  const folder = currentTheme.folderName;

  window.cambiarVideoAR = function(indicePregunta) {
    const isSingleVideo = currentTheme.singleVideo === true;
    const fileName = isSingleVideo ? "pregunta" : `pregunta${indicePregunta + 1}`;

    if (esIOS) {
      video.src = `assets/video/${folder}/iphone/${fileName}.mov`;
      plane.setAttribute("material", "transparent: true; src: #goku; shader: flat;");
    } else {
      video.src = `assets/video/${folder}/android/${fileName}.webm`;
      plane.setAttribute("material", "transparent: true; src: #goku; shader: flat;");
    }

    video.load();
  };

  window.cambiarVideoAR(0);

  plane.setAttribute("visible", "false");

  video.addEventListener("loadedmetadata", () => {
    const aspectRatio = video.videoWidth / video.videoHeight;
    const baseHeight = 1.0;
    plane.setAttribute("height", baseHeight);
    plane.setAttribute("width", baseHeight * aspectRatio);
  });

  video.addEventListener("loadeddata", () => {
    plane.setAttribute("visible", "true");
    if (esIOS) {
      if (markerVisible) playArVideo();
    } else {
      video.play().catch(() => {});
    }
  });

  if (!esIOS) {
    document.addEventListener("click", () => {
      video.muted = true;
      video.play().catch(() => {});
    }, { once: true });
  }

  if (currentTheme.bgm) {
    const bgmAudio = new Audio(currentTheme.bgm);
    bgmAudio.loop = true;
    bgmAudio.crossOrigin = "anonymous";
    bgmAudio.volume = 0.1;

    let isWebAudioInit = false;
    let audioCtx = null;

    const iniciarAudioGesto = () => {
      if (!isWebAudioInit) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioCtx = new AudioContext();
          const track = audioCtx.createMediaElementSource(bgmAudio);
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 0.1;
          track.connect(gainNode).connect(audioCtx.destination);
          isWebAudioInit = true;
        } catch (e) {
          console.log("Web Audio no soportado/falló", e);
        }
      }

      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      bgmAudio.play().catch(() => {});
      document.removeEventListener("touchstart", iniciarAudioGesto);
      document.removeEventListener("click", iniciarAudioGesto);
    };

    bgmAudio.play().then(() => {
      document.addEventListener("touchstart", iniciarAudioGesto, { once: true });
      document.addEventListener("click", iniciarAudioGesto, { once: true });
    }).catch(() => {
      document.addEventListener("touchstart", iniciarAudioGesto, { once: true });
      document.addEventListener("click", iniciarAudioGesto, { once: true });
    });

    window.bgmAudio = bgmAudio;
  }
}
