const SENDMAIL_TRANSPORT = {
  // This transport uses the local sendmail installation.
  sendmail: true,
};

const SMTP_TRANSPORT = {
  service: "Outlook365",
  auth: {
    user: "zS20013891@estudiantes.uv.mx", //"noreply@securemessages.org"
    pass: "Inolvidable7",
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
  },
  debugEnabled: true,
};
