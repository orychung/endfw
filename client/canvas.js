"use strict";
Object.defineProperty(HTMLCanvasElement.prototype, 'ctx', {
  get() {
    if (!this._ctx) this._ctx = this.getContext('2d');
    return this._ctx;
  }
});
