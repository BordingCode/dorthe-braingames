/* ===== Skydepuslespil — pure logic =====
 * Dual-mode (per gamedev-kb/patterns/testing-game-logic.md): runs as a classic <script>
 * in the browser (sets globalThis.SlidePuzzle) AND `require()`s into Node for `node --test`.
 * No DOM, no Math.random hidden inside — generation takes an injectable rng for reproducibility.
 *
 * Board = flat array, length n*n, values 0..n*n-1. 0 is the blank. Goal/solved = [1,2,…,N-1,0].
 */
(function (root) {
  'use strict';

  function solved(n) {
    const N = n * n;
    const b = [];
    for (let i = 1; i < N; i++) b.push(i);
    b.push(0); // blank last
    return b;
  }

  function isSolved(board) {
    for (let i = 0; i < board.length - 1; i++) if (board[i] !== i + 1) return false;
    return board[board.length - 1] === 0;
  }

  function blankIndex(board) { return board.indexOf(0); }

  // Indices of tiles orthogonally adjacent to the blank (the tiles that may slide into it).
  function legalMoves(board, n) {
    const z = board.indexOf(0);
    const r = Math.floor(z / n), c = z % n;
    const out = [];
    if (r > 0) out.push(z - n);
    if (r < n - 1) out.push(z + n);
    if (c > 0) out.push(z - 1);
    if (c < n - 1) out.push(z + 1);
    return out;
  }

  // Slide the tile at `idx` into the blank, if adjacent. Pure: returns a NEW board (or the
  // same array reference unchanged if the move is illegal).
  function applyMove(board, idx, n) {
    if (!legalMoves(board, n).includes(idx)) return board;
    const z = board.indexOf(0);
    const next = board.slice();
    next[z] = board[idx];
    next[idx] = 0;
    return next;
  }

  // Generate-from-solved: apply `steps` random legal moves starting from the solved board.
  // Solvability is guaranteed by construction (every move is reversible). Avoids immediately
  // undoing the previous move so it actually shuffles. rng() -> [0,1).
  function scramble(n, steps, rng) {
    rng = rng || Math.random;
    steps = steps || n * n * 30;
    let board = solved(n);
    let prevZ = -1;
    for (let s = 0; s < steps; s++) {
      const moves = legalMoves(board, n).filter((m) => m !== prevZ);
      const pick = moves[Math.floor(rng() * moves.length)];
      prevZ = board.indexOf(0); // the cell the tile vacates becomes the new "don't undo" target
      board = applyMove(board, pick, n);
    }
    if (isSolved(board)) return scramble(n, steps + n, rng); // never hand back a solved board
    return board;
  }

  // Inversions over the tiles (blank excluded), goal being row-major 1..N-1.
  function inversions(board) {
    const t = board.filter((v) => v !== 0);
    let inv = 0;
    for (let i = 0; i < t.length; i++)
      for (let j = i + 1; j < t.length; j++)
        if (t[i] > t[j]) inv++;
    return inv;
  }

  // Standard 15-puzzle solvability test (independent of how the board was made — used in tests
  // to confirm scramble() always yields solvable boards, and to reject deliberately-broken ones).
  function isSolvable(board, n) {
    const inv = inversions(board);
    if (n % 2 === 1) return inv % 2 === 0;
    const rowFromBottom = n - Math.floor(board.indexOf(0) / n); // 1-indexed from bottom
    return (inv + rowFromBottom) % 2 === 1;
  }

  function isPermutation(board, n) {
    const N = n * n;
    if (board.length !== N) return false;
    const seen = new Array(N).fill(false);
    for (const v of board) {
      if (!Number.isInteger(v) || v < 0 || v >= N || seen[v]) return false;
      seen[v] = true;
    }
    return true;
  }

  const api = { solved, isSolved, blankIndex, legalMoves, applyMove, scramble, inversions, isSolvable, isPermutation };

  if (typeof module !== 'undefined' && module.exports) module.exports = api; // Node / node --test
  root.SlidePuzzle = api;                                                    // browser global
})(typeof globalThis !== 'undefined' ? globalThis : this);
