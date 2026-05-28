/* ===== Dorthes have — storybook SVG art for the world tiles =====
 * Hand-illustrated vector look (no image files): ink outlines, soft gradient shading,
 * a grounding shadow under each object. Gradients + the soft-shadow filter live once in
 * the shared <defs> sprite in index.html (ids "gd-*"), referenced here via url(#id).
 * Plants are anchored to the bottom so growth reads naturally; petals carry a "gd-petals"
 * group so a freshly-bloomed flower can unfold (see css/garden.css .gd-bloomed).
 */
(function (root) {
  'use strict';
  const INK = '#3c4a2e';
  const PETAL = { '🌷': '#ec6a8a', '🌻': '#f6c83c', '🌹': '#e0413f', '🌼': '#fbfbf2', '🌸': '#f4a6c0', '🪻': '#9b6fc7' };
  const CENTER = { '🌻': '#8a5a2b', '🌼': '#f6c83c' };

  const svg = (inner) => '<svg class="gd-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">' + inner + '</svg>';
  // soft shadow on the ground beneath an object, so it feels planted not floating
  const GROUND = '<ellipse cx="50" cy="91" rx="29" ry="6" fill="url(#gd-ground)"/>';
  const STEM = '<path d="M50 90 L50 50" stroke="#4e8d4a" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M50 72 q-16 -4 -21 -16 q16 1 21 11 z" fill="url(#gd-leaf)" stroke="' + INK + '" stroke-width="1.3" stroke-linejoin="round"/>';

  function sprout() {
    return svg(GROUND +
      '<path d="M50 91 L50 67" stroke="#5aa84f" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M50 73 q-13 -1 -18 -13 q14 0 18 9z" fill="url(#gd-leaf)" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M50 69 q13 -1 18 -13 q-14 0 -18 9z" fill="url(#gd-leaf)" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/>');
  }
  function young() {
    return svg(GROUND + STEM +
      '<g class="gd-sway"><circle cx="50" cy="43" r="11" fill="url(#gd-leaf)" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<ellipse cx="46" cy="39" rx="4.5" ry="3" fill="url(#gd-shine)"/></g>');
  }
  function flower(emoji) {
    const p = PETAL[emoji] || '#ec6a8a', c = CENTER[emoji] || '#f6c83c';
    let petals = '';
    for (let k = 0; k < 6; k++) {
      petals += '<ellipse cx="50" cy="26" rx="7.2" ry="13" fill="' + p + '" stroke="' + INK +
        '" stroke-width="1.1" transform="rotate(' + (k * 60) + ' 50 40)"/>';
    }
    return svg(GROUND + STEM +
      '<g class="gd-sway"><g class="gd-petals">' + petals + '</g>' +
      '<circle cx="50" cy="40" r="8.6" fill="' + c + '" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="47" cy="37" rx="3.4" ry="2.4" fill="url(#gd-shine)"/></g>');
  }
  function tree() {
    return svg(GROUND +
      '<path d="M45 90 L46 56 Q50 53 54 56 L55 90 Z" fill="url(#gd-bark)" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<g class="gd-sway" filter="url(#gd-soft)">' +
      '<circle cx="33" cy="47" r="17" fill="url(#gd-leaf)" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<circle cx="67" cy="47" r="17" fill="url(#gd-leaf-deep)" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<circle cx="50" cy="36" r="22" fill="url(#gd-leaf)" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<ellipse cx="43" cy="28" rx="7" ry="5" fill="url(#gd-shine)"/></g>');
  }
  function pond() {
    return svg('<ellipse cx="50" cy="66" rx="42" ry="29" fill="#6f9a59" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="50" cy="64" rx="36" ry="24" fill="url(#gd-water)"/>' +
      '<ellipse cx="44" cy="55" rx="13" ry="6" fill="url(#gd-shine)"/>' +
      '<path d="M30 70 q8 -7 17 -2" stroke="#bfeaf7" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<g class="gd-sway"><ellipse cx="64" cy="70" rx="11" ry="6.5" fill="#5aa84f" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<path d="M64 70 l5 -2" stroke="#3f7a3a" stroke-width="1.4"/></g>');
  }
  function feeder() {
    return svg(GROUND +
      '<path d="M47 90 L47 56 L53 56 L53 90 Z" fill="url(#gd-bark)" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<path d="M28 56 q22 18 44 0 q-3 12 -22 14 q-19 -2 -22 -14z" fill="#dfe6ea" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<ellipse cx="50" cy="56" rx="22" ry="7" fill="url(#gd-water)" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<ellipse cx="44" cy="54" rx="7" ry="2.4" fill="url(#gd-shine)"/>');
  }
  function beehouse() {
    // a coiled-straw skep: stacked rounded bands, dark entrance, ground shadow
    return svg(GROUND +
      '<g filter="url(#gd-soft)">' +
      '<path d="M26 82 q24 4 48 0 q-2 -34 -24 -34 q-22 0 -24 34z" fill="url(#gd-skep)" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M30 70 q20 5 40 0" stroke="#a9772a" stroke-width="2" fill="none"/>' +
      '<path d="M33 60 q17 4 34 0" stroke="#a9772a" stroke-width="2" fill="none"/>' +
      '<path d="M38 51 q12 3 24 0" stroke="#a9772a" stroke-width="2" fill="none"/>' +
      '<ellipse cx="50" cy="78" rx="5" ry="6" fill="#5a3f16" stroke="' + INK + '" stroke-width="1"/>' +
      '<ellipse cx="44" cy="50" rx="6" ry="4" fill="url(#gd-shine)"/></g>');
  }

  /* ---- decorations (cosmetic) ---- */
  function stone() {
    return svg(GROUND +
      '<ellipse cx="46" cy="70" rx="27" ry="18" fill="url(#gd-rock)" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="71" cy="76" rx="14" ry="11" fill="#9aa0a6" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="40" cy="60" rx="8" ry="4" fill="url(#gd-shine)"/>');
  }
  function mushroom() {
    return svg(GROUND +
      '<path d="M44 56 q-4 30 0 32 q6 2 12 0 q4 -2 0 -32z" fill="#f1e8d6" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<path d="M22 58 a28 23 0 0 1 56 0 q-28 9 -56 0z" fill="url(#gd-cap)" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="38" cy="47" r="4.5" fill="#fff"/><circle cx="60" cy="50" r="4" fill="#fff"/><circle cx="50" cy="40" r="3.5" fill="#fff"/>');
  }
  function hedge() {
    return svg(GROUND +
      '<g class="gd-sway" filter="url(#gd-soft)"><rect x="15" y="58" width="70" height="28" rx="13" fill="url(#gd-leaf-deep)" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<circle cx="31" cy="60" r="16" fill="url(#gd-leaf)" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<circle cx="50" cy="54" r="18" fill="url(#gd-leaf)" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<circle cx="69" cy="60" r="16" fill="url(#gd-leaf-deep)" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="44" cy="48" rx="7" ry="4" fill="url(#gd-shine)"/></g>');
  }
  function path() {
    return svg('<ellipse cx="34" cy="36" rx="17" ry="12" fill="#d6b98c" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="66" cy="56" rx="17" ry="12" fill="#cdb083" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="40" cy="80" rx="15" ry="10" fill="#bfa074" stroke="' + INK + '" stroke-width="1.2"/>');
  }
  function lantern() {
    return svg(GROUND +
      '<circle class="gd-lamp-glow" cx="50" cy="33" r="20" fill="url(#gd-glow)"/>' +
      '<rect x="47" y="42" width="6" height="46" rx="2" fill="#5e4a30" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<path d="M39 24 h22 l-4 -6 h-14 z" fill="#3d3a33" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>' +
      '<rect x="40" y="24" width="20" height="18" rx="4" fill="#ffe28a" stroke="#8a6d2f" stroke-width="1.6"/>' +
      '<rect class="gd-lamp-flame" x="46" y="29" width="8" height="9" rx="3" fill="#ffbf3d"/>' +
      '<line x1="40" y1="33" x2="60" y2="33" stroke="#8a6d2f" stroke-width="1.4"/>');
  }
  function bench() {
    return svg(GROUND +
      '<g filter="url(#gd-soft)">' +
      '<rect x="24" y="50" width="52" height="9" rx="3" fill="url(#gd-bark)" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<rect x="24" y="62" width="52" height="9" rx="3" fill="url(#gd-bark)" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<rect x="28" y="71" width="6" height="16" rx="2" fill="#6e4a28" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<rect x="66" y="71" width="6" height="16" rx="2" fill="#6e4a28" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<rect x="26" y="40" width="6" height="22" rx="2" fill="#6e4a28" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<rect x="68" y="40" width="6" height="22" rx="2" fill="#6e4a28" stroke="' + INK + '" stroke-width="1.1"/></g>');
  }
  function birdhouse() {
    return svg(GROUND +
      '<rect x="47" y="56" width="6" height="32" rx="2" fill="#6e4a28" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<g filter="url(#gd-soft)"><rect x="34" y="44" width="32" height="26" rx="4" fill="#e7c590" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M30 46 L50 28 L70 46 Z" fill="#c0533f" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="56" r="6.5" fill="#5a3f22" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<rect x="48" y="62" width="4" height="9" rx="1.5" fill="#6e4a28"/></g>');
  }

  const BUILD = { tree, pond, feeder, beehouse };
  const DECOR = { stone, mushroom, hedge, path, lantern, bench, birdhouse };
  function tile(t) {
    if (!t || t.type === 'soil') return '';
    if (t.type === 'flower') return t.stage === 1 ? sprout() : t.stage === 2 ? young() : flower(t.flower);
    return (BUILD[t.type] || DECOR[t.type] || (() => ''))();
  }
  root.GardenArt = { tile };
})(typeof globalThis !== 'undefined' ? globalThis : this);
