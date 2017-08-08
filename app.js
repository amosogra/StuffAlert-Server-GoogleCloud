/**Created by Amos Ogra on 21/11/2015*/

var express  = require('express');
var multer  = require('multer');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var homeDir = "./home/uploads/";
var path = require('path');


//var connect = require('connect');
var http = require('http');
var database = require('./config/database');
var AmosServer = require('./routes/AmosServer');

var app      = express();
/*var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    console.log(req);
    callback(null, "./home/uploads/raw/tmp");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname);
  }
});*/
// Configuration
//app.use(express.static('./home/uploads/'));
// app.use(connect.cookieParser());
// app.use(connect.bodyParser());
// app.use(connect.logger('dev'));
// app.use(connect.json());
// app.use(connect.urlencoded());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(multer({dest:"./home/uploads/raw/tmp"}).any());
app.use(morgan('dev'));
app.use(cookieParser());


// you'll probably load configuration from config
   var cfg = {
       ssl: false,
       port: normalizePort(process.env.PORT) || 8089,
       ssl_key: '/path/to/your/ssl.key',
       ssl_cert: '/path/to/your/ssl.crt',
       eventOnly: true
   };

    var amosServer = new AmosServer(cfg, app);
    var sockto = {};

// Routes
router = require('./routes/routes.js');
router(app, amosServer);

    amosServer.on('connection', function(socket){
        socket.on('ping', function(id){
            socket.id = id;
            sockto[id] = id;
            console.log("User with id "+id+" pinged the server");
        });

        socket.on('binary', function(data){
            socket.send(data, {binary:true}, function(error){
                if(!error)
                    console.log("message sent");
            });
        });

        socket.on('incoming', function(message){
            console.log(message);
            var id = message.toId;
            if (sockto[id]) {
                sockto[id].pipe('incoming', message, function(error){
                    if(error){
                        //message not sent, handle this event.
                    }
                });
            }
            else {
            console.log("user does not exist");
                //save message to database and only send when the user connects
                //or send using GCM to be on a safer side
            }
        });

        socket.on('request', function(request){
            console.log(request);
            database.sendRequest(request, function(result){
                console.log(result);
                var id = request.toId;
                if(result.success){console.log("result is successfull...");
                    if (sockto[id]) {
                        sockto[id].pipe('request', request, function(error){
                            if(error){
                                //message not sent, handle this event.
                            }
                        });
                    }
                    else {
                    console.log("user does not exist");
                        //save message to database and send periodically
                        //or send using GCM to be on a safer side
                    }
                }
            });
        });

        socket.on('no event', function(message){
            console.log(message);
        });

        socket.on('error', function(e){
            console.log(e);
        });

        socket.on('close', function(){
            console.log("User with id "+socket.id+" has disconnected from the server");
            console.log("deleting socket... " + sockto[socket.id]);
            delete sockto[socket.id];
        });
        console.log("AmosServer Connected to " + socket.id);
    });

function normalizePort(val) {
  var port = parseInt(val, 10);

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
