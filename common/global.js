/* global information container
  use with care, fail if:
  - "g" is used
  - more than one component uses same property of g
*/
if (globalThis.g===undefined) globalThis.g = Object();

if (g.next===undefined)  {
  let sequences = ()=>{};
  g.next = new Proxy(sequences, {
    apply(target, thisArg, args) {
      if (!(args[0] in sequences)) sequences[args[0]] = 0;
      return sequences[args[0]]++;
    }
  });
}
