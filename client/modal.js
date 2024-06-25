class ModalScreen {
  static ACTION = {
    CANCEL: {name: 'Cancel', key: 'Escape',
             call: function(od){ this.dismiss(); }},
    CLOSE: {name: 'Close', key: 'Escape',
             call: function(od){ this.dismiss(); }},
    OK: {name: 'OK', key: 'Enter',
         call: function(od){ this.dismiss(); }},
  }
  static showAlert(options) {
    let dismiss = Promise.wrap();
    let screenOptions = Object.assign({
      actions: [ModalScreen.ACTION.OK],
      cssClass: 'alert',
      ondismiss: ()=>dismiss.resolve(),
    }, options)
    new ModalScreen(screenOptions).show();
    return dismiss;
  }
  static showInput(options) {
    let submit = Promise.wrap();
    let screenOptions = Object.assign({
      actions: [
        ModalScreen.ACTION.CANCEL,
        {
          name: options.submitActionName??'OK',
          key: 'Enter',
          call: function(od){
            if (!(options.validate?.(od)===undefined)) return;
            submit.resolve(od); this.dismiss();
          }
        },
      ],
      ondismiss: ()=>submit.reject(),
    }, options);
    if (options.od==undefined) {
      screenOptions.od = options.fields.reduce((p,field,k)=>{
        p[k] = field.default;
        return p;
      }, Object());
    }
    new ModalScreen(screenOptions).show();
    return submit;
  }
  actions = []
  constructor(data) {
    Object.assign(this, data);
    // od for underlying data
    // caption for screen caption
    // vueTemplate for custom template
  }
  dismiss() {
    all.ui.modals.splice(this.index - 1, 1);
    this.ondismiss?.();
    delete this.index;
  }
  onkeydown(e) {
    this.actions.filter(a=>a.key==e.key)[0]?.call.bind(this)(this.od);
  }
  show() {
    this.index = all.ui.modals.push(this);
  }
}

function initModal() {
    $('div.modal').hide();
    $('screen-layer.grey-cover').hide();
    var covers = $('screen-layer.grey-cover');
    covers.off('keydown');
    covers.on('keydown', function(e) {if(e.key === "Escape") hideModalCover(this);});
    $('button.modal_button_cancel').off('click');
    $('button.modal_button_cancel').on('click', function(e) {hideModalCover($(this).parents('.grey-cover')[0]);});
}

function hideModalCover(cover) {
    $(cover).find('div.modal').hide();
    $(cover).hide();
}

function showModal(modalId) {
    // $('div.modal').hide();
    var modal = $('div.modal#'+modalId);
    modal.show();
    var cover = modal.parents('.grey-cover');
    cover.show();
    cover[0].focus();
}

function showInputRange(caption, message, min=0, max=1, defaultValue=min, validation) {
    var modal = $('div.modal#modal_input_range');
    var slider = modal.find('.modal-body input[type=range]');
    var textBox = modal.find('.modal-body input[type=text]');
    slider[0].min = min;
    slider[0].max = max;
    slider[0].value = defaultValue;
    textBox[0].value = defaultValue;
    modal.find('.modal-caption p')[0].innerHTML = caption;
    modal.find('.modal-body p')[0].innerHTML = message;
    modal.find('button.modal_button_ok').off('click');
    modal.find('button.modal_button_ok').on('click', function(e) {
        if (validation(textBox[0].value)) hideModalCover(modal.parents('.grey-cover')[0]);
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
