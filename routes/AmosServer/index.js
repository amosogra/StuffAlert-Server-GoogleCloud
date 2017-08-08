/**Created by Amos Ogra on 21/11/2015*/

   var util = require('util');
   var events = require('events');
   var WebSocketServer   = require('ws').Server;

    var fs = null;
    var server      = null;
    var httpServ = null;

    // dummy request processing
    var processRequest = function( req, res ) {
        res.writeHead(200);
        res.end("All glory to God!\n");
    };

    function AmosServer(cfg, expressApp){
		events.EventEmitter.call(this);
		var self = this;
        var clients = [];

        if ( cfg.ssl ) {
            fs = require('fs');
            httpServ = require('https');
            server = httpServ.createServer({
                // providing server with  SSL key/cert
                key: fs.readFileSync( cfg.ssl_key ),
                cert: fs.readFileSync( cfg.ssl_cert )
            });//.listen(cfg.port);
        } else {
            httpServ = require('http');
            server = httpServ.createServer();//.listen(cfg.port);
        }

		// passing or reference to web server so WS would knew port and SSL capabilities
        var wss = new WebSocketServer( { server: server } );
        wss.on('connection', function (socket) {
			      socket.id = 0;
            socket.pipe = function (event, data, callback){
                //socket.send({"event":event, "data":data});
                socket.send(JSON.stringify({event:event,data:data}), {binary:false}, function(error){
                    if(error){
                       console.error(error);
                       callback(error);
                    }
                    else{
                        console.log("message sent inside");
                        callback(error);
                    }
                });
			};

            socket.on('message', function (message, flags) {
				if(flags.binary){
					socket.emit('binary', message);
				}
				else{
                    if(cfg.eventOnly){
                        try{
                            var json = JSON.parse(message);
                            socket.emit(json.event, json.data);
                            console.log("message inside = " + json.event);
                        }
                        catch(e){
                           console.error(e);
                           socket.emit('no event', message);
                        }
                    }
                    else{
                        socket.emit('no event', message);
                    }
				}
            });

			self.emit('connection', socket);

        });

        self.clients = wss.clients;
        server.on('request', expressApp);
        server.listen(cfg.port, function(){
            console.log("AmosServer runs on port "+ server.address().port);
            console.log("Server Address is: ", server.address().address);
        });

	}
/**
 * Inherits from EventEmitter.
 */
util.inherits(AmosServer, events.EventEmitter);
module.exports = AmosServer;
