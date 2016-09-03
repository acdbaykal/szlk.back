import {expect, createSpy} from '../../global/utils/chai';
import { _handleSearchRequestFactory,
          _handleUpdateRequestFactory,
          _handleDeleteRequestFactory
        } from "../translations";
import httpMocks from 'node-mocks-http';

describe('Routes::/translation/*', function(){

  const validateLoginSucessfully = createSpy((user, pass) => {
    return Promise.resolve(user, pass);
  });

  const validateLoginFailing = createSpy(() => {
    return Promise.reject(new Error("Mocked Login Error"));
  });

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
    updateTranslation:createSpy(()=>{
      return {add:Promise.resolve([]), update:Promise.resolve([])}
    })
  };
  const  failing_mock_data_connection = {
    deleteTranslation:createFailingSpy(),
    searchTranslation:createFailingSpy(),
    updateTranslation:createSpy(()=>{
      return {add:Promise.reject(), update:Promise.reject()}
    })
  };

  beforeEach(function(){
    validateLoginSucessfully.reset();
    validateLoginFailing.reset();

    for(let fname in ok_mock_data_connection){
      ok_mock_data_connection[fname].reset();
    }

    for(let fname in failing_mock_data_connection){
      failing_mock_data_connection[fname].reset();
    }
  });

  function createStandardRequest(){
    return httpMocks.createRequest({
      method: "GET",
      url: '/translations/search_term',
      params:{
        data:{
          user: 'test',
          pass: 'test'
        }
      },
      body:{
        user: 'test',
        pass: 'test',
        translations :[]
      }
    });
  }

  const TestStub =  function(handlerFactory){//the currying follows the structure of the tests
    const req = createStandardRequest();
    return function(related_function){
      return function(expected_result){
        const resp = httpMocks.createResponse();
        return expected_result === "ok" ?
          function(done){
            const data_connection = ok_mock_data_connection;
            handlerFactory(data_connection, validateLoginSucessfully)(req, resp).then(()=>{
              expect(data_connection[related_function]).to.have.been.called.once;
              expect(resp.statusCode).to.be.equal(200);
              done();
            }).catch(()=>{
              throw ("Should not have failed");
            });

          } :
          function(done){
            const data_connection = failing_mock_data_connection;
            const promise = handlerFactory(data_connection, validateLoginSucessfully)(req, resp)
            expect(promise).to.be.instanceof(Promise);
            promise.then(()=>{
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
        it("if the deleteTranslation call succeeds", test_stub('ok'));
      })

      describe("and fail", function(){
        it("if the deleteTranslation call fails", test_stub("fail"))

        it('if the login fails', function(){
          const request = createStandardRequest();
          const response = httpMocks.createResponse();
          const promise =
            _handleDeleteRequestFactory(ok_mock_data_connection, validateLoginFailing)(request, response);
          promise.then(()=>{
            expect(validateLoginFailing).to.have.been.called.once;
            expect(response.statusCode).to.be.above(499);
          });
        })
      })

      it("should call login validation", function(){
        const request = createStandardRequest();
        const response = httpMocks.createResponse();
        _handleDeleteRequestFactory(ok_mock_data_connection, validateLoginSucessfully)(request, response);
        expect(validateLoginSucessfully).to.have.been.called.once;
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
        it("if the updateTranslation call fails", test_stub("fail"))
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
        it("if the updateTranslation call fails", function(done){
          const request = createStandardRequest();
          const response = httpMocks.createResponse();
          const promise =
            _handleUpdateRequestFactory(failing_mock_data_connection, validateLoginSucessfully)(request, response);
          expect(promise).to.be.instanceof(Promise);
          promise.then((results) => {
            expect(failing_mock_data_connection.updateTranslation).to.have.been.called.once;
            expect(results).to.be.instanceof(Array);
            expect(response.statusCode).to.be.equal(200);
            done();
          }).catch((err)=>{
            console.log("ERRROR");
            //console.error(err);
          });
        })

        it('if the login fails', function(){
          const request = createStandardRequest();
          const response = httpMocks.createResponse();
          const promise =
            _handleUpdateRequestFactory(ok_mock_data_connection, validateLoginFailing)(request, response);
          promise.then(()=>{
            expect(validateLoginFailing).to.have.been.called.once;
            expect(response.statusCode).to.be.above(499);
          });
        })
      })
    })

    it("should call login validation", function(){
      const request = createStandardRequest();
      const response = httpMocks.createResponse();
      _handleUpdateRequestFactory(ok_mock_data_connection, validateLoginSucessfully)(request, response);
      expect(validateLoginSucessfully).to.have.been.called.once;
    })
  })
})
