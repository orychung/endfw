// must include math/matrix.js
// must include promise.js

const LOOP4 = [0,1,2,3];
const LOOP16 = Array(16).fill().map((x,i)=>i);
const O_D_N = Array(256).fill().map(x=>new Uint8ClampedArray(256))
const O_N_D = Array(256).fill().map((x,o)=>{
    var arr = new Uint8ClampedArray(256);
    arr[o] = 0;
    for (var d=1;d<=Math.min(o,255-o);d++) {
        arr[o-d]=d*2-1;
        arr[o+d]=d*2;
    }
    for (var n=0;n<(o*2-256);n++) arr[n]=255-n;
    for (var n=(o*2+1);n<256;n++) arr[n]=n;
    arr.forEach((d,n)=>O_D_N[o][d]=n);
    return arr;
});
if (!('math' in globalThis)) {
    var math = {};
    loadNamespaceMathMatrix(math);
}

function canvasObject(canvas) {
    return {
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        get height() {return this.canvas.height},
        get width() {return this.canvas.width},
        get pngSize() {return atob(this.canvas.toDataURL("image/png").split(",")[1]).length},
        get imageData() {return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)},
        get canvasData() {
            if (this.loadedData == null) {
                this.loadedData = this.imageData;
            }
            return this.loadedData;
        },
        set canvasData(value) {this.loadedData = value;},
        get data() {return this.canvasData.data},
        draw() {
            this.ctx.putImageData(this.canvasData, 0, 0);
            this.loadedData = this.imageData;
        },
        drawLattice(size, color='#000000') {
            this.ctx.fillStyle=color;
            for (var x=0;x<this.canvasData.width;x+=size) {
                for (var y=0;y<this.canvasData.height;y+=size) {
                    this.ctx.fillRect(x,y,1,1);
                }
            }
        },
        imageDataCut(x,y,w,h) {return this.ctx.getImageData(x, y, w, h)},
        clearImage() {
            this.ctx.beginPath();
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.stroke();
        },
        loadFile(src) {
            var done = triggerFactory();
            var canvas = this.canvas;
            var ctx = this.ctx;
            var img = new Image();
            img.onload = function() {
                canvas.height = img.height;
                canvas.width = img.width;
                ctx.drawImage(img, 0, 0);
                done.fire();
            };
            img.src = src;
            return done.promise;
        },
    };
}

class gImage {
    constructor(data=[], width=0, height=0) {
        this.data = data;
        this.width = width;
        this.height = height;
    }
    getBlock(xBlock, yBlock) {return this.blocks[yBlock*this.lattice.width+xBlock];}
    dotVector(x, y) {
        var start = (y*this.width+x)*4;
        return new math.Vector(...this.data.slice(start, start+4));
    }
    render() {
        this.display = new gImage(new Uint8ClampedArray(this.data.length), this.width, this.height);
        this.initLattice();
        this.initBlocks();
    }
    initLattice() {
        var width = Math.ceil(this.width / 16);
        var height = Math.ceil(this.height / 16);
        var data = new Uint8ClampedArray(width * height * 4);
        for (var y=0;y<height;y++) {
            for (var x=0;x<width;x++) {
                var center = (y*this.width+x)*4*16;
                var wX = Math.min(x, this.width-x-1, 2);
                var wY = Math.min(y, this.height-y-1, 2);
                var wSet = [].concat(...combin.range(-wY, wY+1).map(y=>combin.range(-wX, wX+1).map(x=>y*this.width+x)));
                for (var i=0;i<4;i++) {
                    data[(y*width+x)*4+i] = wSet.map(w=>this.data[(y*16*this.width+x*16+w)*4+i]).sum() / wSet.length;
                }
            }
        }
        this.lattice = new gImage(data, width, height);
        return this;
    }
    initBlocks() {
        this.blocks = Array(this.lattice.data.length/4).fill().convert(x=>new Object());
        for (var y=0;y<this.lattice.height;y++) {
            for (var x=0;x<this.lattice.width;x++) {
                g.perfCounter.start('initBlocks.loop', x+','+y);
                var b = this.getBlock(x,y);
                b.x = x;
                b.y = y;
                b.width = Math.min(16, this.width - x*16);
                b.height = Math.min(16, this.height - y*16);
                b.dotStart = (x, y) => ((b.y*16+y)*this.width+b.x*16+x)*4;
                b.dataVector = (x, y) => {
                    var start = b.dotStart(x, y);
                    return new math.Vector(...this.data.slice(start, start+4));
                };
                this.analyseBlock(b);
                
                // diff over gradient
                this.applyLatticeGradient(b);
                this.blockDiff(b);
                b.diffVector = (x, y) => {
                    var start = y*16+x;
                    return new math.Vector(...b.diff.slice(start, start+4));
                };
                
                if ((x==this.lattice.width-1) || (y==this.lattice.height-1)) {
                    // this.offsetRgbaDiff(b);
                    // not a good approach for lossy method for 2 reasons:
                    // 1. it creates non-continuous border
                    // 2. it is a waste of accuracy at edges
                } else {
                    // this.offsetRgbaDiff(b);
                    // this.dividerAdjustment(b);
                }
                
                this.blockDelta(b);
                
                g.perfCounter.start('diffStat');
                b.diffStat = pmf.fromSample(b.diff); //.normalize();
                b.byteCost = 43+LOOP16.map(y=>
                    LOOP16
                    .map(x=>b.ringDiff.slice(y*16*4 + x*4, y*16*4 + x*4 + 3).max())
                    .map(x=>Math.ceil(Math.log2(1+x))*3/8)
                    .sum()
                ).sum();
                if ((x==this.lattice.width-1) || (y==this.lattice.height-1)) {
                    b.byteDeltaCost = b.byteCost
                } else {
                    b.byteDeltaCost = 43+LOOP16.map(y=>
                        LOOP16
                        .map(x=>b.delta.slice(y*16*4 + x*4, y*16*4 + x*4 + 3).max())
                        .map(x=>Math.ceil(Math.log2(Math.abs(x)+Math.abs(x+1)))*3/8)
                        .sum()
                    ).sum();
                }
                g.perfCounter.end();
                g.perfCounter.end();
            }
        }
        
        g.perfCounter.start('latticeStat');
        g.latticeStat = this.blocks.mapKeyValue(
             k=>(k%this.lattice.width)+','+Math.floor(k/this.lattice.width)
            ,b=>Object({
                range: b.diffStat.base.min((x,i)=>parseInt(i))+','+b.diffStat.base.max((x,i)=>parseInt(i)),
                byteDeltaCost: b.byteDeltaCost,
                byteCost: b.byteCost,
                base: b.diffStat.base,
                // dotDiff: LOOP16.map(y=>LOOP16.map(x=>
                    // b.diff.slice(y*16*4 + x*4, y*16*4 + x*4 + 4).max()
                    // + '(' + b.diff.slice(y*16*4 + x*4, y*16*4 + x*4 + 3).min() + ')'
                // )),
                dotDiff: LOOP16.map(y=>LOOP16.map(x=>
                    b.diff.slice(y*16*4 + x*4, y*16*4 + x*4 + 3).join('|')
                )),
                rDiff: LOOP16.map(y=>LOOP16.map(x=>b.diff[y*16*4 + x*4])),
                gDiff: LOOP16.map(y=>LOOP16.map(x=>b.diff[y*16*4 + x*4 + 1])),
                bDiff: LOOP16.map(y=>LOOP16.map(x=>b.diff[y*16*4 + x*4 + 2])),
                corners: b.corners,
                edgeDiff: b.edgeDiff,
                rgbaDiffTotal: b.rgbaDiffTotal,
                // divider: b.divider,
            })
        );
        console.log('g.latticeStat', g.latticeStat);
        g.perfCounter.end();
    }
    analyseBlock(b) {
        var xy00 = (b.y*this.lattice.width+b.x)*4;
        var xy10 = (b.y*this.lattice.width+Math.min(b.x+1,this.lattice.width-1))*4;
        var xy01 = (Math.min(b.y+1,this.lattice.height-1)*this.lattice.width+b.x)*4;
        var xy11 = (Math.min(b.y+1,this.lattice.height-1)*this.lattice.width+Math.min(b.x+1,this.lattice.width-1))*4;
        b.corners = [xy00, xy10, xy01, xy11].map(x=>this.lattice.data.slice(x,x+4));
        
        var diffT = Array.from('0123').map(i=>Math.abs(b.corners[0][i]-b.corners[1][i])).sum();
        var diffR = Array.from('0123').map(i=>Math.abs(b.corners[1][i]-b.corners[3][i])).sum();
        var diffB = Array.from('0123').map(i=>Math.abs(b.corners[3][i]-b.corners[2][i])).sum();
        var diffL = Array.from('0123').map(i=>Math.abs(b.corners[2][i]-b.corners[0][i])).sum();
        b.edgeDiff = [diffT, diffR, diffB, diffL];
        b.diffSort = [0,1,2,3].sortBy(i=>b.edgeDiff[i]);
    }
    applyLatticeGradient(b) {
        for (var y=0;y<b.height;y++) {
            for (var x=0;x<b.width;x++) {
                var s = b.dotStart(x, y);
                for (var i=0;i<4;i++) {
                    this.display.data[s+i] = (
                         b.corners[0][i]*(16-x)*(16-y)
                        +b.corners[1][i]*x*(16-y)
                        +b.corners[2][i]*(16-x)*y
                        +b.corners[3][i]*x*y
                    ) / 256;
                }
            }
        }
    }
    blockDelta(b) {
        b.delta = Array(16*16*4);
        for (var i=0;i<4;i++) {
            b.delta[i] = 0;
        }
        for (var y=1;y<b.height;y++) {
            for (var i=0;i<4;i++) {
                b.delta[y*64+i] = b.diff[y*64+i] - b.diff[y*64+i-64];
            }
        }
        for (var y=0;y<b.height;y++) {
            for (var x=1;x<b.width;x++) {
                for (var i=0;i<4;i++) {
                    b.delta[y*64+x*4+i] = b.diff[y*64+x*4+i] - b.diff[y*64+x*4+i-4];
                }
            }
        }
    }
    blockDiff(b) {
        b.diff = Array(16*16*4);
        b.ringDiff = Array(16*16*4);
        b.rgbaDiffTotal = math.Vector.zero(4);
        for (var y=0;y<b.height;y++) {
            for (var x=0;x<b.width;x++) {
                var s = b.dotStart(x, y);
                for (var i=0;i<4;i++) {
                    b.diff[y*64+x*4+i] = this.data[s+i] - this.display.data[s+i];
                    b.ringDiff[y*64+x*4+i] = O_N_D[this.display.data[s+i]][this.data[s+i]];
                    b.rgbaDiffTotal[i] += this.data[s+i] - this.display.data[s+i];
                }
            }
        }
        b.rgbaDiff = b.rgbaDiffTotal.map(x=>Math.round(x/b.width/b.height));
    }
    dividerAdjustment(b) {
        if (b.x == this.lattice.width-1 || b.y == this.lattice.height-1) return;
        g.perfCounter.start('dividerAdjustment.findMax');
        b.divider = {value: 0, x: 15, y: 15, vector: b.rgbaDiffTotal.scale(3/256)};
        const C_MARGIN = 1;
        for (var y=1+C_MARGIN;y<16-C_MARGIN;y++) {
            for (var x=1+C_MARGIN;x<16-C_MARGIN;x++) {
                var dotDiff = b.diffVector(x,y).dot(b.divider.vector);
                if (dotDiff > b.divider.value) {
                    b.divider.value = dotDiff;
                    b.divider.x = x;
                    b.divider.y = y;
                }
            }
        }
        g.perfCounter.end();
        g.perfCounter.start('dividerAdjustment.applyAdjustment');
        const C01 = 1;
        const C02 = 1;
        for (var y=0;y<16;y++) {
            var uWeight = Math.max(0, b.divider.y-y+C01);
            var dWeight = Math.max(0, y-b.divider.y+C01);
            var yWeight = Math.abs(b.divider.y-y)+C02;
            var yFactor = yWeight*(y/b.divider.y*uWeight + (16-y)/(16-b.divider.y)*dWeight)/(uWeight+dWeight);
            for (var x=0;x<16;x++) {
                var lWeight = Math.max(0, b.divider.x-x+C01);
                var rWeight = Math.max(0, x-b.divider.x+C01);
                var xWeight = Math.abs(b.divider.x-x)+C02;
                var xFactor = xWeight*(x/b.divider.x*lWeight + (16-x)/(16-b.divider.x)*rWeight)/(lWeight+rWeight);
                
                var s = b.dotStart(x, y);
                var finalFactor = (yFactor + xFactor) / (xWeight + yWeight);
                for (var i=0;i<4;i++) {
                    // this.display.data[s+i] += offset[i]*(0.9) + b.divider.vector[i]*(0.1);
                    this.display.data[s+i] += b.divider.vector[i]*finalFactor*0.5+b.rgbaDiff[i]*0.3;
                    b.diff[y*64+x*4+i] = this.data[s+i] - this.display.data[s+i];
                    b.ringDiff[y*64+x*4+i] = O_N_D[this.display.data[s+i]][this.data[s+i]];
                }
            }
        }
        g.perfCounter.end();
        // this.display.data[b.dotStart(b.divider.x, b.divider.y)+0] = 255;
    }
    offsetRgbaDiff(b) {
        for (var y=0;y<b.height;y++) {
            for (var x=0;x<b.width;x++) {
                var s = b.dotStart(x, y);
                for (var i=0;i<4;i++) {
                    this.display.data[s+i] += b.rgbaDiff[i];
                    b.diff[y*64+x*4+i] = this.data[s+i] - this.display.data[s+i];
                    b.ringDiff[y*64+x*4+i] = O_N_D[this.display.data[s+i]][this.data[s+i]];
                }
            }
        }
    }
    injectData(imageData, xOffset, yOffset, width = this.width, height = this.height) {
        for (var y=0;y<height;y++) {
            var yOff = y + yOffset;
            for (var x=0;x<width;x++) {
                var xOff = x + xOffset;
                for (var i=0;i<4;i++) {
                    imageData.data[(yOff*imageData.width+xOff)*4+i] = this.data[(y*this.width+x)*4+i];
                }
            }
        }
    }
    static fromCanvas(canvas) {
        var cObj = canvasObject(canvas);
        var imageData = cObj.imageData;
        return new gImage(imageData.data, imageData.width, imageData.height);
    }
}
