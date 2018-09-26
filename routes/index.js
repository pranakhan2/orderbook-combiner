const fs = require('fs');
const path = require('path');

module.exports = (app) => {
  fs.readdirSync('routes/api').forEach((file) => {
    let fileName = `./api/${file.substr(0, file.indexOf('.'))}`;
    console.log(`Loading route module: ${fileName}...`);
    require(fileName)(app);
  });

}