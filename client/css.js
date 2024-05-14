// must include jquery.js

function regIdHandlers() {
  var gThis;
  try {
    gThis = globalThis;
  } catch (e) {
    gThis = window;
  }
  var handlers = Object.keys(gThis).filter(x=>x.includes('$'));
  handlers.forEach(handler=>{
    let [objectId, eventType] = handler.split('$');
    if ([
      'click', 'dblclick',
      'mouseover', 'mouseup', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove',
      'keypress', 'keyup', 'keydown',
      'focus',
      'change', 'input'
    ].includes(eventType)) {
      $('#'+objectId).off(eventType);
      $('#'+objectId).on(eventType, gThis[handler]);
    }
  })
}

function setCssEvents() {
  console.error('setCssEvents is deprecated to favour use of vue');
}

function flowDiv(type, items=[], useClass='') {
  console.error('flowDiv is deprecated to favour use of vue');
}

function tableOfRows(rows, useClass='') {
  console.error('tableOfRows is deprecated to favour use of vue');
}
function rowOfCells(cells, eid='') {
  console.error('rowOfCells is deprecated to favour use of vue');
}
