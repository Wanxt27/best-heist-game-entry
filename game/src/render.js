// VAULTBREAK — rendering.
// One clear job: everything the player sees, drawn on one canvas:
// the room, the cones, the crew, the loot, the HUD and the screens.
// Cones are drawn before the walls, so a wall hides the part of a
// cone it blocks — the picture matches the sight rules.
(function () {
  var VB = window.VB;
  var TILE = VB.TILE;
  var OX = 32, OY = 64;              // playfield origin in canvas px
  var W = 960, H = 640;

  function px(tx) { return OX + tx * TILE; }
  function py(ty) { return OY + ty * TILE; }

  function drawCone(ctx, x, y, angle, range, fov, color) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - fov, angle + fov);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color.replace('0.13', '0.35').replace('0.12', '0.35');
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Floor and shadows first. Walls come later, after the cones,
  // so a wall hides the part of a cone it blocks.
  function drawFloor(ctx, game) {
    var map = game.map;
    for (var y = 0; y < map.length; y++) {
      for (var x = 0; x < map[y].length; x++) {
        var ch = map[y][x];
        var X = px(x), Y = py(y);
        if (ch === '#') continue;
        // Floor: faint checker so movement reads at a glance.
        ctx.fillStyle = (x + y) % 2 === 0 ? '#171d2b' : '#1a2133';
        ctx.fillRect(X, Y, TILE, TILE);
        if (ch === 's') {
          ctx.fillStyle = 'rgba(4, 6, 14, 0.55)';
          ctx.fillRect(X, Y, TILE, TILE);
          ctx.strokeStyle = 'rgba(120, 160, 255, 0.25)';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(X + 2, Y + 2, TILE - 4, TILE - 4);
          ctx.setLineDash([]);
        }
      }
    }
    // Room border glow.
    ctx.strokeStyle = '#2e3a55';
    ctx.lineWidth = 2;
    ctx.strokeRect(OX - 1, OY - 1, 28 * TILE + 2, 17 * TILE + 2);
  }

  function drawWalls(ctx, game) {
    var map = game.map;
    for (var y = 0; y < map.length; y++) {
      for (var x = 0; x < map[y].length; x++) {
        if (map[y][x] !== '#') continue;
        var X = px(x), Y = py(y);
        ctx.fillStyle = '#3a4152';
        ctx.fillRect(X, Y, TILE, TILE);
        ctx.fillStyle = '#565e73';
        ctx.fillRect(X, Y, TILE, 5);
        ctx.fillStyle = '#2b3040';
        ctx.fillRect(X, Y + TILE - 4, TILE, 4);
      }
    }
  }

  function drawLoot(ctx, game) {
    // Exit door.
    if (game.exitPos) {
      var e = game.exitPos;
      ctx.fillStyle = '#1d7a4a';
      ctx.fillRect(e.x - 14, e.y - 14, 28, 28);
      ctx.fillStyle = '#2fd07f';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', e.x, e.y + 3);
      ctx.strokeStyle = '#2fd07f';
      ctx.lineWidth = 2;
      ctx.strokeRect(e.x - 14, e.y - 14, 28, 28);
    }
    // Bonus stashes.
    for (var i = 0; i < game.bonuses.length; i++) {
      var b = game.bonuses[i];
      if (b.taken) continue;
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2f00';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$', b.x, b.y + 4);
    }
    // The vault: a gold safe. Dark and open once cracked.
    if (game.vaultPos) {
      var v = game.vaultPos;
      ctx.fillStyle = game.vaultTaken ? '#4a3f16' : '#d4af37';
      ctx.fillRect(v.x - 15, v.y - 15, 30, 30);
      ctx.strokeStyle = '#fff3b0';
      ctx.lineWidth = 2;
      ctx.strokeRect(v.x - 15, v.y - 15, 30, 30);
      ctx.fillStyle = game.vaultTaken ? '#8a7a2a' : '#3a2f00';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(game.vaultTaken ? 'OPEN' : 'VAULT', v.x, v.y + 4);
    }
  }

  function drawGuard(ctx, g) {
    // Vision cone first (walls drawn earlier already hide its blocked part).
    drawCone(ctx, g.x, g.y, g.facing, g.range, g.fov,
      g.mode === 'chase' ? 'rgba(255, 40, 40, 0.22)' : 'rgba(255, 80, 40, 0.13)');
    // Body: navy uniform, direction tick.
    ctx.fillStyle = g.mode === 'patrol' ? '#3f5a8a' : '#b03030';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dfe8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.facing) * 16, g.y + Math.sin(g.facing) * 16);
    ctx.stroke();
    // "!" while suspicious or chasing; flashing ring while grabbing.
    if (g.mode !== 'patrol') {
      ctx.fillStyle = '#ffdd00';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 18);
    }
    if (g.catchWarn > 0) {
      ctx.strokeStyle = 'rgba(255, 0, 0,' + (0.5 + 0.5 * Math.sin(Date.now() / 60)) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawCamera(ctx, cam) {
    drawCone(ctx, cam.x, cam.y, cam.angle, cam.range, cam.fov,
      cam.frozen > 0 ? 'rgba(90, 180, 255, 0.12)' : 'rgba(255, 170, 40, 0.13)');
    ctx.fillStyle = cam.frozen > 0 ? '#4a7ab0' : '#8a6a20';
    ctx.fillRect(cam.x - 7, cam.y - 7, 14, 14);
    ctx.strokeStyle = '#ffd970';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cam.x - 7, cam.y - 7, 14, 14);
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.lineTo(cam.x + Math.cos(cam.angle) * 13, cam.y + Math.sin(cam.angle) * 13);
    ctx.stroke();
    if (cam.frozen > 0) {
      ctx.fillStyle = '#bfe0ff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FROZEN', cam.x, cam.y - 12);
    }
  }

  function drawThief(ctx, game) {
    var t = game.thief;
    if (game.coinFlight) {
      var c = game.coinFlight;
      ctx.strokeStyle = '#ffd970';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      ctx.fillStyle = '#ffd970';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = t.hidden ? 0.55 : 1;
    // Hooded thief: dark body, pale mask, direction tick.
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.sneaking ? 10 : 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd970';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#f2ead8';
    ctx.beginPath();
    ctx.arc(t.x + Math.cos(t.facing) * 4, t.y + Math.sin(t.facing) * 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (t.sneaking) {
      ctx.fillStyle = '#9fb4ff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SNEAK', t.x, t.y - 18);
    }
    if (t.hidden) {
      ctx.fillStyle = '#9fb4ff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', t.x, t.y + 24);
    }
  }

  function fmtTime(s) {
    var m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  function drawHud(ctx, game) {
    ctx.fillStyle = '#0c101c';
    ctx.fillRect(0, 0, W, 56);
    ctx.strokeStyle = '#2e3a55';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 56);
    ctx.lineTo(W, 56);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd970';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('VAULTBREAK', 16, 24);
    ctx.fillStyle = '#9fb4ff';
    ctx.font = '12px monospace';
    ctx.fillText(game.level ? game.level.name : '', 16, 42);
    // Loot.
    ctx.fillStyle = '#ffd970';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('LOOT $' + game.loot, 330, 24);
    ctx.fillStyle = '#9fb4ff';
    ctx.font = '12px monospace';
    ctx.fillText('TIME ' + fmtTime(game.time), 330, 42);
    // Alarm meter.
    ctx.fillStyle = '#c8d2e8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ALARM', 520, 20);
    ctx.fillStyle = '#222a3d';
    ctx.fillRect(520, 26, 180, 14);
    var a = game.alarm / 100;
    ctx.fillStyle = a < 0.5 ? '#2fd07f' : a < 0.85 ? '#ffb020' : '#ff4040';
    ctx.fillRect(520, 26, 180 * a, 14);
    ctx.strokeStyle = '#c8d2e8';
    ctx.strokeRect(520, 26, 180, 14);
    if (game.alarmOn) {
      ctx.fillStyle = Math.sin(Date.now() / 120) > 0 ? '#ff4040' : '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('ALARM!', 710, 37);
    }
    // Tools.
    ctx.fillStyle = '#c8d2e8';
    ctx.font = '12px monospace';
    ctx.fillText('COIN [Q] x' + game.coins + '  ($25)', 770, 24);
    ctx.fillText('EMP [F] x' + game.emps, 770, 42);
    if (VB.isMuted()) {
      ctx.fillStyle = '#ff8080';
      ctx.fillText('MUTED', 900, 24);
    }
  }

  function drawHintBar(ctx, game) {
    ctx.fillStyle = '#0c101c';
    ctx.fillRect(0, 608, W, 32);
    ctx.fillStyle = '#7d8aa8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / ARROWS move   SHIFT sneak   E grab   Q coin ($25)   F EMP   R restart   M mute', W / 2, 628);
    if (game.messageTtl > 0 && game.message) {
      ctx.fillStyle = '#ffd970';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(game.message, W / 2, 596);
    }
  }

  function panel(ctx, title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 11, 20, 0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent || '#ffd970';
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, 220);
    ctx.fillStyle = '#c8d2e8';
    ctx.font = '16px monospace';
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], W / 2, 270 + i * 28);
  }

  function button(ctx, label, x, y, w, h) {
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1a1405';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 7);
  }

  function render(ctx, game) {
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, W, H);
    if (game.state === 'menu') {
      drawHud(ctx, game);
      panel(ctx, 'VAULTBREAK', [
        'THE MIDNIGHT VAULT',
        '',
        'Three vault rooms. Guards with eyes, cameras that sweep,',
        'one alarm between you and the getaway car.',
        'Sneak in the shadows. Crack the vault. Get out rich.'
      ]);
      button(ctx, 'START HEIST', 380, 470, 200, 50);
      ctx.fillStyle = '#7d8aa8';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('or press ENTER', W / 2, 545);
      return;
    }
    if (game.state === 'intro') {
      drawHud(ctx, game);
      drawFloor(ctx, game);
      drawWalls(ctx, game);
      panel(ctx, game.level.name, [game.level.hint, '', 'Press ENTER to begin']);
      return;
    }
    drawFloor(ctx, game);
    // Cones first: the walls drawn next hide their blocked parts.
    for (var gi = 0; gi < game.guards.length; gi++) drawGuard(ctx, game.guards[gi]);
    for (var ci = 0; ci < game.cameras.length; ci++) drawCamera(ctx, game.cameras[ci]);
    drawWalls(ctx, game);
    drawLoot(ctx, game);
    drawThief(ctx, game);
    drawHud(ctx, game);
    drawHintBar(ctx, game);
    if (game.state === 'caught') {
      panel(ctx, 'CAUGHT!', ['The guards got you. The vault keeps its gold.', '', 'Press R or ENTER to try again'], '#ff5040');
    } else if (game.state === 'levelclear') {
      panel(ctx, 'LEVEL CLEAR!', ['Loot this room: $' + game.loot, 'Total so far: $' + game.totalLoot, '', 'Press ENTER for the next room'], '#2fd07f');
    } else if (game.state === 'getaway') {
      panel(ctx, 'GETAWAY!', [
        'You slipped into the night with the gold.',
        'Total loot: $' + game.totalLoot,
        'Total time: ' + fmtTime(game.totalTime),
        'Crew rating: ' + game.rating,
        '',
        'Press ENTER to play again'
      ], '#2fd07f');
    }
    // Red vignette while the alarm screams.
    if (game.alarmOn && game.state === 'play') {
      ctx.strokeStyle = 'rgba(255, 40, 40, 0.6)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 60, W - 8, H - 68);
    }
  }

  VB.render = render;
  VB.CANVAS_W = W;
  VB.CANVAS_H = H;
  VB.FIELD_OX = OX;
  VB.FIELD_OY = OY;
})();
