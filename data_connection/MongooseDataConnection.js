import mongoose from 'mongoose';
const ObjectId = mongoose.Types.ObjectId;
import log from '../global/utils/logger';
import {createTranslationModel} from './Translation'
import {xor} from '../global/utils/helpers'
import _ from 'underscore'

const NO_OP_PROMISE = Promise.resolve([]);

const special_char_regex = /[^A-Za-z0-9\sÖÜÄöüäß]/;

function _createExposedPromise(){
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {resolve = res; reject = rej;});
  return {
    promise, resolve, reject
  };
}

export function _escapeSpecialCharacters(str){ //export it to test it
  let exec_result;
  let head = "";
  let tail = str;
  const regex = special_char_regex;

  while((exec_result = regex.exec(tail)) !== null){
      let i = exec_result.index;
      head += tail.substring(0,i) + "\\" + tail.charAt(i); // insert escape char \ before the escaped character
      tail = tail.substring(i+1); //the rest of the string is the new tail
  }

  return head+tail;
}

function DataConnectionFactory(mongoose_connection, maximum_item_count=100){
  const Translation = createTranslationModel(mongoose_connection);

  function searchTranslation(search_term){
    const escaped = _escapeSpecialCharacters(search_term);
    const regex = new RegExp(escaped, 'i');
    const promise = Translation.find({'origin.main':regex}).limit(maximum_item_count).exec();
    promise.catch((err)=>{
      log.info(err, "Error while searchig for a translation. Regex: %s", regex);
    });
    return promise;
  }

  function addSingleTranslation(json_data){
      log.info("Attempt to add single translation to database");
      const creationDate = new Date();
      const editDate = new Date();
      const finalData = {...json_data, creationDate, editDate};

      const translation = new Translation(finalData);
      const promise = translation.save().then((result)=>{
        log.info('Added translation %s', result);
        return result;
      });
      promise.catch((err)=>{
        log.info(err);
      });
      return promise;
  }

  function deleteSingleTranslation(translation){
    const has_id  = typeof translation._id !== "undefined" ||
                    typeof translation.id !== "undefined"
    ;
    if(has_id){
      const id = translation._id || translation.id;
      const to_return = Translation.findByIdAndRemove(id).exec().then(
          (deleted)=>{
            log.info("Deleted translation %s", deleted);
            return deleted;
          }
      );
      to_return.catch((err)=>{
        log.info(err, "Error while trying to delete translation %s", translation);
      });
      return to_return;
    }
    else{
        const err = new TypeError("Error while trying to delete a translation: Translation is missing an id");
      log.info(err, translation);
      return Promise.reject(err); // mangoose also returns null, when a  document has not been deleted
    }
  }

  /**
  *
  **/
  function deleteTranslation(data){
    if(data instanceof Array){
      const delete_count  = data.length;
      let complete_count = 0;
      const deleted = [];
      const {promise, resolve, rejected} = _createExposedPromise();
      const onSingleDeleteComplete = function(result){
        complete_count++;
        if(typeof result !== "undefined" && result !== null && !(result instanceof Error)){
          deleted.push(result);
        }
        //Errors are already handled by the deleteSingleTranslation function
        //no else block needed
        if(complete_count === delete_count){
          resolve(deleted);
        }
      };

      for(var i = 0, iLimit = delete_count; i < iLimit; i++){
          const translation = data[i];
          deleteSingleTranslation(translation).then(
              onSingleDeleteComplete
          ).catch(
            onSingleDeleteComplete
          );
      }
      return promise;
    }
    else if (typeof data === "object") {
      try{
        return deleteTranslation([data]);
      }
      catch(err){
          const err = TypeError("Error while deleting a translation. Parameter is invalid")
          log.info(err , data);
          return Promise.reject(err);
      }
    }
    else{
        const err = TypeError("Error while deleting a translation. Parameter is invalid")
        log.info(err , data);
        return Promise.reject(err);
    }
  }

  function updateSingleTranslation(json_data){
    const id = json_data._id || json_data.id;
    const query = {_id : id};
    const promise = Translation.update(query, json_data).exec().then(
        () => {
          const obj = json_data instanceof Translation ?
              json_data.toObject() : json_data;
          return [{...obj, _id: id}]
        }
    );
    promise.then((result)=>{
      log.info('Updated translation %s', result);
    }).catch((err)=>{
      log.info(err);
    });
    return promise;
  }

  function addMultipleTranslations(translations_arr = []){
    const dated = translations_arr.map((translation) => {
        const now = new Date();
        return {
            ...translation, creationDate : now, editDate: now
        };
    });
    const promise = Translation.create(dated);
    promise.catch((err)=>{
      log.info(err);
    });
    return promise.then((results) => {
      return !results ? [] : results;
    });
  }

  function updateMultipleTranslations(translations_arr = []){
    const update_count = translations_arr.length;
    if(update_count > 0){
      let complete_count = 0;
      const results = [];
      const {promise, resolve, reject} = _createExposedPromise();
      const onSingleUpdateComplete = (translation) => function(err, status){
        complete_count++;
        if(err || status.ok !== 1){
          log.info(err, "Failed updating translation: ", translation);
        }
        else{
          results.push(translation);
        }
        if(complete_count === update_count){
          resolve(results);
        }
      };

      for(let i = 0, iLimit = update_count; i < iLimit; i++){
        const translation = translations_arr[i];
        const id = ObjectId(translation._id);
        Translation.update(
          {"_id":id}, {"$set":_.omit(translation, "_id")}
        ).exec(onSingleUpdateComplete(translation));
      }
      return promise;
    }
    //the array of translations was empty
    return NO_OP_PROMISE;
  }

  function updateTranslation(json_data){
    if(json_data instanceof Array){
      const to_update = [];
      const to_add=[];
      const now = new Date(); // performance over accuracy in this case
      json_data.forEach((tr)=>{
        if(tr instanceof Translation){ // make sure we are working with a plain obj
          tr = tr.toObject();
        }
        const id = tr._id || tr.id;
        if(typeof id !== "undefined"){
          let {creationDate, editDate} = tr;
          if(typeof creationDate === "string"){
            creationDate = new Date(creationDate);
          }
          editDate = now;
          to_update.push({...tr, creationDate, editDate:now});
        }
        else{
          const changed = {...tr, creationDate:now, editDate:now};
          to_add.push(tr);
        }
      });

      return {
        add:addMultipleTranslations(to_add) || NO_OP_PROMISE,
        update:updateMultipleTranslations(to_update) || NO_OP_PROMISE
      };
    }
    else if(typeof json_data === "object"){
      const id = json_data._id || json_data.id;
      const has_id = typeof id !== "undefined";
      if(has_id){
        return {add:NO_OP_PROMISE, update:updateSingleTranslation(json_data)};
      }
      else{
        return {add:addSingleTranslation(json_data), update:NO_OP_PROMISE};
      }
    }
    else{
      return {add:NO_OP_PROMISE, update:NO_OP_PROMISE};
    }
  }

  function close(){
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{resolve = res; reject=rej;});

    mongoose_connection.close((err)=>{
      if(err){
        log.info(err);
        reject(err);
      }
      else{
        resolve();
      }
    });

    return promise;
  }

  return {
    close,
    deleteTranslation,
    searchTranslation,
    updateTranslation
  }
}

export default DataConnectionFactory;
