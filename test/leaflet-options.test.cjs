/**
 * Tests isolation of options in independently initialized Leaflet components.
 * Run: node --test test/leaflet-options.test.cjs
 *
 * @author: HIRANO Satoshi with Happy
 * @copyright 2026 Peace and Passion
 * @since: 2026/11/10
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// 実際のソースをBabelで変換する。描画やAureliaのDIは不要なので境界だけをスタブにする。
async function loadSource(file, dependencies) {
  const babel = await import('@babel/core');
  const decorators = await import('@babel/plugin-proposal-decorators');
  const classProperties = await import('@babel/plugin-transform-class-properties');
  const commonjs = await import('@babel/plugin-transform-modules-commonjs');
  const filename = path.join(__dirname, '..', 'src', file);
  const result = await babel.transformAsync(fs.readFileSync(filename, 'utf8'), {
    filename,
    babelrc: false,
    configFile: false,
    assumptions: { setPublicClassFields: true },
    plugins: [[decorators.default, { version: 'legacy' }], classProperties.default, commonjs.default],
  });
  const code = result.code;
  const module = { exports: {} };
  const requireStub = name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: requireStub, Object, Promise, Element: class {} }, { filename });
  return module.exports;
}

async function createComponents() {
  const defaults = await loadSource('leaflet-defaults.js', {});
  const decorate = () => target => target;
  const { LeafletCustomElement } = await loadSource('leaflet.js', {
    'aurelia-framework': { inject: decorate, customElement: decorate, useView: decorate, bindable: (_target, _key, descriptor) => ({ ...descriptor, writable: true }) },
    'aurelia-event-aggregator': { EventAggregator: class {} },
    './aurelia-leaflet-exceptions.js': { AureliaLeafletException: class extends Error {} },
    './leaflet-defaults.js': defaults,
    './helpers/layer-factory.js': { LayerFactory: class {} },
    leaflet: {},
  });
  return { defaults, first: new LeafletCustomElement({}, {}), second: new LeafletCustomElement({}, {}) };
}

// 生成直後から、個々の地図が設定の外側のオブジェクトを共有しない。
test('each component owns its initial options', async () => {
  const { defaults, first, second } = await createComponents();
  assert.notStrictEqual(first.mapOptions, second.mapOptions);
  assert.notStrictEqual(first.mapOptions, defaults.defaultMapOptions);
});

// 両方の初期化が終わる前に別々の座標を設定しても、各地図は自分の座標へ移動する。
test('deferred map initialization keeps each center independent', async () => {
  const { defaults, first, second } = await createComponents();
  const firstCenter = { lat: 44.99, lng: 13.82 };
  const secondCenter = { lat: 40.77, lng: -73.98 };
  const calls = [];
  first.map = { setView: center => calls.push(['first', center]), setZoom() {}, setMaxBounds() {} };
  second.map = { setView: center => calls.push(['second', center]), setZoom() {}, setMaxBounds() {} };
  const originalCenter = defaults.defaultMapOptions.center;
  first.mapOptionsChanged({ center: firstCenter }, { center: null });
  second.mapOptionsChanged({ center: secondCenter }, { center: null });
  first.mapInitResolve();
  second.mapInitResolve();
  await Promise.all([first.mapInit, second.mapInit]);
  assert.strictEqual(defaults.defaultMapOptions.center, originalCenter);
  assert.deepStrictEqual(calls, [['first', firstCenter], ['second', secondCenter]]);
});
