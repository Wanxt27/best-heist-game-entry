// VAULTBREAK — security cameras.
// One clear job: the sweeping wall cameras. A camera sits on a floor
// tile, turns on a fixed pivot, and sweeps its cone back and forth
// on a sine. An EMP freeze holds it still at its current angle.
(function () {
  var VB = window.VB;

  function makeCamera(def) {
    var c = VB.tileCenter(def.x, def.y);
    return {
      x: c.x, y: c.y,
      base: def.base,
      sweep: def.sweep,
      period: def.period,
      range: def.range,
      fov: def.fov,
      angle: def.base,
      frozen: 0,       // seconds of EMP freeze left
      frozenAngle: 0
    };
  }

  function cameraStep(cam, t, dt) {
    if (cam.frozen > 0) {
      cam.frozen -= dt;
      cam.angle = cam.frozenAngle;
      return;
    }
    cam.angle = cam.base + cam.sweep * Math.sin((t / cam.period) * Math.PI * 2);
  }

  function cameraFreeze(cam, seconds) {
    cam.frozen = seconds;
    cam.frozenAngle = cam.angle;
  }

  // Same sight rules as a guard: range, cone, clear line, shadows hide.
  function cameraSees(cam, thief, map) {
    var dx = thief.x - cam.x, dy = thief.y - cam.y;
    var d = Math.hypot(dx, dy);
    if (d > cam.range) return false;
    if (VB.angleDiff(Math.atan2(dy, dx), cam.angle) > cam.fov) return false;
    if (!VB.lineOfSight(map, cam.x, cam.y, thief.x, thief.y)) return false;
    if (thief.hidden && d > 40) return false;
    return true;
  }

  VB.makeCamera = makeCamera;
  VB.cameraStep = cameraStep;
  VB.cameraFreeze = cameraFreeze;
  VB.cameraSees = cameraSees;
})();
