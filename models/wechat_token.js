const mongoose = require("mongoose")
const Schema = mongoose.Schema

const accessTokenSchema = new Schema({
    name:{
        type:String,
        require:true
    },
    value:{
        type:String
    }
},
{timestamps:true}//为每条记录生成时间戳
)
module.exports = mongoose.model("wechat_access_token",accessTokenSchema)