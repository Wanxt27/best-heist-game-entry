// VAULTBREAK — guard patrols, vision cones and line of sight.
// One clear job: everything a guard is and does, plus the shared
// grid queries (tile lookup, wall test, sight line) the cameras and
// the thief use too. All positions are pixels; tiles are 32px.
(function () {
  var VB = window.VB;
  var TILE = VB.TILE;

  // --- shared grid queries -------------------------------------------
  function tileAt(map, px, py) {
    var x = Math.floor(px / TILE);
    var y = Math.floor(py / TILE);
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return '#';
    return map[y][x];
  }
  function isWall(map, px, py) { return tileAt(map, px, py) === '#'; }
  function tileCenter(tx, ty) { return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }; }

  // True when nothing but air sits between two points: sample the
  // segment every 6px and stop at the first wall tile.
  function lineOfSight(map, x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0;
    var dist = Math.hypot(dx, dy);
    var steps = Math.max(1, Math.ceil(dist / 6));
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      if (isWall(map, x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  // Smallest absolute angle between two headings, 0..PI.
  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }

  // Circle (the walker) against the wall grid: try the move on one
  // axis at a time, so walkers slide along walls instead of sticking.
  function moveWithWalls(map, p, dx, dy, r) {
    var nx = p.x + dx;
    if (!isWall(map, nx + (dx > 0 ? r : -r), p.y - r * 0.7) &&
        !isWall(map, nx + (dx > 0 ? r : -r), p.y + r * 0.7) &&
        !isWall(map, nx + (dx > 0 ? r : -r), p.y)) {
      p.x = nx;
    }
    var ny = p.y + dy;
    if (!isWall(map, p.x - r * 0.7, ny + (dy > 0 ? r : -r)) &&
        !isWall(map, p.x + r * 0.7, ny + (dy > 0 ? r : -r)) &&
        !isWall(map, p.x, ny + (dy > 0 ? r : -r))) {
      p.y = ny;
    }
  }

  // --- guards ----------------------------------------------------------
  // mode: 'patrol' | 'investigate' | 'chase'
  function makeGuard(def) {
    var first = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
    return {
      x: first.x, y: first.y,
      waypoints: def.waypoints,
      wp: 1,
      speed: def.speed * TILE,
      pause: 0,
      pauseTime: def.pause,
      range: def.range,
      fov: def.fov,
      facing: 0,
      mode: 'patrol',
      target: null,       // {x, y} for investigate / chase
      scan: 0,            // look-around timer at an investigated spot
      catchWarn: 0,       // seconds the thief has been within grab range
      coin: null          // {x, y} coin landing the guard is checking
    };
  }

  function guardStep(g, dt, map) {
    if (g.pause > 0) { g.pause -= dt; return; }
    var tx, ty, speed = g.speed;
    if (g.mode === 'patrol') {
      var wp = g.waypoints[g.wp];
      var c = tileCenter(wp[0], wp[1]);
      tx = c.x; ty = c.y;
    } else if (g.mode === 'investigate' && g.target) {
      tx = g.target.x; ty = g.target.y;
      speed = g.speed * 1.25;
    } else if (g.mode === 'chase' && g.target) {
      tx = g.target.x; ty = g.target.y;
      speed = g.speed * 1.7;
    } else {
      return;
    }
    var dx = tx - g.x, dy = ty - g.y;
    var d = Math.hypot(dx, dy);
    if (d < 4) {
      if (g.mode === 'patrol') {
        g.wp = (g.wp + 1) % g.waypoints.length;
        g.pause = g.pauseTime;
      } else if (g.mode === 'investigate') {
        // Arrived: look around, then give up and go back to patrol.
        if (g.scan <= 0) g.scan = 1.5;
        g.facing += dt * 2.2;
        g.scan -= dt;
        if (g.scan <= 0) {
          g.mode = 'patrol';
          g.target = null;
          g.coin = null;
          // Resume at the nearest waypoint.
          var best = 0, bestD = Infinity;
          for (var i = 0; i < g.waypoints.length; i++) {
            var cc = tileCenter(g.waypoints[i][0], g.waypoints[i][1]);
            var dd = Math.hypot(cc.x - g.x, cc.y - g.y);
            if (dd < bestD) { bestD = dd; best = i; }
          }
          g.wp = best;
        }
      }
      return;
    }
    var step = Math.min(d, speed * dt);
    var mx = dx / d * step, my = dy / d * step;
    g.facing = Math.atan2(dy, dx);
    moveWithWalls(map, g, mx, my, 12);
  }

  // Can this guard see the thief right now? Range, cone, a clear
  // sight line, and no shadow to hide in (unless point-blank).
  function guardSees(g, thief, map) {
    var dx = thief.x - g.x, dy = thief.y - g.y;
    var d = Math.hypot(dx, dy);
    if (d > g.range) return false;
    if (angleDiff(Math.atan2(dy, dx), g.facing) > g.fov) return false;
    if (!lineOfSight(map, g.x, g.y, thief.x, thief.y)) return false;
    if (thief.hidden && d > 40) return false;
    return true;
  }

  VB.tileAt = tileAt;
  VB.isWall = isWall;
  VB.tileCenter = tileCenter;
  VB.lineOfSight = lineOfSight;
  VB.angleDiff = angleDiff;
  VB.moveWithWalls = moveWithWalls;
  VB.makeGuard = makeGuard;
  VB.guardStep = guardStep;
  VB.guardSees = guardSees;
})();
