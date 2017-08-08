var crypto = require('crypto');
var rand = require('csprng');
var nodemailer = require('nodemailer');

var database = require('./database');
var db = database.getDatabase;

var smtpTransport = nodemailer.createTransport("SMTP", {
    auth: {
        user: "user@gmail.com",
        pass: "*********"
    }
});


exports.cpass = function (id, opass, npass, callback) {

    var temp1 = rand(160, 36);
    var newpass1 = temp1 + npass;
    var hashed_passwordn = crypto.createHash('sha512').update(newpass1).digest("hex");

    db.users.find({token: id}, function (err, users) {
        if(err){
            callback({'response': "failure"});
            console.log(err);
        }
        else {
            if (users.length != 0) {

                var temp = users[0].salt;
                var hash_db = users[0].hashed_password;
                var newpass = temp + opass;
                var hashed_password = crypto.createHash('sha512').update(newpass).digest("hex");

                if (hash_db == hashed_password) {
                    if (npass.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/) && npass.length > 4 && npass.match(/[0-9]/) && npass.match(/.[!,@,#,$,%,^,&,*,?,_,~]/)) {
                        db.users.update({token: id }, {$set:{hashed_password: hashed_passwordn, salt: temp1}}, function(err, inserted) {
                            if (err || !inserted) {
                                callback({'response': "failure"});
                                console.log(err);
                            }
                            else{
                                callback({'response': "Password Sucessfully Changed", 'res': true});
                            }
                        });
                    } else {
                        callback({'response': "New Password is Weak. Try a Strong Password !", 'res': false});
                    }
                } else {
                    callback({'response': "Passwords do not match. Try Again !", 'res': false});
                }
            } else {
                callback({'response': "Error while changing password, unnable to find user token", 'res': false});
            }
        }
    });
}

exports.respass_init = function (email, callback) {

    var temp = rand(24, 24);
    db.users.find({email: email}, function (err, users) {
        if(err){
            callback({'response': "failure"});
            console.log(err);
        }
        else{
            if (users.length != 0) {
                db.users.update({email: email}, {$set: {temp_str:temp}}, function (err, inserted) {
                    if (err || !inserted) {
                        callback({'response': "failure"});
                        console.log(err);
                    }
                    else{
                        var mailOptions = {
                            from: "Raj Amal  <raj.amalw@gmail.com>",
                            to: email,
                            subject: "Reset Password ",
                            text: "Hello " + email + ".  Code to reset your Password is " + temp + ".\n\nRegards,\nRaj Amal,\nLearn2Crack Team.",

                        }

                        smtpTransport.sendMail(mailOptions, function (error, response) {
                            if (error) {
                                callback({'response': "Error While Resetting password. Try Again !", 'res': false});
                            } else {
                                callback({'response': "Check your Email and enter the verification code to reset your Password.", 'res': true});
                            }
                        });
                    }
                });
            } else {
                callback({'response': "Email Does not Exists.", 'res': false});
            }
        }
    });
}

exports.respass_chg = function (email, code, npass, callback) {
    db.users.find({email: email}, function (err, users) {
        if(err){
            callback({'response': "failure"});
            console.log(err);
        }
        else{
            if (users.length != 0) {

                var temp = users[0].temp_str;
                var temp1 = rand(160, 36);
                var newpass1 = temp1 + npass;
                var hashed_password = crypto.createHash('sha512').update(newpass1).digest("hex");

                if (temp == code) {
                    if (npass.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/) && npass.length > 4 && npass.match(/[0-9]/) && npass.match(/.[!,@,#,$,%,^,&,*,?,_,~]/)) {
                        db.users.update({email: email}, {$set: {hashed_password: hashed_password, salt: temp1, temp_str: ""}}, function(err, inserted) {
                            if (err || !inserted) {
                                callback({'response': "failure"});
                                console.log(err);
                            }
                            else{
                                callback({'response': "Password Sucessfully Changed", 'res': true});
                            }
                        });
                    } else {
                        callback({'response': "New Password is Weak. Try a Strong Password !", 'res': false});
                    }
                } else {
                    callback({'response': "Code does not match. Try Again !", 'res': false});
                }
            } else {
                callback({'response': "Error", 'res': true});
            }
        }
    });
}

