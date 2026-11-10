var _dec, _dec2, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _LeafletCustomElement;
function _initializerDefineProperty(e, i, r, l) { r && Object.defineProperty(e, i, { enumerable: r.enumerable, configurable: r.configurable, writable: r.writable, value: r.initializer ? r.initializer.call(l) : void 0 }); }
function _applyDecoratedDescriptor(i, e, r, n, l) { var a = {}; return Object.keys(n).forEach(function (i) { a[i] = n[i]; }), a.enumerable = !!a.enumerable, a.configurable = !!a.configurable, ("value" in a || a.initializer) && (a.writable = !0), a = r.slice().reverse().reduce(function (r, n) { return n(i, e, r) || r; }, a), l && void 0 !== a.initializer && (a.value = a.initializer ? a.initializer.call(l) : void 0, a.initializer = void 0), void 0 === a.initializer ? (Object.defineProperty(i, e, a), null) : a; }
function _initializerWarningHelper(r, e) { throw Error("Decorating class property failed. Please ensure that transform-class-properties is enabled and runs after the decorators transform."); }
import { inject, customElement, useView, bindable } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { AureliaLeafletException } from './aurelia-leaflet-exceptions.js';
import { defaultMapOptions, defaultLayers } from './leaflet-defaults.js';
import { LayerFactory } from './helpers/layer-factory.js';
import * as Leaflet from 'leaflet';
export let LeafletCustomElement = (_dec = customElement('leaflet'), _dec2 = useView('./leaflet.html'), _dec(_class = _dec2(_class = (_class2 = (_LeafletCustomElement = class LeafletCustomElement {
  constructor(eventAggregator, element) {
    _initializerDefineProperty(this, "layers", _descriptor, this);
    _initializerDefineProperty(this, "mapEvents", _descriptor2, this);
    _initializerDefineProperty(this, "mapOptions", _descriptor3, this);
    _initializerDefineProperty(this, "withLayerControl", _descriptor4, this);
    _initializerDefineProperty(this, "withScaleControl", _descriptor5, this);
    this.map = void 0;
    this.attachedLayers = {
      base: {},
      overlay: {}
    };
    this.L = Leaflet;
    this.eventAggregator = eventAggregator;
    this.element = element;
    this.layerFactory = new LayerFactory(this.L);
    this.mapInit = new Promise((resolve, reject) => {
      this.mapInitResolve = resolve;
      this.mapInitReject = reject;
    });
    this.eventsBound = new Promise((resolve, reject) => {
      this.eventsBoundResolve = resolve;
      this.eventsBoundReject = reject;
    });
    this.mapOptions = Object.assign({}, defaultMapOptions);
    this.layers = defaultLayers;
  }
  layersChanged(newLayers, oldLayers) {
    if (oldLayers && oldLayers !== null) {
      this.removeOldLayers(oldLayers.base, 'base');
      this.removeOldLayers(oldLayers.overlay, 'overlay');
    }
    this.attachLayers();
  }
  mapOptionsChanged(newOptions, oldOptions) {
    // Each map must retain its own options while asynchronous initialization is pending.
    this.mapOptions = Object.assign({}, defaultMapOptions, newOptions);

    // some options can get set on the map object after init
    this.mapInit.then(() => {
      if (oldOptions) {
        if (this.mapOptions.center !== oldOptions.center) {
          this.map.setView(this.mapOptions.center);
        }
        if (this.mapOptions.zoom !== oldOptions.zoom) {
          this.map.setZoom(this.mapOptions.zoom);
        }
        if (this.mapOptions.maxBounds !== oldOptions.maxBounds) {
          this.map.setMaxBounds(this.mapOptions.maxBounds);
        }
      }
    });
  }
  mapEventsChanged(newEvents, oldEvents) {
    this.mapInit.then(() => {
      if (newEvents && newEvents.length) {
        for (let eventName of newEvents) {
          this.map.on(eventName, e => this.eventAggregator.publish('aurelia-leaflet', Object.assign(e, {
            map: this.map
          })));
        }
      }
      if (oldEvents !== null) {
        for (let removedEvent of oldEvents.filter(e => newEvents.indexOf(e) === -1)) {
          this.map.off(removedEvent);
        }
      }
      if (!this.eventsBound.resolved) {
        this.eventsBoundResolve();
      }
    });
  }
  withLayerControlChanged(newValue) {
    if (newValue === false) {
      this.mapInit.then(() => {
        if (this.layerControl) {
          this.map.removeControl(this.layerControl);
        }
      });
    } else {
      this.mapInit.then(() => {
        if (this.layerControl) {
          this.map.removeControl(this.layerControl);
        }
        this.layerControl = this.L.control.layers(this.attachedLayers.base, this.attachedLayers.overlay, newValue).addTo(this.map);
      });
    }
  }
  withScaleControlChanged(newValue) {
    if (newValue === false) {
      this.mapInit.then(() => {
        if (this.scaleControl) {
          this.map.removeControl(this.scaleControl);
        }
      });
    } else {
      this.mapInit.then(() => {
        if (this.scaleControl) {
          this.map.removeControl(this.scaleControl);
        }
        this.scaleControl = this.L.control.scale(newValue).addTo(this.map);
      });
    }
  }
  attached() {
    return new Promise((resolve, reject) => {
      // remove the center option before contructing the map to have a chance to bind to the "load" event
      // first. The "load" event on the map gets fired after center and zoom are set for the first time.
      var center = this.mapOptions.center;
      delete this.mapOptions.center;
      if (!this.map) {
        this.map = new this.L.map(this.mapContainer, this.mapOptions);
      }
      this.mapOptions.center = center;
      if (this.map) {
        this.mapInitResolve();
      } else {
        this.mapInitReject();
        reject();
      }
      resolve();
      if (this.mapEvents) {
        this.eventsBound.then(() => {
          this.map.setView([this.mapOptions.center.lat, this.mapOptions.center.lng], this.mapOptions.zoomLevel);
        });
      } else {
        this.map.setView([this.mapOptions.center.lat, this.mapOptions.center.lng], this.mapOptions.zoomLevel);
      }
    });
  }
  attachLayers() {
    let layersToAttach = {
      base: {},
      overlay: {}
    };
    if (this.layers.hasOwnProperty('base')) {
      for (let layer of this.layers.base) {
        layersToAttach.base[this.getLayerId(layer)] = this.layerFactory.getLayer(layer);
      }
    }
    if (this.layers.hasOwnProperty('overlay')) {
      for (let layer of this.layers.overlay) {
        layersToAttach.overlay[this.getLayerId(layer)] = this.layerFactory.getLayer(layer);
      }
    }
    this.mapInit.then(() => {
      for (let layerId in layersToAttach.base) {
        this.attachedLayers.base[layerId] = layersToAttach.base[layerId].addTo(this.map);
      }
      for (let layerId in layersToAttach.overlay) {
        this.attachedLayers.overlay[layerId] = layersToAttach.overlay[layerId].addTo(this.map);
      }
    });
  }
  removeOldLayers(oldLayers, type) {
    if (!oldLayers || !oldLayers.length) {
      return;
    }
    let removedLayers = oldLayers.filter(oldLayer => {
      let removed = true;
      if (!this.layers.hasOwnProperty(type)) {
        return true;
      }
      for (let newLayer of this.layers[type]) {
        if (this.getLayerId(newLayer) === this.getLayerId(oldLayer)) {
          removed = false;
        }
      }
      return removed;
    });
    for (let removedLayer of removedLayers) {
      this.mapInit.then(() => {
        let id = this.getLayerId(removedLayer);
        if (this.attachedLayers[type].hasOwnProperty(id)) {
          this.map.removeLayer(this.attachedLayers[type][id]);
          delete this.attachedLayers[type][this.getLayerId(removedLayer)];
        }
      });
    }
  }
  getLayerId(layer) {
    let id = layer.id ? layer.id : layer.url;
    if (!id) {
      throw new AureliaLeafletException('Not possible to get id for layer. Set the id property');
    }
    return id;
  }
}, _LeafletCustomElement.inject = [EventAggregator, Element], _LeafletCustomElement), _descriptor = _applyDecoratedDescriptor(_class2.prototype, "layers", [bindable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "mapEvents", [bindable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "mapOptions", [bindable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "withLayerControl", [bindable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, "withScaleControl", [bindable], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _class2)) || _class) || _class);