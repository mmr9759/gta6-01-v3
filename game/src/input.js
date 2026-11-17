// input.js — keyboard and mouse state, shared by player, vehicles and HUD.
export function createInput(canvas) {
  const I = {
    keys: {},
    mouse: { x: 0, y: 0, down: false, clicked: false },
    down(code) { return !!I.keys[code]; },
    pressed(code) {
      if (I.keys[code] && !I._prev[code]) { I._prev[code] = true; return true; }
      return false;
    },
    _prev: {},
    attach(onKey) {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
        if (!e.repeat) { I.keys[e.code] = true; if (onKey) onKey(e.code); }
      });
      window.addEventListener('keyup', (e) => { I.keys[e.code] = false; I._prev[e.code] = false; });
      window.addEventListener('blur', () => { I.keys = {}; I._prev = {}; I.mouse.down = false; });
      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        I.mouse.x = e.clientX - r.left; I.mouse.y = e.clientY - r.top;
      });
      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { I.mouse.down = true; I.mouse.clicked = true; }
      });
      window.addEventListener('mouseup', () => { I.mouse.down = false; });
    },
    // World position under the mouse, given the camera.
    worldMouse(cam, vw, vh) {
      return {
        x: cam.x + (I.mouse.x - vw / 2) / cam.zoom,
        y: cam.y + (I.mouse.y - vh / 2) / cam.zoom,
      };
    },
    endFrame() { I.mouse.clicked = false; },
    // Movement keys as a -1..1 pair, WASD or arrows.
    moveAxes() {
      let x = 0, y = 0;
      if (I.down('KeyA') || I.down('ArrowLeft')) x -= 1;
      if (I.down('KeyD') || I.down('ArrowRight')) x += 1;
      if (I.down('KeyW') || I.down('ArrowUp')) y -= 1;
      if (I.down('KeyS') || I.down('ArrowDown')) y += 1;
      return { x, y };
    },
  };
  return I;
}
