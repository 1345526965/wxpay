const router = require('express').Router()
const Order = require('../../models/order')

router.post("/sub",async(req,res)=>{
    const fee = req.body.fee|1
    const order = new order
    order.order_no = "D"+Date.now()
    order.fee = fee
    await order.save()
    res.json({
        code:1,
        info:{
            orderNo:order.order_no
        }
    })
})
module.exports = router