const mongoose = require('mongoose')
const Schema = mongoose.Schema

const orderSchema = new Schema({
    order_no:{
        type:String,
        require:true  //必须填写
    },
    fee:{
        type:Number,
        default:0
    },
    address:{
        type:String,
        default:''
    },
    payed:{
        type:Boolean,
        default:false
    },
    payed_time:{
        type:Date
    }
    
    
},
{
    timetamps:true
}
)
module.exports = mongoose.model("order",orderSchema)