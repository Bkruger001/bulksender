const SENDMAIL_TRANSPORT = {
  // This transport uses the local sendmail installation.
  sendmail: true,
};

const SMTP_TRANSPORT = {
  service: "",
  auth: {
    user: "", //"noreply@securemessages.org"
    pass: "",
  },
  secureConnection: "true",
  tls: {
    ciphers: "SSLv3",
  },
};
module.exports = {
  transport: SMTP_TRANSPORT,
  mailOptions: {
    from: '"MSG" <45665>',
    priority: 'high',
  },
  debugEnabled: true,
};
