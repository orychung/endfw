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
  getOd() {return Object();}
  onkeydown(e) {
    this.actions.filter(a=>a.key==e.key)[0]?.call.bind(this)(this.od);
  }
  show() {
    if (this.od==undefined) this.od = this.getOd();
    this.index = all.ui.modals.push(this);
  }
}
