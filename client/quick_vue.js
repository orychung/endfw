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
  rootPath: document.currentScript.src.replace(/\/client\/quick_vue\.js.*/,'/vue/'),
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
    let css = {};
    let [x,y,w,h] = [
      e.pageX,
      e.pageY,
      window.visualViewport.width,
      window.visualViewport.height
    ];
    if (x < .6*w) css.left = x+'px'; else css.right  = (w-x)+'px';
    if (y < .6*h) css.top  = y+'px'; else css.bottom = (h-y)+'px';
    all.ui.contextmenus.push({
      css: css,
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

Vue.endAddOn.directives = {
  nodeRef: {
    updated(el, binding, vnode) {
      if (!binding.value) return;
      // od = one of the props of the context
        // LIMITATION: cannot assign vnode to this object since it seems like a clone
      // k1 = key to reach the containing object
        // TODO: explore way to avoid this restriction to have a child object
      // k2 = key to store the instance (vnode with proxy)
      const [od, k1, k2] = binding.value;
      if (od) od[k1][k2??'vnode'] = binding.instance;
    }
  },
  focus: {
    // When the bound element is mounted into the DOM...
    mounted(el) {
      // Focus the element
      el.focus()
    }
  },
  pannable: {
    mounted(el) {
      let isDragging = false;
      let startX, startY, scrollLeft, scrollTop;

      // Ensure the element has overflow enabled for scrolling
      el.style.overflow = 'auto';
      el.style.cursor = 'grab';

      const startDragging = (e) => {
        isDragging = true;
        el.style.cursor = 'grabbing';
        startX = e.pageX - el.offsetLeft;
        startY = e.pageY - el.offsetTop;
        scrollLeft = el.scrollLeft;
        scrollTop = el.scrollTop;
        e.preventDefault();
      };

      const stopDragging = () => {
        isDragging = false;
        el.style.cursor = 'grab';
      };

      const onDrag = (e) => {
        const SENSITIVITY_FACTOR = 1; // Higher to move more sensitively
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const y = e.pageY - el.offsetTop;
        const walkX = (x - startX) * SENSITIVITY_FACTOR;
        const walkY = (y - startY) * SENSITIVITY_FACTOR;
        el.scrollLeft = scrollLeft - walkX;
        el.scrollTop = scrollTop - walkY;
      };

      // Mouse events
      el.addEventListener('mousedown', startDragging);
      el.addEventListener('mousemove', onDrag);
      el.addEventListener('mouseup', stopDragging);
      el.addEventListener('mouseleave', stopDragging);

      // Touch events for mobile support
      el.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startDragging({ pageX: touch.pageX, pageY: touch.pageY, preventDefault: () => e.preventDefault() });
      });
      el.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        onDrag({ pageX: touch.pageX, pageY: touch.pageY, preventDefault: () => e.preventDefault() });
      });
      el.addEventListener('touchend', stopDragging);

      // Store cleanup function
      el._pannableCleanup = () => {
        el.removeEventListener('mousedown', startDragging);
        el.removeEventListener('mousemove', onDrag);
        el.removeEventListener('mouseup', stopDragging);
        el.removeEventListener('mouseleave', stopDragging);
        el.removeEventListener('touchstart', startDragging);
        el.removeEventListener('touchmove', onDrag);
        el.removeEventListener('touchend', stopDragging);
      };
    },
    unmounted(el) {
      // Cleanup event listeners
      if (el._pannableCleanup) {
        el._pannableCleanup();
      }
    }
  },
};

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
  let allDirectives = options.directives ?? Vue.endAddOn.directives;
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
    Object.entries(allDirectives).forEach(([id, details])=>app.directive(id, details));
    app.vm = app.mount(selector);
    globalThis.all = app.vm.all;
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
