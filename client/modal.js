// must include jquery.js

function initModal() {
    $('flex-layout.modal').hide();
    $('screen-layer.cover').hide();
    var covers = $('screen-layer.cover');
    covers.off('keydown');
    covers.on('keydown', function(e) {if(e.key === "Escape") hideModalCover(this);});
    $('button.modal_button_cancel').off('click');
    $('button.modal_button_cancel').on('click', function(e) {hideModalCover($(this).parents('.cover')[0]);});
}

function hideModalCover(cover) {
    $(cover).find('flex-layout.modal').hide();
    $(cover).hide();
}

function showModal(modalId) {
    // $('flex-layout.modal').hide();
    var modal = $('flex-layout.modal#'+modalId);
    modal.show();
    var cover = modal.parents('.cover');
    cover.show();
    cover[0].focus();
}

function showAlert(caption, message) {
    var modal = $('flex-layout.modal#modal_alert');
    modal.find('.modal_caption p')[0].innerHTML = caption;
    modal.find('.modal_body')[0].innerHTML = message;
    modal.find('button.modal_button_ok').off('click');
    modal.find('button.modal_button_ok').on('click', function(e) {
        hideModalCover(modal.parents('.cover')[0]);
    });
    showModal('modal_alert');
}
function showInputText(caption, message, defaultValue='', validation) {
    var modal = $('flex-layout.modal#modal_input_text');
    var textBox = modal.find('.modal_body input[type=text]');
    textBox[0].value = defaultValue;
    modal.find('.modal_caption p')[0].innerHTML = caption;
    modal.find('.modal_body p')[0].innerHTML = message;
    modal.find('button.modal_button_ok').off('click');
    modal.find('button.modal_button_ok').on('click', function(e) {
        if (validation(textBox[0].value)) hideModalCover(modal.parents('.cover')[0]);
    });
    showModal('modal_input_text');
    textBox.off('keydown');
    textBox.on('keydown', function(e) {
        if(e.key === "Enter") modal.find('button.modal_button_ok').click();
    });
    textBox[0].focus();
}
function showInputSelect(caption, message, options=[], defaultValue='', validation) {
    var modal = $('flex-layout.modal#modal_input_select');
    var selectBox = modal.find('.modal_body select');
    selectBox[0].innerHTML = options.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('');
    selectBox[0].value = defaultValue;
    modal.find('.modal_caption p')[0].innerHTML = caption;
    modal.find('.modal_body p')[0].innerHTML = message;
    modal.find('button.modal_button_ok').off('click');
    modal.find('button.modal_button_ok').on('click', function(e) {
        if (validation(selectBox[0].value)) hideModalCover(modal.parents('.cover')[0]);
    });
    showModal('modal_input_select');
    selectBox[0].focus();
}
function showInputRange(caption, message, min=0, max=1, defaultValue=min, validation) {
    var modal = $('flex-layout.modal#modal_input_range');
    var slider = modal.find('.modal_body input[type=range]');
    var textBox = modal.find('.modal_body input[type=text]');
    slider[0].min = min;
    slider[0].max = max;
    slider[0].value = defaultValue;
    textBox[0].value = defaultValue;
    modal.find('.modal_caption p')[0].innerHTML = caption;
    modal.find('.modal_body p')[0].innerHTML = message;
    modal.find('button.modal_button_ok').off('click');
    modal.find('button.modal_button_ok').on('click', function(e) {
        if (validation(textBox[0].value)) hideModalCover(modal.parents('.cover')[0]);
    });
    showModal('modal_input_range');
    slider.off('input'); slider.on('input', function(e) {textBox[0].value = slider[0].value;});
    textBox.off('input'); textBox.on('input', function(e) {slider[0].value = textBox[0].value;});
    textBox.off('keydown');
    textBox.on('keydown', function(e) {
        if(e.key === "Enter") modal.find('button.modal_button_ok').click();
    });
    textBox[0].focus();
}
