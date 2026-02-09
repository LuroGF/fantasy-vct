const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log('PUB:' + vapidKeys.publicKey);
console.log('PRIV:' + vapidKeys.privateKey);
