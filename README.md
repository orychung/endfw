## endfw
A minimalist JS framework library for browser and node.js framework

### Main Features

1. Extension of JS built-in types (see builtin_doc of builtin.js)
    1. Object: attr, filterArray, filterObject, mapArray, mapObject, mapKeyValue, reduce, etc
    1. Array: fromAsync, lookupOf, sortBy, shuffle
    1. String: likeRE
1. Common JS utilities (/common)
1. Web client JS shortcuts (/client)
1. Node.js server utilities (/server)

## How to Use?

### in browser
Load via jsdelivr CDN:
```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/common/builtin.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/client/builtin.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/client/shortcuts.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/client/music.js" charset="utf-8"></script>
```

* Client scripts can be included on a need basis
* `common/builtin`, `client/builtin`, `client/shortcuts` are recommended for general purpose

#### Vue Add-on framework

In header:
```html
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/vue/control.css" />
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/vue/layout.css" />
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/common/builtin.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/common/global.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/client/builtin.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/client/shortcuts.js"></script>
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/orychung/endfw@0.7.0/client/quick_vue.js"></script>
```

In onload listener:
```js
  g.ui = {
    contextmenus: [],
  };
  globalThis.all = g;
  Vue.endAddOn.useBasicMethods();
  await Vue.endAddOn.load();
  Vue.endAddOn.createApp({
    methods: uiHandlers, // methods here are only available to top app, not child components
    mountSelectors: ['#screen'],
  });
```

In body:
```html
<vueTemplates>
  <vueTemplate id="t-my-template">
    <!-- your template contents here -->
  </vueTemplate>
</vueTemplates>
<div id="screen">
  <!-- your app contents here, below is an example to include child component -->
  <t-my-template :od="yourComponentObject"></t-my-template>
  <screen-layer style="--base-z-index:20;">
    <t-contextmenu :all="all" :w="all.ui.contextmenus"></t-contextmenu>
  </screen-layer>
</div>
```

### in node
```bash
npm install github:orychung/endfw@0.7.0
```
```javascript
globalThis.endfw = require('endfw');
```
