var QRCode = require('qrcode');

QRCode.toDataURL('Hello')
  .then(url => {
    console.log(url);
  }).catch(err => {
    console.log(err);
  });