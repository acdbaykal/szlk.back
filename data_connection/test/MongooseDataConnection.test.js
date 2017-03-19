import {expect} from '../../global/utils/chai'
import mongoose from 'mongoose'
import mockgoose from 'mockgoose'
import DBConnection, {_escapeSpecialCharacters} from '../MongooseDataConnection'
import {createTranslationModel} from '../Translation'

// Use native promises
mongoose.Promise = global.Promise;
const cwd = process.cwd();
const ObjectId = mongoose.Types.ObjectId
const translation_to_add={
  origin:{
    main:"Haupt-"
  },
  translation:"Ana",
  type:"pre"
};

const initial_state = [
  {
    origin:{main:"main"},
    translation:"translation",
    type:"v",
    creationDate:new Date(),
    editDate:new Date()
  },
  {
    origin:{main:"Schlange"},
    translation:"translation",
    type:"e",
    creationDate:new Date(),
    editDate:new Date()
  },
  {
    origin:{main:"Schiene"},
    translation:"translation",
    type:"e",
    creationDate:new Date(),
    editDate:new Date()
  }
];

function addTranslations(Translation){
  for(let i = 0, iLimit = initial_state.length; i < iLimit; i++){
    let tr = new Translation(initial_state[i]);
    tr.save();
  }
}

describe('DB connection functions', function(){
  let db_connection;
  let Translation;

  describe('_escapeSpecialCharacters function', function(){
    it("should escape (add a \\ before) non alpa-numeric characters", function(){
      let str = "?:T + (LJ!  })k 5JnE ]0Z\\ab";
      expect(_escapeSpecialCharacters(str)).to.be.equal("\\?\\:T \\+ \\(LJ\\!  \\}\\)k 5JnE \\]0Z\\\\ab");
      str = "Todw vL TtÄu Y 9äM RL TI Ö üÜü";
      expect(_escapeSpecialCharacters(str)).to.be.equal(str);
    })
  })

  before(function(done) {
    mockgoose(mongoose).then(function() {
        const con = mongoose.createConnection();
        con.open("mongodb://localhost/szlk");
        con.on('connected', ()=>{
          Translation = createTranslationModel(con);
          db_connection = DBConnection(con);
          done();
        });
    });
  });

  beforeEach(function(done){
    Translation.remove({}).then(()=>{ // remove all
      addTranslations(Translation); // and readd
      done();
    })
  });

  after(()=>{
    mongoose.unmock();
  });

  describe('searchTranslation()', function(){
    it("should return multiple records when searched for 'sch'", function(){
      const promise = db_connection.searchTranslation('sch').then((result)=>{
        expect(result).to.be.instanceof(Array);
        expect(result.length).to.be.above(1);
      });
      expect(promise).to.be.instanceof(Promise);
      return promise;
    })
  });

  describe("updateTranslation()", function(){
    it("shoul return {add:Promise, update:Promise} if undefined is given as parameter", function(){
      const result = db_connection.updateTranslation(undefined);
      expect(result).to.include.keys('add');
      expect(result).to.include.keys('update');
      const {add, update} = result;
      expect(add).to.be.instanceof(Promise);
      expect(update).to.be.instanceof(Promise);

      return Promise.all([add, update]).then(
        ([add_result, update_result]) =>{
          expect(add_result).to.be.instanceof(Array);
          expect(update_result).to.be.instanceof(Array);
          expect(add_result.length).to.be.equal(0);
          expect(update_result.length).to.be.equal(0);
        }
      );
    });

    it("should return {add:Promise, update:Promise} if an empty is array given as parameter", function(){
      const result = db_connection.updateTranslation([]);
      expect(result).to.include.keys('add');
      expect(result).to.include.keys('update');
      const {add, update} = result;
      expect(add).to.be.instanceof(Promise);
      expect(update).to.be.instanceof(Promise);

      return Promise.all([add, update]).then(
        ([add_result, update_result]) =>{
          expect(add_result).to.be.instanceof(Array);
          expect(update_result).to.be.instanceof(Array);
          expect(add_result.length).to.be.equal(0);
          expect(update_result.length).to.be.equal(0);
        }
      );
    });

    it("should update an existing single translation", function(){
        const new_translation_value="updated";
        let id;
        return Translation.findOne().exec().then((result)=>{
          id = result.id;
          result.translation = new_translation_value;
          const {add, update:update_promise} = db_connection.updateTranslation(result);
          expect(add).to.be.instanceof(Promise);
          expect(update_promise).to.be.instanceof(Promise);
          return update_promise;
        }).then((update_result)=>{
          expect(update_result).to.be.instanceof(Array);
          expect(update_result.length).to.be.equal(1);
          const updated = update_result[0];
          expect(updated.translation).to.be.equal(new_translation_value);
          expect(updated._id.toString()).to.be.equal(id.toString());
          return Translation.findById(id).exec();
        }).then((result)=>{
          expect(result.translation).to.be.equal(new_translation_value);
        });
    });

    it("should add a NON-existing single translation", function(){
        const {add:add_promise, update} = db_connection.updateTranslation(translation_to_add);
        expect(add_promise).to.be.instanceof(Promise);
        expect(update).to.be.instanceof(Promise);

        return add_promise.then((add_result)=>{
          expect(add_result.id).to.be.ok;
          expect(add_result.translation).to.be.equal(translation_to_add.translation);
        });
    });

    it("should handle an array of translations by updating the existing ones and adding the new ones", function(){
        const new_short="short";
        let existing_count;

        return Translation.find({}).exec().then((existing_translations)=>{
          existing_count = existing_translations.length;
          const updated_translations =  existing_translations.map((tr)=>{
              tr.origin.short = new_short;
              return tr;
          });
          const to_add = {...translation_to_add};
          to_add.origin.short = new_short;
          updated_translations.push(to_add);

          const {add, update} = db_connection.updateTranslation(updated_translations);
          expect(add).to.be.instanceof(Promise);
          expect(update).to.be.instanceof(Promise);
          return Promise.all([add, update]);
        }).then((result_arr)=>{
          const [add_result, update_result] = result_arr;
          console.log("UPDTE RESULT: " + JSON.stringify(update_result, "    "));
          expect(update_result).to.be.instanceof(Array);
          expect(add_result).to.be.instanceof(Array);
          expect(update_result.length).to.be.equal(existing_count);
          expect(add_result.length).to.be.one;
          const added_translation = add_result[0];
          expect(added_translation._id).to.be.ok;
          expect(added_translation.origin.short).to.be.equal(new_short);
          expect(
            (update_result.filter(x => x.origin.short === new_short)).length
          ).to.be.equal(existing_count);
        });
    });
  });

  describe('deleteTranslation', ()=>{
    it('should delete all the translations within an array, which have an id '+
        'and are present in the database. It should return an array of deleted translations', ()=>{
        const expected_result=[]; // we will push an object later

        return Translation.find({}).exec().then((all_translations)=>{
          const first_translation = all_translations[0];
          expected_result.push(first_translation.toObject());
          const to_delete = [
                              translation_to_add, //noise
                              first_translation, //to be removed
                              new Translation(translation_to_add) //noise
                            ];
          return db_connection.deleteTranslation(to_delete);
        }).then((delete_result)=>{
          expect(delete_result).to.be.instanceof(Array);
          expect(delete_result.length).to.be.one;
          expect(delete_result[0]._id.toString()).to.be.equal(expected_result[0]._id.toString());
        });
    });

    it('should delete an existing translation and return it within an array.', ()=>{
        const expected_result=[]; // we will push an object later

        return Translation.findOne({}).exec().then((found)=>{
          expected_result.push(found.toObject());
          return db_connection.deleteTranslation(found);
        }).then((delete_result)=>{
          expect(delete_result).to.be.instanceof(Array);
          expect(delete_result.length).to.be.one;
          expect(delete_result[0]._id.toString()).to.be.equal(expected_result[0]._id.toString());
        });
    });

    it('should return a rejected promise a if an invalid parameter is passed.', ()=>{
      return db_connection.deleteTranslation("invalid parameter").catch((err)=>{
          expect(err).to.be.instanceof(TypeError);
      });
    });

    it('should return an empty array when a non-exiting translation is passed.', ()=>{
      return db_connection.deleteTranslation(new Translation(translation_to_add)).then((delete_result)=>{
          console.log(delete_result);

          expect(delete_result).to.be.instanceof(Array);
          expect(delete_result.length).to.be.equal(0);
      });
    });
  });
});
