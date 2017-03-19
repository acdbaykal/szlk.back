import {Router} from 'express';

export function _handleLoginRequestFactory(validateLogin){
  return (req, res)=>{
    const data = req.body;
    const {user, pass} = data;
    return validateLogin(user, pass).then((result)=>{
      res.status(200).send(result);
    }).catch(()=>{
      res.status(500).send({user, pass});
    });
  }
}

function TranslationRouterFactory(validateLogin){
  const router = Router();
  router.post('/', _handleLoginRequestFactory(validateLogin));

  return router;
}


export default TranslationRouterFactory;
