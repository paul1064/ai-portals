// A short film of the flight: ten seconds of the picture, saved as a video file (on a phone: handed to the share sheet).
// main.js loads this the first time it is asked for (key V, or 'Record a 10 s clip' in the share menu).
//
// Where the gun is drawn into the picture itself (a phone) the picture's own canvas is filmed as it is. On a desktop the gun
// has a canvas of its own above the picture, so each frame both are copied onto a third, which is the one filmed: the copy is
// made in the engine's own frame, right after the picture is drawn (engine.overlay), and the gun is drawn once more just
// before it, so both canvases hold this frame's picture when they are read. The film carries no sound.
export function setupClip({ engine, toast, gun }) {
  const view = document.getElementById('view');
  let rec = null, pending = null;
  const style = document.createElement('style');
  style.textContent = `
#clip-dot { position: fixed; left: calc(16px + env(safe-area-inset-left, 0px)); top: calc(14px + env(safe-area-inset-top, 0px)); z-index: 8; pointer-events: none; font: 700 14px/1 ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; letter-spacing: .14em; color: #fff; text-shadow: 0 0 2px #000; }
#clip-dot::before { content: ''; display: inline-block; width: 11px; height: 11px; margin-right: 8px; border-radius: 50%; background: #ff2a2a; box-shadow: 0 0 10px #ff2a2a; animation: clip-blink 1s steps(2) infinite; }
#clip-dot[hidden], #clip-save[hidden] { display: none; }
@keyframes clip-blink { 50% { opacity: .25; } }
#clip-save { all: unset; position: fixed; left: 50%; top: calc(64px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); z-index: 8; box-sizing: border-box; height: 48px; padding: 0 22px; border-radius: 24px; border: 1.5px solid #fff; background: rgba(8, 9, 12, .82); color: #fff; font: 700 14px/48px ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; letter-spacing: .14em; cursor: pointer; box-shadow: 0 0 22px -4px #fff; white-space: nowrap; }`;
  document.head.appendChild(style);
  const dot = document.createElement('div'); dot.id = 'clip-dot'; dot.hidden = true;
  const save = document.createElement('button'); save.id = 'clip-save'; save.hidden = true;
  document.body.append(dot, save);

  const supported = () => typeof MediaRecorder !== 'undefined' && typeof view.captureStream === 'function';
  const pickType = () => ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || '';
  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); };

  // the finished film: a phone is offered a button (its share sheet opens only on a tap), a desktop gets the file at once
  function done(blob, type) {
    const name = 'portal-gun-clip.' + (type.includes('mp4') ? 'mp4' : 'webm'), file = (() => { try { return new File([blob], name, { type: blob.type || type }); } catch (e) { return null; } })();
    const canShare = file && matchMedia('(pointer: coarse)').matches && navigator.canShare && (() => { try { return navigator.canShare({ files: [file] }); } catch (e) { return false; } })();
    if (!canShare) { download(blob, name); toast('Clip gespeichert: ' + name, 3600); return; }
    pending = { blob, name, file }; save.textContent = 'CLIP TEILEN'; save.hidden = false;
    setTimeout(() => { if (pending && pending.blob === blob) { pending = null; save.hidden = true; } }, 45000);
  }
  save.addEventListener('click', async () => {
    const p = pending; pending = null; save.hidden = true; if (!p) return;
    try { await navigator.share({ files: [p.file], title: 'Portal Gun' }); } catch (e) { if (!e || e.name !== 'AbortError') download(p.blob, p.name); }
  });

  function stop() { if (rec) rec.stop(); }
  function start(seconds = 10) {
    if (rec) return stop();
    if (!supported()) { toast('Dieser Browser kann keinen Clip aufnehmen', 3800); return; }
    const type = pickType(), G = gun && gun(), gunCanvas = document.getElementById('gun'), both = !!(G && gunCanvas && engine.overlay == null);
    let source = view, restore = null;
    if (both) {
      const k = Math.min(1, 1280 / view.width), c = document.createElement('canvas'), g = c.getContext('2d'); c.width = Math.round(view.width * k); c.height = Math.round(view.height * k);
      engine.overlay = () => {
        try { G.step(performance.now()); } catch (e) { /* the film goes on without the gun */ }
        g.drawImage(view, 0, 0, c.width, c.height);
        const r = gunCanvas.getBoundingClientRect(), sx = c.width / window.innerWidth, sy = c.height / window.innerHeight;
        if (r.width > 0 && gunCanvas.width > 0) g.drawImage(gunCanvas, r.left * sx, r.top * sy, r.width * sx, r.height * sy);
      };
      restore = () => { engine.overlay = null; };
      source = c;
    }
    let stream, recorder; const chunks = [];
    try { stream = source.captureStream(30); recorder = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 9000000 } : undefined); }
    catch (e) { if (restore) restore(); toast('Die Aufnahme lässt sich hier nicht starten', 3800); return; }
    const t0 = performance.now(), tick = setInterval(() => { dot.textContent = 'REC ' + Math.max(0, Math.ceil(seconds - (performance.now() - t0) / 1000)) + ' s'; }, 250), end = setTimeout(stop, seconds * 1000);
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      clearInterval(tick); clearTimeout(end); dot.hidden = true; rec = null; if (restore) restore();
      try { stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* already ended */ }
      const blob = new Blob(chunks, { type: recorder.mimeType || type || 'video/webm' });
      if (blob.size < 1000) { toast('Die Aufnahme ist leer geblieben', 3800); return; }
      done(blob, blob.type);
    };
    rec = recorder; dot.textContent = 'REC ' + seconds + ' s'; dot.hidden = false; recorder.start(500);
    toast('Aufnahme läuft: ' + seconds + ' Sekunden, ohne Ton' + (matchMedia('(pointer: coarse)').matches ? '' : ' (V stoppt)'), 3200);
  }
  return { toggle: () => start(10), start, stop, get recording() { return !!rec; } };
}
