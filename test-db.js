const { db, getSetting, setSetting } = require('./src/db.js');
console.log("Before save:", getSetting('smtp_host'));
setSetting('smtp_host', 'test.smtp.com');
console.log("After save:", getSetting('smtp_host'));
