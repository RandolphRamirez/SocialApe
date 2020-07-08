const functions = require('firebase-functions');

const express = require('express');
const app = express();

const FBAuth = require('./util/fbauth');

const {db} = require('./util/admin');

const {getAllScreams, postOneScream, getScream, commentOnScream, likeScream, unlikeScream, deleteScream} = require('./handlers/screams');
const {signup, login, uploadimage, addUserDetails, getAuthenticatedUser, getUserDetails, markNotificationsRead} = require('./handlers/users');

// const firebase = require('firebase');
// firebase.initializeApp(config);

// Screa Routes
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);
app.get('/screams/:screamId', getScream);
app.post('/screams/:screamId/comment', FBAuth, commentOnScream);
app.get('/screams/:screamId/like', FBAuth, likeScream);
app.get('/screams/:screamId/unlike', FBAuth, unlikeScream);
app.delete('/screams/:screamId', FBAuth, deleteScream);
// TODO:

 // User Routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadimage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);


 exports.api = functions.https.onRequest(app);

 exports.createNotificationOnLike = functions.firestore.document('/likes/{id}')
    .onCreate((snapshot) => {
        db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then(doc => {
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recepient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        screamId: doc.id
                    })
                    .catch(err => {
                        console.error(err);
                    });
                }
            });
    });

    
exports.deleteNotificationOnUnlike = functions
    .firestore.document('/likes/{id}')
    .onDelete((snapshot) => {
        return db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .then(() => {
                return;
            })
            .catch((err) => {
                console.error(err);
                return;
            })
    })
exports.createNotificationOnComments = functions.firestore.document('/comments/{id}')
    .onCreate(snapshot => {
        db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then(doc => {
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        screamId: doc.id
                    })
                    .then(() => {
                        return;
                    })
                    .catch(err => {
                        console.error(err);
                        return;
                    });
                }
            });
    });

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
    .onUpdate((change) => {
        console.log(change.before.data);
        console.log(change.after.data);
        
        if(change.before.data().imageUrl !== change.after.data().imageUrl){
            let batch = db.batch();

            return db.collection('screams').where('userHandle', '==', change.before.data().handle).get()
                .then(data => {
                    data.forEach(doc => {
                        const scream = db.doc(`/screams/${doc.id}`);
                        batch.update(scream, {userImage: change.after.data().imageUrl});
                    });
                    return batch.commit();
                })
        }
        
    });

exports.onScreamDeleted = functions
    .firestore
    .document('/screams/{screamId}')
    .onDelete((snapshot, context) => {
        const screamId = context.params.screamId;
        const batch = db.batch();
        return db.collection('comments').where('screamId', '==', screamId).get()
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                })
                return db.collection('likes').where('screamId', '==', screamId).get();
            })
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                })
                return db.collection('notifications').where('screamId', '==', screamId).get();
            })
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                })
                return batch.commit();
            })
            .catch(err => console.error(err));

    });
    