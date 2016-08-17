import {expect, createSpy} from '../../global/utils/chai';
import { _handleSearchRequestFactory,
          _handleUpdateRequestFactory,
          _handleDeleteRequestFactory
        } from "../translations";
import httpMocks from 'node-mocks-http'

describe('Routes::/translation/*', function(){

  const createOKSpy = ()=>{
    return createSpy(function(json_data){
      return Promise.resolve();
    });
  };

  const createFailingSpy  = ()=>{
    return createSpy(function(json_data){
      return Promise.reject();
    });
  };

  const ok_mock_data_connection = {
    deleteTranslation:createOKSpy(),
    searchTranslation:createOKSpy(),
    updateTranslation:createOKSpy()
  };
  const  failing_mock_data_connection = {
    deleteTranslation:createFailingSpy(),
    searchTranslation:createFailingSpy(),
    updateTranslation:createFailingSpy()
  };

  beforeEach(function(){
    for(let fname in ok_mock_data_connection){
      ok_mock_data_connection[fname].reset();
    }

    for(let fname in failing_mock_data_connection){
      failing_mock_data_connection[fname].reset();
    }
  });

  const TestStub =  function(handlerFactory){//the currying maps the structure of the tests
    const req= httpMocks.createRequest({
      method: "GET",
      url: '/translations/search_term',
      params:{
        data:{}
      }
    });
    return function(related_function){
      return function(result){
        const resp = httpMocks.createResponse();
        return result === "ok" ?
          function(done){
            const data_connection = ok_mock_data_connection;
            handlerFactory(data_connection)(req, resp).then(()=>{
              expect(data_connection[related_function]).to.have.been.called.once;
              expect(resp.statusCode).to.be.equal(200);
              done();
            }).catch(()=>{
              throw ("Should not have failed");
            });

          } :
          function(done){
            const data_connection = failing_mock_data_connection;
            handlerFactory(data_connection)(req, resp).then(()=>{
              expect(data_connection[related_function]).to.have.been.called.once;
              expect(resp.statusCode).to.be.above(499);
              done();
            });
          }
      }
    }

  }

  describe("_handleDeleteRequestFactory()()", function(){
    describe("should call the deleteTranslation function", function(){
      const test_stub = (
        TestStub(_handleDeleteRequestFactory)("deleteTranslation")
      );
      describe("and send OK", function(){
        it("if the deleteTranslation call succeeds", test_stub("ok"))
      })

      describe("and fail", function(){
        it("if the deleteTranslation call fails", test_stub("fail"))
      })

    })
  })

  describe("_handleSearchRequestFactory()()", function(){
    describe("should call the searchTranslation function", function(){
      const test_stub = (
        TestStub(_handleSearchRequestFactory)("searchTranslation")
      );
      describe("and send OK", function(){
        it("if the searchTranslation call succeeds", test_stub("ok"))
      })

      describe("and fail", function(){
        it("if the deleteTranslation call fails", test_stub("fail"))
      })

    })
  })

  describe("_handleUpdateRequestFactory()()", function(){
    describe("should call the updateTranslation function", function(){
      const test_stub = (
        TestStub(_handleUpdateRequestFactory)("updateTranslation")
      );
      describe("and send OK", function(){
        it("if the updateTranslation call succeeds", test_stub("ok"))
      })

      describe("and fail", function(){
        it("if the deleteTranslation call fails", test_stub("fail"))
      })
    })
  })
})
