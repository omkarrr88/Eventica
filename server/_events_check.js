const http = require('http');
http.get('http://localhost:3000/api/events', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const events = JSON.parse(data);
      console.log('EVENTS_SUMMARY:');
      events.forEach(e => console.log(`${e._id || e.id} | ${e.title} | reviews=${e.reviewCount||0} avg=${(e.averageRating||0).toFixed(2)}`));
    } catch (err) { console.error('Parse error', err); console.log('RAW:', data); }
    process.exit(0);
  });
}).on('error', e => { console.error('ERR', e); process.exit(1); });
