// VAULTBREAK: The Midnight Vault — level definitions.
// One clear job: the three rooms, their walls, shadows, loot, exits,
// guard patrols and camera mounts. Tiles are 32px. Maps use:
//   '#' wall   '.' floor   's' shadow (hides the thief)
//   'T' thief start   'L' main vault   'B' bonus loot   'E' exit door
// Guard waypoints are tile coordinates; every patrol leg is a clear
// straight line (same row or column, no wall between waypoints).
(function () {
  var TILE = 32;
  var GRID_W = 28;
  var GRID_H = 17;

  // Level 1 map, hand-drawn and validated: every marker reachable,
  // every patrol leg clear. Levels 2 and 3 reuse the same skeleton
  // with their own walls, guards and cameras.
  var L1_MAP = [
    '############################',
    '#......s......##...........#',
    '#......s......##.....B.....#',
    '#.............##...........#',
    '#..T..........##....####...#',
    '#.............##....#......#',
    '#.....####....##....#..s...#',
    '#.....#.......##....#..s...#',
    '#.....#.......##...........#',
    '#.....#..####......####....#',
    '#.............#......#.....#',
    '#..B..........#.L....#.....#',
    '#.............#......#..E..#',
    '#.....s.......#......#.....#',
    '#.....s.......#......#.....#',
    '#.............#......#.....#',
    '############################'
  ];

  // Level 3 starts from the level 1 skeleton, then stamps two extra
  // wall blocks and one more bonus stash on top of it.
  function stampWall(rows, x, y, w, h) {
    var grid = rows.map(function (r) { return r.split(''); });
    for (var j = y; j < y + h; j++) {
      for (var i = x; i < x + w; i++) grid[j][i] = '#';
    }
    return grid.map(function (r) { return r.join(''); });
  }
  var L3_MAP = stampWall(L1_MAP, 23, 2, 2, 2);
  L3_MAP = stampWall(L3_MAP, 18, 13, 2, 2);
  (function () {
    var grid = L3_MAP.map(function (r) { return r.split(''); });
    grid[5][24] = 'B';
    L3_MAP = grid.map(function (r) { return r.join(''); });
  })();

  var LEVELS = [
    {
      name: 'LEVEL 1 — THE LOBBY',
      hint: 'Slip past the patrols, crack the vault, reach the exit.',
      loot: 1000,
      bonus: 150,
      map: L1_MAP,
      guards: [
        { waypoints: [[6, 2], [10, 2], [10, 5], [6, 5]], speed: 1.6, pause: 0.8, range: 176, fov: 0.61 },
        { waypoints: [[18, 2], [24, 2], [24, 3], [18, 3]], speed: 1.6, pause: 0.8, range: 176, fov: 0.61 }
      ],
      cameras: []
    },
    {
      name: 'LEVEL 2 — THE GALLERY',
      hint: 'Cameras sweep the hall now. Watch the cones, mind the light.',
      loot: 1000,
      bonus: 150,
      map: [
        '############################',
        '#....s......##......B......#',
        '#....s......##.............#',
        '#...........##....####.....#',
        '#..T........##....#...#....#',
        '#...........##....#...#....#',
        '#.####......##....#...#..s.#',
        '#.#........##....#...#..s..#',
        '#.#...####....###...#......#',
        '#.#........#...............#',
        '#.#..B.....#..s...#...L....#',
        '#.#........#..s...#........#',
        '#.#...######..#####..##....#',
        '#...........#..............#',
        '#....s......#..B...#..E....#',
        '#....s......#......#.......#',
        '############################'
      ],
      guards: [
        { waypoints: [[6, 2], [11, 2], [11, 5], [6, 5]], speed: 1.8, pause: 0.6, range: 184, fov: 0.61 },
        { waypoints: [[21, 9], [25, 9], [25, 11], [21, 11]], speed: 1.8, pause: 0.6, range: 184, fov: 0.61 },
        { waypoints: [[14, 13], [18, 13], [18, 15], [14, 15]], speed: 1.7, pause: 0.7, range: 184, fov: 0.61 }
      ],
      cameras: [
        { x: 14, y: 1, base: Math.PI / 2, sweep: 1.1, period: 4.5, range: 224, fov: 0.44 },
        { x: 26, y: 9, base: Math.PI, sweep: 1.0, period: 5.5, range: 224, fov: 0.44 }
      ]
    },
    {
      name: 'LEVEL 3 — THE VAULT',
      hint: 'The vault is triple-guarded. Shadows are scarce. Be perfect.',
      loot: 1000,
      bonus: 150,
      map: L3_MAP,
      guards: [
        { waypoints: [[6, 2], [10, 2], [10, 5], [6, 5]], speed: 2.0, pause: 0.5, range: 192, fov: 0.61 },
        { waypoints: [[21, 5], [25, 5], [25, 8], [21, 8]], speed: 2.0, pause: 0.5, range: 192, fov: 0.61 },
        { waypoints: [[3, 12], [10, 12], [10, 15], [3, 15]], speed: 1.9, pause: 0.5, range: 192, fov: 0.61 },
        { waypoints: [[17, 10], [20, 10], [20, 12], [17, 12]], speed: 1.9, pause: 0.5, range: 192, fov: 0.61 }
      ],
      cameras: [
        { x: 16, y: 1, base: Math.PI / 2, sweep: 1.2, period: 4.0, range: 232, fov: 0.44 },
        { x: 26, y: 9, base: Math.PI, sweep: 1.1, period: 5.0, range: 232, fov: 0.44 },
        { x: 1, y: 9, base: 0, sweep: 1.0, period: 6.0, range: 232, fov: 0.44 }
      ]
    }
  ];

  window.VB = window.VB || {};
  window.VB.TILE = TILE;
  window.VB.GRID_W = GRID_W;
  window.VB.GRID_H = GRID_H;
  window.VB.LEVELS = LEVELS;

  // Node harness for the local validator (harmless in the browser).
  if (typeof module !== 'undefined') {
    module.exports = { LEVELS: LEVELS, TILE: TILE, GRID_W: GRID_W, GRID_H: GRID_H };
  }
})();
