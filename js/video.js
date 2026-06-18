console.log("video cargado");

const video = document.getElementById("goku");
const plane = document.querySelector("a-plane");

if (video) {
  const esIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // Obtener theme actual
  const params = new URLSearchParams(window.location.search);
  const themeId = params.get('tema') || 1;
  const currentTheme = themesData[themeId] || themesData[1];
  const folder = currentTheme.folderName;

  window.cambiarVideoAR = function(indicePregunta) {
    const isSingleVideo = currentTheme.singleVideo === true;
    
    // Determinar nombre del archivo
    // Si es singleVideo usa 'pregunta', si no usa 'pregunta1', 'pregunta2', etc.
    const fileName = isSingleVideo ? "pregunta" : `pregunta${indicePregunta + 1}`;

    if (esIOS) {
      // OPCIÓN 2: MOV H.265 NATIVO CON ALPHA (Activa por defecto)
      video.src = `assets/video/${folder}/iphone/${fileName}.mov`;
      plane.setAttribute("material", "transparent: true; src: #goku; shader: flat;");
      
      // OPCIÓN 1: Si deseas usar ChromaKey, comenta las dos líneas de arriba 
      // y descomenta las tres de abajo, cambiando la extensión a .mp4 si es necesario:
      /*
      video.src = `assets/video/${folder}/iphone/${fileName}.mp4`;
      plane.removeAttribute("chromakey"); 
      plane.setAttribute("material", "shader: chromakey; src: #goku; color: 0 1 0; transparent: true");
      */
    } else {
      /* Android / PC */
      video.src = `assets/video/${folder}/android/${fileName}.webm`;
      plane.setAttribute("material", "transparent: true; src: #goku; shader: flat;");
    }

    // Forzar la recarga del video
    video.load();
  };

  // Cargar el video inicial (pregunta 0)
  window.cambiarVideoAR(0);

  plane.setAttribute("visible", "false");

  video.addEventListener("loadedmetadata", () => {
    // Calcular el aspect ratio real del video para que no se vea aplastado
    const aspectRatio = video.videoWidth / video.videoHeight;
    
    // Dejar la altura base en 1.5 (más pequeño), pero ajustar el ancho en proporción
    const baseHeight = 1.0;
    plane.setAttribute("height", baseHeight);
    plane.setAttribute("width", baseHeight * aspectRatio);
  });

  video.addEventListener("loadeddata", () => {
    video.play().catch(() => {});
    plane.setAttribute("visible", "true");
  });

  document.addEventListener("click", () => {
    video.muted = true;
    video.play().catch(() => {});
  }, { once: true });

  // ==========================================
  // AUDIO DE AMBIENTE (BGM)
  // ==========================================
  if (currentTheme.bgm) {
    const bgmAudio = new Audio(currentTheme.bgm);
    bgmAudio.loop = true;
    bgmAudio.volume = 0.01; // Volumen al 15% para que sea suave y no tape las voces

    // Intento de autoplay (funciona en PC y en algunos Android si vienes del index)
    bgmAudio.play().catch(() => {
      // Si el navegador (ej. iOS Safari) bloquea el autoplay, 
      // esperamos al primer toque del usuario en la pantalla
      const iniciarAudioGesto = () => {
        bgmAudio.play().catch(() => {});
        document.removeEventListener("touchstart", iniciarAudioGesto);
        document.removeEventListener("click", iniciarAudioGesto);
      };
      document.addEventListener("touchstart", iniciarAudioGesto, { once: true });
      document.addEventListener("click", iniciarAudioGesto, { once: true });
    });
    
    // Lo guardamos en window por si en un futuro necesitas pausarlo externamente
    window.bgmAudio = bgmAudio;
  }
}