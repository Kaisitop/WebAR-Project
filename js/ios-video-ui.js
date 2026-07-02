/** Ocultar controles nativos de video en iOS (sin pausar reproducción) */
function stripVideoControls(el) {
  if (!el || el.tagName !== 'VIDEO') return;
  el.controls = false;
  el.removeAttribute('controls');
  el.muted = true;
  el.defaultMuted = true;
  el.setAttribute('muted', '');
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  el.playsInline = true;
  el.setAttribute('disablePictureInPicture', '');
  el.setAttribute('disableRemotePlayback', '');
  el.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback noplaybackrate');
  el.setAttribute('x-webkit-airplay', 'deny');
  if ('disablePictureInPicture' in el) el.disablePictureInPicture = true;
  if ('disableRemotePlayback' in el) el.disableRemotePlayback = true;
}

function suppressMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.setActionHandler('play', () => {});
    navigator.mediaSession.setActionHandler('pause', () => {});
  } catch (e) {}
}

function prepareVideoForIOS(el) {
  stripVideoControls(el);
  el.addEventListener('play', () => {
    stripVideoControls(el);
    suppressMediaSession();
  }, { passive: true });
}
