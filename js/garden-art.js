/* ===== Dorthes have — custom SVG art for the world tiles =====
 * Simple, cute vector art (no image files) for each tile type/stage. Returns an <svg> string
 * that fills the tile. Plants are anchored to the bottom so growth reads naturally.
 */
(function (root) {
  'use strict';
  const PETAL = { '🌷': '#ec6a8a', '🌻': '#f6c83c', '🌹': '#e0413f', '🌼': '#fbfbf2', '🌸': '#f4a6c0', '🪻': '#9b6fc7' };
  const CENTER = { '🌻': '#8a5a2b', '🌼': '#f6c83c' };

  const svg = (inner) => '<svg class="gd-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">' + inner + '</svg>';
  const STEM = '<line x1="50" y1="88" x2="50" y2="50" stroke="#4e8d4a" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M50 72 q-16 -4 -20 -16 q15 1 20 11 z" fill="#5aa84f"/>';

  function sprout() {
    return svg('<line x1="50" y1="90" x2="50" y2="66" stroke="#5aa84f" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M50 72 q-13 -1 -17 -13 q13 0 17 9z" fill="#6cbf5e"/>' +
      '<path d="M50 68 q13 -1 17 -13 q-13 0 -17 9z" fill="#6cbf5e"/>');
  }
  function young() { return svg(STEM + '<g class="gd-sway"><circle cx="50" cy="44" r="9" fill="#7bc36b"/></g>'); }
  function flower(emoji) {
    const p = PETAL[emoji] || '#ec6a8a', c = CENTER[emoji] || '#f6c83c';
    let petals = '';
    for (let k = 0; k < 6; k++) petals += '<ellipse cx="50" cy="26" rx="7" ry="13" fill="' + p + '" transform="rotate(' + (k * 60) + ' 50 40)"/>';
    return svg(STEM + '<g class="gd-sway">' + petals + '<circle cx="50" cy="40" r="8.5" fill="' + c + '"/></g>');
  }
  function tree() {
    return svg('<rect x="44" y="54" width="12" height="36" rx="4" fill="#8a5a34"/>' +
      '<g class="gd-sway"><circle cx="32" cy="48" r="17" fill="#67b85b"/><circle cx="68" cy="48" r="17" fill="#67b85b"/><circle cx="50" cy="38" r="23" fill="#5aa84f"/></g>');
  }
  function pond() {
    return svg('<ellipse cx="50" cy="60" rx="40" ry="28" fill="#5fb6dd"/><ellipse cx="50" cy="55" rx="30" ry="18" fill="#86cfe9"/>' +
      '<ellipse cx="38" cy="62" rx="10" ry="6" fill="#5aa84f"/><circle cx="64" cy="52" r="3" fill="#bfe8f5"/>');
  }
  function feeder() {
    return svg('<rect x="46" y="50" width="8" height="40" fill="#9a7b53"/>' +
      '<path d="M28 52 q22 16 44 0 q-2 11 -22 13 q-20 -2 -22 -13z" fill="#cdd6dc"/>' +
      '<ellipse cx="50" cy="52" rx="22" ry="7" fill="#8fcfe6"/>');
  }
  function beehouse() {
    return svg('<path d="M30 80 a20 19 0 0 1 40 0 z" fill="#e7b84e"/>' +
      '<ellipse cx="50" cy="64" rx="17" ry="8" fill="#d8a73e"/><ellipse cx="50" cy="52" rx="12" ry="6" fill="#d8a73e"/>' +
      '<circle cx="50" cy="76" r="4" fill="#6b4f1d"/>');
  }

  const BUILD = { tree, pond, feeder, beehouse };
  function tile(t) {
    if (!t || t.type === 'soil') return '';
    if (t.type === 'flower') return t.stage === 1 ? sprout() : t.stage === 2 ? young() : flower(t.flower);
    return (BUILD[t.type] || (() => ''))();
  }
  root.GardenArt = { tile };
})(typeof globalThis !== 'undefined' ? globalThis : this);
