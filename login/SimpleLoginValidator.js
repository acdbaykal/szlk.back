import {sha256 as sha} from 'js-sha256'

const USER = 'test';
const PASS = sha('test');

export default ((user, pass)=>{
  if(user === USER && pass === PASS){
    return Promise.resolve({user, pass});
  }else{
    return Promise.reject();
  }
});
