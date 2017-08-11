/**
 * Created by Amos on 10/16/2014.
 */
var mongojs = require("mongojs");
var ObjectID = require("bson-objectid");
//const config = require('../config.js');

var databaseUrl = process.env.MONGODB_ADDON_URI || /*config.get('MONGO_URL') ||*/ "mongodb://amosogra:ffffgggg@localhost:27017/stuffalert-db"; // "username:password@example.com/mydb", 'mongodb://localhost/test?ssl=true'
var collections = ["users", "admins", "feed"];
var db = mongojs(databaseUrl, collections);

exports.getDatabase = function (callback){
  db.users.find(function(found){
    callback(found);
  });
};

exports.writePhotoAndThumb = function(profile, callback) {
    db.users.find({email: profile.myEmail}, function (err, users) {
        if (err || users.length !==1) {
            callback({'response': "failure"});
            console.log(err);
            console.log("details: ", users);
        }
        else {
            console.log("response : " + "query successful");
            console.log(err);
            console.log("details: ", users);
            if (users.length === 1) {
                db.users.update({email: profile.myEmail},
                    {
                        $set: {username: profile.myUserName, department: profile.myDepartment, club: profile.myClub, level: profile.myClass, photo_url: profile.photo_url, thumb_url: profile.thumb_url}
                    },
                    {upsert: true}, function(err, upserted) {
                        if (err || upserted.n === 0) {
                            callback({'response': "failure"});
                            console.log("error print: " + err);
                            console.log(upserted);
                        }
                        else {
                            callback({'response': "success"});
                            console.log("error-print: ", err);
                            console.log(upserted);
                        }
                    }
                );
            }
            else {
                callback({'response': "unable to upsert database"});
            }
        }
    });
}

exports.updateStatus = function (query, info, callback) {
  db.users.update({_id:new ObjectID(query)},
      {
          $set: {status: info.status, timeStamp: info.timeStamp}
      },
      {upsert: true}, function(err, upserted) {
          if (err || upserted.n === 0) {
              callback({'response': "failure"});
              console.log("error print: " + err);
              console.log(upserted);
          }
          else {
              callback({'response': "success"});
              console.log("error-print: ", err);
              console.log(upserted);
          }
      }
  );
}

exports.fetchProfile = function(query, callback) {
    db.users.find({_id:new ObjectID(query)}, function(err, users) {
        if (err) {
            console.log("error");
            callback({'response':"not_fetched", 'users': []});
        }
        else if(users.length > 0){
            console.log("Query successful");
            callback({'response':"fetched", 'users': users});
        }
    });
}

var insertArticles = function(article, array_name, callback){

    if(array_name === "unapproved_articles" && article.authorizer_id === ""){
        db.users.update({_id:new ObjectID(article.author_id)}, {$addToSet: {unapproved_articles: article}}, function(err, inserted){
                if(err){
                    console.log("Error: ", err);
                    callback({'response':"not inserted"});
                }
                else{
                    console.log("insert details: ", inserted);
                    callback({'response':"inserted"});
                }
        });
    }
    else if(array_name === "unapproved_articles" && article.authorizer_id !== "" && !article.approved_before){
        //this article might have been authorized before but not approved: it was only modified, from the user and admin list.
        db.users.update({_id:new ObjectID(article.author_id), "unapproved_articles.timestamp": article.timestamp},
                        {
                            $set: {"unapproved_articles.$.type": article.type, "unapproved_articles.$.title": article.title,
                            "unapproved_articles.$.heading": article.heading, "unapproved_articles.$.category": article.category,
                            "unapproved_articles.$.paragraph": article.paragraph, "unapproved_articles.$.authorizer": article.authorizer,
                            "unapproved_articles.$.authorizer_id": article.authorizer_id, "unapproved_articles.$.authorized_at": article.authorized_at}
                        }, function(err, upserted){
            if(err){
                console.log("Error: ", err);
                callback({'response': "updated"});
            }
            else{
                db.admins.update({_id:new ObjectID(article.authorizer_id), "unapproved_articles.timestamp": article.timestamp},
                                 {
                                     $set: {"unapproved_articles.$.type": article.type, "unapproved_articles.$.title": article.title,
                                     "unapproved_articles.$.heading": article.heading, "unapproved_articles.$.category": article.category,
                                     "unapproved_articles.$.paragraph": article.paragraph, "unapproved_articles.$.authorizer": article.authorizer,
                                     "unapproved_articles.$.authorizer_id": article.authorizer_id, "unapproved_articles.$.authorized_at": article.authorized_at}
                                 }, {upsert:true}, function(err, a_upserted){
                    if(err){
                        console.log("Error: ", err);
                        callback({'success':true});
                    }
                    else{
                        console.log("details: ", a_upserted)
                        callback({'response': "updated"});
                    }
                });
            }
        });
    }
    else if(array_name === "unapproved_articles" && article.authorizer_id !== "" && article.approved_before){
        //this article has been authorized and approved before, remove it from the approved_articles user and admin list.
        db.users.update({_id:new ObjectID(article.author_id)}, {$addToSet: {unapproved_articles: article}}, function(err, inserted){
                if(err){
                    console.log("Error: ", err);
                    callback({'response': "updated"});
                }
                else{
                    console.log("insert details: ", inserted);
                    //add this article to the admin database as approved by article.authorizer_id.
                    db.admins.update({_id:new ObjectID(article.authorizer_id)}, {$addToSet: {unapproved_articles: article}}, function(err1, a_inserted){
                        if(err){
                            console.log("Error: ", err1);
                            callback({'response': "updated"});
                        }
                        else{
                            //this article has been authorized, remove it from the unapproved_articles user list
                            db.users.update({_id:new ObjectID(article.author_id)}, {$pull: {approved_articles: {timestamp:article.timestamp}}}, function(err2, b_inserted){
                                if(err2){
                                    console.log("Error: ", err2);
                                    callback({'response': "updated"});
                                }
                                else{
                                    //there is a probability that an admin have edited this article before
                                    db.admins.findAndModify({
                                       query: {_id: new ObjectID(article.authorizer_id)},
                                       update: {$pull: {approved_articles: {timestamp:article.timestamp}}}
                                    }, function(err3, pulled){
                                        if(!err3){
                                            console.log("modified admin: ", pulled);
                                            callback({'response': "updated"});
                                        }
                                        else{
                                            console.log("unable to find and modify admin array in approved_articles field.");
                                            callback({'response': "updated"});
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
        });
    }
    else if(array_name === "approved_articles" && !article.approved_before){
        db.users.update({_id: new ObjectID(article.author_id)}, {$addToSet: {approved_articles: article}}, function(err, inserted){
                if(err){
                    console.log("Error: ", err);
                    callback({'response': "updated"});
                }
                else{
                    //console.log("insert details: ", inserted);
                    //add this article to the admin database as approved by article.authorizer_id.
                    db.admins.update({_id:new ObjectID(article.authorizer_id)}, {$addToSet: {approved_articles: article}}, function(err1, a_inserted){
                        if(err){
                            console.log("Error: ", err1);
                            callback({'response': "updated"});
                        }
                        else{
                            //this article has been authorized, remove it from the unapproved_articles user list
                            db.users.update({_id:new ObjectID(article.author_id)}, {$pull: {unapproved_articles: {timestamp:article.timestamp}}}, function(err2, b_inserted){
                                if(err2){
                                    console.log("Error: ", err2);
                                    callback({'response': "updated"});
                                }
                                else{
                                    //there is a probability that an admin have edited this article before
                                    db.admins.findAndModify({
                                       query: {_id: new ObjectID(article.authorizer_id)},
                                       update: {$pull: {unapproved_articles: {timestamp:article.timestamp}}}
                                    }, function(err3, pulled){
                                        if(!err3){
                                            console.log("modified admin: ", pulled);
                                            callback({'response': "updated"});
                                        }
                                        else{
                                            console.log("unable to find and modify admin array in unapproved_articles field.");
                                            callback({'response': "updated"});
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
        });
    }
    else if(array_name === "approved_articles" && article.approved_before){
        //if the article has been authorized before, update it.
        db.users.update({_id:new ObjectID(article.author_id), "approved_articles.timestamp": article.timestamp},
                        {
                            $set: {"approved_articles.$.type": article.type, "approved_articles.$.title": article.title,
                            "approved_articles.$.heading": article.heading, "approved_articles.$.category": article.category,
                            "approved_articles.$.paragraph": article.paragraph, "approved_articles.$.authorizer": article.authorizer,
                            "approved_articles.$.authorizer_id": article.authorizer_id, "approved_articles.$.authorized_at": article.authorized_at}
                        }, function(err, upserted){
            if(err){
                console.log("Error: ", err);
                callback({'response': "updated"});
            }
            else{
                db.admins.update({_id:new ObjectID(article.authorizer_id), "approved_articles.timestamp": article.timestamp},
                                 {
                                     $set: {"approved_articles.$.type": article.type, "approved_articles.$.title": article.title,
                                     "approved_articles.$.heading": article.heading, "approved_articles.$.category": article.category,
                                     "approved_articles.$.paragraph": article.paragraph, "approved_articles.$.authorizer": article.authorizer,
                                     "approved_articles.$.authorizer_id": article.authorizer_id, "approved_articles.$.authorized_at": article.authorized_at}
                                 }, function(err, a_upserted){
                    if(err){
                        console.log("Error: ", err);
                        callback({'response': "updated"});
                    }
                    else{
                        console.log("details: ", a_upserted)
                        callback({'response': "updated"});
                    }
                });
            }
        });
    }
    else {

    }

}


exports.findContributors = function(query, callback) {
    db.users.find({}, function(err, contributors) {
        if (err) {
            console.log("error");
            callback({'contributors': []});
        }
        else if(contributors.length > 0){
            console.log("Query successful");
            callback({'contributors': contributors});
        }
    });
}



exports.writeFeed = function(feed, callback){
    db.feed.insert(feed, function(err, inserted){
        if(!err || inserted){
            //callback({'response': "inserted"});
            insertArticles(feed, "unapproved_articles", callback);
        }
        else{
            console.log(err);
            console.log("details: ", inserted);
            callback({'response':"uninserted"});
        }
    });
}

exports.approveFeed = function(query, feed, callback){
    db.feed.update({_id: new ObjectID(query)},
        {
            $set: feed
        },
        {upsert: true}, function(err, upserted) {
            if (err) {
                console.log("error print: " + err);
                callback({'response': "failure"});
            }
            else {
                console.log("update details: ", upserted);
                //callback({'response': "updated"});
                if(feed.type === "approved"){
                    insertArticles(feed, "approved_articles", callback);
                }
                else{
                    insertArticles(feed, "unapproved_articles", callback);
                }
            }
        }
    );
}

exports.insertComment = function(comment, callback){
    db.feed.update({_id:new ObjectID(comment.feedId)}, {$addToSet: {comments: comment}}, function(err, inserted){
            if(!err || inserted.n > 0){
                //console.log("Error:", err);
                console.log("details: ", inserted);
                db.feed.find({_id: new ObjectID(comment.feedId)}, {comments:1}, function(err, found){
                    if(err || found.length !== 1){
                        callback({'success':true, 'comments': []});
                    }
                    else{
                        callback({'success':true, 'comments': found[0].comments});
                        console.log('result: ', found);
                    }
                });
            }
            else{
                console.log("Error:", err);
                console.log("reason: ", inserted);
                callback({'success':false});
            }
    });

}

exports.readLatestFeed = function(timestamp, type, callback){
    db.feed.find({'timestamp':{$gt: (timestamp-86400000), $lt:timestamp}, 'type': {$ne: "unapproved"}}, function(err, feed){
    if(err){
        //console.log(err);
        callback({'feedresponse':[], 'tryagain':false});
    }
    else if(feed.length === 0){
        callback({'feedresponse':feed, 'tryagain':true});
    }
    else{
        console.log("Query successful");
        callback({'feedresponse':feed, 'tryagain':false});
    }
    });
}


exports.readFeed = function(query, callback){
    db.feed.find(query, function(err, feed){
        if(err || feed.length === 0){
            //console.log(err);
            callback({'feedresponse':[], 'tryagain':false});
        }
        else if(feed.length === 0){
            callback({'feedresponse':feed, 'tryagain':true});
        }
        else{
            console.log("Query successful");
            callback({'feedresponse':feed, 'tryagain':false});
        }
    });
}

exports.sendRequest = function(req, callback){
    db.users.update({_id:new ObjectID(req.toId)}, {$addToSet: {RequestList: {_id:new ObjectID(req.fromId), name:req.fromUser}}}, function(inserted, err){
        if(err || !inserted){
            console.error("Error:" + inserted);
            console.log(inserted);
            console.log(err);
            console.log("reason: " + inserted);
            callback({success:false});
        }
        else{
            addToMyList();
        }
    });

    var addToMyList = function(){
        db.users.update({_id:new ObjectID(req.fromId)},{$addToSet: {myRequestList: {_id:new ObjectID(req.toId), name:req.toUser}}}, function(err, inserted){
            if(err || !inserted){
                console.error(err);
                callback({success:false});
            }
            else{
                callback({success:true});
            }
        });
    }
}

exports.acceptRequest = function(req, callback){
    db.users.update({_id:new ObjectID(req.fromId)}, {$addToSet: {FriendList: {_id:new ObjectID(req.toId), name:req.toUser}}}, function(err, inserted){
            if(err || !inserted){
                console.error(err);
                callback({success:false});
            }
            else{
                addToUsersList();
            }
        });

        var addToUsersList = function(){
            db.users.update({_id:new ObjectID(req.toId)},{$addToSet: {FriendList: {_id:new ObjectID(req.fromId), name:req.fromUser}}}, function(err, upserted){
               if(err || !upserted){
                   console.error(err);
                   callback({success:false});
               }
               else{
                  removeRequest();
               }
           });
        }

        var removeRequest = function(){
            db.users.update({_id:new ObjectID(req.fromId)}, {$pull:{RequestList:{_id:new ObjectID(req.toId)}}}, function(err, pulled){
                    if(err || !pulled){
                        console.error(err);
                        callback({success:false});
                    }
                    else{
                        removeFromRequesterList();
                    }
            });
        }

        var removeFromRequesterList = function(){
            db.users.update({_id:new ObjectID(req.toId)}, {$pull:{myRequestList:{_id:new ObjectID(req.fromId)}}}, function(err, pulled){
                    if(err || !pulled){
                        console.error(err);
                        callback({success:false});
                    }
                    else{
                        callback({success:true});
                    }
            });
        }
}

function normalizePort(val) {
  var port = parseLong(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

db.on('error', function(err) {
  console.log('mongodb had an error in config/database.js', err);
});

db.on('ready',function() {
    console.log('mongodb database connected and is ready...');
});
