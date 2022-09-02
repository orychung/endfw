
function loadNamespaceMathMatrix(nsContainer) {
    function doScale(item, value) {
        if (!(item instanceof Object)) return item * value;
        if ('scale' in item) return item.scale(value);
        return NaN;
    }
    class Vector extends Array {
        constructor(...data) {
            super(...data);
        }
        static ofValue(value, length) {return new Vector(length).fill(value);}
        static zero(length) {return Vector.ofValue(0, length);}
        static sumOf(...values) {
            var out = Vector.zero(values[0].length);
            values.forEach(x=>out.addBy(x));
            return out;
        }
        get copy() {return new Vector(...this);}
        dot(value) {
            var sum = 0;
            for (var i=0;i<Math.min(this.length, value.length);i++) {
                sum += this[i] * value[i];
            }
            return sum;
        }
        scale(value) {
            for (var x=0;x<this.length;x++) {
                this[x] = doScale(this[x], value);
            }
            return this;
        }
        addBy(value) {
            for (var i=0;i<Math.min(this.length, value.length);i++) {
                this[i] += value[i];
            }
        }
        cross(value) {
            if (this.length != 3 || value.length != 3) return NaN; // Only support 3D vectors
            return new Vector(
                this[1]*value[2] - this[2]*value[1],
                this[2]*value[0] - this[0]*value[2],
                this[0]*value[1] - this[1]*value[0]
            )
        }
    }
    nsContainer.Vector = Vector;
    class Matrix {
        constructor(data) {
            this.data = data; // outer array for rows
            // TODO: validate data as 2D array or is originally a matrix
            
            this.width = data[0].length;
            this.height = data.length;
        }
        static ofValue(value, width, height) {return new Matrix(Array(height).fill().map(x=>Array(width).fill(value)));}
        static zero(width, height) {return Matrix.ofValue(0, width, height);}
        get copy() {return this.cut(0, 0, this.width, this.height);}
        get t() {
            var out = Matrix.zero(this.height, this.width);
            for (var y=0;y<this.height;y++) {
                for (var x=0;x<this.width;x++) {
                    out.data[x][y] = this.data[y][x];
                }
            }
            return out;
        }
        cut(x, y, width, height) {
            var out = Matrix.zero(width, height);
            this.data.slice(y, y+height).forEach((row, y)=>
                Object.assign(out.data[y], row.slice(x, x+width))
            );
            return out;
        }
        swapRows(y1, y2) {
            var tempRow = this.data[y1];
            this.data[y1] = this.data[y2];
            this.data[y2] = tempRow;
            return this;
        }
        vConcat(m) {
            var out = Matrix.zero(Math.max(this.width, m.width), this.height + m.height);
            this.data.forEach((row, y)=>
                Object.assign(out.data[y], row)
            );
            m.data.forEach((row, y)=>
                Object.assign(out.data[y+this.height], row)
            );
            return out;
        }
        scale(value) {
            for (var y=0;y<this.height;y++) {
                for (var x=0;x<this.width;x++) {
                    this.data[y][x] = doScale(this.data[y][x], value);
                }
            }
            return this;
        }
        x(value) {
            var out = Matrix.zero(this.height, value.width);
            var t = value.t;
            for (var y=0;y<this.height;y++) {
                for (var x=0;x<value.width;x++) {
                    out.data[y][x] = Vector.prototype.dot.call(this.data[y], t.data[x]);
                }
            }
            return out;
        }
        DET() {
            if (this.width != this.height) return NaN; // Only defined for square matrix
            var agg = 1;
            var thisCut = this.copy;
            for (var i=0;i<this.width-1;i++) {
                var firstNonZero = thisCut.data.first(x=>(x[0]!=0), (x,i)=>i);
                if (firstNonZero == null) return 0; // Matrix is not invertible
                if (firstNonZero > 0) {
                    agg *= -1;
                    thisCut.swapRows(0, firstNonZero);
                };
                agg *= thisCut.data[0][0];
                var newCut = Matrix.zero(thisCut.width-1, thisCut.height-1);
                for (var y=1;y<thisCut.height;y++) {
                    for (var x=1;x<thisCut.width;x++) {
                        newCut.data[y-1][x-1] = thisCut.data[y][x] - (
                            thisCut.data[y][0]
                            * thisCut.data[0][x]
                            / thisCut.data[0][0]
                        );
                    }
                }
                thisCut = newCut;
            }
            agg *= thisCut.data[0][0];
            return agg;
            // TODO: allow the above LU Decomposition be re-used for other functions
        }
        // TODO: eigen values / vectors, schur product
        // TODO: provide named functions as per cell wrappers (so that any class can be put into the cell)
    }
    nsContainer.Matrix = Matrix;
    nsContainer.Plane = class Plane {
        constructor(points) {
            // each point is [x, y, value]
            // TODO: support value as vector
            this.points = points;
            this.order = points.length;
            if (points.length != points[0].length) throw Error('Invalid size.');
            if (points[0][2] instanceof Array) {
                this.valueMode = 'Array';
                points.convert(x=>[x[0], x[1], ...x[2]]);
            } else {
                this.valueMode = 'Number';
            }
            var m = Matrix.ofValue(1, points.length, 1).vConcat(new Matrix(points).t);
            for (var iV=0;iV<points[0].length-2;iV++) {
                var baseDet = m.copy.swapRows(this.order, this.order + iV).cut(0, 0, this.order, this.order).DET();
                this.c = Array(points[0].length-2).fill().map((x, iV)=>
                    Vector.zero(this.order).convert((x,i)=>
                        m.copy.swapRows(i, this.order + iV).cut(0, 0, this.order, this.order).DET()
                    ).scale(1/baseDet)
                );
            }
        }
        getValue(...coordinates) {
            if (coordinates[0] instanceof Array) coordinates = coordinates[0];
            if (this.valueMode == 'Array') {
                return new Vector(...this.c.map(v=>v.dot(new Vector(1, ...coordinates))));
            } else {
                return this.c[0].dot(new Vector(1, ...coordinates));
            }
        }
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        loadNamespaceMathMatrix: loadNamespaceMathMatrix
    }
}
