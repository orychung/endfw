
const sql = require('mssql');
var defaultConfig = {
    user: 'node',
    password: 'node',
    server: 'localhost', // You can use 'localhost\\instance' to connect to named instance
    database: 'NODE',
    port: 1433,
    options: {
        enableArithAbort: true,
    }
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
				this.connection = (await sql.connect(this.config)).request();
				this.connected = true;
			} catch (err) {
				// ... error checks
				console.log('catched on connect', err);
			}
		}
	}
	async run(query, params) {
		if (!this.connected) return {error: 'not in connected state', errorState: 1};
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
		
		try {return {data: await this.connection.query(query), errorState: 0};}
		catch (e) {return {error: e, errorState: 1};}
	}
	async runRows(query, params) {
		try {
			var r = await this.run(query, params);
			if (r.errorState == 0) {
				return r.data.recordset;
			} else {
				console.log(r.error);
				throw new Error();
			}
		} catch (e) {console.log(e);}
	}
	queryCatch(
		query,
		onSuccess=(r) => console.log(r),
		onError=(e) => console.log(e)
	) {
		this.connection.query(query)
		.then((r) => onSuccess(r))
		.catch((e) => onError(e));
	}
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
		sql: sql,
		defaultConfig: defaultConfig,
		connection: connection
    }
}
