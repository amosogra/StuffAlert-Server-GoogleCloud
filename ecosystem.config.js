module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */

   // run the following command to start pm2: pm2 startOrReload ecosystem.config.js --update-env
   apps : [

  {
     name        : "Stuff-Alert Server",
     script      : "./app.js",
     watch       : true,
     //instances  : 4,
     //exec_mode  : "cluster",
     env: {
       "NODE_ENV": "production",
       "PORT":8080,
       "MONGODB_ADDON_URI":"mongodb://amosogra:ffffgggg@127.0.0.1:27017/stuffalert-db"
     }
   }

  ]
 }
