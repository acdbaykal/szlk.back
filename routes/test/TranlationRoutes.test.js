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

  const addResult = "addResult";
  const updateResult = "updateResult";

  const ok_mock_data_connection = {
    deleteTranslation:createOKSpy(),
    searchTranslation:createOKSpy(),
    updateTranslation:createSpy(()=>{
      return {
            add:Promise.resolve([addResult]),
            update:Promise.resolve([updateResult])
      }
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

  function createDefaultRequest(){
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
    const req = createDefaultRequest();
    return function(related_function){
      return function(expectedCode){
        return function(){
            const data_connection = expectedCode === 200 ?
                ok_mock_data_connection : failing_mock_data_connection;

            const resp = httpMocks.createResponse();
            const sendOriginal = resp.send;
            let exposedBody;
            resp.send = function(body){
              exposedBody = body;
              sendOriginal.apply(resp, arguments);
            };

            return handlerFactory(data_connection, validateLoginSucessfully)(req, resp).then(()=>{
              expect(data_connection[related_function]).to.have.been.called.once;
              expect(resp.statusCode).to.be.equal(expectedCode);
              return exposedBody;
            })
        };
      }
    }

  }

  describe("_handleDeleteRequestFactory()()", function(){
    describe("should call the deleteTranslation function", function(){
      const test_stub = (
        TestStub(_handleDeleteRequestFactory)("deleteTranslation")
      );

      describe("and send OK", function(){
        it("if the deleteTranslation call succeeds", test_stub(200));
      });

      describe("and fail", function(){
        it("if the deleteTranslation call fails", test_stub(500));

        it('if the login fails', function(){
          const request = createDefaultRequest();
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
        const request = createDefaultRequest();
        const response = httpMocks.createResponse();
        _handleDeleteRequestFactory(ok_mock_data_connection, validateLoginSucessfully)(request, response);
        expect(validateLoginSucessfully).to.have.been.called.once;
      })

    })
  })

  describe("_handleSearchRequestFactory()()", function(){
    describe("should call the searchTranslation function", function(){
      const test_stub =
        TestStub(_handleSearchRequestFactory)("searchTranslation")
      ;

      describe("and send OK", function(){
        it("if the searchTranslation call succeeds", test_stub(200))
      });

      describe("and fail", function(){
        it("if the updateTranslation call fails", test_stub(500))
      });
    })
  });

  describe("_handleUpdateRequestFactory()()", function(){
    describe("should call the updateTranslation function", function(){
      const test_stub = (
        TestStub(_handleUpdateRequestFactory)("updateTranslation")
      );

      describe("and send OK", function(){
        it("if the updateTranslation call succeeds", function(){
          return test_stub(200)().then((body) =>{
              expect(body).to.be.instanceof(Array);
              expect(body.indexOf(addResult)).to.be.gt(-1);
              expect(body.indexOf(updateResult)).to.be.gt(-1);
          });
        })
      });

      describe("and fail", function(){
        it("if the updateTranslation call fails", function(done){
          const request = createDefaultRequest();
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
            console.error(err);
          });
        });

        it('if the login fails', function(){
          const request = createDefaultRequest();
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
      const request = createDefaultRequest();
      const response = httpMocks.createResponse();
      _handleUpdateRequestFactory(ok_mock_data_connection, validateLoginSucessfully)(request, response);
      expect(validateLoginSucessfully).to.have.been.called.once;
    })
  })
})
