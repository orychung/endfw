"use strict";
/*
  http Proxy function to be called in 2 ways:
  - property path: http.post.xml.asBinary(url, body)
  - options argument: http(url, options), body as options.body
*/
var httpBase = ()=>{}; // necessary to make the Proxy act as Function
httpBase.defaultOptions = {
  headers: {'Content-Type': 'application/json'},
  method: 'GET',
  redirect: 'manual',
};
httpBase.defaultLocalOptions = {
  returnType: 'asText',
};
httpBase.toQueryString = function toQueryString(data, keyPath=null) {
  /*
    @keyPath:
      - top-level param, key is PARAM_KEY
      - child param, key is keyPath[PARAM_KEY]
  */
  return Object.keys(data).map(k=>{
    var newKeyPath = encodeURIComponent(k);
    if (keyPath) newKeyPath = keyPath+'%5B'+newKeyPath+'%5D';
    if (data[k] instanceof Object) return httpBase.toQueryString(data[k], newKeyPath);
    return newKeyPath+'='+encodeURIComponent(data[k]);
  }).join('&');
};
var http = new Proxy(httpBase, {
  async apply(target, thisArg, args) {
    var url = args[0];
    if (target===httpBase) {
      var options = args[1];
      var resp = await fetch(url, options);
    } else {
      var body = args[1];
      if (['GET','HEAD'].includes(target.options.method)) {
        delete target.options.headers['Content-Type'];
        if (body != null) url = url+'?'+httpBase.toQueryString(body);
      } else {
        if (!(typeof body === 'string' || body instanceof String)) {
          if (target.options.headers['Content-Type'] == 'application/json') body = JSON.stringify(body);
        }
        if (body != null) target.options.body = body;
      }
      var resp = await fetch(url, target.options);
    }
    var result = resp;
    if (!result.ok) return result;
    if (target.localOptions.returnType == 'asText') {
      result = await result.text();
      if (resp.headers.get('Content-Type') == 'application/json') result = JSON.parse(result);
    }
    if (target.localOptions.returnType == 'asBinary') result = await result.arrayBuffer();
    if (target.localOptions.returnType == 'asDownload') {
      var data = await result.arrayBuffer();
      var filename;
      var dispositionHeader = result.headers.get('Content-Disposition');
      if (dispositionHeader) filename = dispositionHeader.split('=')[1];
      if (!filename) filename = url.substring(url.lastIndexOf('/') + 1);
      return browse.download(data, filename);
    }
    return result;
  },
  setHead(header, value) {
    this.options.headers[header] = value;
    return this;
  },
  get(target, prop, receiver) {
    if (prop in target) return target[prop];
    var thisArg;
    if (target===httpBase) {
      thisArg = ()=>{console.error('Unexpected!')};
      thisArg.options = JSON.parse(JSON.stringify(httpBase.defaultOptions));
      thisArg.localOptions = JSON.parse(JSON.stringify(httpBase.defaultLocalOptions));
      thisArg = new Proxy(thisArg, this);
    } else {
      thisArg = receiver;
    }
    if (prop == 'setHead') {
      return this.setHead.bind(thisArg);
    }
    if (['delete','get','head','patch','post','put'].includes(prop)) {
      thisArg.options.method = prop.toUpperCase();
    }
    if (['form','json','xml','multipart'].includes(prop)) {
      thisArg.options.headers['Content-Type'] = {
        form: 'application/x-www-form-urlencoded',
        json: 'application/json',
        xml: 'application/xml',
        multipart: 'multipart/form-data',
      }[prop];
    }
    if (['asBinary','asDownload','asText','asResponse'].includes(prop)) {
      thisArg.localOptions.returnType = prop;
    }
    return thisArg;
  },
});

var browse = {
  newTab: function(url) {
    var a1 = document.createElement('a');
    a1.href = url;
    a1.target = '_blank';
    a1.click();
  },
  download: function(data, filename) {
    var a1 = document.createElement('a');
    a1.href=URL.createObjectURL(new Blob([data]));
    a1.download = filename;
    a1.click();
  },
  downloadDataURL: function(dataURL, filename) {
    let base64Index = dataURL.slice(0, 60).indexOf('base64,');
    if (base64Index == -1) throw 'data URL not in base64!';
    let a1 = document.createElement('a');
    a1.href = 'data:image/octet-stream;' + dataURL.slice(base64Index);
    a1.download = filename;
    a1.click();
  },
  currentQuery: function() {
    var query = {};
    (new URL(document.URL)).searchParams.forEach((x,i)=>query[i] = x);
    return query;
  },
  setQuery: function(query) {
    window.history.pushState(
      query,
      "", // unused param: https://developer.mozilla.org/en-US/docs/Web/API/History/pushState#unused
      document.URL.split('?')[0]+'?'+new URLSearchParams(query).toString()
    );
  },
  updateQuery: function(updatesOrKey, value) {
    let query = browse.currentQuery();
    if (typeof updatesOrKey == 'string' || updatesOrKey instanceof String) {
      query[updatesOrKey] = value;
    } else {
      Object.assign(query, updatesOrKey);
    }
    return browse.setQuery(query);
  },
  file: {
    async _get(method, ...args) {
      let reader = new FileReader();
      let resolve;
      let readData = new Promise(r=>{resolve=r});
      reader.onload = (e) => resolve(e.target.result);
      reader[method](...args);
      return readData;
    },
    async arrayBuffer(...args) {return this._get('readAsArrayBuffer', ...args)},
    async binaryString(...args) {return this._get('readAsBinaryString', ...args)},
    async dataURL(...args) {return this._get('readAsDataURL', ...args)},
    async text(...args) {return this._get('readAsText', ...args)},
    async base64(...args) {
      let result = await this._get('readAsDataURL', ...args);
      let startIndex = result.indexOf(';base64,')+8;
      return result.slice(startIndex);
    },
  }
};

var empty = {
  [Symbol.replace]: (s,r=null)=>(s=='')?r:s,
  [Symbol.toPrimitive]: (hint)=>'',
};
