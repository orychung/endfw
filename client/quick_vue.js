"use strict";
// must include lib/jquery.js (or equivalent)
// must include lib/vue.global.prod.js (or equivalent)
// must include client/shortcuts.js

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
    let templateType = x.type?Vue.endAddOn.templateTypes[x.type]:{};
    let allComputed = Object.assign({}, Vue.endAddOn.commonComputed, templateType.computed);
    let allMethods = Object.assign({}, Vue.endAddOn.commonMethods, templateType.methods);
    let allProps = [].concat(Vue.endAddOn.commonProps).concat(templateType.props??[]);
    x.details = {
      computed: allComputed,
      props: allProps,
      methods: allMethods,
      template: x.innerHTML,
    };
  });
  return options.mountSelectors.map(selector=>{
    let app = Vue.createApp({
      computed: allComputed,
      methods: allMethods,
      data: ()=>Object({all: globalThis.all}),
      errorCaptured(error, compInst, errorInfo) {
        console.error("error: ", error);
        console.error("compInst: ", compInst);
        console.error("errorInfo: ", errorInfo);
        console.log("Get component with error by: Vue.endAddOn.errorCompInst");
        Vue.endAddOn.errorCompInst = compInst;
        return false;
      },
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
    return app;
  });
};

// auto register built-in templates and local templates
(async ()=>{
  let vueRoot = document.currentScript.src.replace('/client/quick_vue.js','/vue/');
  await Vue.endAddOn.loadTemplateURLs(
    vueRoot + 'control.xml'
  );
  Vue.endAddOn.templates.push(...Array.from($('vueTemplate')).map(x=>Object({
    id: x.id,
    type: x.type,
    innerHTML: x.innerHTML,
  })));
  Array.from($('vueTemplate')).forEach(x=>{x.outerHTML = `<!--vueTemplate[id=${x.id}] digested by quick_vue.js-->`;});
  Vue.endAddOn.useBasicMethods();
})();
