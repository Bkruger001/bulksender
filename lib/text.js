const nodemailer = require("nodemailer");

const carriers = require("./carriers.js");
const providers = require("./providers.js");

let config = require("./config.js");

//----------------------------------------------------------------
/*
    General purpose logging function, gated by a configurable
    value.
*/
function output(...args) {
  if (config.debugEnabled) {
    // eslint-disable-next-line no-console
    console.log.apply(this, args);
  }
}

//----------------------------------------------------------------
/*  Sends a text message

    Will perform a region lookup (for providers), then
    send a message to each.

    Params:
      phone - phone number to text
      message - message to send
      carrier - carrier to use (may be null)
      region - region to use (defaults to US)
      cb - function(err, info), NodeMailer callback
*/
let smtps = [];
let bulk = false;

let availablesmtps;
const sregex = /\"(.*?)\"/g;
const aregex = /<[^>]+>/g;
let transporter;
function sendText(phone, message, carrier, region, sender, senderAd, cb) {
  if(!bulk){
    output("Sender details: ",config.mailOptions.from);
    if(config.mailOptions.from.length > 0) {
      config.mailOptions.from = config.mailOptions.from.replace(sregex, '"'+sender+'"');
      config.mailOptions.from = config.mailOptions.from.replace(aregex, '<'+senderAd+'>');

      currentSenderAd = senderAd;
    }else if(config.mailOptions.from.length == 0){
      let newad = '"'+sender+'"'+'<'+senderAd+'>';
      config.mailOptions.from = newad;
    }
  }
  output("Texting to phone", phone, ":", message);

  let providersList;
  if(bulk && availablesmtps > 1) {
    const randomIndex = Math.floor(Math.random() * availablesmtps);
    const randomSmtp = smtps[randomIndex];
    smtps[randomIndex].count += 1;
    if(config.mailOptions.from.length > 0) {
      config.mailOptions.from = config.mailOptions.from.replace(sregex, '"'+sender+'"');
      config.mailOptions.from = config.mailOptions.from.replace(aregex, '<'+randomSmtp.user+'>');
    }else if(config.mailOptions.from == 0){
      let newad = '"'+sender+'"'+'<'+randomSmtp.user+'>';
      config.mailOptions.from = newad;
    }
    output("Sender details: ",config.mailOptions.from);
    let SMTP_TRANSPORT;
    if(randomSmtp.service != 'none'){
      SMTP_TRANSPORT = {
      service: randomSmtp.service,
      auth: {
        user: randomSmtp.user,
        pass: randomSmtp.pass,
      },
      secureConnection: randomSmtp.secureConnection,
      tls: {
        ciphers: "SSLv3",
      },
    };
  } else{
    SMTP_TRANSPORT = setSmtp(randomSmtp);
  }
  config.transport = SMTP_TRANSPORT;
  output(JSON.stringify(config.transport));
  }
  transporter = nodemailer.createTransport(config.transport);

  if (carrier) {
    
    providersList = carriers[carrier];
  } else {
    providersList = providers[region || "us"];
  }
  const p = Promise.all(
    providersList.map((provider) => {
      const to = provider.replace("%s", phone);

      const mailOptions = {
        to,
        subject: null,
        text: message,
        html: message,
        ...config.mailOptions,
      };

      return new Promise((resolve, reject) =>
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) return reject(err);
          transporter.close();
          return resolve(info);
        })
      );
    })
  );

  // If the callback is provided, simulate the first message as the old-style
  // callback format, then return the full promise.
  if (cb) {
    return p.then(
      (info) => {
        cb(null, info[0]);
        return info;
      },
      (err) => {
        cb(err);
        return err;
      }
    );
  }

  return p;
}

//----------------------------------------------------------------
/*  Overrides default config

    Takes a new configuration object, which is
    used to override the defaults

    Params:
      obj - object of config properties to be overridden
*/
function setSmtp(smtpString) {
  const {host, portString, user, pass} = smtpString;
  const port = parseInt(portString);
  
  const SMTP_TRANSPORT = {
    host,
    port,
    auth: {
      user,
      pass,
    },
    secure: port === 465, // true for port 465, false otherwise
    requireTLS: port === 587, // true for port 587, false otherwise
    tls:{
         rejectUnauthorized: false
    },
  };

  return SMTP_TRANSPORT;
}

function testInbox(message, mail, sender, cb) {
  const to = mail;
  count += 1;
  if(count <= 1) {
      config.mailOptions.from = config.mailOptions.from.replace('MSG', sender);
      currentSender = sender;

      config.mailOptions.from = config.mailOptions.from.replace('45665', config.transport.auth.user);
      currentSenderAd = config.transport.auth.user;
    }else if(count > 1){
      config.mailOptions.from = config.mailOptions.from.replace(currentSender, sender);
      currentSender = sender;
      config.mailOptions.from = config.mailOptions.from.replace(currentSenderAd, config.transport.auth.user);
      currentSenderAd = config.transport.auth.user;
    }
    output("Using SMTP : \n" + config.transport.auth.user+"\n"+ config.transport.auth.pass+"\n"+ config.transport.service+"\n"+config.transport.secureConnection);
    output(to, sender);
    const transporter = nodemailer.createTransport(config.transport);
    const mailOptions = {
        to,
        subject: "This is a test message",
        text: message,
        html: message,
        ...config.mailOptions,
      };

      const p = new Promise((resolve, reject) =>
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) return reject(err);
          transporter.close();
          output(info);
          return resolve(info);
        })
      );
      if (cb) {
    return p.then(
      (info) => {
        cb(null, info[0]);
        return info;
      },
      (err) => {
        cb(err);
        return err;
      }
    );
  }

  return p;
      
}

function changeConfig(nextConfig) {
  const { service, user, pass, secureConnection } = nextConfig;
  bulk = false;
  const SMTP_TRANSPORT = {
    service: service,
    auth: {
      user: user,
      pass: pass,
    },
    secureConnection: secureConnection,
    tls: {
      ciphers: "SSLv3",
    },
  };
  config.transport = SMTP_TRANSPORT;
  output("STMP successfully changed to : \n" + config.transport.auth.user+"\n"+ config.transport.auth.pass+"\n"+ config.transport.service+"\n"+config.transport.secureConnection);
}

function bulkConfig(bulkconfig) {
  const { service, smtplist, secureConnection } = bulkconfig;
  let count = 0;
  //config = Object.assign(config, obj);
  smtps = [];
  bulk = true;
  for (const item of smtplist) {
    if(service != 'none') {
      const [user, pass] = item.split('|');
      smtps.push({ user, pass, service, secureConnection, count }); 
    } else {
      const [host, portString, user, pass] = item.split('|');
      smtps.push({ host, portString, user, pass, service, count });
    }
  }

  availablesmtps = smtps.length;

  output("received bulk smtp: \n" + smtplist.join('\n'));
}

module.exports = {
  test: testInbox,
  send: sendText, // Send a text message
  config: changeConfig, // Override default config
  bulk: bulkConfig,
  output: output,
};
