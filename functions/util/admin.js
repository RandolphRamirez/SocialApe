const admin = require('firebase-admin');
var serviceAccount = require("../socialape-service_account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialape-7e568.firebaseio.com",
    storageBucket: "socialape-7e568.appspot.com/"
  });
  
const db = admin.firestore();

module.exports = {admin, db};