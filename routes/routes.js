var chgpass = require('../config/chgpass');
var register = require('../config/register');
var login = require('../config/login');
var adminRegister = require('../config/admin_register');
var adminLogin = require('../config/admin_login');
var database = require('../config/database');
var fs = require('fs');
var url = require('url');
var homeDir = "./home/uploads/";
var path = require('path');


module.exports = function(app, amosServer) {
    amosServer.broadcast = function(data){
        amosServer.clients.forEach(function each(client){
            client.send(data);
        });
    };

    app.get('/', function(req, res){
        res.send(
                '<form action="/profile/upload" method="post" enctype="multipart/form-data">'+
                '<input type="file" name="source">'+
                '<input type="file" name="thumb">'+
                '<input type="submit" value="Upload">'+
                '</form>'
        );
    });

    app.get(/^(.+)$/, function (req, res) {
     //  res.sendfile("/home/uploads/" + url.parse(req.url).pathname );
        var uri = url.parse(req.url).pathname;
        var filename = path.join(homeDir, uri);
        if (filename == null) {
            return;
        }
        //console.log("filename : " + filename);
        //console.log("uri : " + uri);
        fs.exists(filename, function(exists) {
            if (!exists) {
                console.log('404 File Not Found : ' + filename);
                res.writeHead(404, {"Content-Type" : "text/plain"});
                res.write("404 Not Found\n");
                res.end();
                return;
            }
            else {
                //var stream = fs.createReadStream(filename, {bufferSize:64*1024});
                //stream.pipe(res);
                res.download(filename, function() {
                   console.log('file downloaded successfully');
                    res.end();
                });
                //console.log('downloading...' + filename);
            }
        });
    });

    app.post('/profile/upload', function(req, res) {
        //console.log(req.body.myEmail + "/" + req.body.myEmail);
        //console.log("Received file:\n" + JSON.stringify(req.files));
        var log = "Received body:\n" + JSON.stringify(req.body);

        writeProfileDetailsT0Db(req, res, log);
    });

    var writeProfileDetailsT0Db = function(req, res, logMessage){
        console.log(logMessage);
        var profile = JSON.parse(req.body.feed);

        database.writePhotoAndThumb(profile, function(upserted) {
            res.json(upserted);
            res.end();
            console.log(upserted);
        });
    }

    app.post('/fetch/profile', function(req, res){
        console.log("post profile fetching:: recieved");
        var query = req.body.query;

        database.fetchProfile(query, function(fetched){
           res.json(fetched);
            res.end();
        });
    });

    app.post('/status_update', function(req, res){
        console.log("post status_update:: recieved");
        var query = req.body.query;
        var info = JSON.parse(req.body.info);

        database.updateStatus(query, info, function(upserted){
           res.json(upserted);
        });
    });


    app.post('/contributors/query', function(req, res) {
        console.log("post contributors recieved");
        var query = JSON.parse(req.body.query);

        database.findContributors(query, function(found) {
            res.json(found);
            res.end();
        });
    });

    app.post('/adminfeed', function(req, res){
     console.log("post feed:: recieved");
     var type = req.body.type;

     database.readFeed({type: type}, function(response){
         if(response.feedresponse.length === 0){
             res.json(response);
             res.end();
             console.log("No feed.");
         }
         else{
             res.json(response);
             res.end();
             console.log("feed fetched successfully.");
         }
     });
    });

    app.post('/feed/upload/approved', function(req, res){
        console.log("post approved:: recieved");
        var query = req.body.query;
        var feed = JSON.parse(req.body.feed);

        database.approveFeed(query, feed, function(inserted){
           res.json(inserted);
          if(feed.type === "approved"){
               amosServer.broadcast(JSON.stringify({event:"notification", data:feed}));
          }
        });
    });


   app.post('/feed/query', function(req, res){
	console.log("post feed:: recieved");
    var query = JSON.parse(req.body.query);

    database.readFeed(query, function(response){
        if(response.feedresponse.length === 0){
            res.json(response);
            res.end();
            console.log("No feed.");
        }
        else{
            res.json(response);
            res.end();
            console.log("feed fetched successfully.");
        }
	});
   });

    app.post('/feed/latest', function(req, res){
     console.log("post latest feed:: recieved");

     var feed = JSON.parse(req.body.query);
     var timestamp = feed.timestamp;
     var type = feed.type;

     database.readLatestFeed(timestamp, type, function(response){
        if(response.feedresponse.length === 0){
            res.json(response);
            res.end();
            console.log("No latest feed.");
        }
        else{
            res.json(response);
            res.end();
            console.log("feed fetched successfully.");
        }
     });
    });


    app.post('/feed/comment', function(req, res){
     var log = "post comment:: recieved";
     //console.log("Received files:\n" + req.files);
     //console.log("Received file:\n" + req.file);

     writeFeedCommentToDb(req, res, log);
    });

    var writeFeedCommentToDb = function(req, res, logMessage){
        console.log(logMessage);
        //var thumbUrl = "photos/feed/comments/" + req.thumbFile.originalname;
        var comment = JSON.parse(req.body.feed);
        //comment.thumbUrl = thumbUrl;
        //console.log(comment);

        database.insertComment(comment, function(response){
           if(!response.success){
               res.json(response);
               res.end();
               console.log("error: ", response);
           }
           else{
               res.json(response);
               res.end();
               //console.log(response);
           }
        });
    }

    app.post('/feed/upload', function(req, res) {
        var log = "new feed uploaded";
        //console.log(JSON.stringify(req.files));
        //console.log("file is:\n" + JSON.stringify(req.file));

        writeFeedToDatabase(req, res, log);
    });

    var writeFeedToDatabase = function(req, res, logMessage){
        console.log(logMessage);
        //var bitmapUrl = "photos/feed/" + req.bitmapFile.originalname;
        var feed = JSON.parse(req.body.feed);
        //feed.bitmap = bitmapUrl;

        database.writeFeed(feed, function(response){
            console.log(response);
            res.json(response);
            if(feed.type === "stuffed"){
                 amosServer.broadcast(JSON.stringify({event:"notification", data:feed}));
            }
            res.end();
        });
    }

    app.post('/login', function(req, res){
        var email = req.body.myEmail;
        var password = req.body.myPassword;

        console.log("Login attempt...");
        login.login(email, password, function (found) {
           console.log(found);
           res.json(found);
           res.end();
        });
    });


    app.post('/register', function(req, res){
        var userName = req.body.myName;
        var email = req.body.myEmail;
        var password = req.body.myPassword;

        console.log("Registering...");
        register.register(userName, email, password,function (found) {
            console.log(found);
            res.json(found);
            res.end();
        });
   });

    app.post('/admin/login', function(req, res){
        var email = req.body.myEmail;
        var password = req.body.myPassword;

        console.log("Admin Login attempt...");
        adminLogin.login(email, password, function (found) {
           console.log(found);
           res.json(found);
           res.end();
        });
    });

    app.post('/admin/register', function(req, res){
        var userName = req.body.myName;
        var email = req.body.myEmail;
        var password = req.body.myPassword;

        console.log("Registering Admin...");
        adminRegister.register(userName, email, password,function (found) {
            console.log(found);
            res.json(found);
            res.end();
        });
   });

   app.post('/api/chgpass', function(req, res) {
	var id = req.body.id;
    var opass = req.body.oldpass;
	var npass = req.body.newpass;

	chgpass.cpass(id,opass,npass,function(found){
	   console.log(found);
	   res.json(found);
       res.end();
	});
   });


   app.post('/api/resetpass', function(req, res) {

      var email = req.body.email;

      chgpass.respass_init(email,function(found){
          console.log(found);
          res.json(found);
          res.end();
      });
   });


   app.post('/api/resetpass/chg', function(req, res) {

	var email = req.body.email;
	var code = req.body.code;
	var npass = req.body.newpass;

	chgpass.respass_chg(email,code,npass,function(found){
	   console.log(found);
	   res.json(found);
        res.end();
	});
   });

};
