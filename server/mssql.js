/* my installation history

npm install mssql

*/
const config = {
    user: 'node',
    password: 'node',
    server: 'localhost', // You can use 'localhost\\instance' to connect to named instance
    database: '2GB',
    port: 1433,
    options: {
        enableArithAbort: true,
    }
}

const sql = require('mssql');
var pool
(async function () {
    try {
        pool = await sql.connect(config);
    } catch (err) {
        // ... error checks
        console.log('catched', err);
    }
})();
sql.on('error', err => {
    // ... error handler
    console.log('onerror', err);
})

function ws_log(message, module='') {
    queryCatch(
        'insert into web.ws_console_log (log_ts, service, log_info) '
        +'values (now(), \'' + module + '\', \'' + message + '\');'
        , (r) => {return;}
    );
}

async function run(query, params) {
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
    
    try {return {data: await pool.request().query(query), errorState: 0};}
    catch (e) {return {error: e, errorState: 1};}
}
async function runRows(query, params) {
    try {
        var r = await run(query, params);
        if (r.errorState == 0) {
            return r.data.recordset;
        } else {
            console.log(r.error);
            throw new Error();
        }
    } catch (e) {console.log(e);}
}
function queryCatch(
    query,
    onSuccess=(r) => console.log(r),
    onError=(e) => console.log(e)
) {
    pool.request().query(query)
    .then((r) => onSuccess(r))
    .catch((e) => onError(e));
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
        pool: pool,
        client: pool,
        ws_log: ws_log,
        run: run,
        runRows: runRows,
        queryCatch: queryCatch
    }
}
