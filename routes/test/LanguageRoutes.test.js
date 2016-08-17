import {expect} from '../../global/utils/chai';
import { _handleInitialRequestFactory,
          _handleMessagesRequestFactory
        } from "../languages";
import LanguageDataProvider from './LanguageDataProvider'
import httpMocks from 'node-mocks-http'

describe("Routes::/languages/*", function(){
  const handleInitialRequest = _handleInitialRequestFactory(LanguageDataProvider);
  const handleMessagesRequest =_handleMessagesRequestFactory(LanguageDataProvider);

  describe("handleInitialRequestFactory", function(){
    it("should return a function expecting two argumenst", function(){
      expect(handleInitialRequest).to.be.a("function");
      expect(handleInitialRequest.length).to.equal(2);
    })
    it("the returned function should send a JSON Object", function(){
      const req= httpMocks.createRequest({
        method: "GET",
        url: '/languages/'
      });
      const resp = httpMocks.createResponse();

      handleInitialRequest(req, resp);
      expect(resp.statusCode).to.be.equal(200);
      expect(resp._isJSON()).to.be.true;
      const data = resp._getData();
      expect(data.hasOwnProperty("en")).to.be.true;
    })
  })

  describe("handleMessagesRequestFactory", function(){
    it("should return a function expecting two argumenst", function(){
      expect(handleMessagesRequest).to.be.a("function");
      expect(handleMessagesRequest.length).to.equal(2);
    })
    it("the returned function should send a JSON Object", function(){
      const req= httpMocks.createRequest({
        method: "GET",
        url: '/languages/',
        params:{
          data:"en"
        }
      });
      const resp = httpMocks.createResponse();

      handleMessagesRequest(req, resp);
      expect(resp.statusCode).to.be.equal(200);
      expect(resp._isJSON()).to.be.true;
      const data = resp._getData();
      expect(data.hasOwnProperty("app.lang.english")).to.be.true;
    })
  })
})
