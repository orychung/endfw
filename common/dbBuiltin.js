
/* Oracle functions */
function nvl(v1, v2) {return (v1 == null)?v2:v1;}
function nvl2(v1, v2, v3) {return (v1 == null)?v3:v2;}
function quotient(a, b) {return (a - a % b) / b;}
function decode(x, ...values) {
    for (i=1;i<values.length;i+=2) if (x == values[i-1]) return values[i];
    if (values.length % 2 == 1) return values[values.length - 1];
    return null;
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        nvl: nvl,
        nvl2: nvl2,
        quotient: quotient,
        decode: decode,
    }
}
