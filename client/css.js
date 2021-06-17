// must include jquery.js
// must include quick_tool.js

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
    /* hiding items not to be visualised */
    /* no item in scope */
    
    /* activate use of default button */
    $('.has_default_button').each(function(index) {
        $(this).keypress(function(ke) {
            if (ke.key === 'Enter') {
                ke.preventDefault();
                $('#'+$(this).attr('default_button')).click();
            }
        })
    });
    
    /* responsive sizing */
    window.onresize = function() {
        $('div.frame.main').each(function(index){
            $(this).css('max-height', Math.max(window.visualViewport.height, parseInt($(this).css('min-height')))+'px');
            $(this).css('max-width', Math.max(window.visualViewport.width, parseInt($(this).css('min-width')))+'px');
        });
    };
    
    /* set WIP text */
    $('[class="#WIP"]').each(function(index){
        $(this).html('(WIP: ' + $(this).parent().attr('class') + ')');
    });
}

function flowDiv(type, items=[], useClass='') {return '<div class="'+useClass+' frame flex_'+type+'">'+items.join('')+'</div>';}
function tableOfRows(rows, useClass='') {return '<table class="'+useClass+'"><tbody>'+rows.join('')+'</tbody></table>';}
function rowOfCells(cells, eid='') {return '<tr eid="'+eid+'"><td>'+cells.join('</td><td>')+'</td></tr>';}
