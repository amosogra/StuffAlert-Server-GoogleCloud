var crypto = require('crypto');
var rand = require('csprng');

var database = require('./database');
var db = database.getDatabase;

exports.register = function (userName, email, password, callback) {

    var x = email;
    if (!(x.indexOf("@") < 1 || x.lastIndexOf(".") < x.indexOf("@") + 2 || x.lastIndexOf(".") + 2 >= x.length)) {
        if ((password.match(/([A-Z])|([a-z])/) || password.match(/[0-9]/)) && password.length > 5) {

            var salt = rand(160, 36);
            var newPass = salt + password;
            var token = crypto.createHash('sha512').update(email + rand).digest("hex");
            var hashed_password = crypto.createHash('sha512').update(newPass).digest("hex");

            db.users.find({email: email}, function(err, foundedUsers){
                if(err) {
                    callback({'response': "failure"});
                    console.log("error-print: ", err);
                }
                else {
                   if (foundedUsers.length == 0) {
                       db.users.insert({username: userName, email: email, token: token, test :{field1:"some text"},
                           hashed_password: hashed_password, salt: salt}, function(err, inserted) {
                           if (err || !inserted) {
                               callback({'response': "failure"});
                               console.log("error-print: ", err);
                           }
                           else{
                             callback({'response': "registered"});
                           }
                       });
                   }
                    else {
                       callback({'response': "denied"});
                   }
                }
            });
        } else {
            callback({'response': "Password Weak"});
        }
    } else {
        callback({'response': "Email Not Valid"});
    }
}
