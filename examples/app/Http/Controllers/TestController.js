"use strict";

class TestController {
  constructor(app, logger) {
    app.get('/test', function*(next) {
      this.body = "get";
    });
    app.get('/test/index', function*(next) {
      this.render('index', {
        title: 'react test'
      });
    });
    app.post('/test', function*(next) {
      var params = yield this.req.body();
      this.body = "post" + params.name;
    });

    app.put('/test', function*(next) {
      var params = yield this.req.body();
      this.body = "put" + params.name;
    });

    app.get('/test/:name', function*(next) {
      this.body = "get" + this.params.name;
    });
  }
}

exports = module.exports = TestController;