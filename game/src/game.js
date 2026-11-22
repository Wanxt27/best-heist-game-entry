// VAULTBREAK — game state and rules.
// One clear job: the state machine (menu, intro, play, caught,
// level clear, getaway) and every rule that makes it a heist:
// movement and sneak, the alarm meter, guard suspicion and chase,
// coin distractions, EMP freezes, loot, exits and the clock.
(function () {
  var VB = window.VB;
  var TILE = VB.TILE;

  var WALK_SPEED = 3.4 * TILE;   // px per second
  var SNEAK_SPEED = 1.9 * TILE;
  var COIN_COST = 25;
  var COIN_RANGE_TILES = 3;
  var EMP_SECONDS = 6;
  var GRAB_RANGE = 48;           // px to the vault to crack it
  var BONUS_RANGE = 40;
  var CATCH_RANGE = 26;          // px for a guard to grab the thief
  var CATCH_GRACE = 0.7;         // seconds of warning before the grab

  var game = {
    state: 'menu',               // menu | intro | play | caught | levelclear | getaway
    levelIndex: 0,
    level: null,
    map: null,
    guards: [],
    cameras: [],
    thief: { x: 0, y: 0, facing: Math.PI / 2, sneaking: false, hidden: false },
    loot: 0,
    vaultTaken: false,
    vaultPos: null,
    bonuses: [],                 // {x, y, taken}
    exitPos: null,
    coins: 3,
    emps: 2,
    alarm: 0,
    alarmOn: false,
    alarmQuiet: 0,
    time: 0,
    totalTime: 0,
    totalLoot: 0,
    coinFlight: null,            // {x, y, tx, ty}
    message: '',
    messageTtl: 0,
    spottedTtl: 0,               // red "!" flash after being seen
    alarmBeepT: 0,
    t: 0,                        // global clock for camera sweeps
    stepT: 0,
    rating: ''
  };

  function showMessage(text, ttl) {
    game.message = text;
    game.messageTtl = ttl || 2.5;
  }

  function parseLevel(index) {
    var def = VB.LEVELS[index];
    var map = def.map.map(function (row) { return row.split(''); });
    var thief = { x: 0, y: 0, facing: Math.PI / 2, sneaking: false, hidden: false };
    var vaultPos = null, exitPos = null, bonuses = [];
    for (var y = 0; y < map.length; y++) {
      for (var x = 0; x < map[y].length; x++) {
        var ch = map[y][x];
        if (ch === 'T') { var c = VB.tileCenter(x, y); thief.x = c.x; thief.y = c.y; }
        if (ch === 'L') { var l = VB.tileCenter(x, y); vaultPos = { x: l.x, y: l.y }; }
        if (ch === 'E') { var e = VB.tileCenter(x, y); exitPos = { x: e.x, y: e.y }; }
        if (ch === 'B') { var b = VB.tileCenter(x, y); bonuses.push({ x: b.x, y: b.y, taken: false }); }
      }
    }
    return { def: def, map: map, thief: thief, vaultPos: vaultPos, exitPos: exitPos, bonuses: bonuses };
  }

  function loadLevel(index) {
    var p = parseLevel(index);
    game.levelIndex = index;
    game.level = p.def;
    game.map = p.map;
    game.thief = p.thief;
    game.vaultPos = p.vaultPos;
    game.exitPos = p.exitPos;
    game.bonuses = p.bonuses;
    game.guards = p.def.guards.map(function (d) { return VB.makeGuard(d); });
    game.cameras = p.def.cameras.map(function (d) { return VB.makeCamera(d); });
    game.loot = 0;
    game.vaultTaken = false;
    game.coins = 3;
    game.emps = 2;
    game.alarm = 0;
    game.alarmOn = false;
    game.alarmQuiet = 0;
    game.time = 0;
    game.coinFlight = null;
    game.message = '';
    game.messageTtl = 0;
    game.spottedTtl = 0;
    game.state = 'intro';
  }

  function resetRun() {
    game.totalTime = 0;
    game.totalLoot = 0;
    game.rating = '';
    loadLevel(0);
  }

  function nearestGuard() {
    var best = null, bestD = Infinity;
    for (var i = 0; i < game.guards.length; i++) {
      var g = game.guards[i];
      var d = Math.hypot(g.x - game.thief.x, g.y - game.thief.y);
      if (d < bestD) { bestD = d; best = g; }
    }
    return best;
  }

  function distractGuards(x, y, radiusTiles) {
    var radius = radiusTiles * TILE;
    for (var i = 0; i < game.guards.length; i++) {
      var g = game.guards[i];
      if (g.mode === 'chase') continue;
      if (Math.hypot(g.x - x, g.y - y) < radius) {
        g.mode = 'investigate';
        g.target = { x: x, y: y };
        g.scan = 0;
      }
    }
  }

  function throwCoin() {
    if (game.coins <= 0) { showMessage('Out of coins!'); return; }
    if (game.loot < COIN_COST) { showMessage('Need $' + COIN_COST + ' loot to toss a coin.'); return; }
    game.coins -= 1;
    game.loot -= COIN_COST;
    var t = game.thief;
    var tx = t.x + Math.cos(t.facing) * COIN_RANGE_TILES * TILE;
    var ty = t.y + Math.sin(t.facing) * COIN_RANGE_TILES * TILE;
    // Land on the nearest floor tile along the throw.
    for (var f = 1; f >= 0.4; f -= 0.2) {
      var px = t.x + Math.cos(t.facing) * COIN_RANGE_TILES * TILE * f;
      var py = t.y + Math.sin(t.facing) * COIN_RANGE_TILES * TILE * f;
      if (!VB.isWall(game.map, px, py)) { tx = px; ty = py; break; }
    }
    game.coinFlight = { x: t.x, y: t.y, tx: tx, ty: ty };
    VB.sounds.coin();
  }

  function useEmp() {
    if (game.emps <= 0) { showMessage('No EMP charges left!'); return; }
    game.emps -= 1;
    for (var i = 0; i < game.cameras.length; i++) VB.cameraFreeze(game.cameras[i], EMP_SECONDS);
    VB.sounds.emp();
    showMessage('Cameras frozen for ' + EMP_SECONDS + 's!');
  }

  function tryInteract() {
    var t = game.thief;
    if (!game.vaultTaken && game.vaultPos &&
        Math.hypot(t.x - game.vaultPos.x, t.y - game.vaultPos.y) < GRAB_RANGE) {
      game.vaultTaken = true;
      game.loot += game.level.loot;
      VB.sounds.pickup();
      showMessage('Vault cracked! +$' + game.level.loot + ' — get to the exit!', 3);
      return;
    }
    for (var i = 0; i < game.bonuses.length; i++) {
      var b = game.bonuses[i];
      if (!b.taken && Math.hypot(t.x - b.x, t.y - b.y) < BONUS_RANGE) {
        b.taken = true;
        game.loot += game.level.bonus;
        VB.sounds.pickup();
        showMessage('Bonus stash! +$' + game.level.bonus);
        return;
      }
    }
  }

  function levelClear() {
    game.totalLoot += game.loot;
    game.totalTime += game.time;
    game.state = 'levelclear';
    VB.sounds.win();
  }

  function finishRun() {
    var t = game.totalTime;
    var allBonus = true;
    // Rating: S needs speed and greed; A needs speed; anything else B.
    game.rating = t < 240 ? 'S' : t < 360 ? 'A' : 'B';
    game.state = 'getaway';
    VB.sounds.win();
    return allBonus;
  }

  function updatePlay(dt) {
    var input = VB.input;
    var t = game.thief;
    game.time += dt;
    game.t += dt;

    // --- thief movement ------------------------------------------------
    var mv = input.moveVector();
    t.sneaking = input.isHeld('shift');
    var speed = t.sneaking ? SNEAK_SPEED : WALK_SPEED;
    if (mv.x !== 0 || mv.y !== 0) {
      t.facing = Math.atan2(mv.y, mv.x);
      VB.moveWithWalls(game.map, t, mv.x * speed * dt, mv.y * speed * dt, 12);
      game.stepT -= dt;
      if (game.stepT <= 0) { game.stepT = t.sneaking ? 0.45 : 0.28; VB.sounds.step(); }
    }
    t.hidden = VB.tileAt(game.map, t.x, t.y) === 's';

    // --- guards and cameras --------------------------------------------
    for (var i = 0; i < game.guards.length; i++) VB.guardStep(game.guards[i], dt, game.map);
    for (var j = 0; j < game.cameras.length; j++) VB.cameraStep(game.cameras[j], game.t, dt);

    // --- detection -------------------------------------------------------
    var seen = false;
    var seenByGuard = false;
    for (var gi = 0; gi < game.guards.length; gi++) {
      if (VB.guardSees(game.guards[gi], t, game.map)) { seen = true; seenByGuard = true; break; }
    }
    var seenByCamera = false;
    if (!seen) {
      for (var ci = 0; ci < game.cameras.length; ci++) {
        if (VB.cameraSees(game.cameras[ci], t, game.map)) { seen = true; seenByCamera = true; break; }
      }
    }
    var rate = 0;
    if (seenByGuard) rate = 30;
    else if (seenByCamera) rate = 42;
    if (seen) {
      if (t.sneaking) rate *= 0.5;
      game.alarm = Math.min(100, game.alarm + rate * dt);
      game.alarmQuiet = 0;
      game.spottedTtl = 0.4;
      if (game.alarm >= 50 && game.alarm < 100) {
        var g = nearestGuard();
        if (g && g.mode === 'patrol') {
          g.mode = 'investigate';
          g.target = { x: t.x, y: t.y };
          g.scan = 0;
          VB.sounds.spotted();
        }
      }
    } else {
      game.alarm = Math.max(0, game.alarm - 12 * dt);
      game.alarmQuiet += dt;
    }
    if (game.messageTtl > 0) game.messageTtl -= dt;
    if (game.spottedTtl > 0) game.spottedTtl -= dt;

    // --- alarm -----------------------------------------------------------
    if (game.alarm >= 100 && !game.alarmOn) {
      game.alarmOn = true;
      for (var ai = 0; ai < game.guards.length; ai++) {
        game.guards[ai].mode = 'chase';
        game.guards[ai].target = { x: t.x, y: t.y };
      }
      VB.sounds.alarm();
      showMessage('ALARM! Run for the shadows!', 3);
    }
    if (game.alarmOn) {
      for (var bi = 0; bi < game.guards.length; bi++) {
        if (game.guards[bi].mode === 'chase') game.guards[bi].target = { x: t.x, y: t.y };
      }
      game.alarmBeepT -= dt;
      if (game.alarmBeepT <= 0) { game.alarmBeepT = 1.1; VB.sounds.alarm(); }
      if (game.alarmQuiet > 4) {
        game.alarmOn = false;
        game.alarm = 55;
        for (var ri = 0; ri < game.guards.length; ri++) {
          if (game.guards[ri].mode === 'chase') { game.guards[ri].mode = 'patrol'; game.guards[ri].target = null; }
        }
        showMessage('They lost you. Stay quiet.', 3);
      }
    }

    // --- caught? ---------------------------------------------------------
    for (var ki = 0; ki < game.guards.length; ki++) {
      var kg = game.guards[ki];
      if (kg.mode === 'patrol') continue;
      var d = Math.hypot(kg.x - t.x, kg.y - t.y);
      if (d < CATCH_RANGE) {
        kg.catchWarn += dt;
        if (kg.catchWarn > CATCH_GRACE) {
          game.state = 'caught';
          VB.sounds.caught();
          return;
        }
      } else {
        kg.catchWarn = Math.max(0, kg.catchWarn - dt * 2);
      }
    }

    // --- coin flight -----------------------------------------------------
    if (game.coinFlight) {
      var c = game.coinFlight;
      var cdx = c.tx - c.x, cdy = c.ty - c.y;
      var cd = Math.hypot(cdx, cdy);
      var cstep = 420 * dt;
      if (cd <= cstep) {
        game.coinFlight = null;
        VB.sounds.coinLand();
        distractGuards(c.tx, c.ty, 7);
        showMessage('Clink! A guard went to look.');
      } else {
        c.x += cdx / cd * cstep;
        c.y += cdy / cd * cstep;
      }
    }

    // --- actions -----------------------------------------------------------
    if (input.wasPressed('e')) tryInteract();
    if (input.wasPressed('q')) throwCoin();
    if (input.wasPressed('f')) useEmp();
    if (input.wasPressed('r')) { loadLevel(game.levelIndex); return; }
    if (input.wasPressed('m')) { VB.setMuted(!VB.isMuted()); showMessage(VB.isMuted() ? 'Muted.' : 'Sound on.'); }

    // --- exit --------------------------------------------------------------
    if (game.exitPos && VB.tileAt(game.map, t.x, t.y) === 'E') {
      if (game.vaultTaken) { levelClear(); return; }
      if (game.messageTtl <= 0) showMessage('Grab the vault loot first!', 1.5);
    }
  }

  function update(dt) {
    var input = VB.input;
    if (game.state === 'menu') {
      if (input.wasPressed('enter') || input.mouseClicked()) {
        var c = input.mouse;
        if (input.wasPressed('enter') || (c.y > 470 && c.y < 520 && c.x > 380 && c.x < 580)) {
          VB.sounds.click();
          resetRun();
        }
      }
      return;
    }
    if (game.state === 'intro') {
      if (input.wasPressed('enter') || input.mouseClicked()) { VB.sounds.click(); game.state = 'play'; }
      return;
    }
    if (game.state === 'play') { updatePlay(dt); return; }
    if (game.state === 'caught') {
      if (input.wasPressed('r') || input.wasPressed('enter') || input.mouseClicked()) {
        VB.sounds.click();
        loadLevel(game.levelIndex);
        game.state = 'play';
      }
      return;
    }
    if (game.state === 'levelclear') {
      if (input.wasPressed('enter') || input.mouseClicked()) {
        VB.sounds.click();
        if (game.levelIndex + 1 < VB.LEVELS.length) loadLevel(game.levelIndex + 1);
        else finishRun();
      }
      return;
    }
    if (game.state === 'getaway') {
      if (input.wasPressed('enter') || input.mouseClicked()) {
        VB.sounds.click();
        game.state = 'menu';
      }
    }
  }

  VB.Game = game;
  VB.loadLevel = loadLevel;
  VB.resetRun = resetRun;
  VB.updateGame = update;
})();
