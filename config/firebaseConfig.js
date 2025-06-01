const admin = require('firebase-admin');
const serviceAccount = require('../config/bodo-app-18921-firebase-adminsdk-kw0r5-474ba1ac7c.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'bodo-app-18921.firebasestorage.app'
});

const firestore = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, firestore, bucket };
