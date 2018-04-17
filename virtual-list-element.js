import Layout from './layouts/layout-1d.js';
import {VirtualList} from './virtual-list.js';

/** Properties */
const _items = Symbol();
const _layout = Symbol();
const _list = Symbol();
const _newChild = Symbol();
const _updateChild = Symbol();
const _recycleChild = Symbol();
const _layoutType = Symbol();
/** Functions */
const _render = Symbol();

export class VirtualListElement extends HTMLElement {
  constructor() {
    super();
    this[_items] = null;
    this[_layout] = null;
    this[_list] = null;
    this[_newChild] = null;
    this[_updateChild] = null;
    this[_recycleChild] = null;
    this[_layoutType] = 'vertical';
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({mode: 'open'}).innerHTML = `
<style>
  :host {
    display: block;
    position: relative;
    contain: strict;
  }
</style>
<slot></slot>`;
    }
    this[_render]();
  }

  static get observedAttributes() {
    return ['layout'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'layout') {
      this.layout = newVal;
    }
  }

  get newChild() {
    return this[_newChild];
  }
  set newChild(fn) {
    this[_newChild] = fn;
    this[_render]();
  }

  get updateChild() {
    return this[_updateChild];
  }
  set updateChild(fn) {
    this[_updateChild] = fn;
    this[_render]();
  }

  get recycleChild() {
    return this[_recycleChild];
  }
  set recycleChild(fn) {
    this[_recycleChild] = fn;
    this[_render]();
  }

  get layout() {
    return this[_layoutType];
  }
  set layout(layout) {
    if (this[_layoutType] !== layout) {
      this[_layoutType] = layout;
      this[_render]();
    }
  }

  get items() {
    return this[_items];
  }
  set items(items) {
    if (this[_items] !== items) {
      this[_items] = items;
      this[_render]();
    }
  }

  requestReset() {
    if (this[_list]) {
      this[_list].requestReset();
    }
  }

  [_render]() {
    if (!this.newChild) {
      return;
    }
    if (!this[_list]) {
      // Delay init to first connected as list needs to measure
      // sizes of container and children.
      if (!this.isConnected) {
        return;
      }
      this[_list] = new VirtualList({container: this});
    }
    if (!this[_layout]) {
      this[_layout] = new Layout({itemSize: {height: 10000}});
    }
    this[_layout].direction = this[_layoutType];

    const {newChild, updateChild, recycleChild, items} = this;
    Object.assign(this[_list], {
      newChild,
      updateChild,
      recycleChild,
      items,
      layout: this[_layout],
    });
  }
}
customElements.define('virtual-list', VirtualListElement);