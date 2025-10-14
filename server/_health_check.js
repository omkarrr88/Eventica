const http = require('http');
http.get('http://localhost:3000/api/health', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('HEALTH_RESPONSE:');
    console.log(data);
    process.exit(0);
  });
}).on('error', e => { console.error('ERR', e); process.exit(1); });
