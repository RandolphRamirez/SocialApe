const functions = require('firebase-functions');

const express = require('express');
const app = express();

const FBAuth = require('./util/fbauth');

const {getAllScreams, postOneScream} = require('./handlers/screams');
const {signup, login, uploadimage} = require('./handlers/users');

// const firebase = require('firebase');
// firebase.initializeApp(config);

// Screa Routes
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);

 // User Routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadimage);


 exports.api = functions.https.onRequest(app);