console.log("quiz cargado");

/* ==========================
   THEME SETUP
========================== */
const params      = new URLSearchParams(window.location.search);
const themeId     = parseInt(params.get('tema')) || 1;
const currentTheme = themesData[themeId] || themesData[1];

unlockTheme(themeId);

/* Ajustar color hex sumando offset a cada canal */
function adjustColor(hex, amount) {
  return '#' + hex.replace(/^#/, '').replace(/../g, c =>
    ('0' + Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)).slice(-2)
  );
}

/* Aplicar variables CSS del tema */
document.documentElement.style.setProperty('--primary',       currentTheme.color);
document.documentElement.style.setProperty('--primary-dark',  adjustColor(currentTheme.color, -35));
document.documentElement.style.setProperty('--primary-light', adjustColor(currentTheme.color, 145));
document.documentElement.style.setProperty('--handle-bg',     adjustColor(currentTheme.color, 90));
document.documentElement.style.setProperty('--option-border', adjustColor(currentTheme.color, 110));

/* Poblar badge del tema y botón quiz al cargar el DOM */
document.addEventListener("DOMContentLoaded", () => {
  const btnIcon = document.querySelector('#btn-quiz .btn-icon');
  if (btnIcon) btnIcon.textContent = currentTheme.icon;

  const badgeIcon  = document.getElementById('theme-badge-icon');
  const badgeTitle = document.getElementById('theme-badge-title');
  const panelIcon  = document.getElementById('panel-icon');

  if (badgeIcon)  badgeIcon.textContent  = currentTheme.icon;
  if (badgeTitle) badgeTitle.textContent = currentTheme.title;
  if (panelIcon)  panelIcon.textContent  = currentTheme.icon;
});

/* ==========================
   AUDIO SYSTEM & TIMER STATE
========================== */
const sfxCorrect = new Audio("public/correcto.aac");
const sfxIncorrect = new Audio("public/incorrecto.aac");

let timerInterval;
let timeLeft = 15;
const MAX_TIME = 15;

let audioListo = false;
const folder = currentTheme.folderName;

const audios = [
  new Audio(`assets/audio/${folder}/Primera-pregunta.aac`),
  new Audio(`assets/audio/${folder}/Segunda-pregunta.aac`),
  new Audio(`assets/audio/${folder}/Tercera-pregunta.aac`),
];

const audiosIncorrectos = [
  new Audio(`assets/audio/${folder}/Primera-incorrecta.aac`),
  new Audio(`assets/audio/${folder}/Segunda-incorrecta.aac`),
  new Audio(`assets/audio/${folder}/Tercera-incorrecta.aac`),
];

const audiosCorrectos = [
  new Audio(`assets/audio/${folder}/Primera-correcta.aac`),
  new Audio(`assets/audio/${folder}/Segunda-correcta.aac`),
  new Audio(`assets/audio/${folder}/Tercera-correcta.aac`),
];

// Audio que suena al terminar el quiz — individual por tarjeta
// Coloca el archivo en: assets/audio/[carpeta_tema]/final.aac
const audioFinal = new Audio(`assets/audio/${folder}/final.aac`);

function activarAudioSistema() {
  if (audioListo) return;
  audios.forEach(audio => {
    audio.muted = false;
    audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
  });
  audiosIncorrectos.forEach(audio => {
    audio.muted = false;
    audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
  });
  audiosCorrectos.forEach(audio => {
    audio.muted = false;
    audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
  });
  audioFinal.muted = false;
  audioFinal.play().then(() => { audioFinal.pause(); audioFinal.currentTime = 0; }).catch(() => {});
  audioListo = true;
}

function reproducirAudio(index) {
  if (!audioListo) return;
  audios.forEach(a => { a.pause(); a.currentTime = 0; });
  if (audios[index]) {
    audios[index].play().catch(err => console.log("Error audio:", err));
  }
}

/* ==========================
   PREGUNTAS Y ESTADO
========================== */
const preguntas = currentTheme.questions;
let preguntaActual = 0;
let puntaje = 0;

let preguntasFallidas = [];
let modoRepeticion = false;
let repeticionIndex = 0;
let preguntaOriginalIndex = 0;

/* Actualizar barra de progreso */
function actualizarProgreso() {
  const bar = document.getElementById('quiz-progress-bar');
  if (!bar) return;
  const pct = ((preguntaActual) / preguntas.length) * 100;
  bar.style.width = `${pct}%`;
}

/* ==========================
   ABRIR / CERRAR PANEL
========================== */
function abrirPanel() {
  document.getElementById("quiz-panel").classList.add("open");
  document.getElementById("quiz-overlay").classList.add("open");

  activarAudioSistema();

  preguntaActual = 0;
  puntaje = 0;
  preguntasFallidas = [];
  modoRepeticion = false;
  repeticionIndex = 0;
  preguntaOriginalIndex = 0;
  
  actualizarProgreso();
  cargarPregunta();

  setTimeout(() => reproducirAudio(preguntaActual), 300);
}

function cerrarPanel() {
  clearInterval(timerInterval);
  document.getElementById("quiz-panel").classList.remove("open");
  document.getElementById("quiz-overlay").classList.remove("open");
  audios.forEach(a => { a.pause(); a.currentTime = 0; });
  audiosIncorrectos.forEach(a => { a.pause(); a.currentTime = 0; });
  audiosCorrectos.forEach(a => { a.pause(); a.currentTime = 0; });
  audioFinal.pause(); audioFinal.currentTime = 0;
}

/* ==========================
   CARGAR PREGUNTA
========================== */
function cargarPregunta() {
  if (modoRepeticion) {
    preguntaOriginalIndex = preguntasFallidas[repeticionIndex];
  } else {
    preguntaOriginalIndex = preguntaActual;
  }
  
  const pregunta = preguntas[preguntaOriginalIndex];

  // Cambiar el video de Realidad Aumentada si la función existe
  if (window.cambiarVideoAR) {
    window.cambiarVideoAR(preguntaOriginalIndex);
  }

  document.getElementById("question-title").textContent = pregunta.titulo;
  
  if (modoRepeticion) {
    document.getElementById("question-subtitle").textContent = `Repaso: ${pregunta.subtitulo}`;
  } else {
    document.getElementById("question-subtitle").textContent = pregunta.subtitulo;
  }

  const contenedor = document.getElementById("quiz-options");
  contenedor.innerHTML = "";

  const letras = ['A', 'B', 'C'];

  pregunta.opciones.forEach((opcion, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.innerHTML = `
      <span class="opt-icon">${letras[i]}</span>
      ${opcion.texto}
    `;
    btn.onclick = () => responder(btn, opcion.correcta);
    contenedor.appendChild(btn);
  });

  actualizarProgreso();
  iniciarTemporizador();

  setTimeout(() => reproducirAudio(preguntaActual), 200);
}

/* ==========================
   TEMPORIZADOR
========================== */
function iniciarTemporizador() {
  clearInterval(timerInterval);
  timeLeft = MAX_TIME;
  actualizarVistaTimer();
  
  timerInterval = setInterval(() => {
    timeLeft--;
    actualizarVistaTimer();
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      // Tiempo agotado = respuesta incorrecta
      const dummyBtn = document.createElement("button");
      responder(dummyBtn, false, true);
    }
  }, 1000);
}

function actualizarVistaTimer() {
  const timerElement = document.getElementById("quiz-timer");
  const textElement = document.getElementById("timer-text");
  if (!timerElement || !textElement) return;
  
  textElement.textContent = timeLeft;
  
  if (timeLeft <= 5) {
    timerElement.classList.add("warning");
  } else {
    timerElement.classList.remove("warning");
  }
}

/* ==========================
   ANIMACIÓN ESTRELLA
========================== */

/* Duraciones reales de los webm (en ms) — ajusta si cambias los archivos */
const STAR_HAPPY_MS = 2200;   // felizAnim.webm
const STAR_SAD_MS   = 1800;   // tristeAnim.webm

const starOverlay = document.getElementById('star-anim-overlay');
const starVideo   = document.getElementById('star-anim-video');

if (starVideo) prepareVideoForIOS(starVideo);

/**
 * Muestra la animación de estrella, espera a que el video termine
 * (o al timeout de seguridad) y luego llama al callback.
 * @param {'happy'|'sad'} type
 * @param {Function} onDone - se llama cuando la animación termina
 */
function mostrarEstrella(type, onDone) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const baseName = type === 'happy' ? 'feliz' : 'triste';
  const src      = isIOS ? `public/${baseName}.mov` : `public/${baseName}Anim.webm`;
  const duration = type === 'happy' ? STAR_HAPPY_MS : STAR_SAD_MS;

  if (type === 'sad') {
    starOverlay.classList.add('sad');
  } else {
    starOverlay.classList.remove('sad');
  }

  stripVideoControls(starVideo);
  starVideo.src = src;
  starVideo.currentTime = 0;
  starOverlay.classList.remove('hiding');
  starOverlay.classList.add('active');
  starVideo.play().catch(() => {});
  if (isIOS) suppressMediaSession();

  let safeTimeout;

  function cerrarEstrella() {
    clearTimeout(safeTimeout);
    starVideo.removeEventListener('ended', cerrarEstrella);

    starOverlay.classList.add('hiding');
    setTimeout(() => {
      starOverlay.classList.remove('active', 'hiding', 'sad');
      starVideo.src = '';
      if (onDone) onDone();
    }, 270);
  }

  starVideo.addEventListener('ended', cerrarEstrella, { once: true });
  safeTimeout = setTimeout(cerrarEstrella, duration + 300);
}

/* ==========================
   RESPONDER
========================== */
function responder(boton, correcta, porTiempo = false) {
  clearInterval(timerInterval); // Detener el temporizador

  const opciones = document.querySelectorAll(".option");

  /* Detener audio y bloquear opciones inmediatamente */
  audios.forEach(a => { a.pause(); a.currentTime = 0; });
  audiosIncorrectos.forEach(a => { a.pause(); a.currentTime = 0; });
  audiosCorrectos.forEach(a => { a.pause(); a.currentTime = 0; });
  opciones.forEach(op => op.classList.add("disabled"));

  if (correcta) {
    puntaje++; // Suma el punto tanto en la primera vez como en el repaso
    sfxCorrect.play().catch(() => {});
    if (audiosCorrectos[preguntaOriginalIndex]) {
      audiosCorrectos[preguntaOriginalIndex].play().catch(() => {});
    }
    boton.className = "option correct";
    boton.innerHTML = '<span class="opt-icon">✅</span> 🎉 ¡Correcto!';
  } else {
    sfxIncorrect.play().catch(() => {});
    if (audiosIncorrectos[preguntaOriginalIndex]) {
      audiosIncorrectos[preguntaOriginalIndex].play().catch(() => {});
    }
    
    if (porTiempo) {
      document.getElementById("question-title").textContent = "⏳ ¡Tiempo Agotado!";
    } else if (boton && boton.parentNode) {
      boton.className = "option wrong";
      boton.innerHTML = `<span class="opt-icon">❌</span> ${currentTheme.icon} Incorrecto`;
    }

    // Guardar la pregunta fallida solo en la primera pasada
    if (!modoRepeticion) {
      preguntasFallidas.push(preguntaActual);
    }
    // Si falla durante el modo repetición, no se vuelve a guardar (pierde el punto)

    /* Revelar la respuesta correcta */
    const todas      = Array.from(opciones);
    const correctaIdx = preguntas[preguntaOriginalIndex].opciones.findIndex(o => o.correcta);
    if (todas[correctaIdx] && todas[correctaIdx] !== boton) {
      todas[correctaIdx].classList.remove("disabled");
      todas[correctaIdx].classList.add("correct");
      todas[correctaIdx].innerHTML = `<span class="opt-icon">✅</span> ${preguntas[preguntaOriginalIndex].opciones[correctaIdx].texto}`;
    }
  }

  setTimeout(() => {
    mostrarEstrella(correcta ? 'happy' : 'sad', () => {

      /* Función que avanza al siguiente paso del quiz */
      const avanzar = () => {
        if (!modoRepeticion) {
          preguntaActual++;
          if (preguntaActual < preguntas.length) {
            cargarPregunta();
          } else {
            mostrarResultado();
          }
        } else {
          repeticionIndex++;
          if (repeticionIndex < preguntasFallidas.length) {
            cargarPregunta();
          } else {
            mostrarResultado();
          }
        }
      };

      /* Si hubo un audio en reproducción (correcto o incorrecto), espera a que termine antes de avanzar.
         De lo contrario avanza de inmediato. */
      const audioActivo = correcta
        ? audiosCorrectos[preguntaOriginalIndex]
        : audiosIncorrectos[preguntaOriginalIndex];

      if (audioActivo && !audioActivo.paused && !audioActivo.ended) {
        audioActivo.addEventListener('ended', avanzar, { once: true });
      } else {
        avanzar();
      }
    });
  }, 400);
}


/* ==========================
   RESULTADO FINAL
========================== */
function mostrarResultado() {
  clearInterval(timerInterval);

  // Detener todos los audios activos y reproducir el audio final de este tema
  audios.forEach(a => { a.pause(); a.currentTime = 0; });
  audiosCorrectos.forEach(a => { a.pause(); a.currentTime = 0; });
  audiosIncorrectos.forEach(a => { a.pause(); a.currentTime = 0; });
  audioFinal.currentTime = 0;
  audioFinal.play().catch(() => {});
  
  const bar = document.getElementById('quiz-progress-bar');
  if (bar) bar.style.width = '100%';

  if (!modoRepeticion) {
    markThemeComplete(themeId);
  }

  const numFallidas = preguntasFallidas.length;
  const permiteRepaso = !modoRepeticion && numFallidas > 0;

  if (modoRepeticion) {
    document.getElementById("question-title").textContent    = `${currentTheme.icon} ¡Listo!`;
    document.getElementById("question-subtitle").textContent = "Terminaste de repasar";
  } else if (numFallidas === 0) {
    document.getElementById("question-title").textContent    = "⭐ ¡Lo lograste!";
    document.getElementById("question-subtitle").textContent = "";
  } else if (numFallidas === 1) {
    document.getElementById("question-title").textContent    = `${currentTheme.icon} ¡Buen trabajo!`;
    document.getElementById("question-subtitle").textContent = "Te equivocaste en 1 pregunta";
  } else {
    document.getElementById("question-title").textContent    = `${currentTheme.icon} ¡Buen trabajo!`;
    document.getElementById("question-subtitle").textContent = `Te equivocaste en ${numFallidas} preguntas`;
  }

  document.getElementById("quiz-options").innerHTML = `
    ${permiteRepaso ? `
    <button class="option" onclick="iniciarRepaso()" style="justify-content:center; border-color: var(--primary); background: var(--primary-light);">
      <span class="opt-icon" style="font-size:20px">🔄</span>
      Repasar preguntas falladas
    </button>` : ''}
    <button class="option" onclick="reiniciarCompleto()" style="justify-content:center; border-color: #94a3b8; background: #f8fafc; color:#475569;">
      <span class="opt-icon" style="font-size:18px">🔁</span>
      Volver a empezar
    </button>
  `;
}

function iniciarRepaso() {
  clearInterval(timerInterval);
  modoRepeticion = true;
  repeticionIndex = 0;
  actualizarProgreso();
  cargarPregunta();
}

function reiniciarCompleto() {
  clearInterval(timerInterval);
  audioFinal.pause(); audioFinal.currentTime = 0;
  preguntaActual = 0;
  puntaje = 0;
  preguntasFallidas = [];
  modoRepeticion = false;
  repeticionIndex = 0;
  preguntaOriginalIndex = 0;
  actualizarProgreso();
  cargarPregunta();
  setTimeout(() => reproducirAudio(0), 300);
}

/* ==========================
   GLOBAL
========================== */
window.abrirPanel   = abrirPanel;
window.cerrarPanel  = cerrarPanel;
window.reiniciarQuiz = reiniciarCompleto; // Alias para retrocompatibilidad
window.iniciarRepaso = iniciarRepaso;
window.reiniciarCompleto = reiniciarCompleto;
