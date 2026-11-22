// VAULTBREAK — input.
// One clear job: keyboard and mouse state. The game reads held keys
// every frame for movement and consumes single "pressed" events for
// one-shot actions (interact, coin, EMP, restart, mute, confirm).
(function () {
  var VB = window.VB;

  var held = {};
  var pressed = {};
  var mouse = { x: 0, y: 0, clicked: false };

  function keyName(e) {
    var k = e.key;
    if (k === ' ') return 'space';
    return k.length === 1 ? k.toLowerCase() : k.toLowerCase();
  }

  window.addEventListener('keydown', function (e) {
    var k = keyName(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0 || k === 'space') e.preventDefault();
    if (!held[k]) pressed[k] = true;
    held[k] = true;
  });
  window.addEventListener('keyup', function (e) { held[e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()] = false; });
  window.addEventListener('blur', function () { held = {}; });

  function bindMouse(canvas) {
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
      mouse.clicked = true;
    });
  }

  // Movement vector from WASD / arrows, normalized.
  function moveVector() {
    var x = 0, y = 0;
    if (held['a'] || held['arrowleft']) x -= 1;
    if (held['d'] || held['arrowright']) x += 1;
    if (held['w'] || held['arrowup']) y -= 1;
    if (held['s'] || held['arrowdown']) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x: x, y: y };
  }

  function isHeld(k) { return !!held[k]; }
  function wasPressed(k) { return !!pressed[k]; }
  function consumePressed() { pressed = {}; }
  function mouseClicked() { var c = mouse.clicked; mouse.clicked = false; return c; }

  VB.input = {
    bindMouse: bindMouse,
    moveVector: moveVector,
    isHeld: isHeld,
    wasPressed: wasPressed,
    consumePressed: consumePressed,
    mouse: mouse,
    mouseClicked: mouseClicked
  };
})();
