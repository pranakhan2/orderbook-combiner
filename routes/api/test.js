
module.exports = (app) => {
  // a little test call to make sure the local proxy worked
  app.get('/api/test', (req, res) => {
    res.json('Success!');
    console.log('/api/test called.');
  });
}