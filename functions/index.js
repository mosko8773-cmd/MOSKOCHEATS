const {onRequest} = require("firebase-functions/v2/https");
const {onValueWritten} = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
admin.initializeApp();

const ACTIVE_CONFIG = {
  remarks:"MOSKO Client v3 Fixed",
  inbounds:[
    {listen:"127.0.0.1",port:10808,protocol:"socks",settings:{auth:"noauth",udp:true},sniffing:{destOverride:["http","tls","quic"],enabled:true,routeOnly:false},tag:"socks"},
    {listen:"127.0.0.1",port:10809,protocol:"http",sniffing:{destOverride:["http","tls","quic"],enabled:true,routeOnly:false},tag:"http"}
  ],
  outbounds:[
    {protocol:"hysteria",settings:{address:"proxy-eu.dripwire.cc",port:443,version:2},streamSettings:{hysteriaSettings:{auth:"2292878901",version:2},network:"hysteria",security:"tls",tlsSettings:{alpn:["h3"],serverName:"proxy-eu.dripwire.cc",show:false},finalmask:{quicParams:{disableChromeParrot:true}}},tag:"proxy"},
    {protocol:"freedom",tag:"direct"}
  ],
  routing:{domainStrategy:"AsIs",rules:[
    {network:"tcp",outboundTag:"proxy",port:"39000-39999"},
    {network:"udp",outboundTag:"proxy",port:"10000-10999"},
    {network:"tcp,udp",outboundTag:"direct"}
  ]}
};
const EXPIRED_CONFIG = {
  remarks:"Key expired",
  outbounds:[
    {protocol:"hysteria",settings:{address:"0.0.0.0",port:1,version:2},streamSettings:{hysteriaSettings:{auth:"error",version:2},network:"hysteria",security:"tls",tlsSettings:{alpn:["h3"],serverName:"0.0.0.0"}},tag:"proxy"},
    {protocol:"freedom",tag:"direct"}
  ],
  routing:{rules:[{network:"tcp,udp",outboundTag:"direct"}]}
};
function expiryMs(r){
  for(const f of ["expiresAt","expireAt","expiredAt","expiry","validUntil"]){
    if(r[f]!=null&&Number.isFinite(Number(r[f]))){let n=Number(r[f]);return n<20000000000?n*1000:n;}
  }
  const first=Number(r.firstLogin),v=Number(r.durationValue);
  if(first>0&&v>0){
    const unit=String(r.durationUnit||"hours").toLowerCase();
    const mul={minute:60000,minutes:60000,min:60000,hour:3600000,hours:3600000,day:86400000,days:86400000,week:604800000,weeks:604800000}[unit]||3600000;
    return (first<20000000000?first*1000:first)+v*mul;
  }
  return null;
}
function active(r){
  if(!r)return false;
  const s=String(r.keyStatus??r.status??"").toUpperCase();
  if(["EXPIRED","INACTIVE","DISABLED","REVOKED","BANNED"].includes(s))return false;
  const exp=expiryMs(r);if(exp!==null&&exp<=Date.now())return false;
  return ["ACTIVE","VALID","ENABLED"].includes(s);
}
exports.config = onRequest(async(req,res)=>{
  res.set("Content-Type","application/json; charset=utf-8");
  res.set("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
  const key=String(req.query.key||"").toUpperCase();
  if(!/^MOSKO-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/.test(key)){res.status(400).json({remarks:"Invalid MOSKO key"});return;}
  try{
    const snap=await admin.database().ref("keys/"+key).get();
    res.status(200).json(active(snap.val())?ACTIVE_CONFIG:EXPIRED_CONFIG);
  }catch(e){res.status(503).json({remarks:"Service temporarily unavailable"});}
});
exports.createHappLink = onRequest(async(req,res)=>{
  cors(req,res,async()=>{
    if(req.method!=="POST"){res.status(405).json({error:"Method not allowed"});return;}
    const key=String(req.body?.key||"").toUpperCase();
    if(!/^MOSKO-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/.test(key)){res.status(400).json({error:"Invalid key"});return;}
    try{
      const snap=await admin.database().ref("keys/"+key).get();
      if(!active(snap.val())){res.status(403).json({error:"Key expired or inactive"});return;}
      const host=req.get("origin")||req.get("referer");
      const base=process.env.PUBLIC_SITE_URL;
      if(!base){res.status(500).json({error:"Set PUBLIC_SITE_URL in Functions environment"});return;}
      const raw=`${base.replace(/\/$/,"")}/config.json?key=${encodeURIComponent(key)}`;
      const api=await fetch("https://crypto.happ.su/api-v2.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:raw})});
      const body=await api.text();let parsed;try{parsed=JSON.parse(body)}catch{}
      const happLink=typeof parsed==="string"?parsed:(parsed?.url||parsed?.link||parsed?.result||parsed?.encrypted_url||body.trim());
      if(!api.ok||!String(happLink).startsWith("happ://")){res.status(502).json({error:"Happ API returned an unexpected response"});return;}
      res.json({happLink});
    }catch(e){res.status(500).json({error:"Unable to create Happ link"});}
  });
});
exports.onKeyChanged = onValueWritten("/keys/{key}", async(event)=>{
  // Intentionally no client-side status mutation. config.json checks current Firebase state on every fetch.
  return null;
});
