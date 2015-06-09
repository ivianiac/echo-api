var Task = require('../task');
  var request = require('request');

var AssureLink = function(echo) {
  var self = this;
  Task.call(self, null);
  self.echo = echo;

  self.config = require('./.credentials');
  self.retries = 0;
  self.retrylimit = 1;
  self.domain = 'https://craftsmanweb.myqdevice.com';

  self.register('^(shut|open) ([a|e]mber|david)(?:[\'s]{1,2})? garage', self.GarageDoor);

};

AssureLink.prototype = Object.create(Task.prototype);
AssureLink.prototype.constructor = AssureLink;

AssureLink.prototype.request = function(api, method, data, callback) {
  var self = this;
  var url = self.domain + (api == "login" ? '/Login.aspx/' : '/Devices.aspx/') + api;

  var headers = {
    'User-Agent': 'User Agent/0.0.1'
  };

  var options = {
    url: url,
    method: method,
    rejectUnauthorized: false,
    headers: headers,
    jar: true
  };

  if(data){
    options.body = JSON.stringify(data);
    options.headers['Content-Type'] = 'application/json';
    options.headers['Origin'] = 'https://craftsmanweb.myqdevice.com';
    options.headers['Referer'] = 'https://craftsmanweb.myqdevice.com/Login.aspx/login';
  }

  request(options, function(err, res, body){
    if(!err && res.statusCode == 200) {
      self.retries = 0;
      callback.call(self, body, res);
    } else if(self.retries <= self.retrylimit){
      self.retries++;
      self.doLogin(function(){
          self.request(api,method,data,callback);
      })
    } else {
      console.log('err: %s', err);
      if(res)
        console.log(err, res.statusCode, body);
    }
  });
};

AssureLink.prototype.doLogin = function(callback){
  var self = this;

  var data = {
    "password":self.config.password,
    "username":self.config.email,
  };
  console.log("AssureLink: logging in");

  self.request('login', 'POST', data, function(body, response) {
    if(typeof callback != "undefined") callback.call();
  })
};

AssureLink.prototype.GarageDoor = function(openClose, AmberDavid) {
  self = this;
  console.log("Assurelink:" + openClose + "ing " + AmberDavid + (AmberDavid.indexOf("'s") ==-1 ? "'s":"") + " door");
  //deviceid: Amber = 201745066, David = 201747916
  var DoorState = openClose == "open" ? 1:0;
  var deviceId = AmberDavid.toLowerCase() == "david" ? "201747916" : "201745066";

  var data = {
    "deviceId":deviceId,
    "attr":"desireddoorstate",
    "value":DoorState
  };

  self.request('setDeviceAttribute', 'POST', data, function(body, response) {
    //console.log("body: %s", body);
  })
};

module.exports = AssureLink;
