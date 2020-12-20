const axios = require('axios').default
const xml2js = require('xml2js')
const sha1 = require('sha1')
const url = require('url')
/*
accessToken
*/
const moment = require('moment')
const WechatToken = require('../models/wechat_token')

/*
签名需要的模块  md5加密
*/
const crypto = require('crypto')
/*
字符串拼接
*/
const qs = require('qs')

const {appid, mchid, mchkey, notifyUrl,appsecret } = require('../config/wx.config')
/*
公众账号ID	appid
商户号	    mch_id
随机字符串	nonce_str
签名	    sign	
商品描述	body	
商户订单号	out_trade_no
标价金额	total_fee
终端IP	    spbill_create_ip
通知地址	notify_url	
交易类型	trade_type
*/
async function wxPay(payload,tradeType='NATIVE'){
    const {body, orderNo, ip, totalFee, nonceStr,openid} = payload
    // 需要签名的参数
    const paramsNeedSign = {
        appid,
        mch_id:mchid,
        body,
        nonce_str:nonceStr,
        spbill_create_ip:ip,
        notify_url:notifyUrl,
        total_fee:totalFee,
        trade_type:tradeType,
        out_trade_no:orderNo
    }
    // 对openid判断
    let strOpendId = ""
    if(openid){
       paramsNeedSign.openid = openid
       strOpendId = `<openid>${openid}</openid>`
    }
    const sign = signPayParams(paramsNeedSign)
    // 生成订单  sendXml
    const sendXml =`<xml>
    <appid>${appid}</appid>
    <body>${body}</body>
    <mch_id>${mchid}</mch_id>
    <nonce_str>${nonceStr}</nonce_str>
    <notify_url>${notifyUrl}</notify_url>
    <out_trade_no>${orderNo}</out_trade_no>
    ${strOpendId}
    <spbill_create_ip>${ip}</spbill_create_ip>
    <total_fee>${totalFee}</total_fee>
    <trade_type>NATIVE</trade_type>
    <sign>${sign}</sign>
    </xml>`
    //  调起统一订单接口
    const result = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder',sendXml,{
        headers:{
            'content-type':'application/xml'
        }
    })
    return await xml2js.parseStringPromise(result.data,{
        cdara:true,
        explicitArray:false
    })
}
/*
获取openid
*/
function getOpenId(code){
    return axios
        .get(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}&secret=${appsecret}&code=${code}&grant_type=authorization_code`)
        .then(result=>{
            return result.data
        })
}
/*
网页授权
*/
function getOauthUrl(redirectUrl,scope = 'snsapi_base'){
     redirectUrl = encodeURIComponent(redirectUrl)
     return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appid}&redirect_uri=${redirectUrl}&response_type=code&scope=${scope}&state=123#wechat_redirect`
}
/*
URL
*/
function fullUrl(req){
    //http
    // return url.format({
    //     protocol:req.protocol,
    //     host:req.get("host"),
    //     pathname:req.originalUrl
    // })

    //https 因为开启https中nginx 、代理之后，无法获取真实的协议
    return `https://${req.get("host") + req.originalUrl} ` //生成完整的url地址
}
/*
签名(支付)
digest 编码 hex
*/
function signPayParams(params){
    const sortedParams = Object.keys(params).sort().reduce((pre,cur)=>({...pre,[cur]:params[cur]}),{})
    sortedParams.key = mchkey
    const signResult = crypto.
       createHash('MD5')
       .update(qs.stringify(sortedParams,{encode:false}))
       .digest("hex")
       .toUpperCase();
    return signResult;   
}
/*
签名（jsapi）
*/
function signJsApiParams(params){
    const sortedParams = Object.key(params).sort()
       .reduce((pre,cur)=>({...pre,[cur]:params[cur]}),{})
    const signResult =  sha1(qs.stringify(signJsApiParams,{encode:false}))
    return signResult  
}
/*
获取accessToken
*/
async function getAccessToken(){
    const accessToken = await WechatToken.findOne({
        name:'access_token'
    })
    let timeDiff = 0
    if(accessToken){
        timeDiff = moment(Date.now().diff(moment(accessToken.createAt),'seconds'))
        if(timeDiff < 6000){
            return accessToken.value
        }else{
            await WechatToken.deleteOne({
                  name:"access_token"
                })
        }
    }
    const result = await axios.get('https://api.weixin.qq.com/cgi-bin/token',{
        params:{
            grant_type:'client_credential',
            appid,
            secret:appsecret
        }
    })
    const t = new WechatToken({
        name:'access_token',
        value:result.data.access_token
    })
    await t.save()
    return result.data.access_token
}   
/*
获取jsApi ticket
*/
async function getJsApiTicket(){
    const jsApiTicket = await WechatToken.findOne({
        name:'jsapi_ticket'
    })
    let timeDiff = 0
    if(jsApiTicket){
        timeDiff = moment(Date.now().diff(moment(jsApiTicket.createAt),'seconds'))
        if(timeDiff < 6000){
            return jsApiTicket.value
        }else{
            await WechatToken.deleteOne({
                  name:"jsapi_ticket"
                })
        }
    }
    const accessToken = await getAccessToken()
    const result = await axios.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket',{
        params:{
            access_token:accessToken,
            type:'jsapi'
        }
    })
    const t = new WechatToken({
        name:'jsapi_ticket',
        value:result.data.ticket
    })
    await t.save()
    return result.data.ticket
}
module.exports ={
    wxPay,
    signPayParams,
    getAccessToken,
    getJsApiTicket,
    signJsApiParams,
    fullUrl,
    appid,
    getOauthUrl,
    getOpenId
}