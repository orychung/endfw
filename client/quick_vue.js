"use strict";
// must include lib/vue.global.prod.js (or equivalent)
// must include common/builtin.js
// must include client/shortcuts.js

Vue.endAddOn = {
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
  rootPath: document.currentScript.src.replace('/client/quick_vue.js','/vue/'),
  templates: [],
  templateTypes: {},
};

Vue.endAddOn.basicMethods = {
  showContextmenu(od, e, options) {
    // no menu if od is not an object
    if (!(od instanceof Object)) return false;
    const menuButtons = options?.menuButtons ??
                        od.menuButtons ??
                        od.constructor.menuButtons;
    if (menuButtons===undefined) return false;
    all.ui.activeElementBeforeContextmenu = document.activeElement;
    all.ui.contextmenus.push({
      x: e.pageX,
      y: e.pageY,
      od: od,
      buttons: menuButtons,
    });
    e.stopPropagation();
    e.preventDefault();
    return true;
  },
}

Vue.endAddOn.useBasicMethods = function useBasicMethods() {
  Object.assign(this.commonMethods, this.basicMethods);
}

Vue.endAddOn.loadTemplateURLs = async function loadTemplateURLs(...templateURLs) {
try {
  let parser = new DOMParser();
  for (var i=0;i<templateURLs.length;i++) {
    let xml = parser.parseFromString(await http.get(templateURLs[i]), 'text/html');
    let templates = Array.from(xml.querySelectorAll('vueTemplate'));
    Vue.endAddOn.templates.push(...templates);
  }
} catch (e) {console.log(e);}
}

Vue.endAddOn.createApp = function(options) {
  if (!options.mountSelectors) return console.error('mountSelectors must be specified');
  let allComputed = Object.assign({}, Vue.endAddOn.commonComputed, options.computed);
  let allMethods = Object.assign({}, Vue.endAddOn.commonMethods, options.methods);
  let allTemplates = options.templates ?? Vue.endAddOn.templates;
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
Vue.endAddOn.load = async function load() {
  let vueRoot = Vue.endAddOn.rootPath;
  await Vue.endAddOn.loadTemplateURLs(
    vueRoot + 'control.xml',
    vueRoot + 'recursive.xml',
  );
  let templates = Array.from(document.querySelectorAll('vueTemplate'));
  Vue.endAddOn.templates.push(...templates.map(x=>Object({
    id: x.id,
    type: x.type,
    innerHTML: x.innerHTML,
  })));
  templates.forEach(x=>{x.outerHTML = `<!--vueTemplate[id=${x.id}] digested by quick_vue.js-->`;});
};
