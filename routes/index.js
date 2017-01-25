var express = require('express');
var passport = require('passport');
var router = express.Router();
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var pg = require('pg');
var alert_message;

var env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:5000/callback'
};

router.get('/login',
  function(req, res){
    if(req.user){
    res.render('notFound', {user:req.user});
    } else {
      if(req.session.returnTo) {
        alert_message = 'You need to login before you can access!'
      }
      res.render('login', {env: env, title: 'Login', message: alert_message});
   }
});

router.get('/callback',
  passport.authenticate('auth0', {
    failureRedirect: '/logout'
  }),
  function(req, res) {
    res.redirect(req.session.returnTo || '/transfer');
});

router.get('*', function (req, res, next) {
  alert_message = null;
  req.session.returnTo = null;
  next();
});

router.get('/', function(request, response){
  response.render('home', {user: request.user, env: env});
});


router.get('/transfer', ensureLoggedIn, function(request, response) {
  pg.connect(process.env.PEDRO_db_URL, function (err, client, done) {
    client.query("PREPARE account_table(TEXT) AS \
     SELECT * FROM account WHERE email = $1;\
      EXECUTE account_table('" + request.user.emails[0].value + "');\
      DEALLOCATE PREPARE account_table", function(err, result){
      done();
      if(err) {
        console.error(err); response.send("Error " + err);
      }else{
        //console.log(request.user);
        response.render('transfer', {user: request.user, title: 'Transfer', budget: result.rows[0].budget, data: result.rows});
      }
    });
  });
});


router.get('/test', function(req, res) {
  res.render('module', {
    recipient : 'Visal Sao',
    amount : 30
  });
});


router.get('/db', ensureLoggedIn, function (request, response) {
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
    client.query('SELECT * FROM account', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.render('db', {columns: result.fields, results: result.rows}); }
    });
  });
});

router.get('/history', ensureLoggedIn,function(request, response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("PREPARE history_query1 (TEXT) AS\
    SELECT * FROM transfer_logs WHERE sender = $1;\
    EXECUTE history_query1 ('"+ request.user.emails[0].value +"');\
    DEALLOCATE PREPARE history_query1", function(err1, result1) {
      done();
      if(err1){
        console.error(err1); 
        response.send("Error " + err1);
      } else {
        client.query("PREPARE history_query2 (TEXT) AS\
        SELECT * FROM exchange_list WHERE email = $1;\
        EXECUTE history_query2 ('"+ request.user.emails[0].value +"');\
        DEALLOCATE PREPARE history_query2", function(err2, result2) {
          done();
          if(err2) {
            console.error(err2);
            response.send("Error " + err2);
          } else {
            client.query("SELECT * FROM account WHERE email = ('" + request.user.emails[0].value + "')", function(err3, result3){
              done();
              if(err3){
                console.error(err3); 
                response.send("Error " + err3);
              }else{
                response.render('history', {columns1: result1.fields, data1: result1.rows, columns2: result2.fields, data2: result2.rows, user:request.user, data: result3.rows});
              }
            });
          }
        });
      }
    });
  });
});

router.get('/exchanging_system', function(req,res){
    res.render('exchanging_system');
});

router.get('/about_us', function(req,res){
  res.render('about_us', {user: req.user, env: env});
});

router.get('/exchange', ensureLoggedIn, function(request,response){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
    client.query("PREPARE account_table(TEXT) AS \
     SELECT * FROM account WHERE email = $1;\
      EXECUTE account_table('" + request.user.emails[0].value + "');\
      DEALLOCATE PREPARE account_table", function(err, result){
      done();
      if(err){
        console.error(err);
      }else{
        response.render('exchange', {user: request.user, data: result.rows});
      }
    });
  });
});

router.post('/exchange_approving', function(req,res){
  var exchangeLog = {
    timeCreated: Date.now(),
    person: req.user._json.name,
    email: req.user._json.email,
    type: req.body.exchangeType,
    amount: req.body.amount ,
    result: req.body.result,
    reason: req.body.reason,
    re: null,
    approved: null,
    timeApproved: null,
    exchanged: null,
    timeExchanged:null      
  }

  var query = "PREPARE newExchange (TEXT, numeric, numeric, TEXT) AS \
  INSERT INTO exchange_list (timeCreated, person, email, type, amount, result, reason)\
  VALUES (CURRENT_TIMESTAMP(2), '" + exchangeLog.person +"', '" + exchangeLog.email +"',\
  $1, $2::float8::numeric::money, $3::float8::numeric::money, $4);\
  EXECUTE newExchange('"+ exchangeLog.type+"', '"+ exchangeLog.amount+"', '"+ exchangeLog.result+"', '"+ exchangeLog.reason+"'); \
  DEALLOCATE PREPARE newExchange;"

  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
    client.query(query, function(err, result) {
      done();
      if(err) {
        console.log(err);
      } else {
        client.query("SELECT * FROM account WHERE email = ('" + req.user.emails[0].value + "')", function(err, result1){
          done();
          if(err){
            console.log('Error: ' + err);
          }else{
            res.render('exchange_approving',   {user: req.user, data: result1.rows});
          }
        });
      }
    })
  });
});

router.post('/exchange_list/approve/:id',function(req, res, next) {
  var exchangeReq_id = req.params.id;
  if(exchangeReq_id === undefined){
    //console.log(exchangeReq_id)
    res.redirect('/exchange_list');
  }
  var status = req.body.status;
  var re = req.user._json.given_name;

  var query = "UPDATE exchange_list SET re = '"+ re +"', approved = '"+ status +"', timeapproved = CURRENT_TIMESTAMP(2) \
  WHERE id = '"+ exchangeReq_id +"';"

  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
    client.query(query, function(err, result){
      if (err) {
        console.log(err)
      } else {
        res.redirect('/exchange_list')
      }
    })
  })
});
  
router.get('/exchange_list', function(req,res){
  var email = req.user.emails[0].value;
  var userName = req.user._json.name;
  var exchangeListQuery = "SELECT * FROM exchange_list \
  ORDER BY timecreated DESC;";
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done){
    client.query("SELECT * FROM account WHERE email = '"+ email+"'", function(err, result) {
      if(err){
        console.error(err); 
        res.send("Error " + err);
      }else{
        if(result.rows[0].role == 're'){
          client.query(exchangeListQuery, function(err2, result2) {
            done();
            if (err2) {
              console.log(err2)
            } else {
              res.render('exchange_list', {requestRow: result2.rows, requestCol: result2.fields,  user: req.user, data: result.rows});
            }
          })
        } else {
          res.render('notFound');
        }
      }
    });
  })
});

router.get('/settings', ensureLoggedIn, function(req, res){
  pg.connect(process.env.PEDRO_db_URL, function(err, client, done) {
    client.query("PREPARE account_table(TEXT) AS \
     SELECT * FROM account WHERE email = $1;\
      EXECUTE account_table('" + req.user.emails[0].value + "');\
      DEALLOCATE PREPARE account_table", function(err, result){
      done();
      if(err){
        console.error(err);
      }else{
        res.render('settings', {user: req.user, data: result.rows});
      }
    });
  });
});

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

router.get('/transfer_success', function(req, res){
  res.render('transfer_success');
});

router.post('/transfer_confirmation', function(req, res) {
    pg.connect(process.env.PEDRO_db_URL, function (err,client,done) {
      client.query("SELECT budget FROM account where email = '" + req.user.emails[0].value + "'", function(err,result) { 
        done();
        if (err)
          { 
            console.error(err); res.send("Error" + err); 
          }
        else 
        { 
          res.render('transfer_confirmation', {budget: result.rows, recipient: req.body.recipient, amount: req.body.amount}); 
        }
      })
    }) 
});

router.post('/transfer_success', function(req, res) {
  pg.connect(process.env.PEDRO_db_URL, function (err,client, done) { 
    client.query("SELECT budget FROM account where email = '" + req.user.emails[0].value + "'", function(err,result) { 
      done();
      if (err) { 
        console.error(err); res.send("Error" + err); 
      } else {
        var sender_new_budget = result.rows[0].budget - req.body.amount; 
        client.query("PREPARE update_account_sender(DECIMAL) AS\
          UPDATE account SET budget = $1\
          WHERE email = '" + req.user.emails[0].value + "';\
          EXECUTE update_account_sender(" + sender_new_budget + ");\
          DEALLOCATE PREPARE update_account_sender", function(err,result) { 
          done();
          if (err){ 
            console.error(err); res.send("Error" + err); 
          }else { 
            client.query("select * from account where email = '" + req.body.recipient + "'", function(err2,result2) {
              done();
              if (err2) { 
                  console.error(err2); res.send("Error" + err2); 
              } else {
                var recipient_new_budget = parseInt(result2.rows[0].budget) + parseInt(req.body.amount);
                console.log("add these: " + req.body.amount, result2.rows[0].budget);
                console.log("equals: " + recipient_new_budget);
                console.log("recip email: " + req.body.recipient);

                client.query("PREPARE update_account_recipient(DECIMAL) AS\
                  UPDATE account SET budget = $1 \
                  WHERE email = '" + req.body.recipient + "';\
                  EXECUTE update_account_recipient(" + recipient_new_budget + ");", function (err3,result3) {
                  done();
                  if (err3){ 
                     console.error(err3); res.send("Error" + err); 
                  }else {
                    client.query("PREPARE insert_account(numeric(100,2), TEXT, TEXT, TEXT, TIMESTAMP) AS\
                      INSERT INTO transfer_logs (amount, sender, recipient, sender_resulting_budget, recipient_resulting_budget, date) \
                      VALUES ($1, $2, $3, $4, $5);\
                      EXECUTE insert_account(" + req.body.amount + ", '" + req.user.emails[0].value + "', '" + req.body.recipient + "', \
                      '" + sender_new_budget + "', '" + recipient_new_budget + "', CURRENT_TIMESTAMP(0)); DEALOLCATE PREPARE insert_account", function(err,result) { 
                        done(); {
                        if (err3){ 
                          console.error(err3); res.send("Error" + err3); 
                        }else{
                          res.render('transfer_success', {recipient: req.body.recipient, amount: req.body.amount});
                        }
                        };
                    });                       
                  }
                });
              }
            });
          }
        });
      }
    });
  });
});

router.post('/exchange_confirmation', function(req, res) {
  res.render('exchange_confirmation', {amount: req.body.amount, result: req.body.result, reason: req.body.reason});
});


router.post('/exchange_confirmation', function(req, res) {
  res.render('exchange_confirmation', {amount: req.body.amount, result: req.body.result, reason: req.body.reason});
});

router.get('/transfer-test', function (request, response) {
  response.render('transfer-test');
});
router.post('/db', function(request, response){
  var text = request.body.transfer;

  response.render('db', {transfer:text});
});

module.exports = router;