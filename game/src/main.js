// VAULTBREAK — boot and main loop.
// One clear job: start the game. With ?shot=start|play|end the page
// renders one fixed frame for the maker's screenshots and never
// advances it; without it, the game runs live at 60fps.
(function () {
  var VB = window.VB;

  function boot() {
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    VB.input.bindMouse(canvas);

    var params = new URLSearchParams(window.location.search);
    var shot = params.get('shot');
    if (shot === 'start' || shot === 'play' || shot === 'end') {
      VB.setupShot(shot);
      VB.render(ctx, VB.Game);
      return;
    }

    VB.resetRun();
    VB.Game.state = 'menu';

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      VB.updateGame(dt);
      VB.render(ctx, VB.Game);
      VB.input.consumePressed();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
