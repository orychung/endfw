## endfw
A minimalist JS framework library for browser and node.js framework

### Main Features

1. Extension of JS built-in types (see builtin_doc of builtin.js)
    1. Object: attr, filterArray, filterObject, mapArray, mapObject, mapKeyValue, reduce, etc
    1. Array: fromAsync, lookupOf, sortBy, shuffle
    1. String: likeRE, splitNum
1. Common JS utilities (/common)
1. Web client JS shortcuts (/client)
1. Node.js server utilities (/server)

## How to Use?

### in browser
Load via jsdelivr CDN:
```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.5.2/common/builtin.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.5.2/client/builtin.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.5.2/client/shortcuts.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.5.2/client/music.js" charset="utf-8"></script>
```

* Client scripts can be included on a need basis
* `common/builtin`, `client/builtin`, `client/shortcuts` are recommended for general purpose

### in node
```bash
npm install github:orychung/endfw@0.5.2
```
```javascript
globalThis.endfw = require('endfw');
```
