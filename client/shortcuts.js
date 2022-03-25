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
        if (['delete','get','head','patch','post','put'].includes(prop)) {
            thisArg.options.method = prop.toUpperCase();
        }
        if (['form','json','xml'].includes(prop)) {
            thisArg.options.headers['Content-Type'] = {
                form: 'application/x-www-form-urlencoded',
                json: 'application/json',
                xml: 'application/xml',
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
        a1.download=filename
        a1.click();
    },
    currentQuery: function() {
        var query = {};
        (new URL(document.URL)).searchParams.forEach((x,i)=>query[i] = x);
        return query;
    },
    updateQuery: function(query) {
        window.history.pushState(
            query,
            "", // unused param
            document.URL.split('?')[0]+'?'+new URLSearchParams(query).toString()
        );
    }
};

var empty = {
    [Symbol.replace]: (s,r=null)=>(s=='')?r:s,
    [Symbol.toPrimitive]: (hint)=>'',
};
