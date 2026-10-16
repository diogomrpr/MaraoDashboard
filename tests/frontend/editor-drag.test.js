import test from 'node:test';
import assert from 'node:assert/strict';
import { insertionAt } from '../../frontend_src/editor-drag.js';
const rect = (left, top, width = 100, height = 80) => ({ left, top, right: left + width, bottom: top + height, width, height });
test('empty, vertical lists and all start/between/end insertion boundaries', () => {
  assert.equal(insertionAt([], 0, 0).boundary, 0);
  const list = [rect(0, 0), rect(0, 90), rect(0, 180)];
  for (const [y, expected] of [[-2,0], [39,0], [41,1], [85,1], [129,1], [131,2], [219,2], [221,3], [300,3]]) {
    assert.equal(insertionAt(list, 25, y).boundary, expected);
  }
});
test('wrapped grids use actual horizontal slots including a single card in the last row', () => {
  const grid = [rect(0,0),rect(110,0),rect(0,90),rect(110,90),rect(0,180)];
  for (const [x,y,expected] of [[20,30,0],[70,30,1],[130,30,1],[190,30,2],[20,100,2],[190,100,4],[20,190,4],[70,190,5],[0,300,5]]) {
    assert.equal(insertionAt(grid,x,y).boundary,expected);
  }
  assert.equal(insertionAt(grid, 190, 85).boundary, 2, 'Between wrapped rows means before the next row');
});
test('right-to-left grids follow DOM ordering', () => {
  const grid = [rect(110,0),rect(0,0)];
  assert.equal(insertionAt(grid,190,30).boundary,0);
  assert.equal(insertionAt(grid,130,30).boundary,1);
  assert.equal(insertionAt(grid,20,30).boundary,2);
});
