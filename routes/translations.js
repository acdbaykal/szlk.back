import {Router} from 'express';
import log from '../global/utils/logger';

export function _handleDeleteRequestFactory(data_connection, validateLogin){
  return (req, res, next)=>{
    const data = req.body || req.params.data;
    const {user, pass, translations} = data;
    const login_promise = validateLogin(user, pass);
    login_promise.catch(()=>{ res.status(505).send("Login failed")});
    login_promise.then(
      () => data_connection.deleteTranslation(translations)
    ).then((result)=>{
      res.status(200).send(result);
    });
  }
}

export function  _handleSearchRequestFactory(data_connection) {
  return (req, res, next)=>{
    const data = req.params.data;
    return data_connection.searchTranslation(data).then((result)=>{
      res.status(200).send(result);
    }).catch(()=>{res.status(505).send([]);});
  }
}

export function _handleUpdateRequestFactory(data_connection, validateLogin){
  return (request, response, next) => {
    const data = request.body;
    const {user, pass, translations} = data;
    const main_promise = validateLogin(user, pass).then(() => {
      //we are pushing the results of the update into an array, and send back
      //whichever update operations succeed
      const update_result = data_connection.updateTranslation(translations);
      const {add, update} = update_result;
      const resolved = []; //we push added and updated tranlations into this array
      let add_complete = false; //adding translations complete?
      let update_complete = false;//updating translations complete?
      const arr_push = Array.prototype.push;
      //we will return a promise, which resolves when update and add operations
      //both completed
      let resolve;
      const promise = new Promise((res) => {resolve = res.bind(this);});
      const sendResult = function(){
        if(add_complete && update_complete){
          response.status(200).send(resolved);
          resolve(resolved);
        }
      }

      add.then((result)=>{
        add_complete = true;
        arr_push.apply(resolved, result);
        sendResult();
      }).catch(() => {
        add_complete = true;
        sendResult();
      });

      update.then((result)=>{
        update_complete = true;
        arr_push.apply(resolved, result);
        sendResult();
      }).catch(()=>{
        update_complete = true;
        sendResult();
      });

      return promise;
    });
    main_promise.catch((err)=>{
      log.info(err);
      response.status(505).send([]);
    });
    return main_promise;
  }
}

function TranslationRouterFactory(data_connection, validateLogin){
  const router = Router();
  router.get('/:data', _handleSearchRequestFactory(data_connection));
  router.post('/', _handleUpdateRequestFactory(data_connection, validateLogin));
  router.delete('/', _handleDeleteRequestFactory(data_connection, validateLogin));
  return router;
}


export default TranslationRouterFactory;
