var React = require('react');

var index = React.createClass({
  propTypes: {
    title: React.PropTypes.string
  },

  render: function() {
    return (
      <html>
        <head>
          <meta charset="utf-8" />
          <title>{this.props.title}</title>
          <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
          <meta name="description" content="" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
        </head>
        <body>
          <div id="app">APPLICATION CONTENT</div>
          <script type="text/javascript" src="/static/app.js"></script>
        </body>
      </html>
    );
  }
});

module.exports = index;