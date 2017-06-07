var useFake      = false;
var express      = require('express');
var app          = express();
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var passport     = require('passport');
//var fn = require('fn');

<<<<<<< HEAD
var hbs = exphbs.create({
  defaultLayout: 'main',
  // Specify helpers which are only registered on this instance.
  helpers: {
    ifCond: function(v1, v2, options) {
      if (v1 == v2) {
        return options.fn(this);
      } 
      return options.inverse(this);
    },

    forCond: function(x, y, z){

      for(var i = 1; i < x; i++){
        if (z[i] == y) {
          return options.fn(this);
        } 
        return options.inverse(this)
      }
    },

    finding: function(arr, val, options){
      
      if(arr){
        for (var i = 0; i < arr.length; i++) {
          if(arr[i] == val){
            return options.fn(this);
          }
        }  
      }
      return options.inverse(this);
    },

//select array_upper ( column_name, 1 ) from table_name_here;
    ifCondA: function(v1, operator, v2, options){
      switch (operator) {
        case '==':
              return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
      }
    },
    upperCase: function(options) {
      return options.fn(this).toUpperCase();
    },
    
    dateFormat: function(date) {
      if (date == null) {
        return;
      }
      var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
      var offset = date.getTimezoneOffset() / 60;
      var hours = date.getHours();
      newDate.setHours(hours - offset);

      var seconds = Math.floor((new Date() - newDate) / 1000);

      var interval = Math.floor(seconds / 86400); //1 day equal 86400
      function pad(s) {
        return (s < 10) ? '0' + s : s;
      } //change the 1 digit number to 2 digit numbers like 1 --> 01
      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      if (interval >= 2) { //more than two days
        return [pad(newDate.getDate()), monthNames[newDate.getMonth()]+',', newDate.getFullYear()].join(' '); //date format seperated by .
      }
      

      function plural(number, text) {
        if (number == 1) {
          return number + ' ' + text + ' ago';
        } else {
          return number + ' ' + text + 's ago';
        }
      }

      if (interval < 0) {
        return [pad(newDate.getDate()), monthNames[newDate.getMonth()]+',', newDate.getFullYear()].join(' '); //date format seperated by .
      }

      if (interval >= 1) {
        return plural(interval, 'day')
      }
      interval = Math.floor(seconds / 3600); //1 hour equal 3600
      if (interval >= 1) {
        return plural(interval, 'hour')
      }
      interval = Math.floor(seconds / 60); //1 minutes equal 60
      if (interval >= 1) {
        return plural(interval, 'minute')
      }
      return plural(Math.floor(seconds), "second");
    }
  }
});
=======
var hbs = require('./lib/handlebar-helpers')
>>>>>>> 4f4655933dba1a7c64d8d41af12c1f09d9bdd8bf

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('port', (process.env.PORT || 5000));


var fake_account = require('./fake')
var routes       = require('./routes/index');

if(useFake){
  app.use(fake_account);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(session({
  secret: 'shhhhhhhhh',
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(require('./lib/oauth2'));


app.use('/', routes);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.use(express.static('public/'));

app.use(function(req, res) {
  res.status(400);
  res.render('notFound', {
    user: req.user
  })
})

