import {Router} from 'express';

const cwd = process.cwd();

export function _handleDeleteRequestFactory(data_connection){
  return (req, res, next)=>{
    const data = req.params.data;
    return data_connection.deleteTranslation(data).then((result)=>{
      res.status(200).send(result);
    }).catch(()=>{ res.status(505).send([])});
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

export function _handleUpdateRequestFactory(data_connection){
  return (req, res, next)=>{
    const data = req.params.data;
    return data_connection.updateTranslation(data).then((result)=>{
      res.status(200).send(result);
    }).catch(()=>{res.status(505).send([]);});
  }
}

function TranslationRouterFactory(data_connection){
  const router = Router();
  router.get('/:data', _handleSearchRequestFactory(data_connection));
  router.post('/:data', _handleUpdateRequestFactory(data_connection));
  router.delete('/:data', _handleDeleteRequestFactory(data_connection));

  return router;
}


export default TranslationRouterFactory;
