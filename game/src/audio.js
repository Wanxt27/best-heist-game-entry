// VAULTBREAK — sound.
// One clear job: every sound the game makes, all synthesized with
// WebAudio. No audio files, no network. M toggles mute.
(function () {
  var VB = window.VB;

  var ctx = null;
  var muted = false;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // One short oscillator blip: frequency slides from f0 to f1.
  function blip(f0, f1, dur, type, vol) {
    if (muted) return;
    var ac = ensure();
    if (!ac) return;
    var t = ac.currentTime;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  var sounds = {
    pickup: function () { blip(660, 990, 0.12, 'sine', 0.14); setTimeout(function () { blip(990, 1320, 0.14, 'sine', 0.12); }, 90); },
    coin: function () { blip(1400, 900, 0.08, 'triangle', 0.10); },
    coinLand: function () { blip(1800, 1800, 0.05, 'square', 0.05); },
    emp: function () { blip(300, 60, 0.35, 'sawtooth', 0.10); },
    alarm: function () { blip(520, 780, 0.28, 'square', 0.07); },
    spotted: function () { blip(220, 440, 0.18, 'square', 0.10); },
    caught: function () { blip(400, 60, 0.6, 'sawtooth', 0.16); },
    win: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        setTimeout(function () { blip(f, f, 0.18, 'triangle', 0.13); }, i * 120);
      });
    },
    click: function () { blip(800, 600, 0.05, 'sine', 0.08); },
    step: function () { blip(180, 140, 0.04, 'sine', 0.03); }
  };

  VB.sounds = sounds;
  VB.setMuted = function (m) { muted = m; };
  VB.isMuted = function () { return muted; };
})();
