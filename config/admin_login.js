var crypto = require('crypto');
var rand = require('csprng');

var database = require('./database');
var db = database.getDatabase;

exports.login = function (email, password, callback) {
    db.admins.find({email: email}, function (err, foundedUsers) {
        if (err) {
            callback({'response': "failure"});
            console.log("error-print: ", err);
        }
        else {
            if (foundedUsers.length == 1) {

                var salt = foundedUsers[0].salt;
                var hash_db = foundedUsers[0].hashed_password;
                var id = foundedUsers[0]._id;
                var newPass = salt + password;
                var hashed_password = crypto.createHash('sha512').update(newPass).digest("hex");
                var userName = foundedUsers[0].username;

                if (hash_db == hashed_password) {
                    callback({'response': "Login Success", 'res': true, '_id': id, 'username': userName});
                } else {
                    callback({'response': "Invalid Password", 'res': false});
                }
            } else {
                callback({'response': "User does not exist", 'res': false});
            }
        }
    });
}
