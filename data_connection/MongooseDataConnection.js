import mongoose from 'mongoose';
import log from '../global/utils/logger';
import {createTranslationModel} from './Translation'
import {xor} from '../global/utils/helpers'

const NO_OP_PROMISE = Promise.resolve([]);

const special_char_regex = /[^A-Za-z0-9\sÖÜÄöüäß]/;

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
      const translation = new Translation(json_data);
      const promise = translation.save();
      promise.then((result)=>{
        log.info('Added translation %s', result);
      }).catch((err)=>{
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
      const to_return = Translation.findByIdAndRemove(id).exec();
      to_return.then((deleted)=>{
        log.info("Deleted translation %s", deleted);
      }).catch((err)=>{
        log.info(err, "Error while trying to delete translation %s", translation);
      })
      return to_return;
    }
    else{
      log.info(new TypeError("Error while trying to delete a translation: Translation is missing an id"), translation);
      return Promise.resolve(null); // mangoose also returns null, when a  document has not been deleted
    }
  }

  function deleteTranslation(data){
    if(data instanceof Array){
      const promisses = [];
      data.forEach((x) => {
        promisses.push(deleteSingleTranslation(x));
      });
      return Promise.all(promisses).then((delete_result)=>{
        return delete_result.filter(x => x !== null);
      });
    }
    else if (typeof data === "object") {
      return deleteTranslation([data]);
    }
    else{
      log.info(TypeError("Error while deleting a translation. Parameter is invalid"), data);
      return NO_OP_PROMISE;
    }
  }

  function updateSingleTranslation(json_data){
    const query = {_id :json_data.id};
    const promise = Translation.update(query, json_data).exec().then(()=>{
      return [json_data];
    });
    promise.then((result)=>{
      log.info('Updated translation %s', result);
    }).catch((err)=>{
      log.info(err);
    });
    return promise;
  }

  function addMultipleTranslations(translations_arr){
    const promise = Translation.create(translations_arr);
    promise.catch((err)=>{
      log.info(err);
    });
    return promise;
  }

  function updateMultipleTranslations(translations_arr, ids){
    if(typeof ids === "undefined"){
      ids = translations_arr.map((tr)=>{
        return tr.id;
      });
    }

    const promise = Translation.update( {id : {"$in":ids}}, {active:false} , {multi: true}).exec().then(
      ()=>{return translations_arr;}
    );
    promise.catch((err)=>{
      log.info(err);
    });
    return promise;
  }

  function updateTranslation(json_data){
    let result;
    if(json_data instanceof Array){
      const update_ids = [];
      const to_update = [];
      const to_add=[];
      const now = new Date(); // performance over accuracy in this case
      json_data.forEach((tr)=>{
        if(tr instanceof Translation){ // make shure we are working with a plain obj
          tr = tr.toObject();
        }
        const {_id:id} = tr;
        if(typeof id !== "undefined"){
          let {creationDate, editDate} = tr;
          if(typeof creationDate === "string"){
            creationDate = new Date(creationDate);
          }
          editDate = now;
          to_update.push({...tr, creationDate, editDate});
        }
        else{
          const changed = {...tr, creationDate:now, editDate:now};
          to_add.push(tr);
        }
      });
      return {
        add:addMultipleTranslations(to_add),
        update:updateMultipleTranslations(to_update, update_ids)
      };
    }
    else if(typeof json_data === "object"){
      const has_id = typeof json_data._id !== "undefined";
      if(has_id){
        return {add:NO_OP_PROMISE, update:updateSingleTranslation(json_data)};
      }
      else{
        return {add:addSingleTranslation(json_data), update:NO_OP_PROMISE};
      }
    }
    else{
      logger.info(new TypeError());
      return {add:NO_OP_PROMISE,update:NO_OP_PROMISE};
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
