/* my installation history

npm install pg

*/
const { Pool, Client } = require('pg');
var defaultConfig = {
  host: 'localhost',
  database: 'node',
  user: 'node',
  password: 'node',
  port: 5432,
};

const singleQuoteRE = new RegExp(/'/g);
function quoteEsc(text) {
    if (!text) return text;
    return text.replace(singleQuoteRE, "''");
}

class connection {
	constructor (config = {}) {
		this.connected = false;
		this.config = JSON.parse(JSON.stringify(defaultConfig));
		for (var key in config) this.config[key] = config[key];
	}
	async connect() {
		if (this.connected == false || this.connection == null) {
			try {
				this.connection = new Client(this.config);
                await this.connection.connect();
                this.defaultRequest = this.connection;
                this.request = this.defaultRequest;
				this.connected = true;
			} catch (err) {
				// ... error checks
				console.log('catched on connect', err);
			}
		}
	}
    async ws_log(message, module='') {
        if (!this.connected) await this.connect();
        this.queryCatch(
            'insert into web.ws_console_log (log_ts, service, log_info) '
            +'values (now(), \'' + module + '\', \'' + message + '\');'
            , (r) => {return;}
        );
    }
    async run(query, params) {
        if (!this.connected) await this.connect();
        if (params) params.forEach((x, i) => {
            if (x != null) {
                var y;
                if (x.__proto__.hasOwnProperty('replace')) {
                    y = x.replace(/'/g, "''");
                } else {
                    y = x;
                };
                query = query.split('$'+(i + 1)).join(y);
            }
        });
        try {return {data: await this.defaultRequest.query(query), errorState: 0};}
        catch (e) {return {error: e, errorState: 1};}
    }
    async runRows(query, params) {
        if (!this.connected) await this.connect();
        try {
            var r = await this.run(query, params);
            if (r.errorState == 0) {
                return r.data.rows;
            } else {
                console.log(r.error);
                throw new Error();
            }
        } catch (e) {console.log(e);}
    }
    async queryCatch(
        query,
        onSuccess=(r) => console.log(r),
        onError=(e) => console.log(e)
    ) {
        if (!this.connected) await this.connect();
        this.defaultRequest.query(query)
        .then((r) => onSuccess(r))
        .catch((e) => onError(e));
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        defaultConfig: defaultConfig,
		connection: connection,
        quoteEsc: quoteEsc
    }
}
