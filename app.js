import express from 'express'
import path from 'path'
import favicon from 'serve-favicon'
import logger from 'morgan'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import routes from './routes/index'
import translations from './routes/translations'
import LanguageDataProvider from 'szlk.messages'
import languages from './routes/languages'
import login from './routes/login'
import DataConnectionFactory from './data_connection/MongooseDataConnection'
import validateLogin from './login/SimpleLoginValidator.js';
import {readFileSync} from 'fs'
import mongoose from 'mongoose'
import mongoSanitize from 'express-mongo-sanitize'

const cwd = process.cwd();
const app = express();
const env = app.get('env');
const is_dev = env === 'development';
const translation_route_root = '/translations/';
const languages_route_root = '/languages/';
const login_route_root = '/login';

if(is_dev){
  console.log("RUNNING IN DEVELOPMENT MODE");
}

// Use native promises
mongoose.Promise = global.Promise;

function initDataConnection(){
  const db_config = (()=>{
    const json_str = readFileSync(path.resolve(cwd, './data/dev_connection.json'));
    return JSON.parse(json_str);
  })();
  const db_connection = mongoose.createConnection();
  const {uri} = db_config;
  console.log("Connecting to  database " + uri);
  db_connection.open(uri);
  db_connection.on('connected', ()=>{console.log(`Connected to database ${uri}`);});
  return DataConnectionFactory(db_connection, 100);
}

function initTemplateEngine(){
  // view engine setup
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
}

function addMiddleware(){
  // uncomment after placing your favicon in /public
  //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
  if(is_dev) app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(translation_route_root, mongoSanitize());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));
}

function setupRoutes(data_connection){
  app.use('/', routes);
  app.use(translation_route_root, translations(data_connection, validateLogin));
  app.use(languages_route_root, languages(LanguageDataProvider));
  app.use(login_route_root, login(validateLogin));
}

function setupErrorHandling(){
  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handlers

  // development error handler
  // will print stacktrace
  if (is_dev) {
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }
  else{
    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
        message: err.message,
        error: {}
      });
    });
  }
}

function prepareExit(data_connection){
  function onExit(){
    console.log('Closing data connection');
    data_connection.close().catch((err)=>{
      console.log('Could not close db conection before shutdown: ' + err.toSring());
    });
  }

  function onExitSignal(){
    process.exit();
  }
  process.on('exit', onExit);
  process.on('uncaughtException', onExit);
  process.on('unhandledRejection', onExit);
  process.on('SIGTERM', onExitSignal);
  process.on('SIGINT', onExitSignal);
  process.once('SIGUSR2', onExitSignal);
}

const data_connection  = initDataConnection();
initTemplateEngine();
addMiddleware();
setupRoutes(data_connection);
setupErrorHandling();
prepareExit(data_connection);
module.exports = app;
