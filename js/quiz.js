console.log("quiz cargado");

/* ==========================
   THEME SETUP
========================== */
const params      = new URLSearchParams(window.location.search);
const themeId     = parseInt(params.get('tema')) || 1;
const currentTheme = themesData[themeId] || themesData[1];

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
  new Audio(`public/Primera-incorrecta.aac`),
  new Audio(`public/Segunda-incorrecta.aac`),
  new Audio(`public/Tercera-incorrecta.aac`),
];

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

/**
 * Muestra la animación de estrella, espera a que el video termine
 * (o al timeout de seguridad) y luego llama al callback.
 * @param {'happy'|'sad'} type
 * @param {Function} onDone - se llama cuando la animación termina
 */
function mostrarEstrella(type, onDone) {
  /* Detección básica de iOS */
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  /* En iOS carga feliz.mov / triste.mov. En Android/otros carga felizAnim.webm / tristeAnim.webm */
  const baseName = type === 'happy' ? 'feliz' : 'triste';
  const src      = isIOS ? `public/${baseName}.mov` : `public/${baseName}Anim.webm`;
  const duration = type === 'happy' ? STAR_HAPPY_MS : STAR_SAD_MS;

  /* Añadir o quitar clase 'sad' para controlar el tamaño */
  if (type === 'sad') {
    starOverlay.classList.add('sad');
  } else {
    starOverlay.classList.remove('sad');
  }

  /* Asignar fuente y mostrar */
  starVideo.src = src;
  starVideo.currentTime = 0;
  starOverlay.classList.remove('hiding');
  starOverlay.classList.add('active');
  starVideo.play().catch(() => {});

  /* Tiempo de seguridad por si el evento 'ended' no llega */
  let safeTimeout;

  function cerrarEstrella() {
    clearTimeout(safeTimeout);
    starVideo.removeEventListener('ended', cerrarEstrella);

    /* Fade out */
    starOverlay.classList.add('hiding');
    setTimeout(() => {
      starOverlay.classList.remove('active', 'hiding', 'sad');
      starVideo.src = '';
      if (onDone) onDone();
    }, 270); /* duración de starFadeOut */
  }

  starVideo.addEventListener('ended', cerrarEstrella, { once: true });
  safeTimeout = setTimeout(cerrarEstrella, duration + 300); /* +300ms margen */
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
  opciones.forEach(op => op.classList.add("disabled"));

  if (correcta) {
    puntaje++; // Suma el punto tanto en la primera vez como en el repaso
    sfxCorrect.play().catch(() => {});
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
      if (!modoRepeticion) {
        preguntaActual++;
        if (preguntaActual < preguntas.length) {
          cargarPregunta();
        } else {
          // Termina la primera pasada, muestra los resultados (y opción de repaso si hubo fallos)
          mostrarResultado();
        }
      } else {
        // En modo repaso, pasar a la siguiente pregunta que había fallado
        repeticionIndex++;
        if (repeticionIndex < preguntasFallidas.length) {
          cargarPregunta();
        } else {
          // Termina el repaso, muestra el resultado definitivo
          mostrarResultado();
        }
      }
    });
  }, 400);
}


/* ==========================
   RESULTADO FINAL
========================== */
function mostrarResultado() {
  clearInterval(timerInterval);
  
  const bar = document.getElementById('quiz-progress-bar');
  if (bar) bar.style.width = '100%';

  const total = preguntas.length;
  
  // Determinar estrellas y mensaje
  let stars, msg, calColor;
  if (puntaje === total) {
    stars = '⭐⭐⭐'; msg = '¡Perfecto! ¡Lo lograste!'; calColor = '#22c55e';
  } else if (puntaje >= total * 0.66) {
    stars = '⭐⭐'; msg = '¡Muy bien hecho!'; calColor = '#f59e0b';
  } else if (puntaje > 0) {
    stars = '⭐'; msg = '¡Sigue practicando!'; calColor = '#ef4444';
  } else {
    stars = '😅'; msg = '¡Inténtalo de nuevo!'; calColor = '#ef4444';
  }

  document.getElementById("question-title").textContent    = `${stars} ${msg}`;
  document.getElementById("question-subtitle").textContent = `Obtuviste ${puntaje} de ${total}`;

  // Comprobar si hay preguntas fallidas y no estamos ya después de un repaso
  const permiteRepaso = !modoRepeticion && preguntasFallidas.length > 0;

  document.getElementById("quiz-options").innerHTML = `
    <button class="option" disabled style="justify-content:center; font-size:18px; font-weight:800; border-color:${calColor}; color:${calColor}; background:${calColor}15; cursor:default;">
      <span class="opt-icon" style="font-size:22px;">${currentTheme.icon}</span>
      ${puntaje} / ${total} correctas
    </button>
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
