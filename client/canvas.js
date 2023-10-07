"use strict";

HTMLCanvasElement.defineMethod('ctx', {
  get() {
    if (!this._ctx) this._ctx = this.getContext('2d', {willReadFrequently: true});
    return this._ctx;
  }
});
HTMLCanvasElement.defineMethod('clearImage', function clearImage() {
  this.ctx.clearRect(0, 0, this.width, this.height);
});
HTMLCanvasElement.defineMethod('loadFile', function loadFile(src) {
  return new Promise((s,f)=>{
    let canvas = this;
    let img = new Image();
    img.onload = function() {
      canvas.height = img.height;
      canvas.width = img.width;
      canvas.ctx.drawImage(img, 0, 0);
      s();
    };
    img.src = src;
  });
});
HTMLCanvasElement.defineMethod('downloadAsFile', function downloadAsFile(options) {
  if (!browse) throw 'shortcuts.js is required!';
  let format = options.format??'image/png';
  let quality = options.quality??1;
  let filename = options.filename??'canvas';
  let dataURL = this.toDataURL(format, quality);
  browse.downloadDataURL(dataURL, filename);
});
HTMLCanvasElement.defineMethod('imageData', {
  get() {return this.ctx.getImageData(0, 0, this.width, this.height);}
});
