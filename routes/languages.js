import {Router} from 'express';

const cwd = process.cwd();

export function _handleInitialRequestFactory(data_provider){//export to test
  return function(request, response){
    response.setHeader("Content-Type", "application/json");
    response.send(data_provider.supportedLanguages);
  };
}

export function  _handleMessagesRequestFactory(data_provider){//export to test
  return function(request, response){
    const lang = request.params.data;
    response.setHeader("Content-Type", "application/json");
    response.send(data_provider(lang));
  };
}11

function LanguageRouterFactory(language_data_provider){
  const router = Router();
  router.get('/', _handleInitialRequestFactory(language_data_provider));
  router.get('/:data', _handleMessagesRequestFactory(language_data_provider));

  return router;
}


export default LanguageRouterFactory;
