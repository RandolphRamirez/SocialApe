const {admin, db} = require('../util/admin');

const config = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(config);

const {validateSignupData, validateLoginData} = require('../util/validators');

exports.signup = (req, res) => {
    let newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }
    
    const {valid, errors} = validateSignupData(newUser);
    
    if(!valid) return res.status(400).json(errors);

    const noimg = 'no-img.png';

    let token, userId;
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((doc) => { 
            if(doc.exists){
                return res.status(400).json({message: 'Handler already exist'})
            }else{
                console.log('email: ' + newUser.email);
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((tokenId) => {
            token = tokenId;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noimg}?alt=media`,
                userId
            }

            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({token: token});
        })
        .catch((err) => {
            if(err.code == 'auth/email-already-in-use'){
                console.error(err);
                return res.status(400).json({error: 'Email is already in use.'});
            }else{
                console.error(err);
                return res.status(500).json({error: err.code});
            }
        })
 };

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const {valid, errors} = validateLoginData(user);
    
    if(!valid) return res.status(400).json(errors);
    
    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({token});
        })
        .catch(err => {
            console.error(err);
            if(err.code === 'auth/wrong-password'){
                return res.status(400).json({error: 'Wrong password, please try again'});
            }else{
                return res.status(500).json({error: err.code});
            }
        });
 }

 exports.uploadimage = (req, res) => {
     const BusBoy = require('busboy');
     const path = require('path');
     const os = require('os');
     const fs = require('fs');
     
     const busboy = new BusBoy({headers: req.headers});

     let imageFileName;
     let imageToBeUploaded = {};

     busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        
        if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
            return res.status(400).json({error: 'Wrong file type submitted'});
        }
        const imageExtenstion = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${Math.round(Math.random() * 1000000000)}.${imageExtenstion}`;
        const filepath = path.join(os.tmpdir(), imageFileName);

        imageToBeUploaded = {filepath, mimetype};
        
        file.pipe(fs.createWriteStream(filepath));

     });
     busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            return db.doc(`/users/${req.user.handle}`).update({imageUrl});
        })
        .then(() => {
            return res.json({message: 'Image Uploaded Successfully'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({message: err});
        });
     });
     busboy.end(req.rawBody);
 }