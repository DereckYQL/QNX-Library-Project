const allowed = new Set(['request_id','method','status','duration_ms','code','port','url','user_id','count']);
function log(event, fields = {}, level = 'info') {
  const record = { time: new Date().toISOString(), level, event };
  for (const [key, value] of Object.entries(fields)) if (allowed.has(key) && ['number','string','boolean'].includes(typeof value)) record[key] = value;
  (level === 'error' ? process.stderr : process.stdout).write(JSON.stringify(record) + '\n');
}
module.exports = { log };
