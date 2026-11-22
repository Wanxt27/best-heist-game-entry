// VAULTBREAK — deterministic screenshot setups.
// One clear job: the three ?shot= frames the maker photographs.
// start = title screen, play = a mid-heist frame of level 2 with
// everything visible at once (room, thief, guards and cones,
// cameras, loot, alarm meter), end = the getaway screen. Every
// position, angle and number here is fixed, so the same URL always
// renders the same frame.
(function () {
  var VB = window.VB;

  function setupShot(shot) {
    var game = VB.Game;
    if (shot === 'start') {
      VB.loadLevel(0);
      game.state = 'menu';
      return;
    }
    if (shot === 'end') {
      VB.loadLevel(2);
      game.totalLoot = 2450;
      game.totalTime = 227;
      game.rating = 'S';
      game.state = 'getaway';
      return;
    }
    // play: level 2, the Gallery — the only room with guards AND
    // cameras AND loot AND the alarm meter, all in one frame.
    VB.loadLevel(1);
    game.state = 'play';
    game.t = 1.125;
    game.time = 83;
    game.alarm = 35;
    game.loot = 150;
    // One bonus stash already pocketed, the vault still waiting.
    game.bonuses[0].taken = true;
    // Thief mid-room, crossing the open floor.
    var thiefTile = VB.tileCenter(12, 10);
    game.thief.x = thiefTile.x;
    game.thief.y = thiefTile.y;
    game.thief.facing = Math.PI / 4;
    game.thief.sneaking = false;
    game.thief.hidden = false;
    // Guards frozen mid-patrol, cones sweeping the floor.
    var spots = [
      { x: 8, y: 2, facing: 0 },
      { x: 23, y: 10, facing: Math.PI },
      { x: 16, y: 14, facing: -Math.PI / 2 }
    ];
    for (var i = 0; i < game.guards.length; i++) {
      var c = VB.tileCenter(spots[i].x, spots[i].y);
      game.guards[i].x = c.x;
      game.guards[i].y = c.y;
      game.guards[i].facing = spots[i].facing;
      game.guards[i].mode = 'patrol';
    }
    // Cameras at their scripted sweep angles for this clock.
    for (var j = 0; j < game.cameras.length; j++) {
      VB.cameraStep(game.cameras[j], game.t, 0);
    }
  }

  VB.setupShot = setupShot;
})();
