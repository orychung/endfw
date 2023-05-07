// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    dynamic: require('./server/dynamic'),
    lessCss: require('./server/lessCss'),
    mssql: require('./server/mssql'),
    pg: require('./server/pg'),
    server: require('./server/server'),
    serverUtil: require('./server/serverUtil'),
    subroute: require('./server/subroute'),
    ingest: require('./server/ingest'),
    
    builtin: require('./common/builtin'),
    dbBuiltin: require('./common/dbBuiltin'),
    global: require('./common/global'),
    parse: require('./common/parse'),
    performance: require('./common/performance'),
    promise: require('./common/promise'),
    stat: require('./common/stat'),
    text: require('./common/text'),
    
    matrix: require('./math/matrix'),
  }
}
