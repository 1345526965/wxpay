const express = require('express')
const mongoose = require('mongoose')
// xml转js
const xml2js = require('xml2js')
const { signPayParams,getJsApiTicket,signJsApiParams,appid,fullUrl,getOauthUrl,getOpenId } = require("./utils/wx") 
const app = express()
const PORT = 3003
const cookieParser = require('cookie-parser')
// 静态资源设置
app.use('/',express.static("./public"))



// 支付结果通知
app.post('/pay/notify_wx',async(req,res) => {
    var buf = ''
    req.on('data',chunk =>{
        buf += chunk
    })
    req.on('end',async ()=>{
        const payResult = await xml2js.parseStringPromise(buf,{
            explicitArray:false  //不以数组的方式返回
        })
        try{
            if(payResult.xml.return_code == 'SUCCESS'){
                const paramsNeedSign = {}
                for(let k in payResult.xml){
                    if( k!="sign"){
                        paramsNeedSign[k] = payResult[k]
                    }
                }
                const sign = signPayParams(paramsNeedSign)
                if(!sign == payResult.xml.sign){
                    const orderNo = payResult.xml.out_trade_no
                    const order = await order.findOne({
                        order_no:orderNo
                    })
                    if(order){
                        order.payed = true
                        order.payed_time = Date.now()
                        await order.save()
                    }
                }
            }
            //商户处理后同步返回给微信参数
            res.send(`
            <xml>
            <return_code><![CDATA[SUCCESS]]></return_code>
            <return_msg><![CDATA[OK]]></return_msg>
          </xml>
            `)
        }catch(err){
    
        }
    })
    
})
//模板引擎
app.set("views","./views");//设置模板文件的路径
app.set("view engine","ejs")

// 路由
app.use("/api/v1/wechat",require("./api/v1/wechat"))
app.get('/',(req,res)=>{
    res.send('hello word')
})
app.get("/wx_pay",async (req,res)=>{
    // openId、code
    if(req.cookies.openid){
        // 渲染页面
        const nonceStr = Date.now().toString()
        const timestamp = Math.floor(Date.now()/1000)
        const jsTicket = await getJsApiTicket()
        // 签名
        const signResult = signJsApiParams({
            jsapi_ticket:jsTicket,
            nonceStr:nonceStr,
            timestamp,
            url:fullUrl(req)
        })
        res.render("wx_pay.ejs",{
            appid,
            timestamp,
            nonceStr,
            signResult,
            openid:req.cookies.openid
        })
      
    }else{
      //重定向到微信授权页面
      if(req.query.code){
        //   此处有code 获取openid
        const { openid} = await getOpenId(req.query.code)
        // 设置openid
        res.cookie('openid',openid,{
            path:'/'
        })
        res.redirect('/wx_pay')
      }else{
        //   重定向到微信授权页面
        const redirectUrl = fullUrl(req)
        res.redirect(getOauthUrl(redirectUrl))
      }
    }
   
})
// 中间件
app.use(cookieParser)
// 连接数据库
mongoose.connect('mongodb://localhost:27817/cat-shop',{useNewUrlParser:true})
.then(res=>{console.log('数据库连接成功')})
.catch(err=>{
    console.log(err)
})

app.listen(PORT,()=>{
    console.log('server 启动 端口:',PORT)
})