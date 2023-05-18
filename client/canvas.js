"use strict";
function addMethod(f) {
    return {
        enumerable: false,
        writable: true,
        value: f
    };
}

Object.defineProperty(HTMLCanvasElement.prototype, 'ctx', {
  get() {
    if (!this._ctx) this._ctx = this.getContext('2d');
    return this._ctx;
  }
});
Object.defineProperty(HTMLCanvasElement.prototype, 'clearImage', addMethod(function clearImage() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}));
