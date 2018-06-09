import {HtmlSpec} from '../../node_modules/streaming-spec/HtmlSpec.js';
import {iterateStream} from '../../node_modules/streaming-spec/iterateStream.js';
import {ItemSource, VirtualScrollerElement} from '../../virtual-scroller-element.js';

class HTMLSpecSource extends ItemSource {
  constructor(items) {
    const placeholders = [];
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.style.lineHeight = '100vh';
      placeholders.push(el);
    }
    const indexToElement = (idx) => idx >= items.length ?
        placeholders[idx % placeholders.length] :
        items[idx];
    super({
      // The number of nodes that we'll load dynamically
      // as the user scrolls.
      getLength: () => Math.max(items.length, 9312),
      item: indexToElement,
      key: indexToElement,
    });
  }
}
class HTMLSpecViewer extends VirtualScrollerElement {
  constructor() {
    super();
    this.onRangechange = this.onRangechange.bind(this);
  }
  connectedCallback() {
    super.connectedCallback();
    if (!this.htmlSpec) {
      const style = document.createElement('style');
      style.textContent = `
  :host {
    /* Bug with position: fixed https://crbug.com/846322 */
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
    padding: 8px;
    height: auto;
  }`;
      this.shadowRoot.appendChild(style);
      if ('rootScroller' in document) {
        document.rootScroller = this;
      }

      this.htmlSpec = new HtmlSpec();
      this.htmlSpec.head.style.display = 'none';
      this.appendChild(this.htmlSpec.head);
      this.items = [];
      this.itemSource = new HTMLSpecSource(this.items);
      this.createElement = (item) => item;
      this.updateElement = (item, _, idx) => {
        if (idx >= this.items.length) {
          item.textContent = `Loading (index ${idx}, loaded ${
              this.items.length} / ${this.itemSource.length})`;
        }
      };
      this.addNextChunk();
      this.addEventListener('rangechange', this.onRangechange);
    }
  }

  async addNextChunk(chunk = 10) {
    if (this._adding) {
      return;
    }
    this._adding = true;

    await new Promise(resolve => requestIdleCallback(resolve));

    const stream = this.htmlSpec.advance(this.items[this.items.length - 1]);
    for await (const el of iterateStream(stream)) {
      if (/^(style|link|script)$/.test(el.localName)) {
        this.htmlSpec.head.appendChild(el);
      } else {
        this.items.push(el);
        this.itemsChanged();
        chunk--;
      }
      if (chunk === 0) {
        break;
      }
    }
    this._adding = false;
    if (chunk > 0) {
      // YOU REACHED THE END OF THE SPEC \o/
      this.updateElement = null;
      this.placeholders = null;
      this.removeEventListener('rangechange', this.onRangechange);
    }
  }

  onRangechange(range) {
    if (range.last >= this.items.length) {
      this.addNextChunk();
    }
  }
}

customElements.define('html-spec-viewer', HTMLSpecViewer);