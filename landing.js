/**
 * landing.js — front-page motion: mouse parallax + click-to-roll dice.
 * Purely cosmetic; the game never depends on it.
 */
(function () {
  'use strict';
  var page  = document.getElementById('name-modal');
  var dice  = document.getElementById('dice-roller');
  var scene = document.getElementById('dice-scene');
  if (!page) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

  function frame() {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    page.style.setProperty('--mx', cx.toFixed(3));
    page.style.setProperty('--my', cy.toFixed(3));
    raf = (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) ? requestAnimationFrame(frame) : 0;
  }

  if (!reduce) {
    page.addEventListener('pointermove', function (e) {
      if (!page.classList.contains('active')) return;
      tx = (e.clientX / window.innerWidth  - 0.5) * 2;   // -1 … 1
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(frame);
    });
  }

  // Click / tap the dice → it hops and rolls
  function roll() {
    if (!dice || reduce) return;
    dice.classList.remove('rolling');
    void dice.offsetWidth;
    dice.classList.add('rolling');
    if (scene) {
      scene.classList.remove('burst');
      void scene.offsetWidth;
      scene.classList.add('burst');
    }
  }
  if (scene) {
    scene.style.pointerEvents = 'auto';
    scene.style.cursor = 'pointer';
    scene.addEventListener('click', roll);
  }
  if (dice) dice.addEventListener('animationend', function () { dice.classList.remove('rolling'); });

  // Roll by itself every few seconds so the page always feels alive
  if (!reduce) setInterval(function () {
    if (page.classList.contains('active') && !document.hidden) roll();
  }, 7000);
})();
