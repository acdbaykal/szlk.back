import mongoose from 'mongoose';

export const TranslationSchema = mongoose.Schema({
  origin:{
    main:{type: String, required:true},
    short:{type: String, required:false}
  },
  type:{type: String, required:true},
  translation:{type: String, required:true},
  creationDate:{type:Date, required:true},
  editDate:{type:Date, required:true}
});

export function createTranslationModel(mongoose_connection){
  return mongoose_connection.model("Translation", TranslationSchema);
}
