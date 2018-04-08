var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var mongoose = require('mongoose');
var app = express();
var indexRouter = require('./routes/index');
var historyRouter = require('./routes/history');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/h', historyRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;

  res.status(err.status || 500);
  res.render('error');
});

mongoose.connect('mongodb://localhost:27017/binance');
var db = mongoose.connection;

db.on('error', function(){
    console.log('Mongodb connection failed.');
});

db.once('open', function() {
    console.log('Mongodb connected.');
});

module.exports = app;
