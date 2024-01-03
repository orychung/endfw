"use strict";
// must include client/shortcuts.js
// must include lib/vue.global.prod.js (or equivalent)

Vue.endAddOn = {
  templates: [],
  commonComputed: {},
  commonMethods: {},
  commonProps: ['all', 'cfg', 'od', 'i', 'w', 'map'],
  /* RECOMMENDED USAGE of commonProps
      all: global data
      cfg: global/local configuration
      od:  local data
      i:   index under container
      w:   container
      map: local map/dictionary
  */
  templateTypes: {},
};

Vue.endAddOn.basicMethods = {
  showContextmenu(od,e) {
    // no menu if od is not an object
    if (!(od instanceof Object)) return;
    all.ui.activeElementBeforeContextmenu = document.activeElement;
    all.ui.contextmenus.push({
      x: e.pageX,
      y: e.pageY,
      od: od,
      buttons: od.menuButtons || od.constructor.menuButtons,
    });
    e.stopPropagation();
    e.preventDefault();
  },
}

Vue.endAddOn.useBasicMethods = function useBasicMethods() {
  Object.assign(this.commonMethods, this.basicMethods);
}

Vue.endAddOn.loadTemplateURLs = async function loadTemplateURLs(...templateURLs) {
try {
  for (var i=0;i<templateURLs.length;i++) {
    let templatesFound = Array.from($(await http.get(templateURLs[i])).find('vueTemplate'));
    Vue.endAddOn.templates = Vue.endAddOn.templates.concat(templatesFound);
  }
} catch (e) {console.log(e);}
}

Vue.endAddOn.createApp = function(options) {
  if (!options.mountSelectors) return console.error('mountSelectors must be specified');
  let allComputed = Object.assign({}, Vue.endAddOn.commonComputed);
  if (options.computed) Object.assign(allComputed, options.computed);
  let allMethods = Object.assign({}, Vue.endAddOn.commonMethods);
  if (options.methods) Object.assign(allMethods, options.methods);
  let allTemplates = options.templates || Vue.endAddOn.templates || [];
  allTemplates.forEach(x=>{
    let allComputed = Object.assign({}, Vue.endAddOn.commonComputed);
    if (x.type) Object.assign(allComputed, Vue.endAddOn.templateTypes[x.type].computed);
    let allMethods = Object.assign({}, Vue.endAddOn.commonMethods);
    if (x.type) Object.assign(allMethods, Vue.endAddOn.templateTypes[x.type].methods);
    let allProps = [].concat(Vue.endAddOn.commonProps);
    if (x.type) allProps = allProps.concat(Vue.endAddOn.templateTypes[x.type].props);
    x.details = {
      computed: allComputed,
      props: allProps,
      methods: allMethods,
      template: x.innerHTML,
    };
  });
  let app;
  options.mountSelectors.forEach(selector=>{
    app = Vue.createApp({
      computed: allComputed,
      methods: allMethods,
      data: ()=>Object({all: globalThis.all}),
    });
    allTemplates.forEach(x=>app.component(x.id, x.details));
    app.directive('focus', {
      // When the bound element is mounted into the DOM...
      mounted(el) {
        // Focus the element
        el.focus()
      }
    });
    globalThis.all = app.mount(selector).all;
  });
  return app;
};