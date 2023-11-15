/*
MIT License

Copyright (c) 2021 Dave Bolenbaugh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';

if(!(window.customElements&&document.body.attachShadow)){const bodyElement=document.querySelector('body');bodyElement.id='broken'
;bodyElement.innerHTML='<b>Your browser does not support Shadow DOM and Custom Elements v1.</b>'}window.customElements.define('glob-vars',class extends HTMLElement{constants(key){const constants={
channelPrefixChars:'@#+!',nicknamePrefixChars:'~&@%+',nickChannelSpacer:' | ',pmNameSpacer:' - ',activityIconInhibitTimerValue:10,cacheReloadString:'-----IRC Cache Reload-----',
cacheErrorString:'-----IRC Cache Error-----',fetchTimeout:5e3};if(Object.hasOwn(constants,key))return constants[key];else return null}csrfToken=null;webServerUrl=null;webSocketUrl=null
;initializePlugin=()=>{if(!Object.hasOwn(window,'globals'))window.globals=Object.create(null);try{this.csrfToken=document.querySelector('meta[name="csrf-token"]').getAttribute('content')
;if('{{csrfToken}}'===this.csrfToken){console.log('The {{csrfToken}} was not replaced with dynamic data');this.csrfToken=null}}catch(e){console.log(e.message||e)}window.globals.ircState={
ircConnectOn:false,ircConnecting:false,ircConnected:false,ircRegistered:false,ircIsAway:false,ircAutoReconnect:false,lastPing:'0.000',ircServerName:'',ircServerHost:'',ircServerPort:6667,
ircTLSEnabled:false,ircServerIndex:0,ircServerPrefix:'',channelList:[],nickName:'',userName:'',realName:'',userMode:'',userHost:'',connectHost:'',channels:[],channelStates:[],progVersion:'0.0.0',
progName:'',times:{programRun:0,ircConnect:0},count:{ircConnect:0,ircConnectError:0},websocketCount:0};window.globals.webState={};window.globals.webState.loginUser={}
;window.globals.webState.webConnectOn=false;window.globals.webState.webConnected=false;window.globals.webState.webConnecting=false;window.globals.webState.ircConnecting=false
;window.globals.webState.ircServerEditOpen=false;window.globals.webState.websocketCount=0;window.globals.webState.lastIrcServerIndex=-1;window.globals.webState.ircServerModified=false
;window.globals.webState.channels=[];window.globals.webState.channelStates=[];window.globals.webState.lastPMNick='';window.globals.webState.activePrivateMessageNicks=[]
;window.globals.webState.activePrivateMessageCsNicks=[];window.globals.webState.times={webConnect:0};window.globals.webState.count={webConnect:0,webStateCalls:0}
;window.globals.webState.cacheReloadInProgress=false;window.globals.webState.lag={last:0,min:9999,max:0};window.globals.webState.dynamic={testAreaColumnPxWidth:null,textAreaPaddingPxWidth:null,
textAreaRowPxHeight:null,textareaPaddingPxHeight:null,sendButtonWidthPx:null,collapseButtonWidthPx:null,commonMarginRightPx:50,lastDevicePixelRatio:1,
panelPxWidth:document.querySelector('body').clientWidth,panelPxHeight:window.innerHeight,lastPanelPxWidth:document.querySelector('body').clientWidth,lastPanelPxHeight:window.innerHeight}
;if(window.devicePixelRatio)window.globals.webState.dynamic.lastDevicePixelRatio=window.devicePixelRatio;this.webServerUrl='https://';this.webSocketUrl='wss://'
;if('http:'===document.location.protocol){this.webServerUrl='http://';this.webSocketUrl='ws://'}this.webServerUrl+=window.location.hostname+':'+window.location.port
;this.webSocketUrl+=window.location.hostname+':'+window.location.port;window.globals.wsocket=null}});window.customElements.define('display-utils',class extends HTMLElement{toggleColorTheme=()=>{
if('light'===document.querySelector('body').getAttribute('theme')){document.querySelector('body').setAttribute('theme','dark');window.localStorage.setItem('colorTheme',JSON.stringify({theme:'dark'}))
;document.dispatchEvent(new CustomEvent('color-theme-changed',{detail:{theme:'dark'}}))}else{document.querySelector('body').setAttribute('theme','light')
;window.localStorage.setItem('colorTheme',JSON.stringify({theme:'light'}));document.dispatchEvent(new CustomEvent('color-theme-changed',{detail:{theme:'light'}}))}};timestampToHMS=timeString=>{
let outString='';if(0===timeString.length)outString=null;else if(0===timeString.indexOf('@time=')){const timeObj=new Date(timeString.slice(6,timeString.length))
;outString+=timeObj.getHours().toString().padStart(2,'0')+':';outString+=timeObj.getMinutes().toString().padStart(2,'0')+':';outString+=timeObj.getSeconds().toString().padStart(2,'0')
}else outString=null;return outString};timestampToYMD=timeString=>{let outString='';if(0===timeString.length)outString=null;else if(0===timeString.indexOf('@time=')){
const timeObj=new Date(timeString.slice(6,timeString.length));outString+=timeObj.getFullYear().toString().padStart(4,'0')+'-';outString+=(timeObj.getMonth()+1).toString().padStart(2,'0')+'-'
;outString+=timeObj.getDate().toString().padStart(2,'0')}else outString=null;return outString};unixTimestampToHMS=seconds=>{let outString=''
;if('number'===typeof seconds&&Number.isInteger(seconds)&&seconds>1e9&&seconds<1e12){const timeObj=new Date(1e3*seconds);let language
;if(window.navigator.languages)language=window.navigator.languages[0];else language=window.navigator.userLanguage||window.navigator.language||'en-US';outString=timeObj.toLocaleTimeString(language,{
hour12:false})}else outString=null;return outString};timestampToUnixSeconds=timeString=>{let outSeconds=null;if(0===timeString.length)outSeconds=null;else if(0===timeString.indexOf('@time=')){
const timeObj=new Date(timeString.slice(6,timeString.length));outSeconds=parseInt(timeObj.valueOf()/1e3)}else outSeconds=null;return outSeconds};stripTrailingCrLf=inString=>{
let inLength=inString.length;if(inLength>0&&10===inString.charCodeAt(inLength-1))inLength--;if(inLength>0&&13===inString.charCodeAt(inLength-1))inLength--
;if(inLength>0&&32===inString.charCodeAt(inLength-1))inLength--;if(inLength>0&&32===inString.charCodeAt(inLength-1))inLength--;if(0===inLength)return'';else return inString.slice(0,inLength)}
;detectMultiLineString=inString=>{let inLength=inString.length;if(inLength>0&&10===inString.charCodeAt(inLength-1))inLength--;if(inLength>0){let countCR=0
;for(let i=0;i<inLength;i++)if(10===inString.charCodeAt(i))countCR++;if(0===countCR)return false;else return true}else return false};cleanCtcpDelimiter=inString=>{const ctcpDelim=1;let outString=''
;const l=inString.length;if(0===l)return outString;let i=0;while(i<l)if(i<l&&inString.charCodeAt(i)===ctcpDelim)i++;else{if(i<l)outString+=inString.charAt(i);i++}return outString}
;cleanFormatting=inString=>{const formattingChars=[2,7,15,17,22,29,30,31];let outString='';const l=inString.length;if(0===l)return outString;let i=0;let active=true;while(i<l){active=true
;if(active&&i<l&&formattingChars.indexOf(inString.charCodeAt(i))>=0){active=false;i++}if(active&&i<l&&3===inString.charCodeAt(i)){active=false;i++
;if(i<l&&inString.charAt(i)>='0'&&inString.charAt(i)<='9')i++;if(i<l&&inString.charAt(i)>='0'&&inString.charAt(i)<='9')i++;if(i<l&&','===inString.charAt(i)){i++
;if(i<l&&inString.charAt(i)>='0'&&inString.charAt(i)<='9')i++;if(i<l&&inString.charAt(i)>='0'&&inString.charAt(i)<='9')i++}}if(active&&i<l&&4===inString.charCodeAt(i)){active=false;i++
;if(inString.charAt(i)>='0'&&inString.charAt(i)<='9'||inString.toUpperCase().charAt(i)>='A'&&inString.toUpperCase().charAt(i)<='F'){for(let j=0;j<6;j++)if(i<l)i++;if(i<l&&','===inString.charAt(i)){i++
;for(let j=0;j<6;j++)if(i<l)i++}}}if(active&&i<l){active=false;outString+=inString.charAt(i);i++}}return outString};stripOneCrLfFromElement=textAreaElement=>{if(!textAreaElement.value)return
;const inString=textAreaElement.value.toString();let crCount=0;let lfCount=0;if(inString.length>0)for(let i=0;i<inString.length;i++){if(13===inString.charCodeAt(i))crCount++
;if(10===inString.charCodeAt(i))lfCount++}if(0===crCount&&1===lfCount){let newString='';for(let i=0;i<inString.length;i++)if(10!==inString.charCodeAt(i))newString+=inString.charAt(i)
;textAreaElement.value=newString}if(1===crCount&&1===lfCount){let newString=''
;for(let i=0;i<inString.length;i++)if(10!==inString.charCodeAt(i)&&13!==inString.charCodeAt(i))newString+=inString.charAt(i);textAreaElement.value=newString}};_updatePageMeasurements(){
window.globals.webState.dynamic.panelPxWidth=document.querySelector('body').clientWidth.toString();window.globals.webState.dynamic.panelPxHeight=window.innerHeight.toString()
;if(!window.globals.webState.watch)window.globals.webState.watch={};window.globals.webState.watch.innerHeight=window.innerHeight.toString()+'px'
;window.globals.webState.watch.innerWidth=window.innerWidth.toString()+'px';window.globals.webState.watch.panelPxWidth=window.globals.webState.dynamic.panelPxWidth.toString()+'px'
;window.globals.webState.watch.panelPxHeight=window.globals.webState.dynamic.panelPxHeight.toString()+'px';window.globals.webState.watch.devicePixelRatio=window.devicePixelRatio}
_calibrateElementSize(){const displayUtilsElement=document.getElementById('displayUtils');const rulerX1=10;const rulerX2=20;const rulerY1=1;const rulerY2=11
;const rulerTextareaEl1=document.createElement('textarea');rulerTextareaEl1.setAttribute('cols',rulerX1.toString());rulerTextareaEl1.setAttribute('rows',rulerY1.toString())
;displayUtilsElement.appendChild(rulerTextareaEl1);const rulerTextareaEl2=document.createElement('textarea');rulerTextareaEl2.setAttribute('cols',rulerX2.toString())
;rulerTextareaEl2.setAttribute('rows',rulerY2.toString());displayUtilsElement.appendChild(rulerTextareaEl2);const rulerButton1El=document.createElement('button');rulerButton1El.textContent='Send'
;displayUtilsElement.appendChild(rulerButton1El);const rulerButton2El=document.createElement('button');rulerButton2El.textContent='⇅';displayUtilsElement.appendChild(rulerButton2El)
;const sizeX1=rulerTextareaEl1.getBoundingClientRect().width;const sizeX2=rulerTextareaEl2.getBoundingClientRect().width;const sizeY1=rulerTextareaEl1.getBoundingClientRect().height
;const sizeY2=rulerTextareaEl2.getBoundingClientRect().height;window.globals.webState.dynamic.testAreaColumnPxWidth=(sizeX2-sizeX1)/(rulerX2-rulerX1)
;window.globals.webState.dynamic.textAreaPaddingPxWidth=sizeX1-rulerX1*window.globals.webState.dynamic.testAreaColumnPxWidth
;window.globals.webState.dynamic.textAreaRowPxHeight=(sizeY2-sizeY1)/(rulerY2-rulerY1)
;window.globals.webState.dynamic.textareaPaddingPxHeight=sizeY1-rulerY1*window.globals.webState.dynamic.textAreaRowPxHeight
;window.globals.webState.dynamic.sendButtonWidthPx=rulerButton1El.getBoundingClientRect().width;window.globals.webState.dynamic.collapseButtonWidthPx=rulerButton2El.getBoundingClientRect().width
;displayUtilsElement.removeChild(rulerTextareaEl1);displayUtilsElement.removeChild(rulerTextareaEl2);displayUtilsElement.removeChild(rulerButton1El);displayUtilsElement.removeChild(rulerButton2El)}
calcInputAreaColSize(marginPxWidth){
if('number'===typeof marginPxWidth&&window.globals.webState.dynamic.testAreaColumnPxWidth&&'number'===typeof window.globals.webState.dynamic.testAreaColumnPxWidth&&window.globals.webState.dynamic.testAreaColumnPxWidth>1&&window.globals.webState.dynamic.textAreaPaddingPxWidth&&'number'===typeof window.globals.webState.dynamic.textAreaPaddingPxWidth&&window.globals.webState.dynamic.textAreaPaddingPxWidth>1){
let margin=marginPxWidth;if(margin<0)margin=0
;const cols=parseInt((window.globals.webState.dynamic.panelPxWidth-window.globals.webState.dynamic.textAreaPaddingPxWidth-margin)/window.globals.webState.dynamic.testAreaColumnPxWidth)
;return cols.toString()}else{console.log('alcInputAreaColSize() invalid input');return null}}handleExternalWindowResizeEvent(){this._updatePageMeasurements()
;if(window.globals.webState.dynamic.testAreaColumnPxWidth){if(window.devicePixelRatio)if(window.globals.webState.dynamic.lastDevicePixelRatio!==window.devicePixelRatio){
window.globals.webState.dynamic.lastDevicePixelRatio=window.devicePixelRatio;this._calibrateElementSize()}document.dispatchEvent(new CustomEvent('resize-custom-elements'))
;window.globals.webState.dynamic.lastPanelPxWidth=window.globals.webState.dynamic.panelPxWidth;window.globals.webState.dynamic.lastClientHeight=window.globals.webState.dynamic.panelPxHeight}}
_checkVerticalSliderPageWidth(){this._updatePageMeasurements()
;if(window.globals.webState.dynamic.testAreaColumnPxWidth)if(window.globals.webState.dynamic.lastPanelPxWidth!==window.globals.webState.dynamic.panelPxWidth||window.globals.webState.dynamic.lastPanelPxHeight!==window.globals.webState.dynamic.panelPxHeight){
window.globals.webState.dynamic.lastPanelPxWidth=window.globals.webState.dynamic.panelPxWidth;window.globals.webState.dynamic.lastPanelPxHeight=window.globals.webState.dynamic.panelPxHeight
;document.dispatchEvent(new CustomEvent('resize-custom-elements'))}}manualRecalcPageWidth(){this._updatePageMeasurements();this._calibrateElementSize()
;document.dispatchEvent(new CustomEvent('resize-custom-elements'))}timerTickHandler=()=>{this._checkVerticalSliderPageWidth()};initializePlugin(){this._updatePageMeasurements()
;window.globals.webState.dynamic.lastPanelPxWidth=window.globals.webState.dynamic.panelPxWidth;this._calibrateElementSize();document.dispatchEvent(new CustomEvent('resize-custom-elements',{detail:{}
}));let localStorageColorTheme=null;localStorageColorTheme=JSON.parse(window.localStorage.getItem('colorTheme'));if(localStorageColorTheme&&'dark'===localStorageColorTheme.theme){
document.querySelector('body').setAttribute('theme','dark');document.dispatchEvent(new CustomEvent('color-theme-changed',{detail:{theme:'dark'}}))}
if(localStorageColorTheme&&'light'===localStorageColorTheme.theme){document.querySelector('body').setAttribute('theme','light');document.dispatchEvent(new CustomEvent('color-theme-changed',{detail:{
theme:'light'}}))}setTimeout(()=>{this._calibrateElementSize();document.dispatchEvent(new CustomEvent('resize-custom-elements'))},900)}connectedCallback(){
document.addEventListener('color-theme-changed',event=>{if('light'===event.detail.theme){document.querySelector('body').classList.remove('global-body-theme-dark')
;document.querySelector('body').classList.add('global-body-theme-light')}else{document.querySelector('body').classList.remove('global-body-theme-light')
;document.querySelector('body').classList.add('global-body-theme-dark')}})}});window.customElements.define('beep-sounds',class extends HTMLElement{constructor(){super();this.beep1=null;this.beep2=null
;this.beep3=null;this.beep1InhibitTimer=0;this.beep2InhibitTimer=0;this.beep3InhibitTimer=0}_beepTimerTick=()=>{if(this.beep1InhibitTimer>0)this.beep1InhibitTimer--
;if(this.beep2InhibitTimer>0)this.beep2InhibitTimer--;if(this.beep3InhibitTimer>0)this.beep3InhibitTimer--};inhibitBeep=seconds=>{this.beep1InhibitTimer=seconds;this.beep2InhibitTimer=seconds
;this.beep3InhibitTimer=seconds};audioPromiseErrorStr='Browser policy has blocked Audio.play() '+'because user must interact with page or manually play sound first.';playBeep1Sound=()=>{
if(!this.beep1)if(window.globals.ircState.customBeepSounds)this.beep1=new Audio('sounds/custom-beep1.mp3');else this.beep1=new Audio('sounds/short-beep1.mp3');if(0===this.beep1InhibitTimer){
this.beep1.play().then(()=>{document.getElementById('headerBar').removeAttribute('beepicon')}).catch(error=>{
if('NotAllowedError'===error.name)console.info('playBeep1Sound() '+this.audioPromiseErrorStr);else if('NotSupportedError'===error.name)console.log('Audio download not available.');else console.error(error)
});this.beep1InhibitTimer=5}};playBeep2Sound=()=>{
if(!this.beep2)if(window.globals.ircState.customBeepSounds)this.beep2=new Audio('sounds/custom-beep2.mp3');else this.beep2=new Audio('sounds/short-beep2.mp3');if(0===this.beep2InhibitTimer){
this.beep2.play().catch(error=>{if('NotAllowedError'===error.name);else if('NotSupportedError'===error.name)console.log('Audio download not available.');else console.error(error)})
;this.beep2InhibitTimer=5}};playBeep3Sound=()=>{
if(!this.beep3)if(window.globals.ircState.customBeepSounds)this.beep3=new Audio('sounds/custom-beep3.mp3');else this.beep3=new Audio('sounds/short-beep3.mp3');if(0===this.beep3InhibitTimer){
this.beep3.play().then(()=>{document.getElementById('headerBar').removeAttribute('beepicon')}).catch(error=>{
if('NotAllowedError'===error.name)console.info('playBeep3Sound() '+this.audioPromiseErrorStr);else if('NotSupportedError'===error.name)console.log('Audio download not available.');else console.error(error)
});this.beep3InhibitTimer=5}};_areBeepsConfigured=()=>{let isAnyBeepEnabled=false;let beepEnableChanArray=null;beepEnableChanArray=JSON.parse(window.localStorage.getItem('beepEnableChanArray'))
;if(beepEnableChanArray&&Array.isArray(beepEnableChanArray))if(beepEnableChanArray.length>0)for(let i=0;i<beepEnableChanArray.length;i++){if(beepEnableChanArray[i].beep1)isAnyBeepEnabled=true
;if(beepEnableChanArray[i].beep2)isAnyBeepEnabled=true;if(beepEnableChanArray[i].beep3)isAnyBeepEnabled=true}let beepEnableObj=null;beepEnableObj=JSON.parse(window.localStorage.getItem('privMsgBeep'))
;if(beepEnableObj&&'object'===typeof beepEnableObj)if(beepEnableObj.beep)isAnyBeepEnabled=true;return isAnyBeepEnabled};userInitiatedAudioPlay=()=>{
document.getElementById('headerBar').removeAttribute('beepicon');if(this._areBeepsConfigured()){setTimeout(this.playBeep2Sound,100);setTimeout(this.playBeep3Sound,600)
;setTimeout(this.playBeep1Sound,950)}};testPlayBeepSound1=()=>{this.beep1InhibitTimer=0;this.playBeep1Sound()};testPlayBeepSound2=()=>{this.beep2InhibitTimer=0;this.playBeep2Sound()}
;testPlayBeepSound3=()=>{this.beep3InhibitTimer=0;this.playBeep3Sound()};timerTickHandler=()=>{this._beepTimerTick()};initializePlugin=()=>{
if(this._areBeepsConfigured())document.getElementById('headerBar').setAttribute('beepicon','')}});window.customElements.define('local-command-parser',class extends HTMLElement{
autoCompleteCommandList=['/ADMIN','/AWAY','/CTCP','/DEOP','/DEVOICE','/JOIN','/LIST','/ME','/MODE','/MOTD','/MSG','/NICK','/NOP','/NOTICE','/OP','/PART','/QUERY','/QUIT','/QUOTE','/TOPIC','/VERSION','/VOICE','/WHO','/WHOIS']
;autoCompleteRawCommandList=['ADMIN','AWAY','CAP','CONNECT','DIE','DISCONNECT','ERROR','GLINE','HELP','INFO','INVITE','ISON','JOIN','KICK','KILL','KLINE','LINKS','LIST','LUSERS','MODE','MOTD','NAMES','NICK','NOTICE','OPER','PART','PASS','PING','PONG','PRIVMSG','QUIT','REHASH','RESTART','SERVLIST','SQUERY','SQUIT','STATS','SUMMON','TIME','TOPIC','TRACE','USER','USERHOST','USERS','VERSION','WALLOPS','WHO','WHOIS','WHOWAS']
;textCommandParser=inputObj=>{const channelPrefixChars=document.getElementById('globVars').constants('channelPrefixChars');const _showIrcServerPanel=()=>{
document.getElementById('ircServerPanel').showPanel();document.dispatchEvent(new CustomEvent('cancel-zoom'))};const _isWS=inChar=>{if(' '===inChar.charAt(0))return true
;if(9===inChar.charCodeAt(0))return true;return false};const _isEOL=inChar=>{if('\n'===inChar.charAt(0))return true;if('\r'===inChar.charAt(0))return true;return false};let inStr=inputObj.inputString
;if(inStr.length>0&&_isEOL(inStr.charAt(inStr.length-1)))inStr=inStr.slice(0,inStr.length-1);if(inStr.length>0&&_isEOL(inStr.charAt(inStr.length-1)))inStr=inStr.slice(0,inStr.length-1)
;const inStrLen=inStr.length;const parsedCommand={command:'',params:[],restOf:[]};if(inStr.length<2)return{error:true,message:'Error no command not found',ircMessage:null}
;if('/'!==inStr.charAt(0))return{error:true,message:'Error missing / before command',ircMessage:null};if(_isWS(inStr.charAt(1)))return{error:true,message:'Error space after slash',ircMessage:null}
;let idx=1;while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){parsedCommand.command+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++
;parsedCommand.command=parsedCommand.command.toUpperCase();if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(null);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars1=''
;while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars1+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++;if(inStr.slice(idx,inStrLen).length>0){
parsedCommand.params.push(chars1);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars2='';while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars2+=inStr.charAt(idx);idx++}
while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++;if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(chars2);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars3=''
;while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars3+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++;if(inStr.slice(idx,inStrLen).length>0){
parsedCommand.params.push(chars3);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars4='';while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars4+=inStr.charAt(idx);idx++}
while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++;if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(chars4);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars5=''
;while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars5+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++;if(inStr.slice(idx,inStrLen).length>0){
parsedCommand.params.push(chars5);parsedCommand.restOf.push(inStr.slice(idx,inStrLen))}}}}}}const _parseChannelModes=(modeValue,chanUserMode,ircCommand,parsedCommand,inputObj)=>{
if('channel'!==inputObj.originType)return{error:true,message:ircCommand+' must be used in channel widnow',ircMessage:null};else if(parsedCommand.params.length>0){const nameArray=[]
;if(1===parsedCommand.params.length)nameArray.push(parsedCommand.restOf[0]);else{for(let i=1;i<parsedCommand.params.length;i++)nameArray.push(parsedCommand.params[i])
;nameArray.push(parsedCommand.restOf[parsedCommand.restOf.length-1])}if(nameArray.length>5)return{error:true,message:ircCommand+' command maximum of 5 names exceeded',ircMessage:null
};else if(channelPrefixChars.indexOf(nameArray[0].charAt(0))>=0)return{error:true,message:ircCommand+' command does not accept the channel name.',ircMessage:null};else{const returnObj={error:false,
message:'',ircMessage:null};returnObj.ircMessage='MODE ';returnObj.ircMessage+=inputObj.originName+' '+modeValue;for(let i=0;i<nameArray.length;i++)returnObj.ircMessage+=chanUserMode
;for(let i=0;i<nameArray.length;i++)returnObj.ircMessage+=' '+nameArray[i];return returnObj}}else return{error:true,message:'Expect: /'+ircCommand+' <nick1> ... [nick5]',ircMessage:null}}
;let ircMessage=null;switch(parsedCommand.command){case'ADMIN':_showIrcServerPanel();ircMessage='ADMIN';if(1===parsedCommand.restOf.length)ircMessage='ADMIN '+parsedCommand.restOf[0];break;case'AWAY':
_showIrcServerPanel();ircMessage='AWAY';if(parsedCommand.restOf.length>0)ircMessage='AWAY :'+parsedCommand.restOf[0];break;case'CTCP':{const ctcpDelim=1;if(2!==parsedCommand.params.length)return{
error:true,message:'Expect: /CTCP <nickname> <ctcp_command>',ircMessage:null}
;ircMessage='PRIVMSG '+parsedCommand.params[1]+' :'+String.fromCharCode(ctcpDelim)+parsedCommand.restOf[1].toUpperCase()+String.fromCharCode(ctcpDelim)}break;case'DEOP':{
const ro=_parseChannelModes('-','o','DEOP',parsedCommand,inputObj);if(ro.error)return ro;else ircMessage=ro.ircMessage}break;case'DEVOICE':{
const ro=_parseChannelModes('-','v','DEVOICE',parsedCommand,inputObj);if(ro.error)return ro;else ircMessage=ro.ircMessage}break;case'JOIN':if(parsedCommand.params.length<1)return{error:true,
message:'Expect: /JOIN <#channel>',ircMessage:null};if(1===parsedCommand.params.length){ircMessage='JOIN '+parsedCommand.restOf[0]
;document.getElementById('manageChannelsPanel').ircChannelsPendingJoin.push(parsedCommand.restOf[0].toLowerCase())}if(2===parsedCommand.params.length){
ircMessage='JOIN '+parsedCommand.params[1]+' '+parsedCommand.restOf[1];document.getElementById('manageChannelsPanel').ircChannelsPendingJoin.push(parsedCommand.params[1].toLowerCase())}break
;case'LIST':_showIrcServerPanel();if(0===parsedCommand.params.length)ircMessage='LIST';else ircMessage='LIST '+parsedCommand.restOf[0];break;case'ME':{if(parsedCommand.params.length<1)return{
error:true,message:'Expect: /ME <action-message>',ircMessage:null};const ctcpDelim=1
;if('channel'===inputObj.originType)ircMessage='PRIVMSG '+inputObj.originName+' :'+String.fromCharCode(ctcpDelim)+'ACTION '+parsedCommand.restOf[0]+String.fromCharCode(ctcpDelim)
;if('private'===inputObj.originType)ircMessage='PRIVMSG '+inputObj.originName+' :'+String.fromCharCode(ctcpDelim)+'ACTION '+parsedCommand.restOf[0]+String.fromCharCode(ctcpDelim)}break;case'MODE':
if(0===parsedCommand.restOf.length&&'channel'!==inputObj.originType){_showIrcServerPanel();ircMessage='MODE '+window.globals.ircState.nickName
}else if(1===parsedCommand.restOf.length&&parsedCommand.restOf[0].toLowerCase()===window.globals.ircState.nickName.toLowerCase()){_showIrcServerPanel()
;ircMessage='MODE '+window.globals.ircState.nickName
}else if(2===parsedCommand.restOf.length&&parsedCommand.params[1].toLowerCase()===window.globals.ircState.nickName.toLowerCase()&&parsedCommand.restOf[1].length>0){_showIrcServerPanel()
;ircMessage='MODE '+window.globals.ircState.nickName+' '+parsedCommand.restOf[1]
}else if(0===parsedCommand.restOf.length&&'channel'===inputObj.originType)ircMessage='MODE '+inputObj.originName;else if(1===parsedCommand.restOf.length&&window.globals.ircState.channels.indexOf(parsedCommand.restOf[0].toLowerCase())>=0)ircMessage='MODE '+parsedCommand.restOf[0];else if(parsedCommand.restOf.length>0&&'channel'===inputObj.originType&&('+'===parsedCommand.restOf[0].charAt(0)||'-'===parsedCommand.restOf[0].charAt(0)||'b'===parsedCommand.restOf[0].charAt(0)))ircMessage='MODE '+inputObj.originName+' '+parsedCommand.restOf[0];else if(parsedCommand.restOf.length>1&&window.globals.ircState.channels.indexOf(parsedCommand.params[1].toLowerCase())>=0)ircMessage='MODE '+parsedCommand.params[1]+' '+parsedCommand.restOf[1];else return{
error:true,message:'Expect: /MODE <nickname> [user-mode] or /MODE <#channel> <channel-mode>',ircMessage:null};break;case'MOTD':_showIrcServerPanel();ircMessage='MOTD'
;if(1===parsedCommand.restOf.length)ircMessage='MOTD '+parsedCommand.restOf[0];break;case'MSG':
if(parsedCommand.params.length>1&&channelPrefixChars.indexOf(parsedCommand.params[1].charAt(0))<0)ircMessage='PRIVMSG '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];else return{error:true,
message:'Expect: /MSG <nickname> <message-text>',ircMessage:null};break;case'NICK':if(parsedCommand.params.length<1)return{error:true,message:'Expect: /NICK <new-nickname>',ircMessage:null}
;_showIrcServerPanel();ircMessage='NICK '+parsedCommand.restOf[0];break;case'NOP':console.log('textCommandParser inputObj:'+JSON.stringify(inputObj,null,2))
;console.log('parsedCommand '+JSON.stringify(parsedCommand,null,2));return{error:false,message:null,ircMessage:null};case'NOTICE':
if(parsedCommand.params.length>1&&parsedCommand.restOf[1].length>0)ircMessage='NOTICE '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];else return{error:true,
message:'Expect: /NOTICE <nickname> <message-text>',ircMessage:null};break;case'OP':{const ro=_parseChannelModes('+','o','OP',parsedCommand,inputObj)
;if(ro.error)return ro;else ircMessage=ro.ircMessage}break;case'PART':if(parsedCommand.params.length<1)if('channel'===inputObj.originType)ircMessage='PART '+inputObj.originName;else return{error:true,
message:'Expect: /PART #channel [Optional message]',ircMessage:null
};else if(1===parsedCommand.params.length)ircMessage='PART '+parsedCommand.restOf[0];else ircMessage='PART '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];break;case'QUERY':
if(parsedCommand.params.length>1&&channelPrefixChars.indexOf(parsedCommand.params[1].charAt(0))<0)ircMessage='PRIVMSG '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];else return{error:true,
message:'Expect: /QUERY <nickname> <message-text>',ircMessage:null};break;case'QUIT':ircMessage='QUIT';if(parsedCommand.restOf.length>0)ircMessage='QUIT :'+parsedCommand.restOf[0];break;case'QUOTE':
if(parsedCommand.restOf.length>0){_showIrcServerPanel();ircMessage=parsedCommand.restOf[0]}else return{error:true,message:'Expect: /QUOTE RAWCOMMAND [arguments]',ircMessage:null};break;case'TOPIC':
if(parsedCommand.params.length>1&&window.globals.ircState.channels.indexOf(parsedCommand.params[1].toLowerCase())>=0)if('-delete'===parsedCommand.restOf[1])ircMessage='TOPIC '+parsedCommand.params[1]+' :';else ircMessage='TOPIC '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];else if(parsedCommand.params.length>0&&channelPrefixChars.indexOf(parsedCommand.restOf[0].charAt(0))<0&&'channel'===inputObj.originType)if('-delete'===parsedCommand.restOf[0])ircMessage='TOPIC '+inputObj.originName+' :';else ircMessage='TOPIC '+inputObj.originName+' :'+parsedCommand.restOf[0];else return{
error:true,message:'Expect: /TOPIC <#channel> <New-channel-topic-message>',ircMessage:null};break;case'VERSION':_showIrcServerPanel();ircMessage='VERSION'
;if(1===parsedCommand.restOf.length)ircMessage='VERSION '+parsedCommand.restOf[0];break;case'VOICE':{const ro=_parseChannelModes('+','v','VOICE',parsedCommand,inputObj)
;if(ro.error)return ro;else ircMessage=ro.ircMessage}break;case'WHO':if(0===parsedCommand.params.length){_showIrcServerPanel();ircMessage='WHO'}else{_showIrcServerPanel()
;ircMessage='WHO '+parsedCommand.restOf[0]}break;case'WHOIS':if(parsedCommand.params.length<1)return{error:true,message:'Expect: /WHOIS <nickname>',ircMessage:null};_showIrcServerPanel()
;ircMessage='WHOIS '+parsedCommand.restOf[0];break;default:}if(ircMessage)return{error:false,message:null,ircMessage:ircMessage};return{error:true,
message:'Command "/'+parsedCommand.command+'" unknown command.',ircMessage:null}};connectedCallback(){window.addEventListener('keydown',e=>{if(!window.globals.webState.webConnected)return
;if(e.altKey&&!e.ctrlKey&&!e.shiftKey){if(window.globals.ircState.ircConnected){if('KeyB'===e.code){document.dispatchEvent(new CustomEvent('collapse-all-panels'))
;document.dispatchEvent(new CustomEvent('cancel-zoom'))}if('KeyC'===e.code)document.getElementById('manageChannelsPanel').handleHotKey()
;if('KeyN'===e.code)document.getElementById('manageChannelsPanel').handleHotKeyNextChannel();if('KeyP'===e.code)document.getElementById('managePmPanels').handleHotKey()}
if('KeyH'===e.code)document.getElementById('helpPanel').handleHotKey();if('KeyI'===e.code)document.getElementById('ircControlsPanel').handleHotKey()
;if('KeyL'===e.code)document.getElementById('serverListPanel').handleHotKey();if('KeyS'===e.code)document.getElementById('ircServerPanel').handleHotKey()
;if('KeyX'===e.code)document.dispatchEvent(new CustomEvent('hide-all-panels'))}})}});window.customElements.define('remote-command-parser',class extends HTMLElement{_parseIrcMessage=message=>{
const _extractTimeString=(start,end,messageString)=>{let i=start;let timeString='';while(' '!==messageString.charAt(i)&&i<=end){timeString+=messageString.charAt(i);i++}
const outStringHMS=document.getElementById('displayUtils').timestampToHMS(timeString);const outStringYMD=document.getElementById('displayUtils').timestampToYMD(timeString);return{dataHMS:outStringHMS,
dataYMD:outStringYMD,nextIndex:i+1}};const _isColonString=(start,messageString)=>{if(':'===messageString.charAt(start))return{isColonStr:true,nextIndex:start+1};else return{isColonStr:false,
nextIndex:start}};const _extractMidString=(start,end,messageString)=>{let i=start;let outString='';while(' '!==messageString.charAt(i)&&i<=end){outString+=messageString.charAt(i);i++}
if(0===outString.length)outString=null;return{data:outString,nextIndex:i+1}};const _extractFinalString=(start,end,messageString)=>{let i=start;let outString='';while(i<=end){
outString+=messageString.charAt(i);i++}if(0===outString.length)outString=null;return{data:outString,nextIndex:i+1}};const _extractNickname=inText=>{
if(inText)if(inText.indexOf('!')>=0&&inText.indexOf('@')>=0&&inText.indexOf('!')<inText.indexOf('@')){const nick=inText.split('!')[0];return nick}else return null;else return null}
;const _extractHostname=inText=>{if(inText)if(inText.indexOf('!')>=0&&inText.indexOf('@')>=0&&inText.indexOf('!')<inText.indexOf('@')){const host=inText.split('!')[1];return host
}else return null;else return null};let timestamp=null;let datestamp=null;let prefix=null;let extNick=null;let extHost=null;let command=null;const params=[];const messageString=message.toString()
;const end=messageString.length-1;let temp={nextIndex:0};temp=_extractTimeString(temp.nextIndex,end,messageString);timestamp=temp.dataHMS;datestamp=temp.dataYMD
;temp=_isColonString(temp.nextIndex,messageString);if(temp.isColonStr){temp=_extractMidString(temp.nextIndex,end,messageString);prefix=temp.data;extNick=_extractNickname(temp.data)
;extHost=_extractHostname(temp.data)}temp=_extractMidString(temp.nextIndex,end,messageString);command=temp.data;let done=false;while(!done)if(temp.nextIndex>end)done=true;else{
temp=_isColonString(temp.nextIndex,messageString);if(temp.isColonStr){temp=_extractFinalString(temp.nextIndex,end,messageString);params.push(temp.data);done=true}else{
temp=_extractMidString(temp.nextIndex,end,messageString);if(temp.data&&temp.data.length>0)params.push(temp.data);else done=true}}return{timestamp:timestamp,datestamp:datestamp,prefix:prefix,
nick:extNick,host:extHost,command:command,params:params}};parseBufferMessage=message=>{const errorPanelEl=document.getElementById('errorPanel')
;const displayUtilsEl=document.getElementById('displayUtils');const ircServerPanelEl=document.getElementById('ircServerPanel')
;if('HEARTBEAT'===message)document.getElementById('websocketPanel').onHeartbeatReceived();else if('UPDATE'===message)document.getElementById('ircControlsPanel').getIrcState().catch(err=>{
console.log(err);let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];errorPanelEl.showError(message)
});else if('CACHERESET'===message)document.dispatchEvent(new CustomEvent('erase-before-reload'));else if('CACHEPULL'===message)document.dispatchEvent(new CustomEvent('update-from-cache'));else if('DEBUGPONG'===message){
if(window.globals.startTimeMsTest3&&'number'===typeof window.globals.startTimeMsTest3){const pong2=Date.now()-window.globals.startTimeMsTest3
;document.getElementById('debugPanel').appendDebugResult('Websocket response: '+pong2.toString()+' ms\n');console.log('Websocket response: '+pong2.toString()+' ms')}
}else if(message.startsWith('LAG=')&&9===message.length){const pingStr=message.split('=')[1];let pingFloat=null;try{pingFloat=parseFloat(pingStr)}catch(err){pingFloat=null}
if(pingFloat&&'number'===typeof pingFloat){window.globals.webState.lag.last=pingFloat;if(pingFloat<window.globals.webState.lag.min)window.globals.webState.lag.min=pingFloat
;if(pingFloat>window.globals.webState.lag.max)window.globals.webState.lag.max=pingFloat}}else{const _showNotExpiredError=errStr=>{const timeNow=new Date;const timeNowSeconds=parseInt(timeNow/1e3)
;const timeMessageSeconds=document.getElementById('displayUtils').timestampToUnixSeconds(message.split(' ')[0])
;if(timeNowSeconds-timeMessageSeconds<errorPanelEl.errorExpireSeconds)errorPanelEl.showError(errStr)};if('--\x3e'===message.split(' ')[0])return;if('webServer:'===message.split(' ')[0])return
;if('webError:'===message.split(' ')[0]){if(message.length>10)errorPanelEl.showError(message.slice(10));return}const parsedMessage=this._parseIrcMessage(message)
;document.getElementById('showRaw').displayParsedServerMessage(parsedMessage);ircServerPanelEl.displayFormattedServerMessage(parsedMessage,message)
;if(parseInt(parsedMessage.command)>=400&&parseInt(parsedMessage.command)<500)_showNotExpiredError(message.slice(12,message.length));switch(parsedMessage.command){case'324':
document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break;case'329':document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break;case'367':
document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break;case'368':document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break
;case'ERROR':
if(!window.globals.ircState.ircRegistered&&1===parsedMessage.params.length)if(!window.globals.webState.cacheReloadInProgress)document.getElementById('errorPanel').showError('ERROR '+parsedMessage.params[0])
;break;case'KICK':document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break;case'JOIN':
document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break;case'MODE':
if(document.getElementById('globVars').constants('channelPrefixChars').indexOf(parsedMessage.params[0].charAt(0))>=0)document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);else ircServerPanelEl.displayPlainServerMessage(displayUtilsEl.cleanFormatting(displayUtilsEl.cleanCtcpDelimiter(parsedMessage.timestamp+' Mode ['+parsedMessage.params[1]+'] '+parsedMessage.params[0])))
;break;case'cachedNICK':document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break;case'NICK':
document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break;case'NOTICE':
if(!parsedMessage.nick||0===parsedMessage.nick.length)ircServerPanelEl.displayPlainServerMessage(displayUtilsEl.cleanFormatting(displayUtilsEl.cleanCtcpDelimiter(parsedMessage.timestamp+' '+parsedMessage.prefix+' '+parsedMessage.params[1])));else{
const ctcpDelim=1;if(null===parsedMessage.params[1])parsedMessage.params[1]=''
;if(parsedMessage.params[1].charCodeAt(0)===ctcpDelim)document.getElementById('ctcpParser').parseCtcpMessage(parsedMessage,message);else{
document.getElementById('noticePanel').displayNoticeMessage(parsedMessage);document.getElementById('manageChannelsPanel').displayChannelNoticeMessage(parsedMessage)}}break;case'PART':
document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break;case'PRIVMSG':{const ctcpDelim=1
;if(parsedMessage.params[1].charCodeAt(0)===ctcpDelim)document.getElementById('ctcpParser').parseCtcpMessage(parsedMessage,message);else{
const chanPrefixIndex=document.getElementById('globVars').constants('channelPrefixChars').indexOf(parsedMessage.params[0].charAt(0))
;const channelIndex=window.globals.ircState.channels.indexOf(parsedMessage.params[0].toLowerCase())
;if(channelIndex>=0)document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);else if(chanPrefixIndex>=0)ircServerPanelEl.displayFormattedServerMessage(parsedMessage,message);else document.getElementById('managePmPanels').displayPrivateMessage(parsedMessage)
}}break;case'cachedQUIT':case'QUIT':document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);break;case'TOPIC':
if(document.getElementById('globVars').constants('channelPrefixChars').indexOf(parsedMessage.params[0].charAt(0))>=0)document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);else console.log('Error message TOPIC to unknown channel')
;break;case'WALLOPS':document.getElementById('wallopsPanel').displayWallopsMessage(parsedMessage);break;default:}}}});window.customElements.define('ctcp-parser',class extends HTMLElement{
parseCtcpMessage=(parsedMessage,message)=>{const channelPrefixChars=document.getElementById('globVars').constants('channelPrefixChars');const ctcpDelim=1;const ctcpMessage=parsedMessage.params[1]
;const end=ctcpMessage.length-1;if(1!==ctcpMessage.charCodeAt(0)){console.log('parseCtcpMessage() missing CTCP start delimiter');return}let i=1;let ctcpCommand='';let ctcpRest=''
;while(' '!==ctcpMessage.charAt(i)&&i<=end){if(ctcpMessage.charCodeAt(i)!==ctcpDelim)ctcpCommand+=ctcpMessage.charAt(i);i++}ctcpCommand=ctcpCommand.toUpperCase()
;while(' '===ctcpMessage.charAt(i)&&i<=end)i++;while(ctcpMessage.charCodeAt(i)!==ctcpDelim&&i<=end){ctcpRest+=ctcpMessage.charAt(i);i++}if('ACTION'===ctcpCommand){
const index=window.globals.ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());if(index>=0){parsedMessage.params[1]=parsedMessage.nick+' '+ctcpRest;parsedMessage.nick='*'
;document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage)
}else if(channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0))>=0)document.getElementById('ircServerPanel').displayFormattedServerMessage(parsedMessage,message);else{
parsedMessage.params[1]=ctcpRest;parsedMessage.isPmCtcpAction=true;document.getElementById('managePmPanels').displayPrivateMessage(parsedMessage)}
}else if(parsedMessage.nick===window.globals.ircState.nickName)if('PRIVMSG'===parsedMessage.command.toUpperCase())document.getElementById('noticePanel').displayCtcpNoticeMessage(parsedMessage.timestamp+' '+'CTCP 1 Request to '+parsedMessage.params[0]+': '+ctcpCommand+' '+ctcpRest);else{
let replyContents='';if(parsedMessage.params.length>2)for(let i=2;i<parsedMessage.params.length;i++)if(parsedMessage.params[i].charCodeAt(0)!==ctcpDelim){
replyContents+=document.getElementById('displayUtils').cleanCtcpDelimiter(parsedMessage.params[i]);if(i!==parsedMessage.params.length)replyContents+=' '}
document.getElementById('noticePanel').displayCtcpNoticeMessage(parsedMessage.timestamp+' '+'CTCP 2 Reply to '+parsedMessage.params[0]+': '+ctcpCommand+' '+replyContents)
}else if('PRIVMSG'===parsedMessage.command.toUpperCase())document.getElementById('noticePanel').displayCtcpNoticeMessage(parsedMessage.timestamp+' '+'CTCP 3 Request from '+parsedMessage.nick+': '+ctcpCommand+' '+ctcpRest);else document.getElementById('noticePanel').displayCtcpNoticeMessage(parsedMessage.timestamp+' '+'CTCP 4 Reply from '+parsedMessage.nick+': '+ctcpCommand+' '+ctcpRest)
}});window.customElements.define('user-info',class extends HTMLElement{getLoginInfo=()=>new Promise((resolve,reject)=>{const fetchController=new AbortController
;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner');const fetchOptions={method:'GET',cache:'no-store',
redirect:'error',signal:fetchController.signal,headers:{Accept:'application/json'}};const fetchURL='/userinfo';activitySpinnerEl.requestActivitySpinner()
;const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status
;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;if(!('user'in responseJson))throw new Error('Token validation failed.');window.globals.webState.loginUser=responseJson;let lastLoginUser=null;try{
lastLoginUser=JSON.parse(window.localStorage.getItem('lastLoginUser'))}catch(error){}
if(!lastLoginUser)window.localStorage.clear();else if('userid'in lastLoginUser&&lastLoginUser.userid!==responseJson.userid)window.localStorage.clear()
;const newLoginTimestamp=Math.floor(Date.now()/1e3);const newLoginUser={timestamp:newLoginTimestamp,userid:responseJson.userid}
;window.localStorage.setItem('lastLoginUser',JSON.stringify(newLoginUser));resolve(JSON.parse(JSON.stringify(responseJson)))}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);message=message.split('\n')[0];document.getElementById('errorPanel').showError('Error retrieving user info: '+message);reject(error)})})})
;window.customElements.define('websocket-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('websocketPanelTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.firstConnect=true}_scrollToTop=()=>{this.focus();const newVertPos=window.scrollY+this.getBoundingClientRect().top-50
;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this._scrollToTop()};collapsePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;_updateWebsocketStatus=()=>{if(!window.globals.webState.webConnected){document.dispatchEvent(new CustomEvent('web-connect-changed'));this.showPanel()
;document.dispatchEvent(new CustomEvent('hide-all-panels',{detail:{except:['websocketPanel']}}))}else if(window.globals.webState.webConnecting){
document.dispatchEvent(new CustomEvent('web-connect-changed'));this.showPanel();document.dispatchEvent(new CustomEvent('hide-all-panels',{detail:{except:['websocketPanel']}}))
}else document.dispatchEvent(new CustomEvent('web-connect-changed'))};_initWebSocketAuth=()=>new Promise((resolve,reject)=>{const fetchController=new AbortController
;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner');const fetchOptions={method:'POST',redirect:'error',
signal:fetchController.signal,headers:{'CSRF-Token':document.getElementById('globVars').csrfToken,'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify({
purpose:'websocket-auth'})};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/wsauth';activitySpinnerEl.requestActivitySpinner()
;const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status
;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;resolve(window.globals.ircState)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner();window.globals.webState.webConnected=false
;window.globals.webState.webConnecting=false;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})});_connectWebSocket=()=>{window.globals.wsocket=new WebSocket(document.getElementById('globVars').webSocketUrl+'/irc/ws')
;window.globals.webState.websocketCount++;window.globals.wsocket.addEventListener('open',event=>{window.globals.webState.webConnected=true;window.globals.webState.webConnecting=false
;window.globals.webState.times.webConnect=Math.floor(Date.now()/1e3);window.globals.webState.count.webConnect++
;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Websocket opened successfully\n';this._updateWebsocketStatus();this._resetHeartbeatTimer()
;document.getElementById('ircControlsPanel').getIrcState().then(()=>{this.shadowRoot.getElementById('reconnectStatusDivId').textContent='Websocket opened successfully\n';this.hidePanel()
;if(this.firstConnect){this.firstConnect=false;document.getElementById('activitySpinner').cancelActivitySpinner()}document.dispatchEvent(new CustomEvent('update-from-cache'))}).catch(err=>{
console.log(err);let message=err.message||err.toString()||'Error calling getIrcState()';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)
;document.getElementById('errorPanel').showError('Error calling getIrcState() after web socket connection.')
;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Error calling getIrcState() after web socket connection.\n'
;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Closing websocket\n';window.globals.webState.webConnectOn=false
;if(window.globals.wsocket)window.globals.wsocket.close(3002,'Closed due to getIrcState() error.');this.showPanel();document.dispatchEvent(new CustomEvent('hide-all-panels',{detail:{
except:['websocketPanel']}}))})});window.globals.wsocket.addEventListener('close',event=>{if(window.globals.webState.websocketCount>0){window.globals.webState.websocketCount--
;console.log('Websocket closed, count: '+window.globals.webState.websocketCount+' code: '+event.code+' '+event.reason);if(0===window.globals.webState.websocketCount){
if(window.globals.webState.webConnected)if('code'in event&&3001===event.code)this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Web page disconnected at user request.\n'+'Auto-reconnect disabled\n';else{
this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Web socket connection closed, count: '+window.globals.webState.websocketCount+'\n'+'Code: '+event.code+' '+event.reason+'\n'
;if(!window.globals.webState.webConnectOn)window.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Automatic web reconnect is disabled. \nPlease reconnect manually.\n'}
window.globals.webState.webConnected=false;window.globals.webState.webConnecting=false;this._updateWebsocketStatus()}}});window.globals.wsocket.addEventListener('error',error=>{if(error){
let errMessage=error.message||error.toString()||'Websocket error event occurred';console.log(errMessage);errMessage=errMessage.split('\n')[0]
;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Websocket Error \n'}window.globals.webState.webConnected=false;window.globals.webState.webConnecting=false
;this._updateWebsocketStatus()});let previousBufferFragment='';const parseStreamBuffer=inBuffer=>{if(!inBuffer)return;const data=previousBufferFragment.concat(inBuffer);previousBufferFragment=''
;const len=data.length;if(0===len)return;let index=0;let count=0;for(let i=0;i<len;i++){const charCode=data.charCodeAt(i);if(10!==charCode&&13!==charCode)count+=1;else{if(count>0){
const message=data.slice(index,index+count);document.getElementById('showRaw').displayRawIrcServerMessage(message);document.getElementById('remoteCommandParser').parseBufferMessage(message)}index=i+1
;count=0}}if(count>0)previousBufferFragment=data.slice(index,index+count)};window.globals.wsocket.addEventListener('message',event=>{parseStreamBuffer(event.data)})}
;_testWebServerRunning=()=>new Promise((resolve,reject)=>{const fetchController=new AbortController;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout')
;const activitySpinnerEl=document.getElementById('activitySpinner');const fetchOptions={method:'GET',redirect:'error',signal:fetchController.signal,headers:{Accept:'application/json'}}
;const fetchURL=document.getElementById('globVars').webServerUrl+'/status';activitySpinnerEl.requestActivitySpinner();const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout)
;fetch(fetchURL,fetchOptions).then(response=>{if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error')
;err.status=response.status;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();if(Object.hasOwn(responseJson,'status')&&'ok'===responseJson.status)resolve({});else{const statErr=new Error('Call to /status did not return ok')
;reject(statErr)}}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Error: No internet or server down\n';reject(error)})})
;_testWebServerLoginCookie=()=>new Promise((resolve,reject)=>{const fetchController=new AbortController;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout')
;const activitySpinnerEl=document.getElementById('activitySpinner');const fetchOptions={method:'GET',redirect:'error',signal:fetchController.signal,headers:{Accept:'application/json'}}
;const fetchURL=document.getElementById('globVars').webServerUrl+'/secure';activitySpinnerEl.requestActivitySpinner();const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout)
;fetch(fetchURL,fetchOptions).then(response=>{if(200===response.status)return response.json();else{console.log(response.status);if(403===response.status)window.location.href='/login'
;return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}
}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner();if(Object.hasOwn(responseJson,'secure')&&'ok'===responseJson.secure)resolve({});else{
const statErr=new Error('Call to /secure did not return ok');reject(statErr)}}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})});_reConnectWebSocketAfterDisconnect=()=>{this._testWebServerRunning().then(()=>{
this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Server found, Checking authorization.\n';return Promise.resolve({})}).then(this._testWebServerLoginCookie).then(()=>{
this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Login authorization confirmed, opening web socket.\n';return Promise.resolve({})}).then(this._initWebSocketAuth).then(()=>{
this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Authorizing websocket....\n';setTimeout(()=>{this._connectWebSocket()},100)}).catch(err=>{
let errMessage=err.message||err.toString()||'Websocket Authorization Error';console.log(errMessage);errMessage=errMessage.split('\n')[0]
;document.getElementById('errorPanel').showError('Error connecting web socket: '+errMessage);this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Error: authorizing websocket.\n'
;window.globals.webState.webConnected=false;window.globals.webState.webConnecting=false;this._updateWebsocketStatus()})};firstWebSocketConnectOnPageLoad=()=>{
const persistedWebsocketState=JSON.parse(window.localStorage.getItem('persistedWebsocketState'))
;if(persistedWebsocketState&&persistedWebsocketState.persist)this.shadowRoot.getElementById('persistCheckBoxId').checked=true;if(persistedWebsocketState&&persistedWebsocketState.disabled){
window.globals.webState.webConnectOn=false;this.shadowRoot.getElementById('reconnectStatusDivId').textContent='Auto-reconnect disabled';this.showPanel()
;document.getElementById('activitySpinner').cancelActivitySpinner()}else{window.globals.webState.webConnectOn=true;window.globals.webState.webConnecting=true;this._initWebSocketAuth().then(()=>{
this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Authorizing websocket....\n';setTimeout(()=>{this._connectWebSocket()},100)}).catch(err=>{this.showPanel()
;let errMessage=err.message||err.toString()||'Unknown error';console.log(errMessage);errMessage=errMessage.split('\n')[0]
;document.getElementById('errorPanel').showError('Error connecting web socket '+errMessage)})}};_connectHandler=()=>{if(!window.globals.webState.webConnected&&!window.globals.webState.webConnecting){
window.globals.webState.webConnectOn=true;window.globals.webState.webConnecting=true;this._updateWebsocketStatus()
;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Reconnect to web server initiated (Manual)\n';this._reConnectWebSocketAfterDisconnect()
;const persist=this.shadowRoot.getElementById('persistCheckBoxId').checked;if(persist){const persistedWebsocketStateObj={persist:true,disabled:false}
;window.localStorage.setItem('persistedWebsocketState',JSON.stringify(persistedWebsocketStateObj))}}};_disconnectHandler=()=>{if(window.globals.webState.webConnected){
this.shadowRoot.getElementById('reconnectStatusDivId').textContent='Placing web browser in "standby".\n'+'Closing websocket to remote IRC client.\n';window.globals.webState.webConnectOn=false
;if(window.globals.wsocket)window.globals.wsocket.close(3001,'Disconnect on request');const persist=this.shadowRoot.getElementById('persistCheckBoxId').checked;if(persist){
const persistedWebsocketStateObj={persist:true,disabled:true};window.localStorage.setItem('persistedWebsocketState',JSON.stringify(persistedWebsocketStateObj))}}};webConnectNavBarMenuHandler=action=>{
if('connect'===action)this._connectHandler();else if('disconnect'===action)this._disconnectHandler()};_webStatusIconTouchDebounce=false;webConnectHeaderBarIconHandler=()=>{
if(this._webStatusIconTouchDebounce)return;this._webStatusIconTouchDebounce=true;setTimeout(()=>{this._webStatusIconTouchDebounce=false},1e3)
;if(!window.globals.webState.webConnected&&!window.globals.webState.webConnecting)this._connectHandler();else if(window.globals.webState.webConnected)this._disconnectHandler()};wsReconnectCounter=0
;wsReconnectTimer=0;_reconnectTimerTickHandler=()=>{if(!window.globals.webState.webConnectOn||window.globals.webState.webConnected){this.wsReconnectCounter=0;this.wsReconnectTimer=0;return}
if(window.globals.webState.webConnecting)return;this.wsReconnectTimer++;if(0===this.wsReconnectCounter){if(this.wsReconnectTimer>0){window.globals.webState.webConnecting=true
;this._updateWebsocketStatus();this.wsReconnectTimer=0;this.wsReconnectCounter++;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Reconnect to web server initiated (Timer-1)\n'
;this._reConnectWebSocketAfterDisconnect()}}else if(1===this.wsReconnectCounter){if(this.wsReconnectTimer>5){window.globals.webState.webConnecting=true;this._updateWebsocketStatus()
;this.wsReconnectTimer=0;this.wsReconnectCounter++;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Reconnect to web server initiated (Timer-2)\n'
;this._reConnectWebSocketAfterDisconnect()}}else if(this.wsReconnectCounter>10){window.globals.webState.webConnectOn=false
;if(11===this.wsReconnectCounter)this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Auto-reconnect disabled\n'}else if(this.wsReconnectTimer>15){
window.globals.webState.webConnecting=true;this._updateWebsocketStatus();this.wsReconnectTimer=0;this.wsReconnectCounter++
;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Reconnect to web server initiated (Timer-3)\n';this._reConnectWebSocketAfterDisconnect()}};heartbeatExpirationTimeSeconds=15
;heartbeatUpCounter=0;_resetHeartbeatTimer=()=>{this.heartbeatUpCounter=0};onHeartbeatReceived=()=>{this.heartbeatUpCounter=0};_heartbeatTimerTickHandler=()=>{this.heartbeatUpCounter++
;if(window.globals.webState.webConnected)if(this.heartbeatUpCounter>this.heartbeatExpirationTimeSeconds+1){console.log('HEARTBEAT timeout + 2 seconds, socket unresponsive, forcing disconnect')
;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Web socket connection timeout, socket unresponsive, force disconnect\n';window.globals.webState.webConnected=false
;window.globals.webState.webConnecting=false;this._updateWebsocketStatus()}else if(this.heartbeatUpCounter===this.heartbeatExpirationTimeSeconds){
console.log('HEARTBEAT timeout + 0 seconds , attempting to closing socket');this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Web socket connection timeout, attempting to close\n'
;if(window.globals.wsocket)window.globals.wsocket.close(3e3,'Heartbeat timeout')}};timerTickHandler=()=>{this._reconnectTimerTickHandler();this._heartbeatTimerTickHandler()};initializePlugin(){
this.shadowRoot.getElementById('manualWebSocketReconnectButtonId').setAttribute('title','Connect or disconnect web browser from remote IRC client')
;this.shadowRoot.getElementById('stopWebSocketReconnectButtonId').setAttribute('title','Disable auto-reconnect to remote IRC client')
;this.shadowRoot.getElementById('persistCheckBoxId').setAttribute('title','Remember websocket disabled state in future page load/refresh')}connectedCallback(){
this.shadowRoot.getElementById('manualWebSocketReconnectButtonId').addEventListener('click',()=>{if(!window.globals.webState.webConnected&&!window.globals.webState.webConnecting){
window.globals.webState.webConnectOn=true;window.globals.webState.webConnecting=true;this._updateWebsocketStatus()
;this.shadowRoot.getElementById('reconnectStatusDivId').textContent+='Reconnect to web server initiated (Manual)\n';this._reConnectWebSocketAfterDisconnect()}
const persist=this.shadowRoot.getElementById('persistCheckBoxId').checked;if(persist){const persistedWebsocketStateObj={persist:true,disabled:false}
;window.localStorage.setItem('persistedWebsocketState',JSON.stringify(persistedWebsocketStateObj))}});this.shadowRoot.getElementById('stopWebSocketReconnectButtonId').addEventListener('click',()=>{
if(!window.globals.webState.webConnected){window.globals.webState.webConnectOn=false;window.globals.webState.webConnecting=false;this._updateWebsocketStatus()
;this.shadowRoot.getElementById('reconnectStatusDivId').textContent='Auto-reconnect disabled\n';const persist=this.shadowRoot.getElementById('persistCheckBoxId').checked;if(persist){
const persistedWebsocketStateObj={persist:true,disabled:true};window.localStorage.setItem('persistedWebsocketState',JSON.stringify(persistedWebsocketStateObj))}}})
;this.shadowRoot.getElementById('persistCheckBoxId').addEventListener('click',()=>{if(this.shadowRoot.getElementById('persistCheckBoxId').checked){const disabled=!window.globals.webState.webConnectOn
;const persistedWebsocketStateObj={persist:true,disabled:disabled};window.localStorage.setItem('persistedWebsocketState',JSON.stringify(persistedWebsocketStateObj))
}else window.localStorage.removeItem('persistedWebsocketState')});this.shadowRoot.getElementById('websocketInfoButtonId').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('websocketInfoDivId').hasAttribute('hidden'))this.shadowRoot.getElementById('websocketInfoDivId').removeAttribute('hidden');else this.shadowRoot.getElementById('websocketInfoDivId').setAttribute('hidden','')
});document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('hide-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('show-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()}else if(event.detail&&event.detail.debug)this.showPanel()})}})
;customElements.define('nav-menu',class extends HTMLElement{constructor(){super();const template=document.getElementById('navMenuTemplate');const templateContent=template.content;this.attachShadow({
mode:'open'}).appendChild(templateContent.cloneNode(true));this.previousChannels=[];this.previousPmPanels=[];this.arrayOfMenuElements=[];this.ircConnectedLast=null;this.webConnectedLast=null}
toggleDropdownMenu=()=>{this.shadowRoot.getElementById('navDropdownDivId').classList.toggle('nav-dropdown-div-show')};closeDropdownMenu=()=>{
this.shadowRoot.getElementById('navDropdownDivId').classList.remove('nav-dropdown-div-show')};handleServerUnreadUpdate=status=>{const itemEl=this.shadowRoot.getElementById('item3_3_Id')
;if(status)itemEl.textContent='IRC Server (New Messages)';else itemEl.textContent='IRC Server (Alt-S)'};handleNoticeUnreadUpdate=status=>{const itemEl=this.shadowRoot.getElementById('item3_5_Id')
;if(status)itemEl.textContent='Notices (New Messages)';else itemEl.textContent='Notices'};handleWallopsUnreadUpdate=status=>{const itemEl=this.shadowRoot.getElementById('item3_4_Id')
;if(status)itemEl.textContent='Wallops (New Messages)';else itemEl.textContent='Wallops'};handlePmListUpdate=()=>{const pmPanels=Array.from(window.globals.webState.activePrivateMessageNicks)
;let changed=false
;if(pmPanels.length!==this.previousPmPanels.length)changed=true;else if(pmPanels.length>0)for(let i=0;i<pmPanels.length;i++)if(pmPanels[i].toLowerCase()!==this.previousPmPanels[i].toLowerCase())changed=true
;if(changed){const parentEl=this.shadowRoot.getElementById('dropdownMenuPrivMsgContainerId');while(parentEl.firstChild){parentEl.firstChild.removeEventListener('click',this.handlePmPanelClick)
;parentEl.removeChild(parentEl.firstChild)}this.previousPmPanels=[];if(pmPanels.length>0)for(let i=0;i<pmPanels.length;i++){const pmPanelMenuItem=document.createElement('div')
;pmPanelMenuItem.classList.add('nav-group01');pmPanelMenuItem.classList.add('nav-level1');pmPanelMenuItem.pmPanelName=pmPanels[i].toLowerCase()
;pmPanelMenuItem.setAttribute('pm-panel-name',pmPanels[i].toLowerCase());if(this.shadowRoot.getElementById('item1_1_Id').hasAttribute('collapsed'))pmPanelMenuItem.setAttribute('collapsed','')
;const pmPanelNameSpan=document.createElement('span');pmPanelNameSpan.classList.add('mr10')
;if(pmPanels[i].toLowerCase()===window.globals.webState.activePrivateMessageCsNicks[i].toLowerCase())pmPanelNameSpan.textContent=window.globals.webState.activePrivateMessageCsNicks[i];else pmPanelNameSpan.textContent=pmPanels[i]
;pmPanelNameSpan.pmPanelName=pmPanels[i].toLowerCase();pmPanelNameSpan.setAttribute('pm-panel-name',pmPanels[i].toLowerCase());pmPanelMenuItem.appendChild(pmPanelNameSpan)
;const pmPanelMessageCount=document.createElement('div');pmPanelMessageCount.classList.add('global-count');pmPanelMessageCount.setAttribute('title','Unread Message Count')
;if('light'===document.querySelector('body').getAttribute('theme')){pmPanelMessageCount.classList.add('global-text-theme-light');pmPanelMessageCount.classList.add('global-border-theme-light')}else{
pmPanelMessageCount.classList.add('global-text-theme-dark');pmPanelMessageCount.classList.add('global-border-theme-dark')}pmPanelMessageCount.textContent='0'
;pmPanelMessageCount.setAttribute('hidden','');pmPanelMessageCount.pmPanelName=pmPanels[i].toLowerCase();pmPanelMessageCount.setAttribute('pm-panel-name',pmPanels[i].toLowerCase())
;pmPanelMenuItem.appendChild(pmPanelMessageCount);this.previousPmPanels.push(pmPanels[i].toLowerCase());parentEl.appendChild(pmPanelMenuItem)
;pmPanelMenuItem.addEventListener('click',this.handlePmPanelClick)}this.arrayOfMenuElements=this.shadowRoot.querySelectorAll('.nav-level1')}};handlePmPanelClick=event=>{event.stopPropagation()
;const privmsgName=event.target.pmPanelName.toLowerCase();document.getElementById('privmsg:'+privmsgName).showAndScrollPanel();this.closeDropdownMenu()};_showHideItemsInMenu=()=>{
if(window.globals.ircState.ircConnected!==this.ircConnectedLast||window.globals.webState.webConnected!==this.webConnectedLast){this.ircConnectedLast=window.globals.ircState.ircConnected
;this.webConnectedLast=window.globals.webState.webConnected;this.closeDropdownMenu()
;const ircMenuIdList=['group01ButtonId','group02ButtonId','item3_4_Id','item3_5_Id','item4_2_Id','item4_3_Id','item4_4_Id']
;const webMenuIdList=['group01ButtonId','group02ButtonId','group03ButtonId','item4_1_Id','item4_2_Id','item4_3_Id','item4_4_Id'];webMenuIdList.forEach(menuId=>{
this.shadowRoot.getElementById(menuId).removeAttribute('unavailable')});ircMenuIdList.forEach(menuId=>{this.shadowRoot.getElementById(menuId).removeAttribute('unavailable')})
;if(!window.globals.webState.webConnected)webMenuIdList.forEach(menuId=>{this.shadowRoot.getElementById(menuId).setAttribute('unavailable','')})
;if(!window.globals.ircState.ircConnected)ircMenuIdList.forEach(menuId=>{this.shadowRoot.getElementById(menuId).setAttribute('unavailable','')});this.arrayOfMenuElements.forEach(itemId=>{
itemId.setAttribute('collapsed','')})}};_handleWebConnectChanged=()=>{this._showHideItemsInMenu()
;if(window.globals.webState.webConnected||window.globals.webState.webConnecting)this.shadowRoot.getElementById('item4_6_Id').textContent='Place web page in Standby';else this.shadowRoot.getElementById('item4_6_Id').textContent='Re-connect web page.'
};_handleIrcStateChanged=()=>{this._showHideItemsInMenu();const channels=Array.from(window.globals.ircState.channels);let changed=false
;if(channels.length!==this.previousChannels.length)changed=true;else if(channels.length>0)for(let i=0;i<channels.length;i++)if(channels[i].toLowerCase()!==this.previousChannels[i].toLowerCase())changed=true
;if(changed){const parentEl=this.shadowRoot.getElementById('dropdownMenuChannelContainerId');while(parentEl.firstChild){parentEl.firstChild.removeEventListener('click',this.handleChannelClick)
;parentEl.removeChild(parentEl.firstChild)}this.previousChannels=[];if(channels.length>0)for(let i=0;i<channels.length;i++){const channelMenuItem=document.createElement('div')
;channelMenuItem.classList.add('nav-group02');channelMenuItem.classList.add('nav-level1');channelMenuItem.channelName=channels[i].toLowerCase()
;channelMenuItem.setAttribute('channel-name',channels[i].toLowerCase());if(this.shadowRoot.getElementById('item2_1_Id').hasAttribute('collapsed'))channelMenuItem.setAttribute('collapsed','')
;const channelNameSpan=document.createElement('span');channelNameSpan.classList.add('mr10');channelNameSpan.textContent=window.globals.ircState.channelStates[i].csName
;channelNameSpan.channelName=channels[i].toLowerCase();channelNameSpan.setAttribute('channel-name',channels[i].toLowerCase());channelMenuItem.appendChild(channelNameSpan)
;const channelMessageCount=document.createElement('div');channelMessageCount.classList.add('global-count');channelMessageCount.setAttribute('title','Unread Message Count')
;if('light'===document.querySelector('body').getAttribute('theme')){channelMessageCount.classList.add('global-border-theme-light');channelMessageCount.classList.add('global-text-theme-light')}else{
channelMessageCount.classList.add('global-border-theme-dark');channelMessageCount.classList.add('global-text-theme-dark')}channelMessageCount.textContent='0'
;channelMessageCount.setAttribute('hidden','');channelMessageCount.channelName=channels[i].toLowerCase();channelMessageCount.setAttribute('channel-name',channels[i].toLowerCase())
;channelMenuItem.appendChild(channelMessageCount);this.previousChannels.push(channels[i].toLowerCase());parentEl.appendChild(channelMenuItem)
;channelMenuItem.addEventListener('click',this.handleChannelClick)}this.arrayOfMenuElements=this.shadowRoot.querySelectorAll('.nav-level1')}};handleChannelClick=event=>{event.stopPropagation()
;const channelNameId=event.target.channelName;document.getElementById('channel:'+channelNameId).showAndScrollPanel();this.closeDropdownMenu()};initializePlugin=()=>{this._handleIrcStateChanged()
;document.getElementById('userInfo').getLoginInfo().then(userinfo=>{
if(Object.hasOwn(userinfo,'user')&&userinfo.user.length>0)this.shadowRoot.getElementById('item5_1_Id').textContent='Logout ('+userinfo.name+')'}).catch(err=>{console.log(err)})};connectedCallback(){
document.addEventListener('click',event=>{this.closeDropdownMenu()});document.addEventListener('color-theme-changed',event=>{if('light'===event.detail.theme){
this.shadowRoot.getElementById('navDropdownDivId').classList.remove('nav-menu-theme-dark');this.shadowRoot.getElementById('navDropdownDivId').classList.add('nav-menu-theme-light')}else{
this.shadowRoot.getElementById('navDropdownDivId').classList.remove('nav-menu-theme-light');this.shadowRoot.getElementById('navDropdownDivId').classList.add('nav-menu-theme-dark')}})
;document.addEventListener('irc-state-changed',this._handleIrcStateChanged);document.addEventListener('update-channel-count',event=>{
const channelMenuItemElements=this.shadowRoot.getElementById('dropdownMenuChannelContainerId');const menuItemEls=Array.from(channelMenuItemElements.children);menuItemEls.forEach(itemEl=>{
const channelStr=itemEl.channelName;const channelEl=document.getElementById('channel:'+channelStr);const count=channelEl.unreadMessageCount;if(count>0){
itemEl.lastChild.textContent=channelEl.unreadMessageCount.toString();itemEl.lastChild.removeAttribute('hidden')}else{itemEl.lastChild.textContent='0';itemEl.lastChild.setAttribute('hidden','')}})})
;document.addEventListener('update-privmsg-count',event=>{const privmsgMenuItemElements=this.shadowRoot.getElementById('dropdownMenuPrivMsgContainerId')
;const menuItemEls=Array.from(privmsgMenuItemElements.children);menuItemEls.forEach(itemEl=>{const privmsgStr=itemEl.pmPanelName.toLowerCase()
;const privmsgEl=document.getElementById('privmsg:'+privmsgStr);const count=privmsgEl.unreadMessageCount;if(count>0){itemEl.lastChild.textContent=privmsgEl.unreadMessageCount.toString()
;itemEl.lastChild.removeAttribute('hidden')}else{itemEl.lastChild.textContent='0';itemEl.lastChild.setAttribute('hidden','')}})})
;document.addEventListener('web-connect-changed',this._handleWebConnectChanged);this.arrayOfMenuElements=this.shadowRoot.querySelectorAll('.nav-level1');const _toggleDropdownOnMenuClick=groupName=>{
if(this.arrayOfMenuElements.length>0)for(let i=0;i<this.arrayOfMenuElements.length;i++)if(this.arrayOfMenuElements[i].classList.contains(groupName))if(this.arrayOfMenuElements[i].hasAttribute('collapsed'))this.arrayOfMenuElements[i].removeAttribute('collapsed');else this.arrayOfMenuElements[i].setAttribute('collapsed','')
};this.shadowRoot.getElementById('group01ButtonId').addEventListener('click',event=>{event.stopPropagation();_toggleDropdownOnMenuClick('nav-group01')})
;this.shadowRoot.getElementById('group02ButtonId').addEventListener('click',event=>{event.stopPropagation();_toggleDropdownOnMenuClick('nav-group02')})
;this.shadowRoot.getElementById('group03ButtonId').addEventListener('click',event=>{event.stopPropagation();_toggleDropdownOnMenuClick('nav-group03')})
;this.shadowRoot.getElementById('group04ButtonId').addEventListener('click',event=>{event.stopPropagation();_toggleDropdownOnMenuClick('nav-group04')})
;this.shadowRoot.getElementById('item1_1_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('managePmPanels').showPanel();this.closeDropdownMenu()})
;this.shadowRoot.getElementById('item2_1_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('manageChannelsPanel').showPanel();this.closeDropdownMenu()})
;this.shadowRoot.getElementById('item3_1_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('serverListPanel').showPanel();this.closeDropdownMenu()})
;this.shadowRoot.getElementById('item3_2_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('ircControlsPanel').showPanel();this.closeDropdownMenu()})
;this.shadowRoot.getElementById('item3_3_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('ircServerPanel').showPanel();this.closeDropdownMenu()})
;this.shadowRoot.getElementById('item3_4_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('wallopsPanel').showPanel();this.closeDropdownMenu()})
;this.shadowRoot.getElementById('item3_5_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('noticePanel').showPanel();this.closeDropdownMenu()})
;this.shadowRoot.getElementById('item3_6_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('helpPanel').showPanel()
;document.dispatchEvent(new CustomEvent('global-scroll-to-top'));this.closeDropdownMenu()});this.shadowRoot.getElementById('item4_1_Id').addEventListener('click',event=>{event.stopPropagation()
;document.getElementById('displayUtils').toggleColorTheme();this.closeDropdownMenu()});this.shadowRoot.getElementById('item4_2_Id').addEventListener('click',event=>{event.stopPropagation()
;document.dispatchEvent(new CustomEvent('show-all-panels'));document.dispatchEvent(new CustomEvent('cancel-zoom'));this.closeDropdownMenu()})
;this.shadowRoot.getElementById('item4_3_Id').addEventListener('click',event=>{event.stopPropagation();document.dispatchEvent(new CustomEvent('collapse-all-panels'))
;document.dispatchEvent(new CustomEvent('cancel-zoom'));this.closeDropdownMenu()});this.shadowRoot.getElementById('item4_4_Id').addEventListener('click',event=>{event.stopPropagation()
;document.dispatchEvent(new CustomEvent('hide-all-panels'));this.closeDropdownMenu()});this.shadowRoot.getElementById('item4_5_Id').addEventListener('click',event=>{event.stopPropagation()
;document.getElementById('debugPanel').showPanel();this.closeDropdownMenu()});this.shadowRoot.getElementById('item4_6_Id').addEventListener('click',event=>{event.stopPropagation()
;if(window.globals.webState.webConnected||window.globals.webState.webConnecting)document.getElementById('websocketPanel').webConnectNavBarMenuHandler('disconnect');else document.getElementById('websocketPanel').webConnectNavBarMenuHandler('connect')
;this.closeDropdownMenu()});this.shadowRoot.getElementById('item5_0_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('licensePanel').showPanel()
;this.closeDropdownMenu()});this.shadowRoot.getElementById('item5_1_Id').addEventListener('click',event=>{event.stopPropagation();document.getElementById('logoutPanel').handleLogoutRequest()
;this.closeDropdownMenu()})}});customElements.define('activity-spinner',class extends HTMLElement{constructor(){super();const template=document.getElementById('activitySpinnerTemplate')
;const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.activitySpinnerCounter=0}requestActivitySpinner=()=>{
this.activitySpinnerCounter+=1;this.shadowRoot.getElementById('activitySpinner').removeAttribute('hidden')};cancelActivitySpinner=()=>{this.activitySpinnerCounter-=1
;if(this.activitySpinnerCounter<0)this.activitySpinnerCounter=0
;if(this.activitySpinnerCounter>0)this.shadowRoot.getElementById('activitySpinner').removeAttribute('hidden');else this.shadowRoot.getElementById('activitySpinner').setAttribute('hidden','')}
;resetActivitySpinner=()=>{this.activitySpinnerCounter=0;this.shadowRoot.getElementById('activitySpinner').setAttribute('hidden','')};connectedCallback(){
if(this.hasAttribute('default')&&'show'===this.getAttribute('default'))this.requestActivitySpinner();else this.resetActivitySpinner()}})
;customElements.define('hamburger-icon',class extends HTMLElement{constructor(){super();const template=document.getElementById('hamburgerIconTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.activitySpinnerCounter=0}setColorTheme=theme=>{
const hamburgerIconEl=this.shadowRoot.getElementById('hamburgerBorderId');const hamburgerLine1El=this.shadowRoot.getElementById('hamburgerLine1Id')
;const hamburgerLine2El=this.shadowRoot.getElementById('hamburgerLine2Id');const hamburgerLine3El=this.shadowRoot.getElementById('hamburgerLine3Id');if('light'===theme){
hamburgerIconEl.classList.remove('hamburger-icon-theme-dark');hamburgerLine1El.classList.remove('hamburger-line-theme-dark');hamburgerLine2El.classList.remove('hamburger-line-theme-dark')
;hamburgerLine3El.classList.remove('hamburger-line-theme-dark');hamburgerIconEl.classList.add('hamburger-icon-theme-light');hamburgerLine1El.classList.add('hamburger-line-theme-light')
;hamburgerLine2El.classList.add('hamburger-line-theme-light');hamburgerLine3El.classList.add('hamburger-line-theme-light')}else if('dark'===theme){
hamburgerIconEl.classList.remove('hamburger-icon-theme-light');hamburgerLine1El.classList.remove('hamburger-line-theme-light');hamburgerLine2El.classList.remove('hamburger-line-theme-light')
;hamburgerLine3El.classList.remove('hamburger-line-theme-light');hamburgerIconEl.classList.add('hamburger-icon-theme-dark');hamburgerLine1El.classList.add('hamburger-line-theme-dark')
;hamburgerLine2El.classList.add('hamburger-line-theme-dark');hamburgerLine3El.classList.add('hamburger-line-theme-dark')}else throw new Error('Invalid color theme, allowed: light, dark')}})
;customElements.define('header-bar',class extends HTMLElement{constructor(){super();const template=document.getElementById('headerBarTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.privmsgicon=false;this.collapseAllToggle=0;this.collapseAllTimeout=0}static get observedAttributes(){
return['beepicon','channelicon','noticeicon','privmsgicon','servericon','wallopsicon','zoomicon']}get beepicon(){return this.hasAttribute('beepicon')}set beepicon(val){
if(val)this.setAttribute('beepicon','');else this.removeAttribute('beepicon')}get channelicon(){return this.hasAttribute('channelicon')}set channelicon(val){
if(val)this.setAttribute('channelicon','');else this.removeAttribute('channelicon')}get noticeicon(){return this.hasAttribute('noticeicon')}set noticeicon(val){
if(val)this.setAttribute('noticeicon','');else this.removeAttribute('noticeicon')}get privmsgicon(){return this.hasAttribute('privmsgicon')}set privmsgicon(val){
if(val)this.setAttribute('privmsgicon','');else this.removeAttribute('privmsgicon')}get servericon(){return this.hasAttribute('servericon')}set servericon(val){
if(val)this.setAttribute('servericon','');else this.removeAttribute('servericon')}get wallopsicon(){return this.hasAttribute('wallopsicon')}set wallopsicon(val){
if(val)this.setAttribute('wallopsicon','');else this.removeAttribute('wallopsicon')}get zoomicon(){return this.hasAttribute('zoomicon')}set zoomicon(val){
if(val)this.setAttribute('zoomicon','');else this.removeAttribute('zoomicon')}attributeChangedCallback(name,oldValue,newValue){this.updateStatusIcons()}setHeaderBarIcons=options=>{
const webConnectIconEl=this.shadowRoot.getElementById('webConnectIconId');const ircConnectIconEl=this.shadowRoot.getElementById('ircConnectIconId');let noIcons=true
;if(Object.hasOwn(options,'hideNavMenu')&&options.hideNavMenu)this.shadowRoot.getElementById('navDropdownButtonId').setAttribute('hidden','');else this.shadowRoot.getElementById('navDropdownButtonId').removeAttribute('hidden')
;if(Object.hasOwn(options,'webConnect')){webConnectIconEl.removeAttribute('connected');webConnectIconEl.removeAttribute('connecting');webConnectIconEl.removeAttribute('unavailable')
;if('connected'===options.webConnect)webConnectIconEl.setAttribute('connected','');if('connecting'===options.webConnect)webConnectIconEl.setAttribute('connecting','')
;if('unavailable'===options.webConnect)webConnectIconEl.setAttribute('unavailable','')}if(Object.hasOwn(options,'ircConnect')){ircConnectIconEl.removeAttribute('connected')
;ircConnectIconEl.removeAttribute('connecting');ircConnectIconEl.removeAttribute('unavailable');if('connected'===options.ircConnect)ircConnectIconEl.setAttribute('connected','')
;if('connecting'===options.ircConnect)ircConnectIconEl.setAttribute('connecting','');if('unavailable'===options.ircConnect)ircConnectIconEl.setAttribute('unavailable','')}
if(Object.hasOwn(options,'wait'))if(options.wait){noIcons=false;this.shadowRoot.getElementById('waitConnectIconId').removeAttribute('hidden')
}else this.shadowRoot.getElementById('waitConnectIconId').setAttribute('hidden','');if(Object.hasOwn(options,'away'))if(options.away){noIcons=false
;this.shadowRoot.getElementById('ircIsAwayIconId').removeAttribute('hidden')}else this.shadowRoot.getElementById('ircIsAwayIconId').setAttribute('hidden','')
;if(Object.hasOwn(options,'zoom'))if(options.zoom){noIcons=false;this.shadowRoot.getElementById('panelZoomIconId').removeAttribute('hidden')
}else this.shadowRoot.getElementById('panelZoomIconId').setAttribute('hidden','');if(Object.hasOwn(options,'serverUnread'))if(options.serverUnread){noIcons=false
;this.shadowRoot.getElementById('serverUnreadExistIconId').removeAttribute('hidden')}else this.shadowRoot.getElementById('serverUnreadExistIconId').setAttribute('hidden','')
;if(Object.hasOwn(options,'channelUnread'))if(options.channelUnread){noIcons=false;this.shadowRoot.getElementById('channelUnreadExistIconId').removeAttribute('hidden')
}else this.shadowRoot.getElementById('channelUnreadExistIconId').setAttribute('hidden','');if(Object.hasOwn(options,'privMsgUnread'))if(options.privMsgUnread){noIcons=false
;this.shadowRoot.getElementById('privMsgUnreadExistIconId').removeAttribute('hidden')}else this.shadowRoot.getElementById('privMsgUnreadExistIconId').setAttribute('hidden','')
;if(Object.hasOwn(options,'noticeUnread'))if(options.noticeUnread){noIcons=false;this.shadowRoot.getElementById('noticeUnreadExistIconId').removeAttribute('hidden')
}else this.shadowRoot.getElementById('noticeUnreadExistIconId').setAttribute('hidden','');if(Object.hasOwn(options,'wallopsUnread'))if(options.wallopsUnread){noIcons=false
;this.shadowRoot.getElementById('wallopsUnreadExistIconId').removeAttribute('hidden')}else this.shadowRoot.getElementById('wallopsUnreadExistIconId').setAttribute('hidden','')
;if(Object.hasOwn(options,'nickRecovery'))if(options.nickRecovery){noIcons=false;this.shadowRoot.getElementById('nickRecovIconId').removeAttribute('hidden')
}else this.shadowRoot.getElementById('nickRecovIconId').setAttribute('hidden','');if(Object.hasOwn(options,'enableAudio'))if(options.enableAudio){noIcons=false
;this.shadowRoot.getElementById('enableAudioButtonId').removeAttribute('hidden')}else this.shadowRoot.getElementById('enableAudioButtonId').setAttribute('hidden','');if(noIcons){
this.shadowRoot.getElementById('titleDivId').setAttribute('noIcons','')
;if(window.globals.webState.dynamic.panelPxWidth>500)this.shadowRoot.getElementById('titleDivId').removeAttribute('hidden');else this.shadowRoot.getElementById('titleDivId').setAttribute('hidden','')
}else{this.shadowRoot.getElementById('titleDivId').removeAttribute('noIcons','');this.shadowRoot.getElementById('titleDivId').setAttribute('hidden','')}
if(window.globals.ircState.ircConnected&&window.globals.webState.webConnected)this.shadowRoot.getElementById('collapseAllButtonId').removeAttribute('hidden');else this.shadowRoot.getElementById('collapseAllButtonId').setAttribute('hidden','')
};_setFixedElementTitles=()=>{this.shadowRoot.getElementById('hamburgerIconId').title='Navigation Dropdown Menu'
;this.shadowRoot.getElementById('waitConnectIconId').title='Waiting to auto-reconnect to IRC server';this.shadowRoot.getElementById('ircIsAwayIconId').title='Cancel IRC away (/AWAY)'
;this.shadowRoot.getElementById('panelZoomIconId').title='Un-zoom panels';this.shadowRoot.getElementById('serverUnreadExistIconId').title='Unread IRC server message, click to view panel'
;this.shadowRoot.getElementById('channelUnreadExistIconId').title='Unread IRC channel message, click to view panel'
;this.shadowRoot.getElementById('privMsgUnreadExistIconId').title='Unread Private Message (PM), click to view panel'
;this.shadowRoot.getElementById('noticeUnreadExistIconId').title='Unread IRC Notice, click to view panel'
;this.shadowRoot.getElementById('wallopsUnreadExistIconId').title='Unread IRC Wallops, click to view panel';this.shadowRoot.getElementById('nickRecovIconId').title='Waiting to recover main nickname'
;this.shadowRoot.getElementById('enableAudioButtonId').title='Browser had disabled media playback. Click to enable beep sounds'
;this.shadowRoot.getElementById('collapseAllButtonId').title='Toggle: Collapse active panels to bar, Hide all panels'};_updateDynamicElementTitles=()=>{
const webConnectIconEl=this.shadowRoot.getElementById('webConnectIconId')
;if(webConnectIconEl.hasAttribute('connected'))webConnectIconEl.title='Place web page in Standby (Remote IRC stays active)';else webConnectIconEl.title='Re-connect web page to remote IRC client'
;const ircConnectIconEl=this.shadowRoot.getElementById('ircConnectIconId')
;if(ircConnectIconEl.hasAttribute('connected'))ircConnectIconEl.title='Disconnect IRC server from remote IRC client (/QUIT)';else ircConnectIconEl.title='Connect to the currently selected IRC server'
;const titleDivEl=this.shadowRoot.getElementById('titleDivId')
;if(window.globals.ircState.ircConnected)titleDivEl.textContent=window.globals.ircState.ircServerName+' ('+window.globals.ircState.nickName+')';else titleDivEl.textContent='irc-hybrid-client'}
;updateStatusIcons=()=>{const state={hideNavMenu:false,webConnect:'disconnected',ircConnect:'unavailable',wait:false,away:false,zoom:false,serverUnread:false,channelUnread:false,privMsgUnread:false,
noticeUnread:false,wallopsUnread:false,nickRecovery:false,enableAudio:false};if(this.hasAttribute('beepicon'))state.enableAudio=true;if(this.hasAttribute('channelicon'))state.channelUnread=true
;if(this.hasAttribute('noticeicon'))state.noticeUnread=true;if(this.hasAttribute('privmsgicon'))state.privMsgUnread=true;if(this.hasAttribute('servericon'))state.serverUnread=true
;if(this.hasAttribute('wallopsicon'))state.wallopsUnread=true;if(this.hasAttribute('zoomicon'))state.zoom=true;if(window.globals.webState.webConnected){state.webConnect='connected'
;if(window.globals.ircState.ircConnected){if(window.globals.ircState.ircRegistered)state.ircConnect='connected';else state.ircConnect='connecting';if(window.globals.ircState.ircIsAway)state.away=true
}else{if(window.globals.webState.ircConnecting||window.globals.ircState.ircConnecting)state.ircConnect='connecting';else state.ircConnect='disconnected'
;if(window.globals.ircState.ircAutoReconnect&&window.globals.ircState.ircConnectOn&&!window.globals.ircState.ircConnected&&!window.globals.ircState.ircConnecting)state.wait=true}}else{
if(window.globals.webState.webConnecting)state.webConnect='connecting';state.ircConnect='unavailable'}if(!window.globals.webState.webConnected||!window.globals.ircState.ircConnected){state.away=false
;state.zoom=false;state.serverUnread=false;state.channelUnread=false;state.privMsgUnread=false;state.noticeUnread=false;state.wallopsUnread=false;state.nickRecovery=false}
if(window.globals.ircState.ircConnected)if(window.globals.ircState.nickRecoveryActive)state.nickRecovery=true;else state.nickRecovery=false;this.setHeaderBarIcons(state)
;this._updateDynamicElementTitles()};timerTickHandler=()=>{if(this.collapseAllTimeout>0){this.collapseAllTimeout--;if(0===this.collapseAllTimeout)this.collapseAllToggle=0}};initializePlugin=()=>{
this.updateStatusIcons();this._setFixedElementTitles();this._updateDynamicElementTitles();setInterval(()=>{const serverIconEl=this.shadowRoot.getElementById('serverUnreadExistIconId')
;const wallopsIconEl=this.shadowRoot.getElementById('wallopsUnreadExistIconId');const noticeIconEl=this.shadowRoot.getElementById('noticeUnreadExistIconId')
;const privMsgIconEl=this.shadowRoot.getElementById('privMsgUnreadExistIconId');const channelIconEl=this.shadowRoot.getElementById('channelUnreadExistIconId')
;const audioIconEl=this.shadowRoot.getElementById('enableAudioButtonId');if(serverIconEl.hasAttribute('flash')){serverIconEl.removeAttribute('flash');wallopsIconEl.removeAttribute('flash')
;noticeIconEl.removeAttribute('flash');privMsgIconEl.removeAttribute('flash');channelIconEl.removeAttribute('flash');audioIconEl.removeAttribute('flash')}else{serverIconEl.setAttribute('flash','')
;wallopsIconEl.setAttribute('flash','');noticeIconEl.setAttribute('flash','');privMsgIconEl.setAttribute('flash','');channelIconEl.setAttribute('flash','');audioIconEl.setAttribute('flash','')}},500)}
;connectedCallback(){this.shadowRoot.getElementById('navDropdownButtonId').addEventListener('click',event=>{event.stopPropagation();document.getElementById('navMenu').toggleDropdownMenu()})
;this.shadowRoot.getElementById('enableAudioButtonId').addEventListener('click',()=>{document.getElementById('beepSounds').userInitiatedAudioPlay()})
;this.shadowRoot.getElementById('webConnectIconId').addEventListener('click',()=>{document.getElementById('websocketPanel').webConnectHeaderBarIconHandler()})
;this.shadowRoot.getElementById('ircConnectIconId').addEventListener('click',()=>{document.getElementById('ircControlsPanel').webConnectHeaderBarIconHandler()})
;this.shadowRoot.getElementById('ircIsAwayIconId').addEventListener('click',()=>{document.getElementById('ircControlsPanel').awayButtonHeaderBarIconHandler()})
;this.shadowRoot.getElementById('panelZoomIconId').addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('cancel-zoom'))})
;this.shadowRoot.getElementById('serverUnreadExistIconId').addEventListener('click',()=>{document.getElementById('ircServerPanel').showPanel()})
;this.shadowRoot.getElementById('channelUnreadExistIconId').addEventListener('click',()=>{document.getElementById('manageChannelsPanel').handleHeaderBarActivityIconClick()})
;this.shadowRoot.getElementById('privMsgUnreadExistIconId').addEventListener('click',()=>{document.getElementById('managePmPanels').handleHeaderBarActivityIconClick()})
;this.shadowRoot.getElementById('noticeUnreadExistIconId').addEventListener('click',()=>{document.getElementById('noticePanel').showPanel()})
;this.shadowRoot.getElementById('wallopsUnreadExistIconId').addEventListener('click',()=>{document.getElementById('wallopsPanel').showPanel()})
;this.shadowRoot.getElementById('collapseAllButtonId').addEventListener('click',()=>{this.collapseAllTimeout=3;document.dispatchEvent(new CustomEvent('cancel-zoom'));if(0===this.collapseAllToggle){
this.collapseAllToggle=1;document.dispatchEvent(new CustomEvent('collapse-all-panels'))}else{this.collapseAllToggle=0;document.dispatchEvent(new CustomEvent('hide-all-panels'))}})
;document.addEventListener('color-theme-changed',event=>{const hamburgerIconEl=this.shadowRoot.getElementById('hamburgerIconId');const headerBarDivEl=this.shadowRoot.getElementById('headerBarDivId')
;const serverUnreadExistIconEl=this.shadowRoot.getElementById('serverUnreadExistIconId');const channelUnreadExistIconEl=this.shadowRoot.getElementById('channelUnreadExistIconId')
;const privMsgUnreadExistIconEl=this.shadowRoot.getElementById('privMsgUnreadExistIconId');const noticeUnreadExistIconEl=this.shadowRoot.getElementById('noticeUnreadExistIconId')
;const wallopsUnreadExistIconEl=this.shadowRoot.getElementById('wallopsUnreadExistIconId');const nickRecovIconEl=this.shadowRoot.getElementById('nickRecovIconId');if('light'===event.detail.theme){
hamburgerIconEl.setColorTheme('light');headerBarDivEl.classList.remove('header-bar-theme-dark');headerBarDivEl.classList.add('header-bar-theme-light')
;serverUnreadExistIconEl.classList.remove('irc-server-panel-theme-dark');serverUnreadExistIconEl.classList.add('irc-server-panel-theme-light')
;channelUnreadExistIconEl.classList.remove('channel-panel-theme-dark');channelUnreadExistIconEl.classList.add('channel-panel-theme-light')
;privMsgUnreadExistIconEl.classList.remove('pm-panel-theme-dark');privMsgUnreadExistIconEl.classList.add('pm-panel-theme-light');noticeUnreadExistIconEl.classList.remove('notice-panel-theme-dark')
;noticeUnreadExistIconEl.classList.add('notice-panel-theme-light');wallopsUnreadExistIconEl.classList.remove('wallops-panel-theme-dark')
;wallopsUnreadExistIconEl.classList.add('wallops-panel-theme-light');nickRecovIconEl.classList.remove('hbar-recovery-theme-dark');nickRecovIconEl.classList.add('hbar-recovery-theme-light')}else{
hamburgerIconEl.setColorTheme('dark');headerBarDivEl.classList.remove('header-bar-theme-light');headerBarDivEl.classList.add('header-bar-theme-dark')
;serverUnreadExistIconEl.classList.remove('irc-server-panel-theme-light');serverUnreadExistIconEl.classList.add('irc-server-panel-theme-dark')
;privMsgUnreadExistIconEl.classList.remove('pm-panel-theme-light');privMsgUnreadExistIconEl.classList.add('pm-panel-theme-dark');noticeUnreadExistIconEl.classList.remove('notice-panel-theme-light')
;noticeUnreadExistIconEl.classList.add('notice-panel-theme-dark');wallopsUnreadExistIconEl.classList.remove('wallops-panel-theme-light')
;wallopsUnreadExistIconEl.classList.add('wallops-panel-theme-dark');nickRecovIconEl.classList.remove('hbar-recovery-theme-light');nickRecovIconEl.classList.add('hbar-recovery-theme-dark')}})
;document.addEventListener('irc-state-changed',()=>{this.updateStatusIcons()});document.addEventListener('resize-custom-elements',()=>{const titleDivEl=this.shadowRoot.getElementById('titleDivId')
;if(window.globals.webState.dynamic.panelPxWidth>500&&titleDivEl.hasAttribute('noIcons'))titleDivEl.removeAttribute('hidden');else titleDivEl.setAttribute('hidden','')})
;document.addEventListener('update-channel-count',event=>{let totalCount=0;const channelsElements=document.getElementById('channelsContainerId');const channelEls=Array.from(channelsElements.children)
;channelEls.forEach(chanEl=>{totalCount+=chanEl.unreadMessageCount});if(totalCount>0)this.setAttribute('channelicon','');else this.removeAttribute('channelicon')})
;document.addEventListener('update-privmsg-count',event=>{let totalCount=0;const privmsgElements=document.getElementById('pmContainerId');const privmsgEls=Array.from(privmsgElements.children)
;privmsgEls.forEach(pmEl=>{totalCount+=pmEl.unreadMessageCount});if(totalCount>0)this.setAttribute('privmsgicon','');else this.removeAttribute('privmsgicon')})
;document.addEventListener('web-connect-changed',()=>{this.updateStatusIcons()})}});window.customElements.define('error-panel',class extends HTMLElement{constructor(){super()
;const template=document.getElementById('errorPanelTemplate');const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))
;this.errorExpireSeconds=5;this.errorRemainSeconds=0}clearError=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')
;const errorContentDivEl=this.shadowRoot.getElementById('errorContentDivId');while(errorContentDivEl.firstChild)errorContentDivEl.removeChild(errorContentDivEl.firstChild);this.errorRemainSeconds=0}
;showError=errorString=>{this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');const errorContentDivEl=this.shadowRoot.getElementById('errorContentDivId')
;const errorMessageEl=document.createElement('div');errorMessageEl.textContent=errorString||'Error: unknown error (2993)';errorContentDivEl.appendChild(errorMessageEl)
;this.errorRemainSeconds=this.errorExpireSeconds};_expireErrorMessages=()=>{if(this.errorRemainSeconds>0){this.errorRemainSeconds--
;if(0===this.errorRemainSeconds)this.clearError();else this.shadowRoot.getElementById('errorTitleId').textContent='Tap to Close ('+this.errorRemainSeconds.toString()+')'}};timerTickHandler=()=>{
this._expireErrorMessages()};connectedCallback(){this.shadowRoot.getElementById('panelDivId').addEventListener('click',()=>{this.clearError()})}})
;window.customElements.define('help-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('helpPanelTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.docsFolderTestComplete=false}_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this._setDocsFolderLinkVisibility();document.dispatchEvent(new CustomEvent('cancel-zoom'));this._scrollToTop()}
;collapsePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;handleHotKey=()=>{if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))this.hidePanel();else this.showPanel()};_setDocsFolderLinkVisibility=()=>{
if(this.docsFolderTestComplete)return;this.docsFolderTestComplete=true;const fetchController=new AbortController;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout')
;const activitySpinnerEl=document.getElementById('activitySpinner');const fetchOptions={method:'HEAD',headers:{redirect:'error',signal:fetchController.signal,Accept:'text/html'}}
;const fetchURL='/irc/docs/index.html';activitySpinnerEl.requestActivitySpinner();const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)this.shadowRoot.getElementById('viewDocsButtonDivId').removeAttribute('hidden');if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()}).catch(()=>{
if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()})};connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')});document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const infoDivEl=this.shadowRoot.getElementById('infoDivId')
;const viewDocsButtonDivEl=this.shadowRoot.getElementById('viewDocsButtonDivId');if('light'===event.detail.theme){panelDivEl.classList.remove('help-panel-theme-dark')
;panelDivEl.classList.add('help-panel-theme-light');infoDivEl.classList.remove('global-text-theme-dark');infoDivEl.classList.add('global-text-theme-light')
;viewDocsButtonDivEl.classList.remove('help-panel-docs-div-dark');viewDocsButtonDivEl.classList.add('help-panel-docs-div-light')}else{panelDivEl.classList.remove('help-panel-theme-light')
;panelDivEl.classList.add('help-panel-theme-dark');infoDivEl.classList.remove('global-text-theme-light');infoDivEl.classList.add('global-text-theme-dark')
;viewDocsButtonDivEl.classList.remove('help-panel-docs-div-light');viewDocsButtonDivEl.classList.add('help-panel-docs-div-dark')}});document.addEventListener('irc-state-changed',()=>{
if(window.globals.ircState.ircConnected!==this.ircConnectedLast){this.ircConnectedLast=window.globals.ircState.ircConnected;if(!window.globals.ircState.ircConnected)this.hidePanel()}})
;document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('show-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()}else if(event.detail&&event.detail.debug)this.showPanel()})}})
;window.customElements.define('license-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('licensePanelTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))}_scrollToTop=()=>{this.focus();const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({
top:newVertPos,behavior:'smooth'})};showPanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');document.dispatchEvent(new CustomEvent('cancel-zoom'))
;this._scrollToTop()};collapsePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')});document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const licenseDivEl=this.shadowRoot.getElementById('licenseDivId');if('light'===event.detail.theme){
panelDivEl.classList.remove('license-panel-theme-dark');panelDivEl.classList.add('license-panel-theme-light');licenseDivEl.classList.remove('global-text-theme-dark')
;licenseDivEl.classList.add('global-text-theme-light')}else{panelDivEl.classList.remove('license-panel-theme-light');panelDivEl.classList.add('license-panel-theme-dark')
;licenseDivEl.classList.remove('global-text-theme-light');licenseDivEl.classList.add('global-text-theme-dark')}});document.addEventListener('irc-state-changed',()=>{
if(window.globals.ircState.ircConnected!==this.ircConnectedLast){this.ircConnectedLast=window.globals.ircState.ircConnected;if(!window.globals.ircState.ircConnected)this.hidePanel()}})
;document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('show-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()}else if(event.detail&&event.detail.debug)this.showPanel()})}})
;window.customElements.define('logout-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('logoutPanelTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))}_scrollToTop=()=>{this.focus();const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({
top:newVertPos,behavior:'smooth'})};showPanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this._scrollToTop()};collapsePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;handleLogoutRequest=()=>{if(window.globals.ircState.ircConnected&&window.globals.webState.webConnected||!window.globals.webState.webConnected){this.showPanel()
;document.dispatchEvent(new CustomEvent('global-scroll-to-top'))}else{window.localStorage.clear();window.location.href='/logout'}};connectedCallback(){
this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()});this.shadowRoot.getElementById('cancelButtonId').addEventListener('click',()=>{this.hidePanel()})
;this.shadowRoot.getElementById('webLogoutButtonId').addEventListener('click',()=>{window.localStorage.clear();window.location.href='/logout'});document.addEventListener('collapse-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('hide-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('show-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()}else if(event.detail&&event.detail.debug)this.showPanel()})}})
;window.customElements.define('server-form-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('serverFormPanelTemplate')
;const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))}fetchServerList=(index,lock)=>new Promise((resolve,reject)=>{
const fetchController=new AbortController;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner')
;let urlStr='/irc/serverlist';if(index>=0){urlStr+='?index='+index.toString();if(lock>=0)urlStr+='&lock='+lock.toString()}const fetchURL=encodeURI(urlStr);const fetchOptions={method:'GET',
redirect:'error',signal:fetchController.signal,headers:{Accept:'application/json'}};activitySpinnerEl.requestActivitySpinner();const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout)
;fetch(fetchURL,fetchOptions).then(response=>{if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error')
;err.status=response.status;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();resolve(responseJson)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);error.status=err.status;reject(error)})});submitServer=(body,method,index)=>new Promise((resolve,reject)=>{const fetchController=new AbortController
;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner')
;const csrfToken=document.getElementById('globVars').csrfToken;let baseUrl='/irc/serverlist';if('action'in body)baseUrl='/irc/serverlist/tools';if(-1!==index)baseUrl+='?index='+index.toString()
;const fetchURL=encodeURI(baseUrl);const fetchOptions={method:method,redirect:'error',signal:fetchController.signal,headers:{'CSRF-Token':csrfToken,Accept:'application/json',
'Content-Type':'application/json'},body:JSON.stringify(body)};activitySpinnerEl.requestActivitySpinner();const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout)
;fetch(fetchURL,fetchOptions).then(response=>{if(200===response.status||201===response.status)return response.json();else return response.text().then(remoteErrorText=>{
const err=new Error('HTTP status error');err.status=response.status;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{
if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner();resolve(responseJson)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);error.status=err.status;reject(error)})});checkForApiError=data=>new Promise((resolve,reject)=>{
if('success'===data.status)resolve(data);else reject(new Error('PATCH API did not return success status flag'))});_showSocks5ProxyAvailability=()=>{if(window.globals.ircState.enableSocks5Proxy){
this.shadowRoot.getElementById('ircProxyEnabledDivId').textContent='Socks5 Proxy: Available'
;this.shadowRoot.getElementById('ircProxyAddrDivId').textContent=window.globals.ircState.socks5Host+':'+window.globals.ircState.socks5Port}else{
this.shadowRoot.getElementById('ircProxyEnabledDivId').textContent='Socks5 Proxy: Disabled by server';this.shadowRoot.getElementById('ircProxyAddrDivId').textContent=''}}
;_clearIrcServerForm=()=>new Promise((resolve,reject)=>{this.shadowRoot.getElementById('indexInputId').value='-1';this.shadowRoot.getElementById('disabledCheckboxId').checked=false
;this.shadowRoot.getElementById('groupInputId').value=0;this.shadowRoot.getElementById('nameInputId').value='';this.shadowRoot.getElementById('hostInputId').value=''
;this.shadowRoot.getElementById('portInputId').value=6697;this.shadowRoot.getElementById('tlsCheckboxId').checked=true;this.shadowRoot.getElementById('verifyCheckboxId').checked=true
;this._showSocks5ProxyAvailability();this.shadowRoot.getElementById('proxyCheckboxId').checked=false;this.shadowRoot.getElementById('autoReconnectCheckboxId').checked=false
;this.shadowRoot.getElementById('loggingCheckboxId').checked=false;this.shadowRoot.getElementById('passwordInputId').setAttribute('disabled','')
;this.shadowRoot.getElementById('passwordInputId').value='(Blank)';this.shadowRoot.getElementById('replacePasswordButton').removeAttribute('hidden')
;this.shadowRoot.getElementById('serverPasswordWarningDiv').setAttribute('hidden','');this.shadowRoot.getElementById('saslUsernameInputId').value=''
;this.shadowRoot.getElementById('saslPasswordInputId').setAttribute('disabled','');this.shadowRoot.getElementById('saslPasswordInputId').value='(Blank)'
;this.shadowRoot.getElementById('replaceSaslPasswordButton').removeAttribute('hidden');this.shadowRoot.getElementById('serverSaslPasswordWarningDiv').setAttribute('hidden','')
;this.shadowRoot.getElementById('identifyNickInputId').value='';this.shadowRoot.getElementById('identifyCommandInputId').setAttribute('disabled','')
;this.shadowRoot.getElementById('identifyCommandInputId').value='(blank)';this.shadowRoot.getElementById('replaceIdentifyCommandButton').removeAttribute('hidden')
;this.shadowRoot.getElementById('nickservCommandWarningDiv').setAttribute('hidden','');this.shadowRoot.getElementById('nickInputId').value='';this.shadowRoot.getElementById('altNickInputId').value=''
;this.shadowRoot.getElementById('recoverNickCheckboxId').checked=false;this.shadowRoot.getElementById('userInputId').value='';this.shadowRoot.getElementById('realInputId').value=''
;this.shadowRoot.getElementById('modesInputId').value='';this.shadowRoot.getElementById('channelListInputId').value='';resolve(null)});_parseFormInputValues=()=>new Promise((resolve,reject)=>{
const index=parseInt(this.shadowRoot.getElementById('indexInputId').value);const data={};if(-1!==index)data.index=parseInt(this.shadowRoot.getElementById('indexInputId').value)
;if(this.shadowRoot.getElementById('disabledCheckboxId').checked)data.disabled=true;else data.disabled=false;data.group=parseInt(this.shadowRoot.getElementById('groupInputId').value)
;data.name=this.shadowRoot.getElementById('nameInputId').value;data.host=this.shadowRoot.getElementById('hostInputId').value;data.port=parseInt(this.shadowRoot.getElementById('portInputId').value)
;if(this.shadowRoot.getElementById('tlsCheckboxId').checked)data.tls=true;else data.tls=false;if(this.shadowRoot.getElementById('verifyCheckboxId').checked)data.verify=true;else data.verify=false
;if(this.shadowRoot.getElementById('proxyCheckboxId').checked)data.proxy=true;else data.proxy=false
;if(this.shadowRoot.getElementById('autoReconnectCheckboxId').checked)data.reconnect=true;else data.reconnect=false
;if(this.shadowRoot.getElementById('loggingCheckboxId').checked)data.logging=true;else data.logging=false
;if(!this.shadowRoot.getElementById('passwordInputId').hasAttribute('disabled'))data.password=this.shadowRoot.getElementById('passwordInputId').value
;data.saslUsername=this.shadowRoot.getElementById('saslUsernameInputId').value
;if(!this.shadowRoot.getElementById('saslPasswordInputId').hasAttribute('disabled'))data.saslPassword=this.shadowRoot.getElementById('saslPasswordInputId').value
;data.identifyNick=this.shadowRoot.getElementById('identifyNickInputId').value
;if(!this.shadowRoot.getElementById('identifyCommandInputId').hasAttribute('disabled'))data.identifyCommand=this.shadowRoot.getElementById('identifyCommandInputId').value
;data.nick=this.shadowRoot.getElementById('nickInputId').value;data.altNick=this.shadowRoot.getElementById('altNickInputId').value
;if(this.shadowRoot.getElementById('recoverNickCheckboxId').checked)data.recoverNick=true;else data.recoverNick=false;data.user=this.shadowRoot.getElementById('userInputId').value
;data.real=this.shadowRoot.getElementById('realInputId').value;data.modes=this.shadowRoot.getElementById('modesInputId').value
;data.channelList=this.shadowRoot.getElementById('channelListInputId').value;let errorStr=null;if(isNaN(data.group))errorStr='Invalid group number'
;if(parseInt(data.group)<0)errorStr='Invalid group number';if(''===data.name)errorStr='Label is required input.';if(''===data.host)errorStr='Host/IP is required input.'
;if(isNaN(data.port))errorStr='Invalid port number';if(data.nick===data.altNick)errorStr='Nickname and alternate nickname must be different.'
;if(data.recoverNick&&0===data.altNick.length)errorStr='Nickname recovery checkbox set without valid alternate nickname';if(''===data.nick)errorStr='Nickname is required input.'
;if(''===data.user)errorStr='Unix ident user is required input.';if(''===data.real)errorStr='Real Name is required input.';if(errorStr){const parseError=new Error(errorStr);parseError.parseError=true
;reject(parseError)}else resolve({data:data,index:index})});_populateIrcServerForm=data=>new Promise((resolve,reject)=>{this.shadowRoot.getElementById('indexInputId').value=data.index.toString()
;if(data.disabled)this.shadowRoot.getElementById('disabledCheckboxId').checked=true;else this.shadowRoot.getElementById('disabledCheckboxId').checked=false
;if('group'in data)this.shadowRoot.getElementById('groupInputId').value=parseInt(data.group);else this.shadowRoot.getElementById('groupInputId').value=0
;this.shadowRoot.getElementById('nameInputId').value=data.name;this.shadowRoot.getElementById('hostInputId').value=data.host;this.shadowRoot.getElementById('portInputId').value=parseInt(data.port)
;if(data.tls)this.shadowRoot.getElementById('tlsCheckboxId').checked=true;else this.shadowRoot.getElementById('tlsCheckboxId').checked=false
;if(data.verify)this.shadowRoot.getElementById('verifyCheckboxId').checked=true;else this.shadowRoot.getElementById('verifyCheckboxId').checked=false
;if(data.proxy)this.shadowRoot.getElementById('proxyCheckboxId').checked=true;else this.shadowRoot.getElementById('proxyCheckboxId').checked=false
;if(data.reconnect)this.shadowRoot.getElementById('autoReconnectCheckboxId').checked=true;else this.shadowRoot.getElementById('autoReconnectCheckboxId').checked=false
;if(data.logging)this.shadowRoot.getElementById('loggingCheckboxId').checked=true;else this.shadowRoot.getElementById('loggingCheckboxId').checked=false
;this.shadowRoot.getElementById('passwordInputId').setAttribute('disabled','');this.shadowRoot.getElementById('replacePasswordButton').removeAttribute('hidden')
;if(null===data.password)this.shadowRoot.getElementById('passwordInputId').value='(hidden)';else this.shadowRoot.getElementById('passwordInputId').value='(blank)'
;this.shadowRoot.getElementById('serverPasswordWarningDiv').setAttribute('hidden','');this.shadowRoot.getElementById('saslUsernameInputId').value=data.saslUsername
;this.shadowRoot.getElementById('saslPasswordInputId').setAttribute('disabled','');this.shadowRoot.getElementById('replaceSaslPasswordButton').removeAttribute('hidden')
;if(null===data.saslPassword)this.shadowRoot.getElementById('saslPasswordInputId').value='(hidden)';else this.shadowRoot.getElementById('saslPasswordInputId').value='(blank)'
;this.shadowRoot.getElementById('serverSaslPasswordWarningDiv').setAttribute('hidden','');this.shadowRoot.getElementById('identifyNickInputId').value=data.identifyNick
;this.shadowRoot.getElementById('identifyCommandInputId').setAttribute('disabled','');this.shadowRoot.getElementById('replaceIdentifyCommandButton').removeAttribute('hidden')
;if(null===data.identifyCommand)this.shadowRoot.getElementById('identifyCommandInputId').value='(hidden)';else this.shadowRoot.getElementById('identifyCommandInputId').value='(blank)'
;this.shadowRoot.getElementById('nickservCommandWarningDiv').setAttribute('hidden','');this.shadowRoot.getElementById('nickInputId').value=data.nick
;this.shadowRoot.getElementById('altNickInputId').value=data.altNick
;if(0===data.altNick.length)this.shadowRoot.getElementById('recoverNickCheckboxId').checked=false;else if(data.recoverNick)this.shadowRoot.getElementById('recoverNickCheckboxId').checked=true;else this.shadowRoot.getElementById('recoverNickCheckboxId').checked=false
;this.shadowRoot.getElementById('userInputId').value=data.user;this.shadowRoot.getElementById('realInputId').value=data.real;this.shadowRoot.getElementById('modesInputId').value=data.modes
;this.shadowRoot.getElementById('channelListInputId').value=data.channelList;this._showSocks5ProxyAvailability();resolve(data)});createNewIrcServer=()=>{if(window.globals.ircState.ircConnected){
document.getElementById('errorPanel').showError('Disconnect from IRC before editing IRC server configuration');return}if(window.globals.webState.ircServerEditOpen){
document.getElementById('errorPanel').showError('Another edit session is in progress');return}window.globals.webState.ircServerEditOpen=true
;document.dispatchEvent(new CustomEvent('irc-server-edit-open'));this._clearIrcServerForm().then(()=>{this.shadowRoot.getElementById('saveNewButtonId').removeAttribute('hidden')
;this.shadowRoot.getElementById('saveNewButtonId2').removeAttribute('hidden');this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden','');this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','')}).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message);window.globals.webState.ircServerEditOpen=false
;this.hidePanel()})};editIrcServerAtIndex=index=>{if(window.globals.ircState.ircConnected){
document.getElementById('errorPanel').showError('Disconnect from IRC before editing IRC server configuration');return}if(window.globals.webState.ircServerEditOpen){
document.getElementById('errorPanel').showError('Another edit session is in progress');return}window.globals.webState.ircServerEditOpen=true
;document.dispatchEvent(new CustomEvent('irc-server-edit-open'));this._clearIrcServerForm().then(()=>this.fetchServerList(index,1)).then(data=>this._populateIrcServerForm(data)).then(()=>{
this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden','');this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveModifiedButtonId').removeAttribute('hidden');this.shadowRoot.getElementById('saveModifiedButtonId2').removeAttribute('hidden')
;this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','')}).catch(err=>{console.log(err);let message=err.message||err.toString()||'Error';message=message.split('\n')[0]
;if(409===err.status)document.getElementById('errorPanel').showError('Database Locked');else if(405===err.status)document.getElementById('errorPanel').showError('Database Disabled');else document.getElementById('errorPanel').showError(message)
;window.globals.webState.ircServerEditOpen=false;this.hidePanel()})};_scrollToTop=()=>{this.focus();const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,
behavior:'smooth'})};showPanel=()=>{this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden','');this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden','');this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden','')
;this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this._scrollToTop()};hidePanel=()=>{if(!window.globals.webState.webConnected){
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden','');this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden','')}else{const ircControlsPanelEl=document.getElementById('ircControlsPanel')
;if(window.globals.webState.ircServerEditOpen)this.fetchServerList(0,0).then(()=>{window.globals.webState.ircServerEditOpen=false;console.log('Unlock database after aborted edit')
;this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}).then(ircControlsPanelEl.getIrcState).catch(err=>{console.log(err);let message=err.message||err.toString()||'Error'
;message=message.split('\n')[0];document.getElementById('errorPanel').showError(message);this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden','');this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden','')});else this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}};collapsePanel=()=>{
this.hidePanel()};_saveNewButtonHandler=()=>{const ircControlsPanelEl=document.getElementById('ircControlsPanel');const errorPanelEl=document.getElementById('errorPanel')
;let previousSelectedIndex=window.globals.ircState.ircServerIndex;if(-1===previousSelectedIndex)previousSelectedIndex=0
;this._parseFormInputValues().then(data=>this.submitServer(data.data,'POST',-1)).then(data=>this.checkForApiError(data)).then(()=>ircControlsPanelEl.serverSetIndexHandler(previousSelectedIndex)).then(data=>{
if('index'in data&&parseInt(data.index)===previousSelectedIndex){window.globals.webState.ircServerEditOpen=false;this.hidePanel();window.globals.webState.ircServerModified=true
}else return Promise.reject(new Error('Unable to restore server index after edit'))}).catch(err=>{console.log(err);let message=err.message||err.toString()||'Error';message=message.split('\n')[0]
;if(err.status&&422===err.status)message='Input validation rejected by server (Status 422)';else if(!err.parseError){this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden','');this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden','')}errorPanelEl.showError(message)})};_saveModifiedButtonHandler=()=>{
const ircControlsPanelEl=document.getElementById('ircControlsPanel');const errorPanelEl=document.getElementById('errorPanel');const previousSelectedIndex=window.globals.ircState.ircServerIndex
;this._parseFormInputValues().then(data=>this.submitServer(data.data,'PATCH',data.index)).then(data=>this.checkForApiError(data)).then(()=>ircControlsPanelEl.serverSetIndexHandler(previousSelectedIndex)).then(data=>{
if('index'in data&&parseInt(data.index)===previousSelectedIndex){window.globals.webState.ircServerEditOpen=false;this.hidePanel();window.globals.webState.ircServerModified=true
}else return Promise.reject(new Error('Unable to restore server index after edit'))}).catch(err=>{console.log(err);let message=err.message||err.toString()||'Error';message=message.split('\n')[0]
;if(err.status&&422===err.status)message='Input validation rejected by server (Status 422)';else if(!err.parseError){this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden','');this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden','')}errorPanelEl.showError(message)})};initializePlugin=()=>{
this.shadowRoot.getElementById('saveNewButtonId').setAttribute('title','Save new IRC server configuration to database and close form.')
;this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('title','Save new IRC server configuration to database and close form.')
;this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('title','Save modified IRC server configuration to database and close form.')
;this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('title','Save modified IRC server configuration to database and close form.')
;this.shadowRoot.getElementById('cancelEditButtonId').setAttribute('title','Discard changes and close form')
;this.shadowRoot.getElementById('cancelEditButtonId').setAttribute('title','Discard changes and close form')};connectedCallback(){
this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()});this.shadowRoot.getElementById('cancelEditButtonId').addEventListener('click',()=>{
this.hidePanel()});this.shadowRoot.getElementById('cancelEditButtonId2').addEventListener('click',()=>{this.hidePanel()})
;this.shadowRoot.getElementById('saveModifiedButtonId').addEventListener('click',this._saveModifiedButtonHandler)
;this.shadowRoot.getElementById('saveModifiedButtonId2').addEventListener('click',this._saveModifiedButtonHandler)
;this.shadowRoot.getElementById('saveNewButtonId').addEventListener('click',this._saveNewButtonHandler)
;this.shadowRoot.getElementById('saveNewButtonId2').addEventListener('click',this._saveNewButtonHandler);this.shadowRoot.getElementById('replacePasswordButton').addEventListener('click',()=>{
this.shadowRoot.getElementById('passwordInputId').removeAttribute('disabled');this.shadowRoot.getElementById('passwordInputId').value=''
;this.shadowRoot.getElementById('replacePasswordButton').setAttribute('hidden','');this.shadowRoot.getElementById('serverPasswordWarningDiv').removeAttribute('hidden')})
;this.shadowRoot.getElementById('replaceSaslPasswordButton').addEventListener('click',()=>{this.shadowRoot.getElementById('saslPasswordInputId').removeAttribute('disabled')
;this.shadowRoot.getElementById('saslPasswordInputId').value='';this.shadowRoot.getElementById('replaceSaslPasswordButton').setAttribute('hidden','')
;this.shadowRoot.getElementById('serverSaslPasswordWarningDiv').removeAttribute('hidden')});this.shadowRoot.getElementById('replaceIdentifyCommandButton').addEventListener('click',()=>{
this.shadowRoot.getElementById('identifyCommandInputId').removeAttribute('disabled');this.shadowRoot.getElementById('identifyCommandInputId').value=''
;this.shadowRoot.getElementById('replaceIdentifyCommandButton').setAttribute('hidden','');this.shadowRoot.getElementById('nickservCommandWarningDiv').removeAttribute('hidden')})
;this.shadowRoot.getElementById('disabledCheckboxInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('disabledCheckboxInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('disabledCheckboxInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('disabledCheckboxInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('groupInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('groupInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('groupInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('groupInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('nameInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('nameInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('nameInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('nameInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('autoReconnectCheckboxInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('autoReconnectCheckboxInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('autoReconnectCheckboxInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('autoReconnectCheckboxInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('loggingCheckboxInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('loggingCheckboxInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('loggingCheckboxInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('loggingCheckboxInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('hostInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('hostInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('hostInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('hostInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('proxyCheckboxInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('proxyCheckboxInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('proxyCheckboxInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('proxyCheckboxInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('passwordInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('passwordInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('passwordInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('passwordInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('saslUsernameInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('saslUsernameInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('saslUsernameInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('saslUsernameInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('saslPasswordInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('saslPasswordInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('saslPasswordInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('saslPasswordInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('nickInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('nickInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('nickInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('nickInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('altNickInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('altNickInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('altNickInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('altNickInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('recoverNickCheckboxInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('recoverNickCheckboxInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('recoverNickCheckboxInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('recoverNickCheckboxInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('realInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('realInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('realInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('realInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('userInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('userInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('userInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('userInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('identifyNickInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('identifyNickInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('identifyNickInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('identifyNickInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('modesInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('modesInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('modesInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('modesInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('channelListInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('channelListInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('channelListInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('channelListInputInfo').setAttribute('hidden','')
});this.shadowRoot.getElementById('identifyCommandInputInfoBtn').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('identifyCommandInputInfo').hasAttribute('hidden'))this.shadowRoot.getElementById('identifyCommandInputInfo').removeAttribute('hidden');else this.shadowRoot.getElementById('identifyCommandInputInfo').setAttribute('hidden','')
});document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');if('light'===event.detail.theme){panelDivEl.classList.remove('server-form-theme-dark');panelDivEl.classList.add('server-form-theme-light')
}else{panelDivEl.classList.remove('server-form-theme-light');panelDivEl.classList.add('server-form-theme-dark')}let newTextTheme='global-text-theme-dark';let oldTextTheme='global-text-theme-light'
;if('light'===document.querySelector('body').getAttribute('theme')){newTextTheme='global-text-theme-light';oldTextTheme='global-text-theme-dark'}
let inputEls=Array.from(this.shadowRoot.querySelectorAll('input'));inputEls.forEach(el=>{el.classList.remove(oldTextTheme);el.classList.add(newTextTheme)});newTextTheme='server-form-input-group1-dark'
;oldTextTheme='server-form-input-group1-light';if('light'===document.querySelector('body').getAttribute('theme')){newTextTheme='server-form-input-group1-light'
;oldTextTheme='server-form-input-group1-dark'}inputEls=Array.from(this.shadowRoot.querySelectorAll('.server-form-group1'));inputEls.forEach(el=>{el.classList.remove(oldTextTheme)
;el.classList.add(newTextTheme)});newTextTheme='server-form-input-group2-dark';oldTextTheme='server-form-input-group2-light';if('light'===document.querySelector('body').getAttribute('theme')){
newTextTheme='server-form-input-group2-light';oldTextTheme='server-form-input-group2-dark'}inputEls=Array.from(this.shadowRoot.querySelectorAll('.server-form-group2'));inputEls.forEach(el=>{
el.classList.remove(oldTextTheme);el.classList.add(newTextTheme)})});document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()
}else this.hidePanel()});document.addEventListener('show-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){
if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()
}else if(event.detail&&event.detail.debug)this.showPanel()})}});window.customElements.define('server-list-panel',class extends HTMLElement{constructor(){super()
;const template=document.getElementById('serverListPanelTemplate');const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))
;this.mobileWedthBreakpointPixels=500;this.mobileWidth=false;this.fullWidth=false;this.editable=true;this.selectButtonIdList=[];this.connectButtonIdList=[];this.disabledCheckboxIdList=[]
;this.editButtonIdList=[];this.copyButtonIdList=[];this.deleteButtonIdList=[];this.moveUpButtonIdList=[];this.ircConnectedLast=false}_updateVisibility=()=>{
if(window.globals.ircState.disableServerListEditor)this.shadowRoot.getElementById('serverListDisabledDivId').removeAttribute('hidden');else this.shadowRoot.getElementById('serverListDisabledDivId').setAttribute('hidden','')
;const createNewButtonEl=this.shadowRoot.getElementById('createNewButtonId');const editorOpenWarningDivEl=this.shadowRoot.getElementById('editorOpenWarningDivId')
;createNewButtonEl.removeAttribute('hidden');editorOpenWarningDivEl.setAttribute('hidden','');if(window.globals.ircState.disableServerListEditor)createNewButtonEl.setAttribute('hidden','')
;if(window.globals.ircState.ircConnected)createNewButtonEl.setAttribute('hidden','');if(window.globals.webState.ircServerEditOpen){createNewButtonEl.setAttribute('hidden','')
;editorOpenWarningDivEl.removeAttribute('hidden')}this.shadowRoot.getElementById('forceUnlockButtonId').setAttribute('hidden','')};_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
if(!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')){this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','')
;if(window.globals.ircState.ircConnected)this.editable=false;if(!window.globals.ircState.ircConnected)this.editable=true;this.fullWidth=false;this.mobileWidth=false
;if(window.globals.webState.dynamic.panelPxWidth<this.mobileWedthBreakpointPixels)this.mobileWidth=true}this._updateVisibility()
;document.getElementById('serverFormPanel').fetchServerList(-1,-1).then(data=>this._buildServerListTable(data)).catch(err=>{console.log(err);let message=err.message||err.toString()||'Error'
;message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)});document.dispatchEvent(new CustomEvent('cancel-zoom'));this._scrollToTop()};hidePanel=()=>{
this._clearServerListTable();this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};collapsePanel=()=>{this.hidePanel()};handleHotKey=()=>{
if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))this.hidePanel();else this.showPanel()};_handleServerListOpenError=err=>{console.log(err)
;let message=err.message||err.toString()||'Error attempting edit IRC server';message=message.split('\n')[0];if(409===err.status){
this.shadowRoot.getElementById('forceUnlockButtonId').removeAttribute('hidden');document.getElementById('errorPanel').showError('Database Locked')
}else if(405===err.status)document.getElementById('errorPanel').showError('Database Disabled');else document.getElementById('errorPanel').showError(message)};_selectServerButtonHandler=event=>{
const ircControlsPanelEl=document.getElementById('ircControlsPanel');const index=parseInt(event.target.getAttribute('index'))
;if(!window.globals.ircState.ircConnected&&!window.globals.ircState.ircConnecting)ircControlsPanelEl.serverSetIndexHandler(index).then(data=>{
if('index'in data&&parseInt(data.index)===index)return Promise.resolve(index);else throw new Error('Unable to set server index')}).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})};_connectToIrcButtonHandler=event=>{
const ircControlsPanelEl=document.getElementById('ircControlsPanel');const errorPanelEl=document.getElementById('errorPanel');const index=parseInt(event.target.getAttribute('index'))
;if(window.globals.ircState.ircConnected||window.globals.ircState.ircConnecting)document.getElementById('ircControlsPanel').disconnectHandler();else if(index!==window.globals.ircState.ircServerIndex)errorPanelEl.showError('Unable to connect because index number on button does not match selected server.');else ircControlsPanelEl.connectHandler().catch(err=>{
console.log(err);let message=err.message||err.toString()||'Error';message=message.split('\n')[0];errorPanelEl.showError(message)})};_toggleDisabledCheckboxHandler=event=>{
const serverFormPanelEl=document.getElementById('serverFormPanel');const index=parseInt(event.target.getAttribute('index'));serverFormPanelEl.submitServer({index:index,action:'toggle-disabled'
},'POST',index).then(serverFormPanelEl.checkForApiError).catch(this._handleServerListOpenError)};_editIrcServerButtonHandler=event=>{const serverFormEl=document.getElementById('serverFormPanel')
;const index=parseInt(event.target.getAttribute('index'));serverFormEl.fetchServerList(index,1).then(()=>{serverFormEl.fetchServerList(index,0)}).then(()=>{serverFormEl.editIrcServerAtIndex(index)
}).catch(this._handleServerListOpenError)};_copyIrcServerToNewButtonHandler=event=>{const serverFormPanelEl=document.getElementById('serverFormPanel')
;const index=parseInt(event.target.getAttribute('index'));serverFormPanelEl.submitServer({index:index},'COPY',index).then(serverFormPanelEl.checkForApiError).catch(this._handleServerListOpenError)}
;_deleteIrcServerButtonHandler=event=>{const serverFormPanelEl=document.getElementById('serverFormPanel');const index=parseInt(event.target.getAttribute('index'));serverFormPanelEl.submitServer({
index:index},'DELETE',index).then(serverFormPanelEl.checkForApiError).catch(this._handleServerListOpenError)};_moveUpInListButtonHandler=event=>{
const serverFormPanelEl=document.getElementById('serverFormPanel');const index=parseInt(event.target.getAttribute('index'));serverFormPanelEl.submitServer({index:index,action:'move-up'
},'POST',index).then(serverFormPanelEl.checkForApiError).catch(this._handleServerListOpenError)};_clearServerListTable=data=>{const tableNode=this.shadowRoot.getElementById('tbodyId')
;this.selectButtonIdList.forEach(id=>{this.shadowRoot.getElementById(id).removeEventListener('click',this._selectServerButtonHandler)});this.selectButtonIdList=[]
;this.connectButtonIdList.forEach(id=>{this.shadowRoot.getElementById(id).removeEventListener('click',this._connectToIrcButtonHandler)});this.connectButtonIdList=[]
;this.disabledCheckboxIdList.forEach(id=>{this.shadowRoot.getElementById(id).removeEventListener('click',this._toggleDisabledCheckboxHandler)});this.disabledCheckboxIdList=[]
;this.editButtonIdList.forEach(id=>{this.shadowRoot.getElementById(id).removeEventListener('click',this._editIrcServerButtonHandler)});this.editButtonIdList=[];this.copyButtonIdList.forEach(id=>{
this.shadowRoot.getElementById(id).removeEventListener('click',this._copyIrcServerToNewButtonHandler)});this.copyButtonIdList=[];this.deleteButtonIdList.forEach(id=>{
this.shadowRoot.getElementById(id).removeEventListener('click',this._deleteIrcServerButtonHandler)});this.deleteButtonIdList=[];this.moveUpButtonIdList.forEach(id=>{
this.shadowRoot.getElementById(id).removeEventListener('click',this._moveUpInListButtonHandler)});this.moveUpButtonIdList=[];while(tableNode.firstChild)tableNode.removeChild(tableNode.firstChild)}
;_buildServerListTable=data=>new Promise((resolve,reject)=>{this._clearServerListTable();const tableNode=this.shadowRoot.getElementById('tbodyId')
;if(window.globals.webState.ircServerEditOpen)this.editable=false;const full=this.fullWidth;const mobile=this.mobileWidth;const edit=this.editable&&!this.fullWidth&&!this.mobileWidth
;if(!full&&!mobile&&!window.globals.ircState.ircConnected)this.shadowRoot.getElementById('serverIndexChangeInfoDivId').removeAttribute('hidden');else this.shadowRoot.getElementById('serverIndexChangeInfoDivId').setAttribute('hidden','')
;const columnTitles=[];if(!full&&!window.globals.webState.ircServerEditOpen){columnTitles.push('');columnTitles.push('')}if(!mobile)columnTitles.push('Index');if(mobile){columnTitles.push('Dis')
;columnTitles.push('G')}else{columnTitles.push('Disabled');columnTitles.push('Group')}columnTitles.push('Label');if(!mobile)columnTitles.push('Host');if(!mobile)columnTitles.push('Port')
;if(full)columnTitles.push('TLS');if(full)columnTitles.push('verify');if(full)columnTitles.push('proxy');if(full)columnTitles.push('password');if(full)columnTitles.push('sasl username')
;if(full)columnTitles.push('sasl password');columnTitles.push('Nick');if(full)columnTitles.push('Alternate');if(full)columnTitles.push('Recover');if(full)columnTitles.push('user')
;if(full)columnTitles.push('Real Name');if(full)columnTitles.push('Modes');if(full)columnTitles.push('Channels');if(full)columnTitles.push('identifyNick');if(full)columnTitles.push('command')
;if(full)columnTitles.push('reconnect');if(full)columnTitles.push('logging');if(edit&&!window.globals.ircState.disableServerListEditor){columnTitles.push('');columnTitles.push('')
;columnTitles.push('');columnTitles.push('')}const titleRowEl=document.createElement('tr');columnTitles.forEach(titleName=>{const tdEl=document.createElement('th');tdEl.textContent=titleName
;tdEl.classList.add('server-list-th');titleRowEl.appendChild(tdEl)});tableNode.appendChild(titleRowEl);if(Array.isArray(data)&&data.length>0){
this.shadowRoot.getElementById('emptyTableDivId').setAttribute('hidden','');let allServersDisabled=true;for(let i=0;i<data.length;i++){const rowEl=document.createElement('tr')
;rowEl.setAttribute('index',i.toString())
;if(data[i].disabled)if('light'===document.querySelector('body').getAttribute('theme'))rowEl.classList.add('server-list-disabled-light-tr');else rowEl.classList.add('server-list-disabled-dark-tr');else allServersDisabled=false
;if(!full&&!window.globals.webState.ircServerEditOpen){const td01El=document.createElement('td');const selectButtonEl=document.createElement('button');selectButtonEl.setAttribute('index',i.toString())
;selectButtonEl.id='selectAtIndex'+i.toString();selectButtonEl.textContent='Select';if(mobile)selectButtonEl.textContent='Sel';selectButtonEl.title='Set as active server for IRC connections'
;if(data[i].disabled){selectButtonEl.setAttribute('disabled','');selectButtonEl.setAttribute('title','Disabled')}if(window.globals.ircState.ircConnected){
if(window.globals.ircState.ircServerIndex===i){selectButtonEl.setAttribute('title','Select is disabled when connected');this.selectButtonIdList.push('selectAtIndex'+i.toString())
;td01El.classList.add('server-list-button-connected');td01El.appendChild(selectButtonEl)}}else{if(window.globals.ircState.ircServerIndex===i)td01El.classList.add('server-list-button-disconnected')
;this.selectButtonIdList.push('selectAtIndex'+i.toString());td01El.appendChild(selectButtonEl)}rowEl.appendChild(td01El);const td02El=document.createElement('td')
;const connectButtonEl=document.createElement('button');connectButtonEl.textContent='Connect';if(mobile)connectButtonEl.textContent='Con';connectButtonEl.setAttribute('index',i.toString())
;connectButtonEl.id='connectAtIndex'+i.toString();this.pendingConnectButtonId=null;if(window.globals.ircState.ircServerIndex===i)if(window.globals.ircState.ircConnected){
td02El.classList.add('server-list-button-connected');connectButtonEl.textContent='Disconnect';if(mobile)connectButtonEl.textContent='Dis'
;connectButtonEl.setAttribute('title','Disconnect from IRC server');this.connectButtonIdList.push('connectAtIndex'+i.toString());td02El.appendChild(connectButtonEl)}else{
td02El.classList.add('server-list-button-disconnected');connectButtonEl.setAttribute('title','Connect server to IRC network');if(data[i].disabled){connectButtonEl.setAttribute('disabled','')
;connectButtonEl.setAttribute('title','Disabled')}this.connectButtonIdList.push('connectAtIndex'+i.toString());td02El.appendChild(connectButtonEl)}rowEl.appendChild(td02El)}if(!mobile){
const td03El=document.createElement('td');td03El.textContent=i.toString();rowEl.appendChild(td03El)}const td10El=document.createElement('td');const disabledCheckboxEl=document.createElement('input')
;disabledCheckboxEl.setAttribute('type','checkbox');disabledCheckboxEl.setAttribute('index',i.toString());disabledCheckboxEl.id='disableAtIndex'+i.toString()
;this.disabledCheckboxIdList.push('disableAtIndex'+i.toString());disabledCheckboxEl.setAttribute('title','Click to enable or disable IRC server')
;if(this.editable&&!window.globals.ircState.disableServerListEditor)disabledCheckboxEl.removeAttribute('disabled');else disabledCheckboxEl.setAttribute('disabled','')
;disabledCheckboxEl.checked=data[i].disabled;td10El.appendChild(disabledCheckboxEl);rowEl.appendChild(td10El);const td11El=document.createElement('td')
;if('group'in data[i])td11El.textContent=data[i].group;else td11El.textContent=0
;if('group'in data[i]&&data[i].group>0&&data[i].group<6)td11El.classList.add('server-list-group-color-'+data[i].group.toString());rowEl.appendChild(td11El);const td12El=document.createElement('td')
;td12El.textContent=data[i].name;rowEl.appendChild(td12El);if(!mobile){const td20El=document.createElement('td');td20El.textContent=data[i].host;rowEl.appendChild(td20El)
;const td21El=document.createElement('td');td21El.textContent=data[i].port;rowEl.appendChild(td21El)}if(full){const td22El=document.createElement('td');const tlsIconEl=document.createElement('div')
;const tlsIconInnerEl=document.createElement('div');tlsIconEl.appendChild(tlsIconInnerEl);if(data[i].tls){tlsIconEl.classList.add('server-list-icon-true')
;tlsIconInnerEl.classList.add('server-list-icon-inner-true')}else{tlsIconEl.classList.add('server-list-icon-false');tlsIconInnerEl.classList.add('server-list-icon-inner-false')}
td22El.appendChild(tlsIconEl);rowEl.appendChild(td22El);const td23El=document.createElement('td');const verifyIconEl=document.createElement('div');const verifyIconInnerEl=document.createElement('div')
;verifyIconEl.appendChild(verifyIconInnerEl);if(data[i].verify){verifyIconEl.classList.add('server-list-icon-true');verifyIconInnerEl.classList.add('server-list-icon-inner-true')}else{
verifyIconEl.classList.add('server-list-icon-false');verifyIconInnerEl.classList.add('server-list-icon-inner-false')}td23El.appendChild(verifyIconEl);rowEl.appendChild(td23El)
;const td24El=document.createElement('td');const proxyIconEl=document.createElement('div');const proxyIconInnerEl=document.createElement('div');proxyIconEl.appendChild(proxyIconInnerEl)
;if(data[i].proxy){proxyIconEl.classList.add('server-list-icon-true');proxyIconInnerEl.classList.add('server-list-icon-inner-true')}else{proxyIconEl.classList.add('server-list-icon-false')
;proxyIconInnerEl.classList.add('server-list-icon-inner-false')}td24El.appendChild(proxyIconEl);rowEl.appendChild(td24El);const td25El=document.createElement('td')
;if(null===data[i].password)td25El.textContent='(hidden)';else td25El.textContent='(blank)';rowEl.appendChild(td25El);const td26El=document.createElement('td');td26El.textContent=data[i].saslUsername
;rowEl.appendChild(td26El);const td27El=document.createElement('td');if(null===data[i].saslPassword)td27El.textContent='(hidden)';else td27El.textContent='(blank)';rowEl.appendChild(td27El)}
const td30El=document.createElement('td');td30El.textContent=data[i].nick;rowEl.appendChild(td30El);if(full){const td31El=document.createElement('td');td31El.textContent=data[i].altNick
;rowEl.appendChild(td31El);const td32El=document.createElement('td');const recoverNickIconEl=document.createElement('div');const recoverNickIconInnerEl=document.createElement('div')
;recoverNickIconEl.appendChild(recoverNickIconInnerEl);if(data[i].recoverNick){recoverNickIconEl.classList.add('server-list-icon-true')
;recoverNickIconInnerEl.classList.add('server-list-icon-inner-true')}else{recoverNickIconEl.classList.add('server-list-icon-false');recoverNickIconInnerEl.classList.add('server-list-icon-inner-false')
}td32El.appendChild(recoverNickIconEl);rowEl.appendChild(td32El);const td33El=document.createElement('td');td33El.textContent=data[i].user;rowEl.appendChild(td33El)
;const td34El=document.createElement('td');td34El.textContent=data[i].real;rowEl.appendChild(td34El);const td35El=document.createElement('td');td35El.textContent=data[i].modes
;rowEl.appendChild(td35El);const td40El=document.createElement('td');data[i].channelList.split(',').forEach(channel=>{const chanDiv=document.createElement('div');chanDiv.textContent=channel
;td40El.appendChild(chanDiv)});rowEl.appendChild(td40El);const td50El=document.createElement('td');td50El.textContent=data[i].identifyNick;rowEl.appendChild(td50El)
;const td51El=document.createElement('td');if(null===data[i].identifyCommand)td51El.textContent='(hidden)';else td51El.textContent='(blank)';rowEl.appendChild(td51El)
;const td60El=document.createElement('td');const reconnectIconEl=document.createElement('div');const reconnectIconInnerEl=document.createElement('div')
;reconnectIconEl.appendChild(reconnectIconInnerEl);if(data[i].reconnect){reconnectIconEl.classList.add('server-list-icon-true');reconnectIconInnerEl.classList.add('server-list-icon-inner-true')}else{
reconnectIconEl.classList.add('server-list-icon-false');reconnectIconInnerEl.classList.add('server-list-icon-inner-false')}td60El.appendChild(reconnectIconEl);rowEl.appendChild(td60El)
;const td61El=document.createElement('td');const loggingIconEl=document.createElement('div');const loggingIconInnerEl=document.createElement('div');loggingIconEl.appendChild(loggingIconInnerEl)
;if(data[i].logging){loggingIconEl.classList.add('server-list-icon-true');loggingIconInnerEl.classList.add('server-list-icon-inner-true')}else{loggingIconEl.classList.add('server-list-icon-false')
;loggingIconInnerEl.classList.add('server-list-icon-inner-false')}td61El.appendChild(loggingIconEl);rowEl.appendChild(td61El)}if(edit&&!window.globals.ircState.disableServerListEditor){
const td70El=document.createElement('td');const editButtonEl=document.createElement('button');editButtonEl.setAttribute('index',i.toString());editButtonEl.id='editAtIndex'+i.toString()
;this.editButtonIdList.push('editAtIndex'+i.toString());editButtonEl.textContent='Edit';editButtonEl.setAttribute('title','Open IRC server configuration form');td70El.appendChild(editButtonEl)
;rowEl.appendChild(td70El);const td71El=document.createElement('td');const copyButtonEl=document.createElement('button');copyButtonEl.setAttribute('index',i.toString())
;copyButtonEl.id='copyAtIndex'+i.toString();this.copyButtonIdList.push('copyAtIndex'+i.toString());copyButtonEl.textContent='Duplicate'
;copyButtonEl.setAttribute('title','Make a duplicate copy of this IRC server configuration');td71El.appendChild(copyButtonEl);rowEl.appendChild(td71El);const td72El=document.createElement('td')
;const deleteButtonEl=document.createElement('button');deleteButtonEl.setAttribute('index',i.toString());deleteButtonEl.id='deleteAtIndex'+i.toString()
;this.deleteButtonIdList.push('deleteAtIndex'+i.toString());deleteButtonEl.textContent='Delete';deleteButtonEl.setAttribute('title','Delete this IRC server from the server list.')
;td72El.appendChild(deleteButtonEl);rowEl.appendChild(td72El);const td73El=document.createElement('td');if(i>0){const moveUpButtonEl=document.createElement('button')
;moveUpButtonEl.setAttribute('index',i.toString());moveUpButtonEl.id='moveUpAtIndex'+i.toString();this.moveUpButtonIdList.push('moveUpAtIndex'+i.toString());moveUpButtonEl.textContent='Up'
;moveUpButtonEl.setAttribute('title','Move IRC server up by one row in the server list table.');td73El.appendChild(moveUpButtonEl)}rowEl.appendChild(td73El)}tableNode.appendChild(rowEl)}
const tdEls=Array.from(this.shadowRoot.querySelectorAll('td'));tdEls.forEach(tdEl=>{tdEl.classList.add('server-list-td')});this.selectButtonIdList.forEach(id=>{
this.shadowRoot.getElementById(id).addEventListener('click',this._selectServerButtonHandler)});this.connectButtonIdList.forEach(id=>{
this.shadowRoot.getElementById(id).addEventListener('click',this._connectToIrcButtonHandler)});this.disabledCheckboxIdList.forEach(id=>{
this.shadowRoot.getElementById(id).addEventListener('click',this._toggleDisabledCheckboxHandler)});this.editButtonIdList.forEach(id=>{
this.shadowRoot.getElementById(id).addEventListener('click',this._editIrcServerButtonHandler)});this.copyButtonIdList.forEach(id=>{
this.shadowRoot.getElementById(id).addEventListener('click',this._copyIrcServerToNewButtonHandler)});this.deleteButtonIdList.forEach(id=>{
this.shadowRoot.getElementById(id).addEventListener('click',this._deleteIrcServerButtonHandler)});this.moveUpButtonIdList.forEach(id=>{
this.shadowRoot.getElementById(id).addEventListener('click',this._moveUpInListButtonHandler)})
;if(allServersDisabled)this.shadowRoot.getElementById('allDisabledWarningDivId').removeAttribute('hidden');else this.shadowRoot.getElementById('allDisabledWarningDivId').setAttribute('hidden','')
}else this.shadowRoot.getElementById('emptyTableDivId').removeAttribute('hidden')
;if(window.globals.ircState.enableSocks5Proxy)this.shadowRoot.getElementById('ircProxyDivId').textContent='Socks5 Proxy: Available ('+window.globals.ircState.socks5Host+':'+window.globals.ircState.socks5Port+')';else this.shadowRoot.getElementById('ircProxyDivId').textContent='Socks5 Proxy: Disabled by server'
;resolve(null)});initializePlugin=()=>{this.shadowRoot.getElementById('createNewButtonId').setAttribute('title','Opens form to create a new IRC server configuration')
;this.shadowRoot.getElementById('showEditButtonId').setAttribute('title','Configures table to default width. (If allowed edit buttons visible)')
;this.shadowRoot.getElementById('showFullButtonId').setAttribute('title','Configures table to show all IRC configuration settings (edit button hidden)')
;this.shadowRoot.getElementById('showMobileButtonId').setAttribute('title','Set narrow table width to select server from mobile phone screen')
;this.shadowRoot.getElementById('disconnectButtonId').setAttribute('title','Disconnect from the IRC network')
;this.shadowRoot.getElementById('forceUnlockButtonId').setAttribute('title','Press to unlock database. Refreshing or leaving editor '+'form during edit can leave database locked.')}
;connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()})
;this.shadowRoot.getElementById('ircProxyInfoBtnId').addEventListener('click',()=>{const ircProxyInfoEl=this.shadowRoot.getElementById('ircProxyInfoId')
;if(ircProxyInfoEl.hasAttribute('hidden'))ircProxyInfoEl.removeAttribute('hidden');else ircProxyInfoEl.setAttribute('hidden','')})
;this.shadowRoot.getElementById('disconnectButtonId').addEventListener('click',()=>{document.getElementById('ircControlsPanel').disconnectHandler()})
;this.shadowRoot.getElementById('forceUnlockButtonId').addEventListener('click',()=>{const serverFormEl=document.getElementById('serverFormPanel');serverFormEl.fetchServerList(0,0).then(()=>{
console.log('Database: unlock successful');window.globals.webState.ircServerEditOpen=false;this.shadowRoot.getElementById('forceUnlockButtonId').setAttribute('hidden','')}).catch(err=>{
console.log(err);let message=err.message||err.toString()||'Error attempting to create new IRC server';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})})
;this.shadowRoot.getElementById('createNewButtonId').addEventListener('click',()=>{const serverFormEl=document.getElementById('serverFormPanel');serverFormEl.fetchServerList(0,1).then(()=>{
serverFormEl.fetchServerList(0,0)}).then(()=>{serverFormEl.createNewIrcServer()}).catch(this._handleServerListOpenError)})
;this.shadowRoot.getElementById('showFullButtonId').addEventListener('click',()=>{this.fullWidth=true;this.mobileWidth=false
;document.getElementById('serverFormPanel').fetchServerList(-1,-1).then(data=>this._buildServerListTable(data)).catch(err=>{console.log(err);let message=err.message||err.toString()||'Error'
;message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})});this.shadowRoot.getElementById('showEditButtonId').addEventListener('click',()=>{this.fullWidth=false
;this.mobileWidth=false;document.getElementById('serverFormPanel').fetchServerList(-1,-1).then(data=>this._buildServerListTable(data)).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})})
;this.shadowRoot.getElementById('showMobileButtonId').addEventListener('click',()=>{this.fullWidth=false;this.mobileWidth=true
;document.getElementById('serverFormPanel').fetchServerList(-1,-1).then(data=>this._buildServerListTable(data)).catch(err=>{console.log(err);let message=err.message||err.toString()||'Error'
;message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})});document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const tbodyEl=this.shadowRoot.getElementById('tbodyId');if('light'===event.detail.theme){
panelDivEl.classList.remove('server-list-theme-dark');panelDivEl.classList.add('server-list-theme-light');tbodyEl.classList.remove('server-list-tbody-dark')
;tbodyEl.classList.add('server-list-tbody-light')}else{panelDivEl.classList.remove('server-list-theme-light');panelDivEl.classList.add('server-list-theme-dark')
;tbodyEl.classList.remove('server-list-tbody-light');tbodyEl.classList.add('server-list-tbody-dark')}if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))this.showPanel()
});document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('irc-server-edit-open',()=>{
document.getElementById('serverFormPanel').fetchServerList(-1,-1).then(this._buildServerListTable).then(this._updateVisibility).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})});document.addEventListener('irc-state-changed',()=>{
let needUpdate=false;if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')){if(window.globals.ircState.ircConnected!==this.ircConnectedLast){
this.ircConnectedLast=window.globals.ircState.ircConnected;if(window.globals.ircState.ircConnected){this.editable=false;needUpdate=true;this.hidePanel()}else{this.editable=true;this.fullWidth=false
;this.mobileWidth=false;if(window.globals.webState.dynamic.panelPxWidth<this.mobileWedthBreakpointPixels)this.mobileWidth=true;needUpdate=true}}else{
if(window.globals.ircState.ircConnected)needUpdate=false;if(!window.globals.ircState.ircConnected){needUpdate=true;if(!window.globals.webState.ircServerEditOpen)this.editable=true}}
if(needUpdate)document.getElementById('serverFormPanel').fetchServerList(-1,-1).then(data=>this._buildServerListTable(data)).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)});this._updateVisibility()}})
;document.addEventListener('show-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){
if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()
}else this.showPanel()})}});window.customElements.define('irc-controls-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('ircControlsPanelTemplate')
;const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.lastConnectErrorCount=0;this.ircConnectedLast=false
;this.ircConnectingLast=false;this.webSocketFirstConnect=true;this.webConnectedLast=false;this.updateCacheDebounceActive=false}_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible','');this._updateVisibility()
;document.dispatchEvent(new CustomEvent('cancel-zoom'));this._scrollToTop()};collapsePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','')
;this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');this._updateVisibility()};hidePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible')};handleHotKey=()=>{
if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')&&this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))this.collapsePanel();else if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')&&!this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))this.hidePanel();else this.showPanel()
};_updateVisibility=()=>{const editServerButtonEl=this.shadowRoot.getElementById('editServerButtonId');const connectButtonEl=this.shadowRoot.getElementById('connectButtonId')
;const forceUnlockButtonEl=this.shadowRoot.getElementById('forceUnlockButtonId');const editorOpenWarningDivEl=this.shadowRoot.getElementById('editorOpenWarningDivId')
;const emptyTableWarningDivEl=this.shadowRoot.getElementById('emptyTableWarningDivId');const awayHiddenDivEl=this.shadowRoot.getElementById('awayHiddenDivId')
;editServerButtonEl.removeAttribute('hidden');connectButtonEl.removeAttribute('disabled');awayHiddenDivEl.setAttribute('hidden','')
;if(window.globals.ircState.ircConnected||window.globals.webState.ircServerEditOpen){editServerButtonEl.setAttribute('hidden','');connectButtonEl.setAttribute('disabled','')}
editorOpenWarningDivEl.setAttribute('hidden','');if(window.globals.webState.ircServerEditOpen)editorOpenWarningDivEl.removeAttribute('hidden');emptyTableWarningDivEl.setAttribute('hidden','')
;if(window.globals.ircState.ircServerIndex<0){emptyTableWarningDivEl.removeAttribute('hidden');editServerButtonEl.setAttribute('hidden','');connectButtonEl.setAttribute('disabled','')}
if(window.globals.ircState.ircConnected)awayHiddenDivEl.removeAttribute('hidden');forceUnlockButtonEl.setAttribute('hidden','')};_checkConnect=code=>{
if(code>=1&&!window.globals.webState.webConnected){document.getElementById('errorPanel').showError('Error: not connected to web server');return false}
if(code>=2&&!window.globals.ircState.ircConnected){document.getElementById('errorPanel').showError('Error: Not connected to IRC server.');return false}
if(code>=3&&!window.globals.ircState.ircRegistered){document.getElementById('errorPanel').showError('Error: Not connected to IRC server.');return false}return true}
;getIrcState=()=>new Promise((resolve,reject)=>{window.globals.webState.count.webStateCalls++;const fetchController=new AbortController
;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner');const fetchOptions={method:'GET',redirect:'error',
signal:fetchController.signal,headers:{Accept:'application/json'}};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/getircstate';activitySpinnerEl.requestActivitySpinner()
;const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status
;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;window.globals.ircState=responseJson;if(window.globals.ircState.ircConnecting!==this.ircConnectingLast){this.ircConnectingLast=window.globals.ircState.ircConnecting
;if(window.globals.ircState.ircConnecting)activitySpinnerEl.requestActivitySpinner();else activitySpinnerEl.cancelActivitySpinner()}
if(this.lastConnectErrorCount!==window.globals.ircState.count.ircConnectError){this.lastConnectErrorCount=window.globals.ircState.count.ircConnectError
;if(window.globals.ircState.count.ircConnectError>0)if(window.globals.webState.count.webStateCalls>1)document.getElementById('errorPanel').showError('An IRC Server connection error occurred')
;window.globals.webState.ircConnecting=false}document.dispatchEvent(new CustomEvent('irc-state-changed'));resolve(window.globals.ircState)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})});sendIrcServerMessageHandler=message=>new Promise((resolve,reject)=>{if(!this._checkConnect(3))resolve(null);const fetchController=new AbortController
;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner');const body={message:message};const fetchOptions={
method:'POST',redirect:'error',signal:fetchController.signal,headers:{'CSRF-Token':document.getElementById('globVars').csrfToken,'Content-type':'application/json',Accept:'application/json'},
body:JSON.stringify(body)};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/message';activitySpinnerEl.requestActivitySpinner()
;const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status
;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;if(responseJson.error)reject(new Error(responseJson.message));else resolve(null)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})});sendIrcServerMessage=message=>{this.sendIrcServerMessageHandler(message).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})}
;serverSetIndexHandler=index=>{if(window.globals.ircState.ircConnected)return Promise.reject(new Error('Can not change servers while connected'));return new Promise((resolve,reject)=>{
const fetchController=new AbortController;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner')
;const fetchOptions={method:'POST',redirect:'error',signal:fetchController.signal,headers:{'CSRF-Token':document.getElementById('globVars').csrfToken,'Content-type':'application/json',
Accept:'application/json'},body:JSON.stringify({index:index})};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/server';activitySpinnerEl.requestActivitySpinner()
;const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status
;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;resolve(responseJson)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})})};connectHandler=()=>{if(window.globals.webState.ircServerEditOpen)return Promise.reject(new Error('Connection not allowed during IRC server edit.'))
;return new Promise((resolve,reject)=>{if(!this._checkConnect(1))return;if(window.globals.ircState.ircConnected||window.globals.ircState.ircConnecting||window.globals.webState.ircConnecting){
document.getElementById('errorPanel').showError('Error: Already connected to IRC server');return}if(-1===window.globals.ircState.ircServerIndex){
document.getElementById('errorPanel').showError('Empty Server List');return}window.globals.webState.ircConnecting=true;const connectObject={}
;connectObject.nickName=this.shadowRoot.getElementById('nickNameInputId').value;connectObject.realName=window.globals.ircState.realName;connectObject.userMode=window.globals.ircState.userMode
;const fetchController=new AbortController;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner')
;const fetchOptions={method:'POST',redirect:'error',signal:fetchController.signal,headers:{'CSRF-Token':document.getElementById('globVars').csrfToken,'Content-type':'application/json',
Accept:'application/json'},body:JSON.stringify(connectObject)};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/connect';activitySpinnerEl.requestActivitySpinner()
;const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status
;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;if(responseJson.error)reject(new Error(responseJson.message));else resolve(null)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})})};disconnectHandler=()=>{
if(window.globals.webState.ircConnecting||window.globals.ircState.webConnecting||window.globals.ircState.ircConnected&&!window.globals.ircState.ircRegistered){
window.globals.webState.ircConnecting=false;this.forceDisconnectHandler().catch(err=>{console.log(err);let message=err.message||err.toString()||'Error occurred calling /irc/connect'
;message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})
}else if(window.globals.ircState.ircAutoReconnect&&window.globals.ircState.ircConnectOn&&!window.globals.ircState.ircConnected&&!window.globals.ircState.ircConnecting)this.forceDisconnectHandler().catch(err=>{
console.log(err);let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)
});else this.sendIrcServerMessage('QUIT :'+window.globals.ircState.progName+' '+window.globals.ircState.progVersion)};forceDisconnectHandler=()=>new Promise((resolve,reject)=>{
const fetchController=new AbortController;const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner')
;const fetchOptions={method:'POST',redirect:'error',signal:fetchController.signal,headers:{'CSRF-Token':document.getElementById('globVars').csrfToken,'Content-type':'application/json',
Accept:'application/json'},body:JSON.stringify({})};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/disconnect';activitySpinnerEl.requestActivitySpinner()
;const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status
;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;if(responseJson.error)reject(new Error(responseJson.message));else resolve(null)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})});updateFromCache=()=>{
if(window.globals.webState.cacheReloadInProgress)return Promise.reject(new Error('Attempt cache reload, while previous in progress'));window.globals.webState.cacheReloadInProgress=true
;document.dispatchEvent(new CustomEvent('erase-before-reload'));return new Promise((resolve,reject)=>{const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout')
;const activitySpinnerEl=document.getElementById('activitySpinner');const fetchController=new AbortController;const fetchOptions={method:'GET',redirect:'error',signal:fetchController.signal,headers:{
Accept:'application/json'}};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/cache';activitySpinnerEl.requestActivitySpinner()
;const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status
;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseArray=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;if(Array.isArray(responseArray)){window.globals.webState.lastPMNick='';window.globals.webState.activePrivateMessageNicks=[];const remoteCommandParserEl=document.getElementById('remoteCommandParser')
;if(responseArray.length>0)for(let i=0;i<responseArray.length;i++)if(responseArray[i].length>0)remoteCommandParserEl.parseBufferMessage(responseArray[i])}const timestamp=Math.floor(Date.now()/1e3)
;document.dispatchEvent(new CustomEvent('cache-reload-done',{detail:{timestamp:timestamp}}));resolve(null)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const timestamp=Math.floor(Date.now()/1e3);document.dispatchEvent(new CustomEvent('cache-reload-error',{detail:{timestamp:timestamp}}));const error=new Error(message);reject(error)})})}
;pruneIrcChannel=pruneChannel=>{if('string'!==typeof pruneChannel||pruneChannel.length<1)return Promise.reject(new Error('Invalid channel name parameter'));else return new Promise((resolve,reject)=>{
const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner');const fetchController=new AbortController
;const fetchOptions={method:'POST',redirect:'error',signal:fetchController.signal,headers:{'CSRF-Token':document.getElementById('globVars').csrfToken,'Content-type':'application/json',
Accept:'application/json'},body:JSON.stringify({channel:pruneChannel})};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/prune';activitySpinnerEl.requestActivitySpinner()
;const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout);fetch(fetchURL,fetchOptions).then(response=>{
if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status
;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;if(responseJson.error)reject(new Error(responseJson.message));else resolve(null)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})})};eraseIrcCache=cacheType=>{if('string'!==typeof cacheType||cacheType.length<1)return Promise.reject(new Error('Invalid erase cache parameter'));else{
document.dispatchEvent(new CustomEvent('erase-before-reload'));return new Promise((resolve,reject)=>{const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout')
;const activitySpinnerEl=document.getElementById('activitySpinner');const fetchController=new AbortController;const fetchOptions={method:'POST',redirect:'error',signal:fetchController.signal,headers:{
'CSRF-Token':document.getElementById('globVars').csrfToken,'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify({erase:cacheType})}
;const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/erase';activitySpinnerEl.requestActivitySpinner();const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout)
;fetch(fetchURL,fetchOptions).then(response=>{if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error')
;err.status=response.status;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();if(responseJson.error)reject(new Error(responseJson.message));else resolve(responseJson)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})})}};webServerTerminate=()=>new Promise((resolve,reject)=>{const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout')
;const activitySpinnerEl=document.getElementById('activitySpinner');const fetchController=new AbortController;const fetchOptions={method:'POST',redirect:'error',signal:fetchController.signal,headers:{
'CSRF-Token':document.getElementById('globVars').csrfToken,'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify({terminate:'YES'})}
;const fetchURL=document.getElementById('globVars').webServerUrl+'/terminate';activitySpinnerEl.requestActivitySpinner();const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout)
;fetch(fetchURL,fetchOptions).then(response=>{if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error')
;err.status=response.status;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();if(responseJson.error)reject(new Error(responseJson.message));else resolve(responseJson)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;const error=new Error(message);reject(error)})});ircStatusIconTouchDebounce=false;webConnectHeaderBarIconHandler=()=>{if(this.ircStatusIconTouchDebounce)return;this.ircStatusIconTouchDebounce=true
;setTimeout(()=>{this.ircStatusIconTouchDebounce=false},1e3)
;if(window.globals.ircState.ircConnected||window.globals.ircState.ircConnecting||window.globals.webState.ircConnecting)if(window.globals.webState.ircConnecting||window.globals.ircState.webConnecting||window.globals.ircState.ircConnected&&!window.globals.ircState.ircRegistered){
window.globals.webState.ircConnecting=false;this.forceDisconnectHandler().catch(err=>{console.log(err);let message=err.message||err.toString()||'Error occurred calling /irc/connect'
;message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})
}else document.getElementById('ircControlsPanel').sendIrcServerMessage('QUIT :'+window.globals.ircState.progName+' '+window.globals.ircState.progVersion);else this.connectHandler().catch(err=>{
console.log(err);let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})}
;awayButtonHeaderBarIconHandler=()=>{if(window.globals.ircState.ircConnected&&window.globals.ircState.ircIsAway){document.getElementById('ircServerPanel').showPanel()
;document.dispatchEvent(new CustomEvent('cancel-zoom'));this.sendIrcServerMessage('AWAY')}};initializePlugin=()=>{
this.shadowRoot.getElementById('showServerListButtonId').setAttribute('title','Open panel with list of IRC servers')
;this.shadowRoot.getElementById('showServerPanelButtonId').setAttribute('title','Open panel showing messages from IRC server')
;this.shadowRoot.getElementById('editServerButtonId').setAttribute('title','Opens form to edit IRC server configuration')
;this.shadowRoot.getElementById('forceUnlockButtonId').setAttribute('title','Press to unlock database. Refreshing or leaving editor '+'form during edit can leave database locked.')
;this.shadowRoot.getElementById('connectButtonId').setAttribute('title','Connect to the IRC network')
;this.shadowRoot.getElementById('quitButtonId').setAttribute('title','Disconnect (/QUIT) from the IRC network.')
;this.shadowRoot.getElementById('setAwayButtonId').setAttribute('title','Set your status to AWAY on the IRC network with optional away message')
;this.shadowRoot.getElementById('setBackButtonId').setAttribute('title','Cancel your AWAY status on the IRC network.')
;this.shadowRoot.getElementById('nickNameInputId').setAttribute('title','Nickname to be used for next IRC connect')
;this.shadowRoot.getElementById('userAwayMessageId').setAttribute('title','IRC user AWAY message')};connectedCallback(){
this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()});this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))this.collapsePanel();else this.showPanel()})
;this.shadowRoot.getElementById('showServerListButtonId').addEventListener('click',()=>{document.getElementById('serverListPanel').showPanel()})
;this.shadowRoot.getElementById('showServerPanelButtonId').addEventListener('click',()=>{document.getElementById('ircServerPanel').showPanel()})
;this.shadowRoot.getElementById('editServerButtonId').addEventListener('click',()=>{const serverFormEl=document.getElementById('serverFormPanel');const index=window.globals.ircState.ircServerIndex
;serverFormEl.fetchServerList(index,1).then(()=>{serverFormEl.fetchServerList(index,0)}).then(()=>{serverFormEl.editIrcServerAtIndex(index)}).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error attempting edit IRC server';message=message.split('\n')[0];if(409===err.status){
this.shadowRoot.getElementById('forceUnlockButtonId').removeAttribute('hidden');document.getElementById('errorPanel').showError('Database Locked')
}else if(405===err.status)document.getElementById('errorPanel').showError('Database Disabled');else document.getElementById('errorPanel').showError(message)})})
;this.shadowRoot.getElementById('forceUnlockButtonId').addEventListener('click',()=>{const serverFormEl=document.getElementById('serverFormPanel');serverFormEl.fetchServerList(0,0).then(()=>{
console.log('Database: unlock successful');window.globals.webState.ircServerEditOpen=false;this._updateVisibility()}).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error attempting to create new IRC server';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})})
;this.shadowRoot.getElementById('connectButtonId').addEventListener('click',()=>{if(this.shadowRoot.getElementById('nickNameInputId').value.length<1){
document.getElementById('errorPanel').showError('Invalid nick name.');return}this.connectHandler().catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})})
;this.shadowRoot.getElementById('quitButtonId').addEventListener('click',()=>{this.disconnectHandler()});this.shadowRoot.getElementById('setAwayButtonId').addEventListener('click',()=>{
if(window.globals.ircState.ircConnected&&this.shadowRoot.getElementById('userAwayMessageId').value.length>0){document.getElementById('ircServerPanel').showPanel()
;document.dispatchEvent(new CustomEvent('cancel-zoom'));this.sendIrcServerMessage('AWAY '+this.shadowRoot.getElementById('userAwayMessageId').value)}})
;this.shadowRoot.getElementById('setBackButtonId').addEventListener('click',()=>{if(window.globals.ircState.ircConnected&&window.globals.ircState.ircIsAway){
document.getElementById('ircServerPanel').showPanel();document.dispatchEvent(new CustomEvent('cancel-zoom'));this.sendIrcServerMessage('AWAY')}})
;this.shadowRoot.getElementById('setAwayInfoBtnId').addEventListener('click',()=>{this.shadowRoot.getElementById('setAwayInfoId').removeAttribute('hidden')})
;document.addEventListener('cache-reload-done',event=>{window.globals.webState.cacheReloadInProgress=false});document.addEventListener('cache-reload-error',event=>{
window.globals.webState.cacheReloadInProgress=false});document.addEventListener('debounced-update-from-cache',event=>{if(!this.updateCacheDebounceActive){this.updateCacheDebounceActive=true
;setTimeout(()=>{this.updateCacheDebounceActive=false;if(!window.globals.webState.cacheReloadInProgress)this.updateFromCache().catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})},1e3)}})
;document.addEventListener('update-from-cache',event=>{this.updateFromCache().catch(err=>{console.log(err);let message=err.message||err.toString()||'Error';message=message.split('\n')[0]
;document.getElementById('errorPanel').showError(message)})});document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){
if(event.detail.except!==this.id)this.collapsePanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()})
;document.addEventListener('color-theme-changed',event=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId');if('light'===event.detail.theme){
panelDivEl.classList.remove('irc-controls-panel-theme-dark');panelDivEl.classList.add('irc-controls-panel-theme-light')}else{panelDivEl.classList.remove('irc-controls-panel-theme-light')
;panelDivEl.classList.add('irc-controls-panel-theme-dark')}let newTextTheme='global-text-theme-dark';let oldTextTheme='global-text-theme-light'
;if('light'===document.querySelector('body').getAttribute('theme')){newTextTheme='global-text-theme-light';oldTextTheme='global-text-theme-dark'}
const inputEls=Array.from(this.shadowRoot.querySelectorAll('input'));inputEls.forEach(el=>{el.classList.remove(oldTextTheme);el.classList.add(newTextTheme)})})
;document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('irc-server-edit-open',()=>{
this._updateVisibility()});document.addEventListener('irc-state-changed',()=>{if(this.webSocketFirstConnect){this.webSocketFirstConnect=false
;if(window.globals.ircState.ircConnected)this.collapsePanel();else{this.showPanel();if(window.globals.ircState.ircServerIndex<0){
this.shadowRoot.getElementById('editServerButtonId').setAttribute('hidden','');this.shadowRoot.getElementById('connectButtonId').setAttribute('disabled','')
;const serverFormEl=document.getElementById('serverFormPanel');serverFormEl.fetchServerList(0,1).then(()=>{serverFormEl.fetchServerList(0,0)}).then(()=>{serverFormEl.createNewIrcServer()
}).catch(err=>{console.log(err);let message=err.message||err.toString()||'Error';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})}}}
if(window.globals.ircState.ircConnected!==this.ircConnectedLast){this.ircConnectedLast=window.globals.ircState.ircConnected;if(window.globals.ircState.ircConnected){this.collapsePanel()
;if(!window.globals.webState.cacheReloadInProgress)document.dispatchEvent(new CustomEvent('debounced-update-from-cache'))}else this.showPanel()}
if(window.globals.ircState.ircConnected)this.shadowRoot.getElementById('nickNameInputId').value=window.globals.ircState.nickName;else if(window.globals.ircState.ircServerIndex>=0)this.shadowRoot.getElementById('nickNameInputId').value=window.globals.ircState.nickName
;if(window.globals.ircState.ircConnected)this.shadowRoot.getElementById('panelTitleDivId').textContent='IRC Controls '+window.globals.ircState.ircServerName+' ('+window.globals.ircState.nickName+')';else this.shadowRoot.getElementById('panelTitleDivId').textContent='IRC Controls'
;if(window.globals.ircState.ircConnected){window.globals.webState.ircConnecting=false;document.title='IRC-'+window.globals.ircState.ircServerName+'('+window.globals.ircState.nickName+')'}
if(!window.globals.ircState.ircConnected)document.title='irc-hybrid-client';let infoReconnect='';if(window.globals.ircState.ircAutoReconnect)infoReconnect='Auto-reconnect:   Enabled\n'
;let infoRotate='';if(window.globals.ircState.ircServerRotation&&window.globals.ircState.ircServerGroup>0)infoRotate='Rotate servers:   Group: '+window.globals.ircState.ircServerGroup.toString()+'\n'
;let infoProxy=''
;if(window.globals.ircState.ircProxy&&window.globals.ircState.enableSocks5Proxy)infoProxy='Socks5 proxy:     '+window.globals.ircState.socks5Host+':'+window.globals.ircState.socks5Port+'\n'
;let selectedServerInfo='Label:\nServer:\nNickname:'
;if(window.globals.ircState.ircServerIndex>=0)selectedServerInfo='Label:            '+window.globals.ircState.ircServerName+' (Index='+window.globals.ircState.ircServerIndex.toString()+')\n'+'Server:           '+window.globals.ircState.ircServerHost+':'+window.globals.ircState.ircServerPort+'\n'+infoProxy+infoReconnect+infoRotate+'Nickname:         '+window.globals.ircState.nickName
;this.shadowRoot.getElementById('selectedServerPreId').textContent=selectedServerInfo;this._updateVisibility()});document.addEventListener('show-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.showPanel()}else this.showPanel()});document.addEventListener('web-connect-changed',()=>{
if(window.globals.webState.webConnected!==this.webConnectedLast){this.webConnectedLast=window.globals.webState.webConnected;if(!window.globals.webState.webConnected)this.webSocketFirstConnect=true}})}
});window.customElements.define('irc-server-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('ircServerPanelTemplate')
;const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.ircConnectedLast=false;this.ircConnectOnLast=false
;this.ircConnectingLast=false}_scrollToTop=()=>{this.focus();const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId')
;panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight;document.dispatchEvent(new CustomEvent('cancel-zoom'));document.getElementById('headerBar').removeAttribute('servericon')
;document.getElementById('navMenu').handleServerUnreadUpdate(false);this._scrollToTop();this.shadowRoot.getElementById('panelMessageInputId').focus()};collapsePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};handleHotKey=()=>{
if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))this.hidePanel();else this.showPanel()};_parseInputForIRCCommands=textAreaEl=>{
const errorPanelEl=document.getElementById('errorPanel');const displayUtilsEl=document.getElementById('displayUtils');const text=displayUtilsEl.stripTrailingCrLf(textAreaEl.value)
;if(displayUtilsEl.detectMultiLineString(text)){textAreaEl.value='';errorPanelEl.showError('Multi-line input is not supported.')}else if(text.length>0){
const commandAction=document.getElementById('localCommandParser').textCommandParser({inputString:text,originType:'generic',originName:null});textAreaEl.value='';if(commandAction.error){
errorPanelEl.showError(commandAction.message);return}else{
if(commandAction.ircMessage&&commandAction.ircMessage.length>0)document.getElementById('ircControlsPanel').sendIrcServerMessage(commandAction.ircMessage);return}}textAreaEl.value=''}
;_autoCompleteServInputElement=snippet=>{const serverInputAreaEl=this.shadowRoot.getElementById('panelMessageInputId');const localCommandParserEl=document.getElementById('localCommandParser')
;let last='';const trailingSpaceKey=32;let matchedCommand=''
;if(localCommandParserEl.autoCompleteCommandList.length>0)for(let i=0;i<localCommandParserEl.autoCompleteCommandList.length;i++)if(0===localCommandParserEl.autoCompleteCommandList[i].indexOf(snippet.toUpperCase()))matchedCommand=localCommandParserEl.autoCompleteCommandList[i]
;let matchedRawCommand=''
;if(localCommandParserEl.autoCompleteRawCommandList.length>0)for(let i=0;i<localCommandParserEl.autoCompleteRawCommandList.length;i++)if(0===localCommandParserEl.autoCompleteRawCommandList[i].indexOf(snippet.toUpperCase()))matchedRawCommand=localCommandParserEl.autoCompleteRawCommandList[i]
;if(matchedCommand.length>0&&serverInputAreaEl.value===snippet){serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-snippet.length)
;serverInputAreaEl.value+=matchedCommand;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=matchedCommand
}else if(matchedRawCommand.length>0&&'/QUOTE '===serverInputAreaEl.value.slice(0,7).toUpperCase()){
serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-snippet.length);serverInputAreaEl.value+=matchedRawCommand
;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=matchedRawCommand}else if(0===window.globals.ircState.nickName.toLowerCase().indexOf(snippet.toLowerCase())){
serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-snippet.length);serverInputAreaEl.value+=window.globals.ircState.nickName
;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=window.globals.ircState.nickName}else serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);return last}
;lastServAutoCompleteMatch='';_serverAutoComplete=e=>{const serverInputAreaEl=this.shadowRoot.getElementById('panelMessageInputId');const autoCompleteSpaceKey=32;const trailingSpaceKey=32
;if(!e.code)return;if(e.code&&'Tab'===e.code){if(serverInputAreaEl.value.length<2){e.preventDefault();return}let snippet='';const snippetArray=serverInputAreaEl.value.split(' ')
;if(snippetArray.length>0)snippet=snippetArray[snippetArray.length-1];if(snippet.length>0){if('Tab'===e.code&&snippet.length>0)this._autoCompleteServInputElement(snippet)}else{
if('/QUIT '===serverInputAreaEl.value.toUpperCase())serverInputAreaEl.value+=window.globals.ircState.progName+' '+window.globals.ircState.progVersion;else serverInputAreaEl.value+=window.globals.ircState.nickName
;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey)}e.preventDefault()}
if(e.code&&'Space'===e.code)if(serverInputAreaEl.value.length>0)if(serverInputAreaEl.value.charCodeAt(serverInputAreaEl.value.length-1)===autoCompleteSpaceKey)if(serverInputAreaEl.value.length>1&&serverInputAreaEl.value.charCodeAt(serverInputAreaEl.value.length-2)===autoCompleteSpaceKey){
serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-1)
;if('/QUIT '===serverInputAreaEl.value.toUpperCase())serverInputAreaEl.value+=window.globals.ircState.progName+' '+window.globals.ircState.progVersion;else serverInputAreaEl.value+=window.globals.ircState.nickName
;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);e.preventDefault()}else{serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-1);let snippet=''
;const snippetArray=serverInputAreaEl.value.split(' ');if(snippetArray.length>0)snippet=snippetArray[snippetArray.length-1];if(snippet.length>0){
const matchStr=this._autoCompleteServInputElement(snippet);if(this.lastServAutoCompleteMatch!==matchStr){this.lastServAutoCompleteMatch=matchStr;e.preventDefault()}
}else serverInputAreaEl.value+=String.fromCharCode(autoCompleteSpaceKey)}}
;ircMessageCommandDisplayFilter=['324','329','331','332','333','353','366','367','368','JOIN','KICK','MODE','NOTICE','PART','PING','PONG','PRIVMSG','cachedQUIT'.toUpperCase(),'QUIT','TOPIC','WALLOPS']
;displayPlainServerMessage=message=>{const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');panelMessageDisplayEl.value+=message+'\n'
;panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight;const now=Math.floor(Date.now()/1e3);const ircConnectTime=now-window.globals.ircState.times.ircConnect
;if(ircConnectTime>5&&document.activeElement!==document.getElementById('ircServerPanel')&&!window.globals.webState.cacheReloadInProgress){
document.getElementById('headerBar').setAttribute('servericon','');document.getElementById('navMenu').handleServerUnreadUpdate(true)}};displayFormattedServerMessage=(parsedMessage,message)=>{
const displayUtilsEl=document.getElementById('displayUtils');const displayMessage=msg=>{const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId')
;panelMessageDisplayEl.value+=msg+'\n';panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight};const _showAfterParamZero=(parsedMessage,title)=>{let msgString=''
;if(parsedMessage.params.length>1)for(let i=1;i<parsedMessage.params.length;i++)msgString+=' '+parsedMessage.params[i];else console.log('Error _showAfterParamZero() no parsed field')
;let outMessage=parsedMessage.timestamp+msgString;if(title)outMessage=title+msgString;displayMessage(displayUtilsEl.cleanFormatting(displayUtilsEl.cleanCtcpDelimiter(outMessage)))}
;const _substituteHmsTime=inMessage=>{const timeString=inMessage.split(' ')[0];const restOfMessage=inMessage.slice(timeString.length+1,inMessage.length)
;const hmsString=displayUtilsEl.timestampToHMS(timeString);return hmsString+' '+restOfMessage};if(this.ircMessageCommandDisplayFilter.indexOf(parsedMessage.command.toUpperCase())>=0)return
;if(this.shadowRoot.getElementById('panelDivId').getAttribute('lastDate')!==parsedMessage.datestamp){this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate',parsedMessage.datestamp)
;this.shadowRoot.getElementById('panelMessageDisplayId').value+='\n=== '+parsedMessage.datestamp+' ===\n\n'}switch(parsedMessage.command){case'001':case'002':case'003':case'004':
_showAfterParamZero(parsedMessage,null);break;case'005':break;case'221':if('params'in parsedMessage&&parsedMessage.params.length>0){
const outMessage=parsedMessage.timestamp+' Mode '+parsedMessage.params[0]+' '+parsedMessage.params[1];displayMessage(displayUtilsEl.cleanFormatting(displayUtilsEl.cleanCtcpDelimiter(outMessage)))}
break;case'250':case'251':case'252':case'254':case'255':case'265':_showAfterParamZero(parsedMessage,null);break;case'256':case'257':case'258':case'259':_showAfterParamZero(parsedMessage,null);break
;case'315':displayMessage('WHO --End--');break;case'352':_showAfterParamZero(parsedMessage,'WHO');break;case'275':case'307':case'311':case'312':case'313':case'317':case'319':case'330':case'338':
case'378':case'379':case'671':_showAfterParamZero(parsedMessage,'WHOIS');break;case'301':if(3!==parsedMessage.params.length)_showAfterParamZero(parsedMessage,'WHOIS');else{
const outMessage='WHOIS '+parsedMessage.params[1]+' is away: '+parsedMessage.params[2];displayMessage(displayUtilsEl.cleanFormatting(displayUtilsEl.cleanCtcpDelimiter(outMessage)))}break;case'318':
displayMessage('WHOIS --End--');break;case'322':if(4===parsedMessage.params.length){let outMessage='LIST '+parsedMessage.params[1]+' '+parsedMessage.params[2]
;if(parsedMessage.params[3])outMessage+=' '+parsedMessage.params[3];displayMessage(displayUtilsEl.cleanFormatting(displayUtilsEl.cleanCtcpDelimiter(outMessage)))
}else console.log('Error Msg 322 not have 4 parsed parameters');break;case'321':break;case'323':displayMessage('LIST --End--');break;case'372':_showAfterParamZero(parsedMessage,null);break;case'375':
case'376':break;case'900':case'903':_showAfterParamZero(parsedMessage,null);break;case'cachedNICK':
if('default'===parsedMessage.params[0])displayMessage(displayUtilsEl.cleanFormatting(displayUtilsEl.cleanCtcpDelimiter(parsedMessage.timestamp+' '+parsedMessage.nick+' is now known as '+parsedMessage.params[1])))
;break;case'NICK':
if(window.globals.ircState.nickName.toLowerCase()===parsedMessage.nick.toLowerCase())displayMessage(displayUtilsEl.cleanFormatting(displayUtilsEl.cleanCtcpDelimiter(parsedMessage.timestamp+' '+parsedMessage.nick+' is now known as '+parsedMessage.params[0])))
;break;default:displayMessage(displayUtilsEl.cleanFormatting(displayUtilsEl.cleanCtcpDelimiter(_substituteHmsTime(message))))}const now=Math.floor(Date.now()/1e3)
;const ircConnectTime=now-window.globals.ircState.times.ircConnect
;if(ircConnectTime>5&&document.activeElement!==document.getElementById('ircServerPanel')&&!window.globals.webState.cacheReloadInProgress){
document.getElementById('headerBar').setAttribute('servericon','');document.getElementById('navMenu').handleServerUnreadUpdate(true)}};_updateElapsedTimeDisplay=()=>{const toTimeString=seconds=>{
let remainSec=seconds;let day=0;let hour=0;let min=0;let sec=0;day=parseInt(remainSec/86400);remainSec-=86400*day;hour=parseInt(remainSec/3600);remainSec-=3600*hour;min=parseInt(remainSec/60)
;sec=remainSec-60*min;return day.toString().padStart(3,' ')+' D '+hour.toString().padStart(2,'0')+':'+min.toString().padStart(2,'0')+':'+sec.toString().padStart(2,'0')};let timeStr=''
;const now=Math.floor(Date.now()/1e3)
;if(window.globals.webState.webConnected)timeStr+='Web Connected: '+toTimeString(now-window.globals.webState.times.webConnect)+' ('+window.globals.webState.count.webConnect.toString()+')\n';else timeStr+='Web Connected: N/A\n'
;if(window.globals.ircState.ircConnected)timeStr+='IRC Connected: '+toTimeString(now-window.globals.ircState.times.ircConnect)+' ('+window.globals.ircState.count.ircConnect.toString()+')\n';else timeStr+='IRC Connected: N/A\n'
;if(window.globals.webState.webConnected)timeStr+='Backend Start: '+toTimeString(now-window.globals.ircState.times.programRun)+'\n';else timeStr+='Backend Start: N/A\n'
;if(window.globals.ircState.ircConnected&&window.globals.webState.lag.min<9998)timeStr+='IRC Lag: '+window.globals.webState.lag.last.toFixed(3)+' Min: '+window.globals.webState.lag.min.toFixed(3)+' Max: '+window.globals.webState.lag.max.toFixed(3);else timeStr+='IRC Lag: (Waiting next ping)'
;if(!window.globals.ircState.ircConnected)window.globals.webState.lag={last:0,min:9999,max:0};this.shadowRoot.getElementById('elapsedTimeDiv').textContent=timeStr};timerTickHandler=()=>{
this._updateElapsedTimeDisplay()};initializePlugin(){this._updateElapsedTimeDisplay()}connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{
this.hidePanel()});this.shadowRoot.getElementById('clearButtonId').addEventListener('click',()=>{
this.shadowRoot.getElementById('panelMessageDisplayId').value='\nPanel cleared, this did not clear the message cache\n\n'})
;this.shadowRoot.getElementById('loadFromCacheButtonId').addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('update-from-cache'))})
;this.shadowRoot.getElementById('sendButtonId').addEventListener('click',()=>{this._parseInputForIRCCommands(document.getElementById('panelMessageInputId'))
;document.getElementById('panelMessageInputId').focus()});this.shadowRoot.getElementById('panelMessageInputId').addEventListener('input',event=>{
if('insertText'===event.inputType&&null===event.data||'insertLineBreak'===event.inputType){
document.getElementById('displayUtils').stripOneCrLfFromElement(this.shadowRoot.getElementById('panelMessageInputId'))
;this._parseInputForIRCCommands(this.shadowRoot.getElementById('panelMessageInputId'))}})
;this.shadowRoot.getElementById('panelMessageInputId').addEventListener('keydown',this._serverAutoComplete,false);this.shadowRoot.getElementById('panelDivId').addEventListener('click',(function(){
document.getElementById('headerBar').removeAttribute('servericon');document.getElementById('navMenu').handleServerUnreadUpdate(false)}))
;this.shadowRoot.getElementById('tallerButtonId').addEventListener('click',()=>{const newRows=parseInt(this.shadowRoot.getElementById('panelMessageDisplayId').getAttribute('rows'))+5
;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows',newRows.toString())});this.shadowRoot.getElementById('normalButtonId').addEventListener('click',()=>{
this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows','15')});document.addEventListener('cache-reload-done',event=>{
const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');const cacheReloadString=document.getElementById('globVars').constants('cacheReloadString');let markerString=''
;let timestampString='';if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp)
;if(timestampString)markerString+=timestampString;markerString+=' '+cacheReloadString+'\n';if(''!==panelMessageDisplayEl.value){panelMessageDisplayEl.value+=markerString
;panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight}});document.addEventListener('cache-reload-error',(function(event){
const cacheErrorString=document.getElementById('globVars').constants('cacheErrorString');let errorString='\n';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString
;errorString+=' '+cacheErrorString+'\n\n';this.shadowRoot.getElementById('panelMessageDisplayId').value=errorString}));document.addEventListener('collapse-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId')
;const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId');const elapsedTimeOuterDivEl=this.shadowRoot.getElementById('elapsedTimeOuterDivId');if('light'===event.detail.theme){
panelDivEl.classList.remove('irc-server-panel-theme-dark');panelDivEl.classList.add('irc-server-panel-theme-light');panelMessageDisplayEl.classList.remove('global-text-theme-dark')
;panelMessageDisplayEl.classList.add('global-text-theme-light');panelMessageInputEl.classList.remove('global-text-theme-dark');panelMessageInputEl.classList.add('global-text-theme-light')
;elapsedTimeOuterDivEl.classList.remove('global-text-theme-dark');elapsedTimeOuterDivEl.classList.add('global-text-theme-light')}else{panelDivEl.classList.remove('irc-server-panel-theme-light')
;panelDivEl.classList.add('irc-server-panel-theme-dark');panelMessageDisplayEl.classList.remove('global-text-theme-light');panelMessageDisplayEl.classList.add('global-text-theme-dark')
;panelMessageInputEl.classList.remove('global-text-theme-light');panelMessageInputEl.classList.add('global-text-theme-dark');elapsedTimeOuterDivEl.classList.remove('global-text-theme-light')
;elapsedTimeOuterDivEl.classList.add('global-text-theme-dark')}});document.addEventListener('erase-before-reload',event=>{this.shadowRoot.getElementById('panelMessageDisplayId').value=''
;this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate','0000-00-00')});document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()
}else this.hidePanel()});document.addEventListener('irc-state-changed',()=>{if(window.globals.ircState.ircConnectOn!==this.ircConnectOnLast){this.ircConnectOnLast=window.globals.ircState.ircConnectOn
;if(!window.globals.ircState.ircConnectOn)this.hidePanel()}if(window.globals.ircState.ircConnecting!==this.ircConnectingLast){this.ircConnectingLast=window.globals.ircState.ircConnecting
;if(window.globals.ircState.ircConnecting)this.showPanel()}if(window.globals.ircState.ircConnected!==this.ircConnectedLast){this.ircConnectedLast=window.globals.ircState.ircConnected
;this.shadowRoot.getElementById('programVersionDiv').textContent=' version-'+window.globals.ircState.progVersion;document.getElementById('headerBar').removeAttribute('servericon')
;document.getElementById('navMenu').handleServerUnreadUpdate(false);setTimeout(()=>{document.getElementById('headerBar').removeAttribute('servericon')
;document.getElementById('navMenu').handleServerUnreadUpdate(false)},2e3);if(window.globals.ircState.ircConnected&&!window.globals.ircState.ircConnecting)this.hidePanel()}})
;document.addEventListener('resize-custom-elements',()=>{if(window.globals.webState.dynamic.testAreaColumnPxWidth){
const calcInputAreaColSize=document.getElementById('displayUtils').calcInputAreaColSize;const mar1=window.globals.webState.dynamic.commonMarginRightPx
;const mar2=window.globals.webState.dynamic.commonMarginRightPx+5+window.globals.webState.dynamic.sendButtonWidthPx
;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('cols',calcInputAreaColSize(mar1))
;this.shadowRoot.getElementById('panelMessageInputId').setAttribute('cols',calcInputAreaColSize(mar2))}});document.addEventListener('show-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.showPanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.showPanel()
}else this.showPanel()})}});window.customElements.define('wallops-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('wallopsPanelTemplate')
;const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))}_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId')
;panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight;document.dispatchEvent(new CustomEvent('cancel-zoom'));document.getElementById('headerBar').removeAttribute('wallopsicon')
;document.getElementById('navMenu').handleWallopsUnreadUpdate(false);this._scrollToTop()};collapsePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};displayWallopsMessage=parsedMessage=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId')
;const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');const _addText=text=>{
panelMessageDisplayEl.value+=document.getElementById('displayUtils').cleanFormatting(text)+'\n'
;if(!window.globals.webState.cacheReloadInProgress)panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight}
;if(!window.globals.webState.cacheReloadInProgress&&!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')&&!document.querySelector('body').hasAttribute('zoomId'))this.showPanel()
;if(panelDivEl.getAttribute('lastDate')!==parsedMessage.datestamp){panelDivEl.setAttribute('lastDate',parsedMessage.datestamp);panelMessageDisplayEl.value+='\n=== '+parsedMessage.datestamp+' ===\n\n'}
if('command'in parsedMessage&&'WALLOPS'===parsedMessage.command){
if(parsedMessage.nick)_addText(parsedMessage.timestamp+' '+parsedMessage.nick+document.getElementById('globVars').constants('nickChannelSpacer')+parsedMessage.params[0]);else _addText(parsedMessage.timestamp+' '+parsedMessage.prefix+document.getElementById('globVars').constants('nickChannelSpacer')+parsedMessage.params[0])
;if(!window.globals.webState.cacheReloadInProgress){document.getElementById('headerBar').setAttribute('wallopsicon','');document.getElementById('navMenu').handleWallopsUnreadUpdate(true)}}}
;initializePlugin=()=>{};connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')});this.shadowRoot.getElementById('eraseButtonId').addEventListener('click',()=>{
document.getElementById('ircControlsPanel').eraseIrcCache('WALLOPS').catch(err=>{console.log(err);let message=err.message||err.toString()||'Error occurred calling /irc/connect'
;message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})});this.shadowRoot.getElementById('tallerButtonId').addEventListener('click',()=>{
const newRows=parseInt(this.shadowRoot.getElementById('panelMessageDisplayId').getAttribute('rows'))+5;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows',newRows.toString())})
;this.shadowRoot.getElementById('normalButtonId').addEventListener('click',()=>{this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows','10')})
;this.shadowRoot.getElementById('panelDivId').addEventListener('click',(function(){document.getElementById('headerBar').removeAttribute('wallopsicon')
;document.getElementById('navMenu').handleWallopsUnreadUpdate(false)}));document.addEventListener('cache-reload-done',event=>{
const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');const cacheReloadString=document.getElementById('globVars').constants('cacheReloadString');let markerString=''
;let timestampString='';if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp)
;if(timestampString)markerString+=timestampString;markerString+=' '+cacheReloadString+'\n';if(''!==panelMessageDisplayEl.value){panelMessageDisplayEl.value+=markerString
;panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight}});document.addEventListener('cache-reload-error',(function(event){
const cacheErrorString=document.getElementById('globVars').constants('cacheErrorString');let errorString='\n';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString
;errorString+=' '+cacheErrorString+'\n\n';this.shadowRoot.getElementById('panelMessageDisplayId').value=errorString}));document.addEventListener('collapse-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');if('light'===event.detail.theme){
panelDivEl.classList.remove('wallops-panel-theme-dark');panelDivEl.classList.add('wallops-panel-theme-light');panelMessageDisplayEl.classList.remove('global-text-theme-dark')
;panelMessageDisplayEl.classList.add('global-text-theme-light')}else{panelDivEl.classList.remove('wallops-panel-theme-light');panelDivEl.classList.add('wallops-panel-theme-dark')
;panelMessageDisplayEl.classList.remove('global-text-theme-light');panelMessageDisplayEl.classList.add('global-text-theme-dark')}});document.addEventListener('erase-before-reload',event=>{
this.shadowRoot.getElementById('panelMessageDisplayId').value='';this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate','0000-00-00')})
;document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('irc-state-changed',()=>{
if(window.globals.ircState.ircConnected!==this.ircConnectedLast){this.ircConnectedLast=window.globals.ircState.ircConnected;if(!window.globals.ircState.ircConnected)this.hidePanel()}})
;document.addEventListener('resize-custom-elements',()=>{if(window.globals.webState.dynamic.testAreaColumnPxWidth){
const calcInputAreaColSize=document.getElementById('displayUtils').calcInputAreaColSize;const mar1=window.globals.webState.dynamic.commonMarginRightPx
;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('cols',calcInputAreaColSize(mar1))}});document.addEventListener('show-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.showPanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.showPanel()
}else this.showPanel()})}});window.customElements.define('notice-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('noticePanelTemplate')
;const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))}_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId')
;panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight;document.dispatchEvent(new CustomEvent('cancel-zoom'));document.getElementById('headerBar').removeAttribute('noticeicon')
;document.getElementById('navMenu').handleNoticeUnreadUpdate(false);this._scrollToTop()};collapsePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};displayCtcpNoticeMessage=ctcpMessage=>{
const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');panelMessageDisplayEl.value+=document.getElementById('displayUtils').cleanFormatting(ctcpMessage)+'\n'
;if(!window.globals.webState.cacheReloadInProgress&&!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')&&!document.querySelector('body').hasAttribute('zoomId'))this.showPanel()
;if(!window.globals.webState.cacheReloadInProgress){document.getElementById('headerBar').setAttribute('noticeicon','');document.getElementById('navMenu').handleNoticeUnreadUpdate(true)}
if(!window.globals.webState.cacheReloadInProgress)panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight};displayNoticeMessage=parsedMessage=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');const _addText=text=>{
panelMessageDisplayEl.value+=document.getElementById('displayUtils').cleanFormatting(text)+'\n'
;if(!window.globals.webState.cacheReloadInProgress)panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight};if('NOTICE'!==parsedMessage.command)return;const ctcpDelim=1
;if(2===parsedMessage.params.length&&parsedMessage.params[1].charCodeAt(0)===ctcpDelim||3===parsedMessage.params.length&&parsedMessage.params[2].charCodeAt(0)===ctcpDelim)return
;if(window.globals.ircState.channels.indexOf(parsedMessage.params[0].toLowerCase())>=0)return
;if(!window.globals.webState.cacheReloadInProgress&&!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')&&!document.querySelector('body').hasAttribute('zoomId'))this.showPanel()
;if(panelDivEl.getAttribute('lastDate')!==parsedMessage.datestamp){panelDivEl.setAttribute('lastDate',parsedMessage.datestamp);panelMessageDisplayEl.value+='\n=== '+parsedMessage.datestamp+' ===\n\n'}
if(parsedMessage.params[0]===window.globals.ircState.nickName){
if(parsedMessage.nick)_addText(parsedMessage.timestamp+' '+parsedMessage.nick+document.getElementById('globVars').constants('nickChannelSpacer')+parsedMessage.params[1]);else _addText(parsedMessage.timestamp+' '+parsedMessage.prefix+document.getElementById('globVars').constants('nickChannelSpacer')+parsedMessage.params[1])
;if(!window.globals.webState.cacheReloadInProgress){document.getElementById('headerBar').setAttribute('noticeicon','');document.getElementById('navMenu').handleNoticeUnreadUpdate(true)}
}else if(parsedMessage.nick===window.globals.ircState.nickName){
_addText(parsedMessage.timestamp+' [to] '+parsedMessage.params[0]+document.getElementById('globVars').constants('nickChannelSpacer')+parsedMessage.params[1])
;if(!window.globals.webState.cacheReloadInProgress){document.getElementById('headerBar').setAttribute('noticeicon','');document.getElementById('navMenu').handleNoticeUnreadUpdate(true)}}}
;initializePlugin=()=>{};connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')});this.shadowRoot.getElementById('eraseButtonId').addEventListener('click',()=>{
document.getElementById('ircControlsPanel').eraseIrcCache('NOTICE').catch(err=>{console.log(err);let message=err.message||err.toString()||'Error occurred calling /irc/connect'
;message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})});this.shadowRoot.getElementById('tallerButtonId').addEventListener('click',()=>{
const newRows=parseInt(this.shadowRoot.getElementById('panelMessageDisplayId').getAttribute('rows'))+5;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows',newRows.toString())})
;this.shadowRoot.getElementById('normalButtonId').addEventListener('click',()=>{this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows','10')})
;this.shadowRoot.getElementById('panelDivId').addEventListener('click',(function(){document.getElementById('headerBar').removeAttribute('noticeicon')
;document.getElementById('navMenu').handleNoticeUnreadUpdate(false)}));document.addEventListener('cache-reload-done',event=>{
const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');const cacheReloadString=document.getElementById('globVars').constants('cacheReloadString');let markerString=''
;let timestampString='';if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp)
;if(timestampString)markerString+=timestampString;markerString+=' '+cacheReloadString+'\n';if(''!==panelMessageDisplayEl.value){panelMessageDisplayEl.value+=markerString
;panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight}});document.addEventListener('cache-reload-error',(function(event){
const cacheErrorString=document.getElementById('globVars').constants('cacheErrorString');let errorString='\n';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString
;errorString+=' '+cacheErrorString+'\n\n';this.shadowRoot.getElementById('panelMessageDisplayId').value=errorString}));document.addEventListener('collapse-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');if('light'===event.detail.theme){
panelDivEl.classList.remove('notice-panel-theme-dark');panelDivEl.classList.add('notice-panel-theme-light');panelMessageDisplayEl.classList.remove('global-text-theme-dark')
;panelMessageDisplayEl.classList.add('global-text-theme-light')}else{panelDivEl.classList.remove('notice-panel-theme-light');panelDivEl.classList.add('notice-panel-theme-dark')
;panelMessageDisplayEl.classList.remove('global-text-theme-light');panelMessageDisplayEl.classList.add('global-text-theme-dark')}});document.addEventListener('erase-before-reload',event=>{
this.shadowRoot.getElementById('panelMessageDisplayId').value='';this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate','0000-00-00')})
;document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('irc-state-changed',()=>{
if(window.globals.ircState.ircConnected!==this.ircConnectedLast){this.ircConnectedLast=window.globals.ircState.ircConnected;if(!window.globals.ircState.ircConnected)this.hidePanel()}})
;document.addEventListener('resize-custom-elements',()=>{if(window.globals.webState.dynamic.testAreaColumnPxWidth){
const calcInputAreaColSize=document.getElementById('displayUtils').calcInputAreaColSize;const mar1=window.globals.webState.dynamic.commonMarginRightPx
;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('cols',calcInputAreaColSize(mar1))}});document.addEventListener('show-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.showPanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.showPanel()
}else this.showPanel()})}});window.customElements.define('manage-pm-panels',class extends HTMLElement{constructor(){super();const template=document.getElementById('managePmPanelsTemplate')
;const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.privmsgPanelCount=0;this.ircConnectedLast=false;this.listOfOpenedPmPanels=[]
;this.listOfCollapsedPmPanels=[];this.listOfClosedPmPanels=[]}_scrollToTop=()=>{this.focus();const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,
behavior:'smooth'})};showPanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible','')
;document.dispatchEvent(new CustomEvent('cancel-zoom'));this._scrollToTop()};collapsePanel=()=>{if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')){
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible')}};hidePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible')}
;handleHeaderBarActivityIconClick=()=>{const panelEls=Array.from(document.getElementById('pmContainerId').children);let once=true;panelEls.forEach(panelEl=>{if(once&&panelEl.unreadMessageCount>0){
once=false;panelEl.showAndScrollPanel()}})};handleHotKey=()=>{if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')){
const panelEls=Array.from(document.getElementById('pmContainerId').children);panelEls.forEach(panelEl=>{panelEl.hidePanel()});this.hidePanel()}else{
const panelEls=Array.from(document.getElementById('pmContainerId').children);panelEls.forEach(panelEl=>{panelEl.collapsePanel()});this.showPanel()}};setLastPmPanel=(pmPanelName,state)=>{
const openedIndex=this.listOfOpenedPmPanels.indexOf(pmPanelName.toLowerCase());const collapsedIndex=this.listOfCollapsedPmPanels.indexOf(pmPanelName.toLowerCase())
;const closedIndex=this.listOfClosedPmPanels.indexOf(pmPanelName.toLowerCase());if(openedIndex>=0)this.listOfOpenedPmPanels.splice(openedIndex,1)
;if(collapsedIndex>=0)this.listOfCollapsedPmPanels.splice(collapsedIndex,1);if(closedIndex>=0)this.listOfClosedPmPanels.splice(openedIndex,1)
;if('opened'===state)this.listOfOpenedPmPanels.push(pmPanelName.toLowerCase());else if('collapsed'===state)this.listOfCollapsedPmPanels.push(pmPanelName.toLowerCase());else if('closed'===state)this.listOfClosedPmPanels.push(pmPanelName.toLowerCase());else console.log('Error, invalid panel state in setLastPmPanel()')
};_cleanLastPmPanelStates=()=>{let needPrune;let pruneIndexList;const panelEls=Array.from(document.getElementById('pmContainerId').children);if(this.listOfOpenedPmPanels.length>0){pruneIndexList=[]
;for(let i=0;i<this.listOfOpenedPmPanels.length;i++){needPrune=true;panelEls.forEach(panelEl=>{if(panelEl.privmsgName.toLowerCase()===this.listOfOpenedPmPanels[i].toLowerCase())needPrune=false})
;if(needPrune)pruneIndexList.push(i)}while(pruneIndexList.length>0)this.listOfOpenedPmPanels.splice(pruneIndexList.pop(),1)}if(this.listOfCollapsedPmPanels.length>0){pruneIndexList=[]
;for(let i=0;i<this.listOfCollapsedPmPanels.length;i++){needPrune=true;panelEls.forEach(panelEl=>{if(panelEl.privmsgName.toLowerCase()===this.listOfCollapsedPmPanels[i].toLowerCase())needPrune=false})
;if(needPrune)pruneIndexList.push(i)}while(pruneIndexList.length>0)this.listOfCollapsedPmPanels.splice(pruneIndexList.pop(),1)}if(this.listOfClosedPmPanels.length>0){pruneIndexList=[]
;for(let i=0;i<this.listOfClosedPmPanels.length;i++){needPrune=true;panelEls.forEach(panelEl=>{if(panelEl.privmsgName.toLowerCase()===this.listOfClosedPmPanels[i].toLowerCase())needPrune=false})
;if(needPrune)pruneIndexList.push(i)}while(pruneIndexList.length>0)this.listOfClosedPmPanels.splice(pruneIndexList.pop(),1)}};_createPmElement=(pmNick,parsedMessage)=>{
if(window.globals.webState.activePrivateMessageNicks.indexOf(pmNick.toLowerCase())<0){const pmContainerEl=document.getElementById('pmContainerId');const newPmPanelEl=document.createElement('pm-panel')
;newPmPanelEl.id='privmsg:'+pmNick.toLowerCase();newPmPanelEl.privmsgName=pmNick.toLowerCase();newPmPanelEl.privmsgCsName=pmNick;newPmPanelEl.setAttribute('privmsg-name',pmNick.toLowerCase())
;newPmPanelEl.setAttribute('privmsg-cs-name',pmNick);if(pmContainerEl.firstChild)pmContainerEl.insertBefore(newPmPanelEl,pmContainerEl.firstChild);else pmContainerEl.appendChild(newPmPanelEl)
;newPmPanelEl.initializePlugin(parsedMessage);this.privmsgPanelCount++;this.shadowRoot.getElementById('activePmCountIconId').textContent=this.privmsgPanelCount.toString()
}else throw new Error('Attempt to create channel that already exists')};displayPrivateMessage=parsedMessage=>{if(!window.globals.ircState.ircConnected)return
;if(!Object.hasOwn(parsedMessage,'params'))return;let pmName=parsedMessage.nick;if(pmName.toLowerCase()===window.globals.ircState.nickName.toLowerCase())pmName=parsedMessage.params[0]
;if(window.globals.webState.activePrivateMessageNicks.indexOf(pmName.toLowerCase())<0)this._createPmElement(pmName,parsedMessage);else{
const pmPanelElements=Array.from(document.getElementById('pmContainerId').children);pmPanelElements.forEach(el=>{
if(Object.hasOwn(el,'privmsgName'))if(el.privmsgCsName.toLowerCase()===pmName.toLowerCase())el.displayPmMessage(parsedMessage)})}};_buildPrivateMessageText=()=>{
const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId');const pmNickNameInputEl=this.shadowRoot.getElementById('pmNickNameInputId')
;const displayUtilsEl=document.getElementById('displayUtils');const ircControlsPanelEl=document.getElementById('ircControlsPanel');const errorPanelEl=document.getElementById('errorPanel')
;const localCommandParserEl=document.getElementById('localCommandParser');if(0===panelMessageInputEl.value.length)return;const text=displayUtilsEl.stripTrailingCrLf(panelMessageInputEl.value)
;if(displayUtilsEl.detectMultiLineString(text)){errorPanelEl.showError('Multi-line input is not supported.');panelMessageInputEl.value=''
}else if(0===text.length)panelMessageInputEl.value='';else if('/'===text.charAt(0)){const commandAction=localCommandParserEl.textCommandParser({inputString:text,originType:'generic',originName:null})
;panelMessageInputEl.value=''
;if(commandAction.error)errorPanelEl.showError(commandAction.message);else if(commandAction.ircMessage&&commandAction.ircMessage.length>0)ircControlsPanelEl.sendIrcServerMessage(commandAction.ircMessage)
}else{if(0===pmNickNameInputEl.value.length)return;if(1!==pmNickNameInputEl.value.split('\n').length){errorPanelEl.showError('Multi-line input not allowed in nick name field');return}
const targetNickname=pmNickNameInputEl.value;const message='PRIVMSG '+targetNickname+' :'+text;ircControlsPanelEl.sendIrcServerMessage(message);panelMessageInputEl.value=''}};_loadBeepEnable=()=>{
this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').checked=false;this.removeAttribute('beep-enabled');let beepEnableObj=null
;beepEnableObj=JSON.parse(window.localStorage.getItem('privMsgBeep'));if(beepEnableObj&&'object'===typeof beepEnableObj)if(beepEnableObj.beep){
this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').checked=true;this.setAttribute('beep-enabled','')}else{this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').checked=false
;this.removeAttribute('beep-enabled')}};_setFixedElementTitles=()=>{this.shadowRoot.getElementById('activePmCountIconId').title='Count of the number of active private message panels'
;this.shadowRoot.getElementById('pmUnreadCountIconId').title='Count of the total number unread private messages'
;this.shadowRoot.getElementById('eraseButtonId').title='Erase all private message from remote message cache'
;this.shadowRoot.getElementById('pmNickNameInputId').title='The IRC nickname to be recipient of private message or /whois query'
;this.shadowRoot.getElementById('whoisButtonId').title='Perform irc /WHOIS query on entered nickname, results in server panel'
;this.shadowRoot.getElementById('panelMessageInputId').title='Private message input area';this.shadowRoot.getElementById('sendButtonId').title='Send private message (PM)'
;this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').title='If checked, open new PM panels with audio beep enabled'};timerTickHandler=()=>{
const privmsgElements=document.getElementById('pmContainerId');const privmsgEls=Array.from(privmsgElements.children);privmsgEls.forEach(pmEl=>{pmEl.timerTickHandler()})};initializePlugin=()=>{
this._loadBeepEnable();this._setFixedElementTitles()};connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()})
;this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))this.collapsePanel();else this.showPanel()})
;this.shadowRoot.getElementById('panelMessageInputId').addEventListener('input',event=>{const displayUtilsEl=document.getElementById('displayUtils')
;if('insertText'===event.inputType&&null===event.data){displayUtilsEl.stripOneCrLfFromElement(this.shadowRoot.getElementById('panelMessageInputId'));this._buildPrivateMessageText()}
if('insertLineBreak'===event.inputType){displayUtilsEl.stripOneCrLfFromElement(this.shadowRoot.getElementById('panelMessageInputId'));this._buildPrivateMessageText()}})
;this.shadowRoot.getElementById('sendButtonId').addEventListener('click',()=>{this._buildPrivateMessageText()})
;this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').addEventListener('click',event=>{const now=Math.floor(Date.now()/1e3)
;if(this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').checked){this.setAttribute('beep-enabled','');window.localStorage.setItem('privMsgBeep',JSON.stringify({timestamp:now,beep:true}))
;document.getElementById('beepSounds').playBeep3Sound()}else{this.removeAttribute('beep-enabled');window.localStorage.setItem('privMsgBeep',JSON.stringify({timestamp:now,beep:false}))}})
;this.shadowRoot.getElementById('eraseButtonId').addEventListener('click',()=>{document.getElementById('ircControlsPanel').eraseIrcCache('PRIVMSG').then(()=>{
if(!window.globals.webState.cacheReloadInProgress)document.dispatchEvent(new CustomEvent('update-from-cache'))}).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})})
;this.shadowRoot.getElementById('whoisButtonId').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('pmNickNameInputId').value.length>0)if(1===this.shadowRoot.getElementById('pmNickNameInputId').value.split('\n').length){
const message='WHOIS '+this.shadowRoot.getElementById('pmNickNameInputId').value;document.getElementById('ircControlsPanel').sendIrcServerMessage(message)
;document.getElementById('ircServerPanel').showPanel();document.dispatchEvent(new CustomEvent('cancel-zoom'))
}else document.getElementById('errorPanel').showError('Multi-line input not allowed');else document.getElementById('errorPanel').showError('Input required')})
;document.addEventListener('cache-reload-done',event=>{this._cleanLastPmPanelStates()});document.addEventListener('cancel-beep-sounds',()=>{
this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').checked=false;this.removeAttribute('beep-enabled')});document.addEventListener('collapse-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.hidePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');if('light'===event.detail.theme){panelDivEl.classList.remove('pm-panel-theme-dark');panelDivEl.classList.add('pm-panel-theme-light')}else{
panelDivEl.classList.remove('pm-panel-theme-light');panelDivEl.classList.add('pm-panel-theme-dark')}let newTextTheme='global-text-theme-dark';let oldTextTheme='global-text-theme-light'
;if('light'===document.querySelector('body').getAttribute('theme')){newTextTheme='global-text-theme-light';oldTextTheme='global-text-theme-dark'}
const textareaEls=Array.from(this.shadowRoot.querySelectorAll('textarea'));textareaEls.forEach(el=>{el.classList.remove(oldTextTheme);el.classList.add(newTextTheme)})})
;document.addEventListener('erase-before-reload',()=>{this.shadowRoot.getElementById('pmNickNameInputId').value='';this.shadowRoot.getElementById('pmUnreadCountIconId').textContent='0'
;this.shadowRoot.getElementById('pmUnreadCountIconId').setAttribute('hidden','');this.privmsgPanelCount=0;this.shadowRoot.getElementById('activePmCountIconId').textContent='0'})
;document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('resize-custom-elements',()=>{
if(window.globals.webState.dynamic.testAreaColumnPxWidth){const calcInputAreaColSize=document.getElementById('displayUtils').calcInputAreaColSize
;const margin=window.globals.webState.dynamic.commonMarginRightPx+5+window.globals.webState.dynamic.sendButtonWidthPx
;this.shadowRoot.getElementById('panelMessageInputId').setAttribute('cols',calcInputAreaColSize(margin))}});document.addEventListener('irc-state-changed',()=>{
if(window.globals.ircState.ircConnected!==this.ircConnectedLast){this.ircConnectedLast=window.globals.ircState.ircConnected;if(!window.globals.ircState.ircConnected)this.hidePanel()}})
;document.addEventListener('show-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.showPanel()}else this.showPanel()});document.addEventListener('update-privmsg-count',event=>{let totalCount=0
;const privmsgElements=document.getElementById('pmContainerId');const privmsgEls=Array.from(privmsgElements.children);privmsgEls.forEach(pmEl=>{totalCount+=pmEl.unreadMessageCount})
;this.shadowRoot.getElementById('pmUnreadCountIconId').textContent=totalCount.toString()
;if(totalCount>0)this.shadowRoot.getElementById('pmUnreadCountIconId').removeAttribute('hidden');else this.shadowRoot.getElementById('pmUnreadCountIconId').setAttribute('hidden','')})}})
;window.customElements.define('pm-panel',class extends HTMLElement{constructor(){super();const template=document.getElementById('pmPanelTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.elementExistsInDom=true;this.privmsgName='';this.privmsgCsName='';this.defaultHeightInRows=10
;this.unreadMessageCount=0;this.activityIconInhibitTimer=0}_sendPrivMessageToUser=(targetNickname,textAreaEl)=>{const displayUtilsEl=document.getElementById('displayUtils')
;const errorPanelEl=document.getElementById('errorPanel');const ircControlsPanelEl=document.getElementById('ircControlsPanel');const text=displayUtilsEl.stripTrailingCrLf(textAreaEl.value)
;if(displayUtilsEl.detectMultiLineString(text)){textAreaEl.value='';textAreaEl.setAttribute('rows','1');errorPanelEl.showError('Multi-line input is not supported.')}else if(text.length>0){
if('/'===text.charAt(0)){const commandAction=document.getElementById('localCommandParser').textCommandParser({inputString:text,originType:'private',originName:targetNickname});textAreaEl.value=''
;if(commandAction.error){errorPanelEl.showError(commandAction.message);return}else{
if(commandAction.ircMessage&&commandAction.ircMessage.length>0)ircControlsPanelEl.sendIrcServerMessage(commandAction.ircMessage);return}}
if(window.globals.ircState.ircConnected&&window.globals.ircState.ircIsAway)setTimeout(()=>{
if(window.globals.ircState.ircConnected&&window.globals.ircState.ircIsAway)ircControlsPanelEl.sendIrcServerMessage('AWAY')},1e3);const message='PRIVMSG '+targetNickname+' :'+text
;ircControlsPanelEl.sendIrcServerMessage(message);textAreaEl.value=''}textAreaEl.value=''};_splitMultiLinePaste=multiLineContent=>{if('string'!==typeof multiLineContent)return[]
;if(0===multiLineContent.length)return[];const outArray=[];const inArray=multiLineContent.split('\n');if(inArray.length>0)for(let i=0;i<inArray.length;i++){let nextLine=inArray[i]
;if(nextLine.length>0){if(13===nextLine.charCodeAt(nextLine.length-1))nextLine=nextLine.slice(0,nextLine.length-1);if(nextLine.length>0)outArray.push(nextLine)}}return outArray}
;_handleHotKeyPressed=e=>{if(e.altKey&&!e.ctrlKey&&!e.shiftKey)if('KeyV'===e.code)this._handleBottomCollapseButton()};_incrementMessageCount=()=>{this.unreadMessageCount++
;this.shadowRoot.getElementById('messageCountIconId').textContent=this.unreadMessageCount.toString();this.shadowRoot.getElementById('messageCountIconId').removeAttribute('hidden')
;document.dispatchEvent(new CustomEvent('update-privmsg-count',{detail:{channel:this.privmsgName.toLowerCase(),unreadMessageCount:this.unreadMessageCount}}))};_resetMessageCount=()=>{
this.unreadMessageCount=0;this.shadowRoot.getElementById('messageCountIconId').textContent=this.unreadMessageCount.toString()
;this.shadowRoot.getElementById('messageCountIconId').setAttribute('hidden','');document.dispatchEvent(new CustomEvent('update-privmsg-count',{detail:{channel:this.privmsgName.toLowerCase(),
unreadMessageCount:this.unreadMessageCount}}))};_scrollTextAreaToRecent=()=>{const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId')
;panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight};_scrollToTop=()=>{this.focus();const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,
behavior:'smooth'})};showPanel=()=>{document.getElementById('managePmPanels').setLastPmPanel(this.privmsgName.toLocaleLowerCase(),'opened')
;this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible','')
;this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden','');this._updateVisibility();document.dispatchEvent(new CustomEvent('cancel-zoom'));this._scrollTextAreaToRecent()
;this._scrollToTop();this.shadowRoot.getElementById('panelMessageInputId').focus()};showAndScrollPanel=()=>{this._resetMessageCount();this.showPanel();this._scrollTextAreaToRecent()
;this._scrollToTop();this.shadowRoot.getElementById('panelMessageInputId').focus()};collapsePanel=()=>{
document.getElementById('managePmPanels').setLastPmPanel(this.privmsgName.toLocaleLowerCase(),'collapsed');this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','')
;this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden','');this._updateVisibility()}
;hidePanel=()=>{document.getElementById('managePmPanels').setLastPmPanel(this.privmsgName.toLocaleLowerCase(),'closed')
;this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible')};_updateVisibility=()=>{
const beepCheckBoxEl=this.shadowRoot.getElementById('beepCheckBoxId')
;if(this.shadowRoot.getElementById('panelDivId').hasAttribute('beep3-enabled'))beepCheckBoxEl.checked=true;else beepCheckBoxEl.checked=false};_handleCloseButton=()=>{this.hidePanel()}
;_handleCollapseButton=()=>{if(this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))this.collapsePanel();else this.showPanel()};_handleBottomCollapseButton=()=>{
const bottomCollapseDivEl=this.shadowRoot.getElementById('bottomCollapseDivId');if(bottomCollapseDivEl.hasAttribute('hidden')){bottomCollapseDivEl.removeAttribute('hidden');this._scrollToTop()
}else bottomCollapseDivEl.setAttribute('hidden','')};_handleTallerButton=()=>{const newRows=parseInt(this.shadowRoot.getElementById('panelMessageDisplayId').getAttribute('rows'))+10
;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows',newRows);this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows','3')};_handleNormalButton=()=>{
this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows',this.defaultHeightInRows);this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows','1')}
;_handlePrivmsgInputAreaElPaste=event=>{if(this._splitMultiLinePaste(event.clipboardData.getData('text')).length>1){
this.shadowRoot.getElementById('multiLineSendSpanId').textContent='Clipboard ('+this._splitMultiLinePaste(event.clipboardData.getData('text')).length+' lines)'
;this.shadowRoot.getElementById('multiLineActionDivId').removeAttribute('hidden');this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows','3')}};_handleMultiLineSendButtonClick=()=>{
const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId');const multiLineActionDivEl=this.shadowRoot.getElementById('multiLineActionDivId')
;const errorPanelEl=document.getElementById('errorPanel');const multiLineArray=this._splitMultiLinePaste(panelMessageInputEl.value);if(multiLineArray.length>100){
multiLineActionDivEl.setAttribute('hidden','');panelMessageInputEl.value='';errorPanelEl.showError('Maximum multi-line clipboard paste 100 Lines')}else{
const lastIrcConnect=window.globals.ircState.times.ircConnect;const lastWebConnect=window.globals.webState.times.webConnect;let abortedFlag=false;const delayIntervalMs=2e3;let delayMs=0
;if(multiLineArray.length>0){panelMessageInputEl.setAttribute('rows','1');panelMessageInputEl.value=multiLineArray[0];for(let i=0;i<multiLineArray.length;i++){delayMs+=delayIntervalMs;setTimeout(()=>{
let okToSend=false
;if(window.globals.ircState.ircConnected&&lastIrcConnect===window.globals.ircState.times.ircConnect&&lastWebConnect===window.globals.webState.times.webConnect&&!abortedFlag)okToSend=true;if(okToSend){
if(window.globals.webState.activePrivateMessageNicks.indexOf(this.privmsgName.toLowerCase())<0)okToSend=false
;if(!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))okToSend=false;if(!this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))okToSend=false}
if(!okToSend)abortedFlag=true;else{const message='PRIVMSG '+this.privmsgCsName+' :'+multiLineArray[i];document.getElementById('ircControlsPanel').sendIrcServerMessage(message)
;if(i!==multiLineArray.length-1)panelMessageInputEl.value=multiLineArray[i+1];else panelMessageInputEl.value=''}},delayMs)}multiLineActionDivEl.setAttribute('hidden','')
}else multiLineActionDivEl.setAttribute('hidden','')}};_handlePrivMsgSendButtonElClick=()=>{const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId')
;this._sendPrivMessageToUser(this.privmsgCsName,panelMessageInputEl);panelMessageInputEl.focus();this._resetMessageCount()
;this.activityIconInhibitTimer=document.getElementById('globVars').constants('activityIconInhibitTimerValue');this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden','')}
;_handlePrivmsgInputAreaElInput=event=>{const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId')
;if('insertText'===event.inputType&&null===event.data||'insertLineBreak'===event.inputType){document.getElementById('displayUtils').stripOneCrLfFromElement(panelMessageInputEl)
;this._sendPrivMessageToUser(this.privmsgCsName,panelMessageInputEl);this._resetMessageCount()
;this.activityIconInhibitTimer=document.getElementById('globVars').constants('activityIconInhibitTimerValue')}};_handlePanelClick=()=>{this._resetMessageCount()};displayPmMessage=parsedMessage=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId')
;const displayUtilsEl=document.getElementById('displayUtils');const globVarsEl=document.getElementById('globVars');const pmNameSpacer=globVarsEl.constants('pmNameSpacer');const _addText=text=>{
panelMessageDisplayEl.value+=displayUtilsEl.cleanFormatting(text)+'\n';if(!window.globals.webState.cacheReloadInProgress)this._scrollTextAreaToRecent()}
;if(parsedMessage.params[0].toLowerCase()===this.privmsgName.toLowerCase()||parsedMessage.params[0].toLowerCase()!==this.privmsgName.toLowerCase()&&parsedMessage.nick.toLowerCase()===this.privmsgName.toLowerCase())if(panelDivEl.getAttribute('lastDate')!==parsedMessage.datestamp){
panelDivEl.setAttribute('lastDate',parsedMessage.datestamp);panelMessageDisplayEl.value+='\n=== '+parsedMessage.datestamp+' ===\n\n'}
if('PRIVMSG'===parsedMessage.command)if(parsedMessage.nick===window.globals.ircState.nickName){if(parsedMessage.params[0].toLowerCase()===this.privmsgName.toLowerCase()){
if('isPmCtcpAction'in parsedMessage)_addText(parsedMessage.timestamp+pmNameSpacer+parsedMessage.nick+' '+parsedMessage.params[1]);else _addText(parsedMessage.timestamp+' '+parsedMessage.nick+pmNameSpacer+parsedMessage.params[1])
;if(panelDivEl.hasAttribute('beep3-enabled')&&!window.globals.webState.cacheReloadInProgress)document.getElementById('beepSounds').playBeep3Sound();if(!window.globals.webState.cacheReloadInProgress){
document.dispatchEvent(new CustomEvent('cancel-zoom'));this.showPanel()}}}else if(parsedMessage.nick.toLowerCase()===this.privmsgName.toLowerCase()){
if('isPmCtcpAction'in parsedMessage)_addText(parsedMessage.timestamp+pmNameSpacer+parsedMessage.nick+' '+parsedMessage.params[1]);else _addText(parsedMessage.timestamp+' '+parsedMessage.nick+pmNameSpacer+parsedMessage.params[1])
;if(panelDivEl.hasAttribute('beep3-enabled')&&!window.globals.webState.cacheReloadInProgress)document.getElementById('beepSounds').playBeep3Sound()
;if(!window.globals.webState.cacheReloadInProgress&&!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')&&!document.querySelector('body').hasAttribute('zoomId')){
this.showPanel();this._updateVisibility()}if(this.privmsgCsName!==parsedMessage.nick){this.privmsgCsName=parsedMessage.nick;this.shadowRoot.getElementById('pmNameDivId').textContent=this.privmsgCsName
;this.setAttribute('privmsg-cs-name',this.privmsgCsName)}
if((document.activeElement.id!==this.id||!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')||!this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))&&!window.globals.webState.cacheReloadInProgress&&0===this.activityIconInhibitTimer)this._incrementMessageCount()
}};_handleResizeCustomElements=()=>{if(window.globals.webState.dynamic.testAreaColumnPxWidth){const calcInputAreaColSize=document.getElementById('displayUtils').calcInputAreaColSize
;const mar1=window.globals.webState.dynamic.commonMarginRightPx
;const mar2=window.globals.webState.dynamic.commonMarginRightPx+5+window.globals.webState.dynamic.sendButtonWidthPx+window.globals.webState.dynamic.collapseButtonWidthPx
;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('cols',calcInputAreaColSize(mar1))
;this.shadowRoot.getElementById('panelMessageInputId').setAttribute('cols',document.getElementById('displayUtils').calcInputAreaColSize(mar2))}};_handleColorThemeChanged=event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');if('light'===event.detail.theme){panelDivEl.classList.remove('pm-panel-theme-dark');panelDivEl.classList.add('pm-panel-theme-light')}else{
panelDivEl.classList.remove('pm-panel-theme-light');panelDivEl.classList.add('pm-panel-theme-dark')}let newTextTheme='global-text-theme-dark';let oldTextTheme='global-text-theme-light'
;if('light'===document.querySelector('body').getAttribute('theme')){newTextTheme='global-text-theme-light';oldTextTheme='global-text-theme-dark'}
const textareaEls=Array.from(this.shadowRoot.querySelectorAll('textarea'));textareaEls.forEach(el=>{el.classList.remove(oldTextTheme);el.classList.add(newTextTheme)})}
;_handleCollapseAllPanels=event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()};_handleHideAllPanels=event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()};_handleShowAllPanels=event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.showPanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.showPanel()
}else this.showPanel()};_handlePrivMsgBeep1CBInputElClick=event=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId')
;if(panelDivEl.hasAttribute('beep3-enabled'))panelDivEl.removeAttribute('beep3-enabled');else{panelDivEl.setAttribute('beep3-enabled','');document.getElementById('beepSounds').playBeep3Sound()}
this._updateVisibility()};_handleCancelBeepSounds=()=>{this.shadowRoot.getElementById('panelDivId').removeAttribute('beep3-enabled');this._updateVisibility()};_removeSelfFromDOM=()=>{
if(!this.elementExistsInDom)throw new Error('Error, Request to remove self from DOM after already removed.');this.elementExistsInDom=false
;const webStatePmPanelNameIndex=window.globals.webState.activePrivateMessageNicks.indexOf(this.privmsgName.toLowerCase())
;if(webStatePmPanelNameIndex>=0)window.globals.webState.activePrivateMessageNicks.splice(webStatePmPanelNameIndex,1)
;const webStatePmPanelCsNameIndex=window.globals.webState.activePrivateMessageCsNicks.indexOf(this.privmsgCsName)
;if(webStatePmPanelCsNameIndex>=0)window.globals.webState.activePrivateMessageCsNicks.splice(webStatePmPanelCsNameIndex,1);document.getElementById('navMenu').handlePmListUpdate()
;this.shadowRoot.getElementById('beepCheckBoxId').removeEventListener('click',this._handlePrivMsgBeep1CBInputElClick)
;this.shadowRoot.getElementById('bottomCollapseButtonId').removeEventListener('click',this._handleBottomCollapseButton)
;this.shadowRoot.getElementById('closePanelButtonId').removeEventListener('click',this._handleCloseButton)
;this.shadowRoot.getElementById('collapsePanelButtonId').removeEventListener('click',this._handleCollapseButton)
;this.shadowRoot.getElementById('eraseButtonId').removeEventListener('click',this._handleEraseAllButton)
;this.shadowRoot.getElementById('multiLineSendButtonId').removeEventListener('click',this._handleMultiLineSendButtonClick)
;this.shadowRoot.getElementById('normalButtonId').removeEventListener('click',this._handleNormalButton);this.shadowRoot.getElementById('panelDivId').removeEventListener('click',this._handlePanelClick)
;this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('input',this._handlePrivmsgInputAreaElInput)
;this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('keydown',this._handleHotKeyPressed,false)
;this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('paste',this._handlePrivmsgInputAreaElPaste)
;this.shadowRoot.getElementById('sendButtonId').removeEventListener('click',this._handlePrivMsgSendButtonElClick)
;this.shadowRoot.getElementById('tallerButtonId').removeEventListener('click',this._handleTallerButton);document.removeEventListener('cache-reload-done',this._handleCacheReloadDone)
;document.removeEventListener('cache-reload-error',this._handelCacheReloadError);document.removeEventListener('cancel-beep-sounds',this._handleCancelBeepSounds)
;document.removeEventListener('collapse-all-panels',this._handleCollapseAllPanels);document.removeEventListener('color-theme-changed',this._handleColorThemeChanged)
;document.removeEventListener('erase-before-reload',this._handleEraseBeforeReload);document.removeEventListener('hide-all-panels',this._handleHideAllPanels)
;document.removeEventListener('irc-state-changed',this._handleIrcStateChanged);document.removeEventListener('resize-custom-elements',this._handleResizeCustomElements)
;document.removeEventListener('show-all-panels',this._handleShowAllPanels);const parentEl=document.getElementById('pmContainerId')
;const childEl=document.getElementById('privmsg:'+this.privmsgName.toLowerCase());if(parentEl.contains(childEl))parentEl.removeChild(childEl)};_handleIrcStateChanged=()=>{
if(!this.elementExistsInDom)throw new Error('Calling irc-state-changed after channel element was destroyed.')
;if(!window.globals.ircState.ircConnected)if(window.globals.webState.activePrivateMessageNicks.indexOf(this.privmsgName.toLowerCase())>=0)this._removeSelfFromDOM()};_handleCacheReloadDone=event=>{
const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');let markerString='';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp);if(timestampString)markerString+=timestampString
;markerString+=' '+document.getElementById('globVars').constants('cacheReloadString')+'\n';panelMessageDisplayEl.value+=markerString;this._scrollTextAreaToRecent();const now=Math.floor(Date.now()/1e3)
;const uptime=now-window.globals.webState.times.webConnect;if(uptime<5&&!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))this.collapsePanel()}
;_handelCacheReloadError=event=>{let errorString='\n';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString
;errorString+=' '+document.getElementById('globVar').constants('cacheErrorString')+'\n\n';this.shadowRoot.getElementById('panelMessageDisplayId').value=errorString};_handleEraseBeforeReload=()=>{
this._removeSelfFromDOM()};_handleEraseAllButton=()=>{document.getElementById('ircControlsPanel').eraseIrcCache('PRIVMSG').then(()=>{
if(!window.globals.webState.cacheReloadInProgress)document.dispatchEvent(new CustomEvent('update-from-cache'))}).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})};_setFixedElementTitles=()=>{
this.shadowRoot.getElementById('messageCountIconId').title='Unread Message Count'
;this.shadowRoot.getElementById('panelMessageInputId').title='Private message input area. IRC commands starting with / are accepted'
;this.shadowRoot.getElementById('sendButtonId').title='Send primate message or IRC command to IRC server'
;this.shadowRoot.getElementById('bottomCollapseButtonId').title='Show more options for this panel'
;this.shadowRoot.getElementById('multiLineSendButtonId').title='Using timer, send multi-line message one line at a time'
;this.shadowRoot.getElementById('tallerButtonId').title='Enlarge PM Text Area Vertically';this.shadowRoot.getElementById('normalButtonId').title='Restore PM Area to default size'
;this.shadowRoot.getElementById('eraseButtonId').title='Remove all private messages from remote message cache'
;this.shadowRoot.getElementById('beepCheckBoxId').title='When checked emit audio beep sound for each message'};timerTickHandler=()=>{if(this.activityIconInhibitTimer>0)this.activityIconInhibitTimer--}
;initializePlugin=parsedMessage=>{const managePmPanelsEl=document.getElementById('managePmPanels')
;if(window.globals.webState.activePrivateMessageNicks.indexOf(this.privmsgName.toLowerCase())>=0)throw new Error('_createPrivateMessageEl: PP panel already exist');this._setFixedElementTitles()
;window.globals.webState.activePrivateMessageNicks.push(this.privmsgName.toLowerCase());window.globals.webState.activePrivateMessageCsNicks.push(this.privmsgCsName)
;document.getElementById('navMenu').handlePmListUpdate();this.shadowRoot.getElementById('pmNameDivId').textContent=this.privmsgCsName;this._handleColorThemeChanged({detail:{
theme:document.querySelector('body').getAttribute('theme')}});const panelDivEl=this.shadowRoot.getElementById('panelDivId');if(panelDivEl.getAttribute('lastDate')!==parsedMessage.datestamp){
panelDivEl.setAttribute('lastDate',parsedMessage.datestamp);this.shadowRoot.getElementById('panelMessageDisplayId').value='\n=== '+parsedMessage.datestamp+' ===\n\n'}
if(document.getElementById('managePmPanels').hasAttribute('beep-enabled')){this.shadowRoot.getElementById('panelDivId').setAttribute('beep3-enabled','')
;if(!window.globals.webState.cacheReloadInProgress)document.getElementById('beepSounds').playBeep3Sound()}else this.shadowRoot.getElementById('panelDivId').removeAttribute('beep3-enabled')
;this._updateVisibility();this.displayPmMessage(parsedMessage)
;if(window.globals.webState.cacheReloadInProgress)if(managePmPanelsEl.listOfOpenedPmPanels.indexOf(this.privmsgName.toLowerCase())>=0)if(!document.querySelector('body').hasAttribute('zoomId'))this.showPanel();else this.hidePanel();else if(managePmPanelsEl.listOfCollapsedPmPanels.indexOf(this.privmsgName.toLowerCase())>=0)if(!document.querySelector('body').hasAttribute('zoomId'))this.collapsePanel();else this.hidePanel();else if(managePmPanelsEl.listOfClosedPmPanels.indexOf(this.privmsgName.toLowerCase())>=0)this.hidePanel();else this.collapsePanel();else this.showPanel()
;this._handleResizeCustomElements();setTimeout(this._handleResizeCustomElements,100)};connectedCallback(){
this.shadowRoot.getElementById('beepCheckBoxId').addEventListener('click',this._handlePrivMsgBeep1CBInputElClick)
;this.shadowRoot.getElementById('bottomCollapseButtonId').addEventListener('click',this._handleBottomCollapseButton)
;this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',this._handleCloseButton)
;this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click',this._handleCollapseButton)
;this.shadowRoot.getElementById('eraseButtonId').addEventListener('click',this._handleEraseAllButton)
;this.shadowRoot.getElementById('multiLineSendButtonId').addEventListener('click',this._handleMultiLineSendButtonClick)
;this.shadowRoot.getElementById('normalButtonId').addEventListener('click',this._handleNormalButton);this.shadowRoot.getElementById('panelDivId').addEventListener('click',this._handlePanelClick)
;this.shadowRoot.getElementById('panelMessageInputId').addEventListener('input',this._handlePrivmsgInputAreaElInput)
;this.shadowRoot.getElementById('panelMessageInputId').addEventListener('keydown',this._handleHotKeyPressed,false)
;this.shadowRoot.getElementById('panelMessageInputId').addEventListener('paste',this._handlePrivmsgInputAreaElPaste)
;this.shadowRoot.getElementById('sendButtonId').addEventListener('click',this._handlePrivMsgSendButtonElClick)
;this.shadowRoot.getElementById('tallerButtonId').addEventListener('click',this._handleTallerButton);document.addEventListener('cache-reload-done',this._handleCacheReloadDone)
;document.addEventListener('cache-reload-error',this._handelCacheReloadError);document.addEventListener('cancel-beep-sounds',this._handleCancelBeepSounds)
;document.addEventListener('collapse-all-panels',this._handleCollapseAllPanels);document.addEventListener('color-theme-changed',this._handleColorThemeChanged)
;document.addEventListener('erase-before-reload',this._handleEraseBeforeReload);document.addEventListener('hide-all-panels',this._handleHideAllPanels)
;document.addEventListener('irc-state-changed',this._handleIrcStateChanged);document.addEventListener('resize-custom-elements',this._handleResizeCustomElements)
;document.addEventListener('show-all-panels',this._handleShowAllPanels)}});window.customElements.define('manage-channels-panel',class extends HTMLElement{constructor(){super()
;const template=document.getElementById('manageChannelsPanelTemplate');const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))
;this.hotKeyCycleIndex=0;this.lastJoinedChannelCount=-1;this.lastChannelListCount=-1;this.lastIrcServerIndex=-1;this.ircConnectedLast=false;this.ircFirstConnect=true
;this.ircReconnectActivatedFlag=false;this.ircChannelsPendingJoin=[]}_scrollToTop=()=>{this.focus();const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,
behavior:'smooth'})};_scrollToBottom=()=>{this.focus();const newVertPos=this.getBoundingClientRect().bottom-window.innerHeight+window.scrollY;window.scrollTo({top:newVertPos,behavior:'smooth'})}
;showPanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible','')
;document.dispatchEvent(new CustomEvent('cancel-zoom'));this._scrollToTop()};collapsePanel=()=>{if(0===window.globals.ircState.channels.length){
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible')}else{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible')}};hidePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible')};handleHotKey=()=>{
if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')){const panelEls=Array.from(document.getElementById('channelsContainerId').children);panelEls.forEach(panelEl=>{
panelEl.hidePanel()});this.hidePanel()}else{const panelEls=Array.from(document.getElementById('channelsContainerId').children);panelEls.forEach(panelEl=>{panelEl.collapsePanel()});this.showPanel()}}
;handleHotKeyNextChannel=()=>{if(!window.globals.ircState.ircConnected)return;if(!window.globals.webState.webConnected)return;if(0===window.globals.ircState.channels.length)return
;this.hotKeyCycleIndex+=1;if(this.hotKeyCycleIndex>=window.globals.ircState.channels.length)this.hotKeyCycleIndex=0
;const channelPanelId='channel:'+window.globals.ircState.channels[this.hotKeyCycleIndex];const panelEls=Array.from(document.getElementById('channelsContainerId').children);panelEls.forEach(panelEl=>{
if(panelEl.id.toLowerCase()===channelPanelId){panelEl.showPanel();panelEl._scrollToTop()}else panelEl.hidePanel()});this.hidePanel()};handleHeaderBarActivityIconClick=()=>{
const panelEls=Array.from(document.getElementById('channelsContainerId').children);let once=true;panelEls.forEach(panelEl=>{if(once&&panelEl.unreadMessageCount>0){once=false
;panelEl.showAndScrollPanel()}})};displayChannelMessage=parsedMessage=>{if(!('command'in parsedMessage)){console.log('Expected command property not found in manage-channels-panel');return}
const channelElements=Array.from(document.getElementById('channelsContainerId').children);const channelNone=['NICK','QUIT']
;const channelFirst=['KICK','JOIN','MODE','cachedNICK','NOTICE','PART','PRIVMSG','TOPIC','cachedQUIT'];const channelSecond=['324','329','367','368']
;if(channelNone.indexOf(parsedMessage.command)>=0)channelElements.forEach(el=>{el.displayChannelMessage(parsedMessage)
});else if(channelFirst.indexOf(parsedMessage.command)>=0)channelElements.forEach(el=>{
if('params'in parsedMessage&&parsedMessage.params.length>0&&'channelName'in el&&parsedMessage.params[0].toLowerCase()===el.channelName.toLowerCase())el.displayChannelMessage(parsedMessage)
});else if(channelSecond.indexOf(parsedMessage.command)>=0)channelElements.forEach(el=>{
if('params'in parsedMessage&&parsedMessage.params.length>1&&'channelName'in el&&parsedMessage.params[1].toLowerCase()===el.channelName.toLowerCase())el.displayChannelMessage(parsedMessage)
});else console.log('Error, manage-channels-panel can not route unmatched message\n',JSON.stringify(parsedMessage,null,2))};displayChannelNoticeMessage=parsedMessage=>{
if('NOTICE'!==parsedMessage.command)return;const ctcpDelim=1
;if(2===parsedMessage.params.length&&parsedMessage.params[1].charCodeAt(0)===ctcpDelim||3===parsedMessage.params.length&&parsedMessage.params[2].charCodeAt(0)===ctcpDelim)return
;if(parsedMessage.params[0]!==window.globals.ircState.nickName&&window.globals.ircState.channels.indexOf(parsedMessage.params[0].toLowerCase())>=0){
const channelElements=Array.from(document.getElementById('channelsContainerId').children);channelElements.forEach(el=>{
if('params'in parsedMessage&&'channelName'in el&&parsedMessage.params[0].toLowerCase()===el.channelName.toLowerCase())el.displayChannelMessage(parsedMessage)})}};_joinNewChannel=()=>{
const newChannel=this.shadowRoot.getElementById('newChannelNameInputId').value;this.shadowRoot.getElementById('newChannelNameInputId').value=''
;if(newChannel.length>1&&document.getElementById('globVars').constants('channelPrefixChars').indexOf(newChannel.charAt(0))>=0){const message='JOIN '+newChannel
;document.getElementById('ircControlsPanel').sendIrcServerMessage(message);this.ircChannelsPendingJoin.push(newChannel.toLowerCase())
}else document.getElementById('errorPanel').showError('Invalid Channel Name')};_createChannelElement=newChannelName=>{if(window.globals.webState.channels.indexOf(newChannelName)<0){
const channelsContainerEl=document.getElementById('channelsContainerId');const newChannelEl=document.createElement('channel-panel');newChannelEl.id='channel:'+newChannelName.toLowerCase()
;newChannelEl.channelName=newChannelName.toLowerCase();newChannelEl.channelCsName=newChannelName;newChannelEl.setAttribute('channel-name',newChannelName.toLowerCase())
;newChannelEl.setAttribute('channel-cs-name',newChannelName);channelsContainerEl.appendChild(newChannelEl);newChannelEl.initializePlugin()
}else throw new Error('Attempt to create channel that already exists')};_handleChannelButtonClick=event=>{const channelName=this.shadowRoot.getElementById(event.target.id).textContent
;if(channelName.length>0){document.getElementById('ircControlsPanel').sendIrcServerMessage('JOIN '+channelName);this.ircChannelsPendingJoin.push(channelName.toLowerCase())}};_updateVisibility=()=>{
const beep1CheckBoxEl=this.shadowRoot.getElementById('beep1CheckBoxId');const beep2CheckBoxEl=this.shadowRoot.getElementById('beep2CheckBoxId')
;const beep3CheckBoxEl=this.shadowRoot.getElementById('beep3CheckBoxId');if(this.hasAttribute('beep1-enabled'))beep1CheckBoxEl.checked=true;else beep1CheckBoxEl.checked=false
;if(this.hasAttribute('beep2-enabled'))beep2CheckBoxEl.checked=true;else beep2CheckBoxEl.checked=false
;if(this.hasAttribute('beep3-enabled'))beep3CheckBoxEl.checked=true;else beep3CheckBoxEl.checked=false};_updateLocalStorageBeepEnable=()=>{const now=Math.floor(Date.now()/1e3)
;const defaultChannelBeepsObj={timestamp:now,beep1:this.hasAttribute('beep1-enabled'),beep2:this.hasAttribute('beep2-enabled'),beep3:this.hasAttribute('beep3-enabled')}
;window.localStorage.setItem('defaultChannelBeepEnable',JSON.stringify(defaultChannelBeepsObj))};_loadBeepEnable=()=>{let defaultChannelBeepsObj=null;try{
defaultChannelBeepsObj=JSON.parse(window.localStorage.getItem('defaultChannelBeepEnable'))}catch(error){}if(defaultChannelBeepsObj){
if(defaultChannelBeepsObj.beep1)this.setAttribute('beep1-enabled','');else this.removeAttribute('beep1-enabled')
;if(defaultChannelBeepsObj.beep2)this.setAttribute('beep2-enabled','');else this.removeAttribute('beep2-enabled')
;if(defaultChannelBeepsObj.beep3)this.setAttribute('beep3-enabled','');else this.removeAttribute('beep3-enabled');this._updateVisibility()}};_setFixedElementTitles=()=>{
this.shadowRoot.getElementById('activeChannelCountIconId').title='Count of the number of active IRC channel panels'
;this.shadowRoot.getElementById('channelUnreadCountIconId').title='Count of the total number unread channel messages'
;this.shadowRoot.getElementById('newChannelNameInputId').title='Channel name input area'
;this.shadowRoot.getElementById('newChannelButtonId').title='Create new IRC channel panel using entered channel name'
;this.shadowRoot.getElementById('beep1CheckBoxId').title='When checked, open new channel panels with audio beep enabled'
;this.shadowRoot.getElementById('beep2CheckBoxId').title='When checked, open new channel panels with audio beep enabled'
;this.shadowRoot.getElementById('beep3CheckBoxId').title='When checked, open new channel panels with audio beep enabled'};timerTickHandler=()=>{
const channelsElements=document.getElementById('channelsContainerId');const channelEls=Array.from(channelsElements.children);channelEls.forEach(chanEl=>{chanEl.timerTickHandler()})}
;initializePlugin=()=>{this._loadBeepEnable();this._setFixedElementTitles()};connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()})
;this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))this.collapsePanel();else this.showPanel()})
;this.shadowRoot.getElementById('newChannelButtonId').addEventListener('click',()=>{this._joinNewChannel()});this.shadowRoot.getElementById('newChannelNameInputId').addEventListener('input',event=>{
if('insertText'===event.inputType&&null===event.data||'insertLineBreak'===event.inputType)this._joinNewChannel()});this.shadowRoot.getElementById('beep1CheckBoxId').addEventListener('click',()=>{
if(this.hasAttribute('beep1-enabled'))this.removeAttribute('beep1-enabled');else{this.setAttribute('beep1-enabled','');document.getElementById('beepSounds').playBeep1Sound()}
this._updateLocalStorageBeepEnable();this._updateVisibility()});this.shadowRoot.getElementById('beep2CheckBoxId').addEventListener('click',()=>{
if(this.hasAttribute('beep2-enabled'))this.removeAttribute('beep2-enabled');else{this.setAttribute('beep2-enabled','');document.getElementById('beepSounds').playBeep2Sound()}
this._updateLocalStorageBeepEnable();this._updateVisibility()});this.shadowRoot.getElementById('beep3CheckBoxId').addEventListener('click',()=>{
if(this.hasAttribute('beep3-enabled'))this.removeAttribute('beep3-enabled');else{this.setAttribute('beep3-enabled','');document.getElementById('beepSounds').playBeep3Sound()}
this._updateLocalStorageBeepEnable();this._updateVisibility()});document.addEventListener('cancel-beep-sounds',()=>{this.removeAttribute('beep1-enabled');this.removeAttribute('beep2-enabled')
;this.removeAttribute('beep3-enabled')});document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){
if(event.detail.except!==this.id)this.collapsePanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()})
;document.addEventListener('color-theme-changed',event=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId')
;const activeChannelCountIconEl=this.shadowRoot.getElementById('activeChannelCountIconId');const channelUnreadCountIconEl=this.shadowRoot.getElementById('channelUnreadCountIconId')
;const newChannelNameInputEl=this.shadowRoot.getElementById('newChannelNameInputId');if('light'===event.detail.theme){panelDivEl.classList.remove('channel-panel-theme-dark')
;panelDivEl.classList.add('channel-panel-theme-light');activeChannelCountIconEl.classList.remove('global-border-theme-dark');activeChannelCountIconEl.classList.add('global-border-theme-light')
;channelUnreadCountIconEl.classList.remove('global-border-theme-dark');channelUnreadCountIconEl.classList.add('global-border-theme-light')
;newChannelNameInputEl.classList.remove('global-text-theme-dark');newChannelNameInputEl.classList.add('global-text-theme-light')}else{panelDivEl.classList.remove('channel-panel-theme-light')
;panelDivEl.classList.add('channel-panel-theme-dark');activeChannelCountIconEl.classList.remove('global-border-theme-light');activeChannelCountIconEl.classList.add('global-border-theme-dark')
;channelUnreadCountIconEl.classList.remove('global-border-theme-light');channelUnreadCountIconEl.classList.add('global-border-theme-dark')
;newChannelNameInputEl.classList.remove('global-text-theme-light');newChannelNameInputEl.classList.add('global-text-theme-dark')}});document.addEventListener('erase-before-reload',()=>{
this.shadowRoot.getElementById('newChannelNameInputId').value='';this.shadowRoot.getElementById('channelUnreadCountIconId').textContent='0'
;this.shadowRoot.getElementById('channelUnreadCountIconId').setAttribute('hidden','')});document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()
}else this.hidePanel()});document.addEventListener('irc-state-changed',()=>{if(window.globals.ircState.ircConnected){if(this.ircFirstConnect){this.ircFirstConnect=false
;if(0===window.globals.ircState.channels.length)if(this.ircReconnectActivatedFlag){this.ircReconnectActivatedFlag=false;setTimeout(()=>{},5e3)}else{this.showPanel();setTimeout(()=>{this._scrollToTop()
},750)}}
if(window.globals.ircState.ircAutoReconnect&&window.globals.ircState.ircConnectOn&&window.globals.ircState.ircConnected&&!window.globals.ircState.ircConnecting&&window.globals.ircState.channels.length>0)this.ircReconnectActivatedFlag=true
}else this.ircFirstConnect=true;if(!window.globals.ircState.ircAutoReconnect||!window.globals.ircState.ircConnectOn)this.ircReconnectActivatedFlag=false
;if(window.globals.ircState.ircConnected!==this.ircConnectedLast){this.ircConnectedLast=window.globals.ircState.ircConnected;if(!window.globals.ircState.ircConnected){this.hidePanel()
;this.ircChannelsPendingJoin=[]}}if(window.globals.ircState.channels.length>0)for(let i=0;i<window.globals.ircState.channels.length;i++){const channelName=window.globals.ircState.channels[i]
;if(-1===window.globals.webState.channels.indexOf(channelName.toLowerCase())){const channelCsName=window.globals.ircState.channelStates[i].csName;this._createChannelElement(channelCsName)}}
let needButtonUpdate=false;let joinedChannelCount=0
;if(window.globals.ircState.channels.length>0)for(let i=0;i<window.globals.ircState.channels.length;i++)if(window.globals.ircState.channelStates[i].joined)joinedChannelCount++
;if(joinedChannelCount!==this.lastJoinedChannelCount){this.lastJoinedChannelCount=joinedChannelCount;needButtonUpdate=true}if(window.globals.ircState.channelList.length!==this.lastChannelListCount){
this.lastChannelListCount=window.globals.ircState.channelList.length;needButtonUpdate=true}if(window.globals.ircState.ircServerIndex!==this.lastIrcServerIndex){
this.lastIrcServerIndex=window.globals.ircState.ircServerIndex;needButtonUpdate=true}if(window.globals.webState.ircServerModified){window.globals.webState.ircServerModified=false;needButtonUpdate=true
}this.shadowRoot.getElementById('activeChannelCountIconId').textContent=joinedChannelCount.toString();if(needButtonUpdate){
const channelJoinButtonContainerEl=this.shadowRoot.getElementById('channelJoinButtonContainerId');while(channelJoinButtonContainerEl.firstChild){
channelJoinButtonContainerEl.firstChild.removeEventListener('click',this._handleChannelButtonClick);channelJoinButtonContainerEl.removeChild(channelJoinButtonContainerEl.firstChild)}
if(window.globals.ircState.channelList.length>0)for(let i=0;i<window.globals.ircState.channelList.length;i++){
const channelIndex=window.globals.ircState.channels.indexOf(window.globals.ircState.channelList[i].toLowerCase());if(channelIndex<0||!window.globals.ircState.channelStates[channelIndex].joined){
const joinButtonEl=document.createElement('button');joinButtonEl.textContent=window.globals.ircState.channelList[i];joinButtonEl.setAttribute('title','/JOIN this preset IRC Channel')
;joinButtonEl.classList.add('mr7');joinButtonEl.id='joinButton'+i.toString();channelJoinButtonContainerEl.appendChild(joinButtonEl)
;joinButtonEl.addEventListener('click',this._handleChannelButtonClick)}}else{const noPresetsWarningDivEl=document.createElement('div')
;noPresetsWarningDivEl.textContent='(No IRC channel presets defined)';channelJoinButtonContainerEl.appendChild(noPresetsWarningDivEl)}}});document.addEventListener('show-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.showPanel()}else this.showPanel()});document.addEventListener('update-channel-count',event=>{let totalCount=0
;const channelsElements=document.getElementById('channelsContainerId');const channelEls=Array.from(channelsElements.children);channelEls.forEach(chanEl=>{totalCount+=chanEl.unreadMessageCount})
;this.shadowRoot.getElementById('channelUnreadCountIconId').textContent=totalCount.toString()
;if(totalCount>0)this.shadowRoot.getElementById('channelUnreadCountIconId').removeAttribute('hidden');else this.shadowRoot.getElementById('channelUnreadCountIconId').setAttribute('hidden','')})
;document.addEventListener('web-connect-changed',()=>{if(window.globals.webState.webConnected!==this.webConnectedLast){this.webConnectedLast=window.globals.webState.webConnected
;if(!window.globals.webState.webConnected){this.ircFirstConnect=true;this.ircChannelsPendingJoin=[]}}})}});window.customElements.define('channel-panel',class extends HTMLElement{constructor(){super()
;const template=document.getElementById('channelPanelTemplate');const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))
;this.elementExistsInDom=true;this.channelName='';this.channelCsName='';this.maxNickLength=0;this.activityIconInhibitTimer=0;this.channelIndex=null;this.initIrcStateIndex=null
;this.unreadMessageCount=0;this.lastAutoCompleteMatch='';this.webConnectedLast=true;this.webSocketFirstConnect=false;this.inhibitDynamicResize=false;this.mobileBreakpointPx=600
;this.textareaHeightInRows='15';this.verticalZoomMarginPixels=137;this.channelNamesCharWidth=20}_sendTextToChannel=(channelIndex,textAreaEl)=>{
const displayUtilsEl=document.getElementById('displayUtils');const errorPanelEl=document.getElementById('errorPanel');const ircControlsPanelEl=document.getElementById('ircControlsPanel')
;const text=displayUtilsEl.stripTrailingCrLf(textAreaEl.value);if(displayUtilsEl.detectMultiLineString(text)){textAreaEl.value='';textAreaEl.setAttribute('rows','1')
;errorPanelEl.showError('Multi-line input is not supported.')}else if(text.length>0){if('/'===text.charAt(0)){const commandAction=document.getElementById('localCommandParser').textCommandParser({
inputString:text,originType:'channel',originName:window.globals.ircState.channelStates[channelIndex].name});textAreaEl.value='';if(commandAction.error){errorPanelEl.showError(commandAction.message)
;return}else{if(commandAction.ircMessage&&commandAction.ircMessage.length>0)ircControlsPanelEl.sendIrcServerMessage(commandAction.ircMessage);return}}
if(window.globals.ircState.ircConnected&&window.globals.ircState.ircIsAway)setTimeout(()=>{
if(window.globals.ircState.ircConnected&&window.globals.ircState.ircIsAway)ircControlsPanelEl.sendIrcServerMessage('AWAY')},1e3)
;const message='PRIVMSG '+window.globals.ircState.channelStates[channelIndex].name+' :'+text;ircControlsPanelEl.sendIrcServerMessage(message);textAreaEl.value=''}textAreaEl.value=''}
;_splitMultiLinePaste=multiLineContent=>{if('string'!==typeof multiLineContent)return[];if(0===multiLineContent.length)return[];const outArray=[];const inArray=multiLineContent.split('\n')
;if(inArray.length>0)for(let i=0;i<inArray.length;i++){let nextLine=inArray[i];if(nextLine.length>0){if(13===nextLine.charCodeAt(nextLine.length-1))nextLine=nextLine.slice(0,nextLine.length-1)
;if(nextLine.length>0)outArray.push(nextLine)}}return outArray};_incrementMessageCount=()=>{this.unreadMessageCount++
;this.shadowRoot.getElementById('messageCountIconId').textContent=this.unreadMessageCount.toString();this.shadowRoot.getElementById('messageCountIconId').removeAttribute('hidden')
;document.dispatchEvent(new CustomEvent('update-channel-count',{detail:{channel:this.channelName,unreadMessageCount:this.unreadMessageCount}}))};_resetMessageCount=()=>{this.unreadMessageCount=0
;this.shadowRoot.getElementById('messageCountIconId').textContent=this.unreadMessageCount.toString();this.shadowRoot.getElementById('messageCountIconId').setAttribute('hidden','')
;document.dispatchEvent(new CustomEvent('update-channel-count',{detail:{channel:this.channelName,unreadMessageCount:this.unreadMessageCount}}))};_scrollTextAreaToRecent=()=>{
const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight};_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};_scrollToBottom=()=>{this.focus()
;const newVertPos=this.getBoundingClientRect().bottom-window.innerHeight+window.scrollY;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
const panelVisibilityDivEl=this.shadowRoot.getElementById('panelVisibilityDivId');const panelCollapsedDivEl=this.shadowRoot.getElementById('panelCollapsedDivId')
;const hideWithCollapseEl=this.shadowRoot.getElementById('hideWithCollapseId');const bottomCollapseDivEl=this.shadowRoot.getElementById('bottomCollapseDivId')
;const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId');if(panelVisibilityDivEl.hasAttribute('visible')&&!panelCollapsedDivEl.hasAttribute('visible')){
panelVisibilityDivEl.setAttribute('visible','');panelCollapsedDivEl.setAttribute('visible','');hideWithCollapseEl.removeAttribute('hidden')
;this.shadowRoot.getElementById('noScrollCheckboxId').checked=false;this._scrollTextAreaToRecent();this._scrollToTop();panelMessageInputEl.focus()
}else if(!panelVisibilityDivEl.hasAttribute('visible')){panelVisibilityDivEl.setAttribute('visible','');panelCollapsedDivEl.setAttribute('visible','');hideWithCollapseEl.removeAttribute('hidden')
;this.shadowRoot.getElementById('noScrollCheckboxId').checked=false;bottomCollapseDivEl.setAttribute('hidden','');this._scrollTextAreaToRecent();this._scrollToTop();panelMessageInputEl.focus()}
this._handleCancelZoomEvent();if(document.querySelector('body').hasAttribute('zoomId'))document.dispatchEvent(new CustomEvent('cancel-zoom'))};showAndScrollPanel=()=>{this._resetMessageCount()
;this.showPanel();this._scrollTextAreaToRecent();this._scrollToTop();this.shadowRoot.getElementById('panelMessageInputId').focus()};collapsePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible')
;this.shadowRoot.getElementById('hideWithCollapseId').setAttribute('hidden','');this._handleCancelZoomEvent()};hidePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible')
;this.shadowRoot.getElementById('hideWithCollapseId').removeAttribute('hidden');this._handleCancelZoomEvent()};_updateVisibility=()=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId')
;const beep1CheckBoxEl=this.shadowRoot.getElementById('beep1CheckBoxId');const beep2CheckBoxEl=this.shadowRoot.getElementById('beep2CheckBoxId')
;const beep3CheckBoxEl=this.shadowRoot.getElementById('beep3CheckBoxId');const briefCheckboxEl=this.shadowRoot.getElementById('briefCheckboxId')
;const autocompleteCheckboxEl=this.shadowRoot.getElementById('autocompleteCheckboxId');const autoCompleteTitleEl=this.shadowRoot.getElementById('autoCompleteTitle')
;const ircStateIndex=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());const webStateIndex=window.globals.webState.channels.indexOf(this.channelName.toLowerCase())
;if(panelDivEl.hasAttribute('beep1-enabled'))beep1CheckBoxEl.checked=true;else beep1CheckBoxEl.checked=false
;if(panelDivEl.hasAttribute('beep2-enabled'))beep2CheckBoxEl.checked=true;else beep2CheckBoxEl.checked=false
;if(panelDivEl.hasAttribute('beep3-enabled'))beep3CheckBoxEl.checked=true;else beep3CheckBoxEl.checked=false;if(panelDivEl.hasAttribute('brief-enabled')){briefCheckboxEl.checked=true
;autoCompleteTitleEl.textContent='Auto-complete (tab, space-space)'}else{briefCheckboxEl.checked=false;autoCompleteTitleEl.textContent='Auto-complete (tab)'}
if(panelDivEl.hasAttribute('auto-comp-enabled'))autocompleteCheckboxEl.checked=true;else autocompleteCheckboxEl.checked=false
;if(ircStateIndex>=0&&webStateIndex>=0)if(window.globals.ircState.channelStates[ircStateIndex].joined){this.shadowRoot.getElementById('joinButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('pruneButtonId').setAttribute('hidden','');this.shadowRoot.getElementById('partButtonId').removeAttribute('hidden')}else{
this.shadowRoot.getElementById('joinButtonId').removeAttribute('hidden');this.shadowRoot.getElementById('pruneButtonId').removeAttribute('hidden')
;this.shadowRoot.getElementById('partButtonId').setAttribute('hidden','')}if(window.globals.ircState.channelStates[ircStateIndex].joined){
this.shadowRoot.getElementById('notInChannelIconId').setAttribute('hidden','');this.shadowRoot.getElementById('sendButtonId').removeAttribute('disabled')
;this.shadowRoot.getElementById('panelMessageInputId').removeAttribute('disabled')}else{this.shadowRoot.getElementById('notInChannelIconId').removeAttribute('hidden')
;this.shadowRoot.getElementById('sendButtonId').setAttribute('disabled','');this.shadowRoot.getElementById('panelMessageInputId').setAttribute('disabled','')
;this.shadowRoot.getElementById('panelNickListId').value=''}};_handleCloseButton=()=>{this.hidePanel()};_handleCollapseButton=()=>{
if(this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))this.collapsePanel();else{this.showPanel();this._scrollTextAreaToRecent()
;this.shadowRoot.getElementById('noScrollCheckboxId').checked=false}};_handleClearButton=()=>{this.shadowRoot.getElementById('panelMessageDisplayId').value=''
;this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate','0000-00-00');this.shadowRoot.getElementById('panelNickListId').setAttribute('rows',this.textareaHeightInRows)
;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows',this.textareaHeightInRows);this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows','1')}
;_handleTallerButton=()=>{const newRows=parseInt(this.shadowRoot.getElementById('panelMessageDisplayId').getAttribute('rows'))+10
;this.shadowRoot.getElementById('panelNickListId').setAttribute('rows',newRows);this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows',newRows)
;this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows','3')};_handleNormalButton=()=>{
this.shadowRoot.getElementById('panelNickListId').setAttribute('rows',this.textareaHeightInRows);this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows',this.textareaHeightInRows)
;this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows','1')};_handleChannelJoinButtonElClick=()=>{const message='JOIN '+this.channelCsName
;document.getElementById('ircControlsPanel').sendIrcServerMessage(message)};_handleChannelPartButtonElClick=()=>{
const message='PART '+this.channelName+' :'+window.globals.ircState.progName+' '+window.globals.ircState.progVersion;document.getElementById('ircControlsPanel').sendIrcServerMessage(message)}
;_handleChannelPruneButtonElClick=()=>{const index=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase())
;if(index>=0)if(!window.globals.ircState.channelStates[index].joined)document.getElementById('ircControlsPanel').pruneIrcChannel(this.channelName).catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})};_handleRefreshButton=()=>{
if(!window.globals.webState.cacheReloadInProgress)document.dispatchEvent(new CustomEvent('update-from-cache'))};_handleChannelInputAreaElPaste=event=>{
if(this._splitMultiLinePaste(event.clipboardData.getData('text')).length>1){this._handleCancelZoomEvent()
;this.shadowRoot.getElementById('multiLineSendSpanId').textContent='Clipboard ('+this._splitMultiLinePaste(event.clipboardData.getData('text')).length+' lines)'
;this.shadowRoot.getElementById('multiLineActionDivId').removeAttribute('hidden');this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows','3')}};_handleMultiLineSendButtonClick=()=>{
const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId');const multiLineActionDivEl=this.shadowRoot.getElementById('multiLineActionDivId')
;const errorPanelEl=document.getElementById('errorPanel');const multiLineArray=this._splitMultiLinePaste(panelMessageInputEl.value);if(multiLineArray.length>100){
multiLineActionDivEl.setAttribute('hidden','');panelMessageInputEl.value='';errorPanelEl.showError('Maximum multi-line clipboard paste 100 Lin`es')}else{
const lastIrcConnect=window.globals.ircState.times.ircConnect;const lastWebConnect=window.globals.webState.times.webConnect;let abortedFlag=false;const delayIntervalMs=2e3;let delayMs=0
;if(multiLineArray.length>0){panelMessageInputEl.setAttribute('rows','1');panelMessageInputEl.value=multiLineArray[0];for(let i=0;i<multiLineArray.length;i++){delayMs+=delayIntervalMs;setTimeout(()=>{
let okToSend=false
;if(window.globals.ircState.ircConnected&&lastIrcConnect===window.globals.ircState.times.ircConnect&&lastWebConnect===window.globals.webState.times.webConnect&&!abortedFlag)okToSend=true;if(okToSend){
const index=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());if(index>=0)if(!window.globals.ircState.channelStates[index].joined)okToSend=false
;if(!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))okToSend=false;if(!this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))okToSend=false}
if(!okToSend)abortedFlag=true;else{const message='PRIVMSG '+window.globals.ircState.channelStates[this.channelIndex].name+' :'+multiLineArray[i]
;document.getElementById('ircControlsPanel').sendIrcServerMessage(message);if(i!==multiLineArray.length-1)panelMessageInputEl.value=multiLineArray[i+1];else panelMessageInputEl.value=''}},delayMs)}
multiLineActionDivEl.setAttribute('hidden','')}else multiLineActionDivEl.setAttribute('hidden','')}};_handleChannelSendButtonElClick=()=>{
const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId');this._sendTextToChannel(this.channelIndex,panelMessageInputEl);panelMessageInputEl.focus();this._resetMessageCount()
;this.activityIconInhibitTimer=document.getElementById('globVars').constants('activityIconInhibitTimerValue');this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden','')}
;_handleChannelInputAreaElInput=event=>{const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId')
;if('insertText'===event.inputType&&null===event.data||'insertLineBreak'===event.inputType){document.getElementById('displayUtils').stripOneCrLfFromElement(panelMessageInputEl)
;this._sendTextToChannel(this.channelIndex,panelMessageInputEl);this._resetMessageCount();this.activityIconInhibitTimer=document.getElementById('globVars').constants('activityIconInhibitTimerValue')
;this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden','')}};_handleBottomCollapseButton=()=>{this._handleCancelZoomEvent()
;const bottomCollapseDivEl=this.shadowRoot.getElementById('bottomCollapseDivId');if(bottomCollapseDivEl.hasAttribute('hidden')){bottomCollapseDivEl.removeAttribute('hidden');this._scrollToTop()
}else bottomCollapseDivEl.setAttribute('hidden','')};_handleChannelZoomButtonElClick=()=>{const bodyEl=document.querySelector('body');const headerBarEl=document.getElementById('headerBar')
;const zoomButtonEl=this.shadowRoot.getElementById('zoomButtonId');const bottomCollapseDivEl=this.shadowRoot.getElementById('bottomCollapseDivId')
;const channelTopicDivEl=this.shadowRoot.getElementById('channelTopicDivId');if(bodyEl.hasAttribute('zoomId')&&bodyEl.getAttribute('zoomId')==='channel:'+this.channelName.toLowerCase()){
this.inhibitDynamicResize=false;bodyEl.removeAttribute('zoomId');headerBarEl.removeAttribute('zoomicon');zoomButtonEl.textContent='Zoom';zoomButtonEl.classList.remove('channel-panel-zoomed')
;channelTopicDivEl.removeAttribute('hidden');bottomCollapseDivEl.setAttribute('hidden','');this._handleNormalButton();this._scrollTextAreaToRecent();this._handleResizeCustomElements()}else{
bodyEl.setAttribute('zoomId','channel:'+this.channelName.toLowerCase());headerBarEl.setAttribute('zoomicon','');zoomButtonEl.textContent='UnZoom';zoomButtonEl.classList.add('channel-panel-zoomed')
;document.dispatchEvent(new CustomEvent('hide-all-panels',{detail:{except:['channel:'+this.channelName.toLowerCase(),'debugPanel']}}));channelTopicDivEl.setAttribute('hidden','')
;bottomCollapseDivEl.setAttribute('hidden','');this.shadowRoot.getElementById('noScrollCheckboxId').checked=false;this._scrollTextAreaToRecent();this._handleResizeCustomElements()}}
;_handleCancelZoomEvent=()=>{const bodyEl=document.querySelector('body');const headerBarEl=document.getElementById('headerBar');const zoomButtonEl=this.shadowRoot.getElementById('zoomButtonId')
;const bottomCollapseDivEl=this.shadowRoot.getElementById('bottomCollapseDivId');const channelTopicDivEl=this.shadowRoot.getElementById('channelTopicDivId');this.inhibitDynamicResize=false
;if(bodyEl.hasAttribute('zoomId')&&bodyEl.getAttribute('zoomId')==='channel:'+this.channelName.toLowerCase()){bodyEl.removeAttribute('zoomId');headerBarEl.removeAttribute('zoomicon')
;zoomButtonEl.textContent='Zoom';zoomButtonEl.classList.remove('channel-panel-zoomed');channelTopicDivEl.removeAttribute('hidden');bottomCollapseDivEl.setAttribute('hidden','')
;this._handleNormalButton();this._handleResizeCustomElements()}};_updateLocalStorageBeepEnable=()=>{const now=Math.floor(Date.now()/1e3);const beepEnableObj={timestamp:now,
channel:this.channelName.toLowerCase(),beep1:this.shadowRoot.getElementById('panelDivId').hasAttribute('beep1-enabled'),
beep2:this.shadowRoot.getElementById('panelDivId').hasAttribute('beep2-enabled'),beep3:this.shadowRoot.getElementById('panelDivId').hasAttribute('beep3-enabled')};let beepChannelIndex=-1
;let beepEnableChanArray=null;beepEnableChanArray=JSON.parse(window.localStorage.getItem('beepEnableChanArray'));if(beepEnableChanArray&&Array.isArray(beepEnableChanArray)){
if(beepEnableChanArray.length>0)for(let i=0;i<beepEnableChanArray.length;i++)if(beepEnableChanArray[i].channel===this.channelName.toLowerCase())beepChannelIndex=i}else beepEnableChanArray=[]
;if(beepChannelIndex>=0)beepEnableChanArray[beepChannelIndex]=beepEnableObj;else beepEnableChanArray.push(beepEnableObj)
;window.localStorage.setItem('beepEnableChanArray',JSON.stringify(beepEnableChanArray))};_loadBeepEnable=()=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId');let beepChannelIndex=-1
;let beepEnableChanArray=null;try{beepEnableChanArray=JSON.parse(window.localStorage.getItem('beepEnableChanArray'))}catch(error){}
if(beepEnableChanArray&&Array.isArray(beepEnableChanArray))if(beepEnableChanArray.length>0)for(let i=0;i<beepEnableChanArray.length;i++)if(beepEnableChanArray[i].channel===this.channelName.toLowerCase())beepChannelIndex=i
;if(beepChannelIndex>=0){if(beepEnableChanArray[beepChannelIndex].beep1)panelDivEl.setAttribute('beep1-enabled','')
;if(beepEnableChanArray[beepChannelIndex].beep2)panelDivEl.setAttribute('beep2-enabled','');if(beepEnableChanArray[beepChannelIndex].beep3)panelDivEl.setAttribute('beep3-enabled','')}else{
let oneIsEnabled=false;const manageChannelsPanelEl=document.getElementById('manageChannelsPanel');if(manageChannelsPanelEl.hasAttribute('beep1-enabled')){panelDivEl.setAttribute('beep1-enabled','')
;oneIsEnabled=true}if(manageChannelsPanelEl.hasAttribute('beep2-enabled')){panelDivEl.setAttribute('beep2-enabled','');oneIsEnabled=true}if(manageChannelsPanelEl.hasAttribute('beep3-enabled')){
panelDivEl.setAttribute('beep3-enabled','');oneIsEnabled=true}if(oneIsEnabled)this._updateLocalStorageBeepEnable()}this._updateVisibility()};_handleChannelBeep1CBInputElClick=()=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');if(panelDivEl.hasAttribute('beep1-enabled'))panelDivEl.removeAttribute('beep1-enabled');else{panelDivEl.setAttribute('beep1-enabled','')
;document.getElementById('beepSounds').playBeep1Sound()}this._updateLocalStorageBeepEnable();this._updateVisibility()};_handleChannelBeep2CBInputElClick=event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');if(panelDivEl.hasAttribute('beep2-enabled'))panelDivEl.removeAttribute('beep2-enabled');else{panelDivEl.setAttribute('beep2-enabled','')
;document.getElementById('beepSounds').playBeep1Sound()}this._updateLocalStorageBeepEnable();this._updateVisibility()};_handleChannelBeep3CBInputElClick=event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');if(panelDivEl.hasAttribute('beep3-enabled'))panelDivEl.removeAttribute('beep3-enabled');else{panelDivEl.setAttribute('beep3-enabled','')
;document.getElementById('beepSounds').playBeep1Sound()}this._updateLocalStorageBeepEnable();this._updateVisibility()};_handleCancelBeepSounds=()=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');panelDivEl.removeAttribute('beep1-enabled');panelDivEl.removeAttribute('beep2-enabled');panelDivEl.removeAttribute('beep3-enabled')}
;_handleBriefCheckboxClick=()=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId')
;if(panelDivEl.hasAttribute('brief-enabled'))panelDivEl.removeAttribute('brief-enabled');else panelDivEl.setAttribute('brief-enabled','');this._updateVisibility()
;document.dispatchEvent(new CustomEvent('update-from-cache'))};_handleAutoCompleteCheckboxClick=()=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId')
;if(panelDivEl.hasAttribute('auto-comp-enabled'))panelDivEl.removeAttribute('auto-comp-enabled');else panelDivEl.setAttribute('auto-comp-enabled','');this._updateVisibility()}
;_autoCompleteInputElement=snippet=>{let last='';const trailingSpaceKey=32;const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId')
;const autoCompleteCommandList=document.getElementById('localCommandParser').autoCompleteCommandList
;const autoCompleteRawCommandList=document.getElementById('localCommandParser').autoCompleteRawCommandList
;const nicknamePrefixChars=document.getElementById('globVars').constants('nicknamePrefixChars');let matchedCommand=''
;if(autoCompleteCommandList.length>0)for(let i=0;i<autoCompleteCommandList.length;i++)if(0===autoCompleteCommandList[i].indexOf(snippet.toUpperCase()))matchedCommand=autoCompleteCommandList[i]
;let matchedRawCommand=''
;if(autoCompleteRawCommandList.length>0)for(let i=0;i<autoCompleteRawCommandList.length;i++)if(0===autoCompleteRawCommandList[i].indexOf(snippet.toUpperCase()))matchedRawCommand=autoCompleteRawCommandList[i]
;if(matchedCommand.length>0&&panelMessageInputEl.value===snippet){panelMessageInputEl.value=panelMessageInputEl.value.slice(0,panelMessageInputEl.value.length-snippet.length)
;panelMessageInputEl.value+=matchedCommand;panelMessageInputEl.value+=String.fromCharCode(trailingSpaceKey);last=matchedCommand
}else if(matchedRawCommand.length>0&&'/QUOTE '===panelMessageInputEl.value.slice(0,7).toUpperCase()){
panelMessageInputEl.value=panelMessageInputEl.value.slice(0,panelMessageInputEl.value.length-snippet.length);panelMessageInputEl.value+=matchedRawCommand
;panelMessageInputEl.value+=String.fromCharCode(trailingSpaceKey);last=matchedRawCommand}else if(0===this.channelName.toLowerCase().indexOf(snippet.toLowerCase())){
panelMessageInputEl.value=panelMessageInputEl.value.slice(0,panelMessageInputEl.value.length-snippet.length);panelMessageInputEl.value+=this.channelCsName
;panelMessageInputEl.value+=String.fromCharCode(trailingSpaceKey);last=this.channelCsName}else if(0===window.globals.ircState.nickName.toLowerCase().indexOf(snippet.toLowerCase())){
panelMessageInputEl.value=panelMessageInputEl.value.slice(0,panelMessageInputEl.value.length-snippet.length);panelMessageInputEl.value+=window.globals.ircState.nickName
;panelMessageInputEl.value+=String.fromCharCode(trailingSpaceKey);last=window.globals.ircState.nickName}else{let completeNick=''
;const chanIndex=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase())
;if(chanIndex>=0)if(window.globals.ircState.channelStates[chanIndex].names.length>0)for(let i=0;i<window.globals.ircState.channelStates[chanIndex].names.length;i++){
let matchNick=window.globals.ircState.channelStates[chanIndex].names[i];if(nicknamePrefixChars.indexOf(matchNick.charAt(0))>=0)matchNick=matchNick.slice(1,matchNick.length)
;if(0===matchNick.toLowerCase().indexOf(snippet.toLowerCase()))completeNick=matchNick}if(completeNick.length>0){
panelMessageInputEl.value=panelMessageInputEl.value.slice(0,panelMessageInputEl.value.length-snippet.length);panelMessageInputEl.value+=completeNick
;panelMessageInputEl.value+=String.fromCharCode(trailingSpaceKey);last=completeNick}else panelMessageInputEl.value+=String.fromCharCode(trailingSpaceKey)}return last};_channelAutoComplete=e=>{
if(e.altKey&&!e.ctrlKey&&!e.shiftKey){if('KeyZ'===e.code)this._handleChannelZoomButtonElClick();if('KeyV'===e.code)this._handleBottomCollapseButton()}const autoCompleteSpaceKey=32
;const trailingSpaceKey=32;const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId');if(this.shadowRoot.getElementById('autocompleteCheckboxId').hasAttribute('disabled'))return
;if(!this.shadowRoot.getElementById('panelDivId').hasAttribute('auto-comp-enabled'))return;if(!e.code)return;if(e.code&&'Tab'===e.code){if(panelMessageInputEl.value.length<2){e.preventDefault();return
}let snippet='';const snippetArray=panelMessageInputEl.value.split(' ');if(snippetArray.length>0)snippet=snippetArray[snippetArray.length-1];if(snippet.length>0){
if('Tab'===e.code&&snippet.length>0)this._autoCompleteInputElement(snippet)}else{
if(panelMessageInputEl.value.toUpperCase()==='/PART '+this.channelName.toUpperCase()+' ')panelMessageInputEl.value+=window.globals.ircState.progName+' '+window.globals.ircState.progVersion;else if('/QUIT '===panelMessageInputEl.value.toUpperCase())panelMessageInputEl.value+=window.globals.ircState.progName+' '+window.globals.ircState.progVersion;else panelMessageInputEl.value+=this.channelCsName
;panelMessageInputEl.value+=String.fromCharCode(trailingSpaceKey)}e.preventDefault()}
if(e.code&&'Space'===e.code&&this.shadowRoot.getElementById('panelDivId').hasAttribute('brief-enabled'))if(panelMessageInputEl.value.length>0)if(panelMessageInputEl.value.charCodeAt(panelMessageInputEl.value.length-1)===autoCompleteSpaceKey)if(panelMessageInputEl.value.length>1&&panelMessageInputEl.value.charCodeAt(panelMessageInputEl.value.length-2)===autoCompleteSpaceKey){
panelMessageInputEl.value=panelMessageInputEl.value.slice(0,panelMessageInputEl.value.length-1)
;if(panelMessageInputEl.value.toUpperCase()==='/PART '+this.channelName.toUpperCase()+' ')panelMessageInputEl.value+=window.globals.ircState.progName+' '+window.globals.ircState.progVersion;else if('/QUIT '===panelMessageInputEl.value.toUpperCase())panelMessageInputEl.value+=window.globals.ircState.progName+' '+window.globals.ircState.progVersion;else panelMessageInputEl.value+=this.channelCsName
;panelMessageInputEl.value+=String.fromCharCode(trailingSpaceKey);e.preventDefault()}else{panelMessageInputEl.value=panelMessageInputEl.value.slice(0,panelMessageInputEl.value.length-1);let snippet=''
;const snippetArray=panelMessageInputEl.value.split(' ');if(snippetArray.length>0)snippet=snippetArray[snippetArray.length-1];if(snippet.length>0){
const matchStr=this._autoCompleteInputElement(snippet);if(this.lastAutoCompleteMatch!==matchStr){this.lastAutoCompleteMatch=matchStr;e.preventDefault()}
}else panelMessageInputEl.value+=String.fromCharCode(autoCompleteSpaceKey)}};_updateNickList=()=>{const panelNickListEl=this.shadowRoot.getElementById('panelNickListId')
;const index=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());if(index>=0){this.maxNickLength=0;if(window.globals.ircState.channelStates[index].names.length>0){
panelNickListEl.value='';const opList=[];const otherList=[]
;for(let i=0;i<window.globals.ircState.channelStates[index].names.length;i++)if('@'===window.globals.ircState.channelStates[index].names[i].charAt(0))opList.push(window.globals.ircState.channelStates[index].names[i]);else otherList.push(window.globals.ircState.channelStates[index].names[i])
;const sortedOpList=opList.sort();const sortedOtherList=otherList.sort();if(sortedOpList.length>0)for(let i=0;i<sortedOpList.length;i++){panelNickListEl.value+=sortedOpList[i]+'\n'
;if(this.maxNickLength<sortedOpList[i].length)this.maxNickLength=sortedOpList[i].length}if(sortedOtherList.length>0)for(let i=0;i<sortedOtherList.length;i++){
panelNickListEl.value+=sortedOtherList[i]+'\n';if(this.maxNickLength<sortedOtherList[i].length)this.maxNickLength=sortedOtherList[i].length}}}};_updateChannelTitle=()=>{
const titleStr=this.channelCsName;let nickCount=0;const index=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());if(index>=0){
if(window.globals.ircState.channelStates[index].kicked)this.shadowRoot.getElementById('beenKickedIconId').removeAttribute('hidden');else{
this.shadowRoot.getElementById('beenKickedIconId').setAttribute('hidden','');nickCount=window.globals.ircState.channelStates[index].names.length}
this.shadowRoot.getElementById('channelNameDivId').textContent=this.channelCsName}this.shadowRoot.getElementById('channelNameDivId').textContent=titleStr
;this.shadowRoot.getElementById('nickCountIconId').textContent=nickCount.toString()};_isNickInChannel=(nickString,channelString)=>{
const nicknamePrefixChars=document.getElementById('globVars').constants('nicknamePrefixChars');if(!nickString||0===nickString.length)return false
;if(0===window.globals.ircState.channels.length)return false;let channelIndex=-1
;for(let i=0;i<window.globals.ircState.channels.length;i++)if(channelString.toLowerCase()===window.globals.ircState.channels[i].toLowerCase())channelIndex=i;if(channelIndex<0)return false
;if(0===window.globals.ircState.channelStates[channelIndex].names.length)return false;let pureNick=nickString.toLowerCase()
;if(nicknamePrefixChars.indexOf(pureNick.charAt(0))>=0)pureNick=pureNick.slice(1,pureNick.length);let present=false;for(let i=0;i<window.globals.ircState.channelStates[channelIndex].names.length;i++){
let checkNick=window.globals.ircState.channelStates[channelIndex].names[i].toLowerCase();if(nicknamePrefixChars.indexOf(checkNick.charAt(0))>=0)checkNick=checkNick.slice(1,checkNick.length)
;if(checkNick===pureNick)present=true}return present};_handlePanelClick=()=>{this._resetMessageCount()};_incUnreadWhenOther=()=>{
if((document.activeElement.id!==this.id||!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')||!this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))&&!window.globals.webState.cacheReloadInProgress&&0===this.activityIconInhibitTimer)this._incrementMessageCount()
};_displayWhenHidden=()=>{
if(!window.globals.webState.cacheReloadInProgress&&!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')&&!document.querySelector('body').hasAttribute('zoomId'))this.showPanel()
};displayChannelMessage=parsedMessage=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId')
;const nickChannelSpacer=document.getElementById('globVars').constants('nickChannelSpacer');const _addText=(timestamp,nick,text)=>{let out='';if(panelDivEl.hasAttribute('brief-enabled')){
out=timestamp+' ';if('*'===nick)out+=nick+nickChannelSpacer;else out+=nick+nickChannelSpacer+'\n';out+=document.getElementById('displayUtils').cleanFormatting(text)+'\n\n'
}else out=timestamp+' '+nick.padStart(this.maxNickLength,' ')+nickChannelSpacer+document.getElementById('displayUtils').cleanFormatting(text)+'\n';panelMessageDisplayEl.value+=out
;if(!window.globals.webState.cacheReloadInProgress&&false===this.shadowRoot.getElementById('noScrollCheckboxId').checked)this._scrollTextAreaToRecent()}
;if(parsedMessage.params[0].toLowerCase()===this.channelName.toLowerCase())if(panelDivEl.getAttribute('lastDate')!==parsedMessage.datestamp){panelDivEl.setAttribute('lastDate',parsedMessage.datestamp)
;panelMessageDisplayEl.value+='\n=== '+parsedMessage.datestamp+' ===\n\n'}switch(parsedMessage.command){case'324':
if('params'in parsedMessage&&parsedMessage.params.length>0&&parsedMessage.params[1].toLowerCase()===this.channelName.toLowerCase()){let modeList='Mode ';modeList+=parsedMessage.params[1]
;if(parsedMessage.params.length>1)modeList+=' '+parsedMessage.params[2];_addText(parsedMessage.timestamp,'*',modeList);this.showAndScrollPanel()}break;case'329':
if('params'in parsedMessage&&parsedMessage.params.length>0&&parsedMessage.params[1].toLowerCase()===this.channelName.toLowerCase()){let created='Channel '
;created+=parsedMessage.params[1]+' created on ';if(parsedMessage.params.length>1){const createdDate=new Date(1e3*parseInt(parsedMessage.params[2]));created+=createdDate.toLocaleString()}
_addText(parsedMessage.timestamp,'*',created)}break;case'367':if('params'in parsedMessage&&parsedMessage.params.length>0&&parsedMessage.params[1].toLowerCase()===this.channelName.toLowerCase()){
let banList='';if(parsedMessage.params.length>1)banList+=' '+parsedMessage.params[2];if(parsedMessage.params.length>2)banList+=' banned by '+parsedMessage.params[3];if(parsedMessage.params.length>3){
const banDate=new Date(1e3*parseInt(parsedMessage.params[4]));banList+=' on '+banDate.toLocaleString()}_addText(parsedMessage.timestamp,'*',banList)}break;case'368':
if('params'in parsedMessage&&parsedMessage.params.length>0&&parsedMessage.params[1].toLowerCase()===this.channelName.toLowerCase()){let banList=''
;if(parsedMessage.params.length>1)banList+=' '+parsedMessage.params[2];_addText(parsedMessage.timestamp,'*',banList)}break;case'KICK':
if(parsedMessage.params[0].toLowerCase()===this.channelName.toLowerCase()){let reason=' ';if(parsedMessage.params[2])reason=parsedMessage.params[2]
;if(panelDivEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has kicked '+parsedMessage.params[1]);else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has kicked '+parsedMessage.params[1]+' ('+reason+')')
;if(panelDivEl.hasAttribute('beep1-enabled')&&!window.globals.webState.cacheReloadInProgress)document.getElementById('beepSounds').playBeep1Sound();this._incUnreadWhenOther();this._displayWhenHidden()
}break;case'JOIN':if(parsedMessage.params[0].toLowerCase()===this.channelName.toLowerCase()){
if(panelDivEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has joined');else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' ('+parsedMessage.host+') has joined')
;if(panelDivEl.hasAttribute('beep2-enabled')&&!window.globals.webState.cacheReloadInProgress)document.getElementById('beepSounds').playBeep1Sound();this._incUnreadWhenOther();this._displayWhenHidden()
}break;case'MODE':if(parsedMessage.params[0].toLowerCase()===this.channelName.toLowerCase())if(parsedMessage.nick){
_addText(parsedMessage.timestamp,'*','Mode '+JSON.stringify(parsedMessage.params)+' by '+parsedMessage.nick);this.showAndScrollPanel()
}else _addText(parsedMessage.timestamp,'*','Mode '+JSON.stringify(parsedMessage.params)+' by '+parsedMessage.prefix);break;case'cachedNICK':
if(this.channelName.toLowerCase()===parsedMessage.params[0].toLowerCase())_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' is now known as '+parsedMessage.params[1]);break;case'NICK':{
let present=false;if(this._isNickInChannel(parsedMessage.nick,this.channelName.toLowerCase()))present=true;if(this._isNickInChannel(parsedMessage.params[0],this.channelName.toLowerCase()))present=true
;if(present)_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' is now known as '+parsedMessage.params[0])}break;case'NOTICE':
if(parsedMessage.params[0].toLowerCase()===this.channelName.toLowerCase()){
_addText(parsedMessage.timestamp,'*','Notice('+parsedMessage.nick+' to '+parsedMessage.params[0]+') '+parsedMessage.params[1])
;if(panelDivEl.hasAttribute('beep1-enabled')&&!window.globals.webState.cacheReloadInProgress)document.getElementById('beepSounds').playBeep1Sound();this._incUnreadWhenOther();this._displayWhenHidden()
}break;case'PART':if(parsedMessage.params[0].toLowerCase()===this.channelName.toLowerCase()){let reason=' ';if(parsedMessage.params[1])reason=parsedMessage.params[1]
;if(panelDivEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has left');else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' ('+parsedMessage.host+') has left '+'('+reason+')')
}break;case'PRIVMSG':if(parsedMessage.params[0].toLowerCase()===this.channelName.toLowerCase()){_addText(parsedMessage.timestamp,parsedMessage.nick,parsedMessage.params[1])
;if(panelDivEl.hasAttribute('beep1-enabled')&&!window.globals.webState.cacheReloadInProgress)document.getElementById('beepSounds').playBeep1Sound();if(panelDivEl.hasAttribute('beep3-enabled')){
const checkLine=parsedMessage.params[1].toLowerCase()
;if(checkLine.indexOf(window.globals.ircState.nickName.toLowerCase())>=0&&!window.globals.webState.cacheReloadInProgress)setTimeout(document.getElementById('beepSounds').playBeep2Sound,250)}
this._incUnreadWhenOther();this._displayWhenHidden()}break;case'cachedQUIT':if(parsedMessage.params[0].toLowerCase()===this.channelName.toLowerCase()){let reason=' '
;if(parsedMessage.params[1])reason=parsedMessage.params[1]
;if(panelDivEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has quit');else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' ('+parsedMessage.host+') has quit '+'('+reason+')')
}break;case'QUIT':if(this._isNickInChannel(parsedMessage.nick,this.channelName.toLowerCase())){let reason=' ';if(parsedMessage.params[0])reason=parsedMessage.params[0]
;if(panelDivEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has quit');else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' ('+parsedMessage.host+') has quit '+'('+reason+')')
}break;case'TOPIC':if(parsedMessage.params[0].toLowerCase()===this.channelName.toLowerCase()){const newTopic=parsedMessage.params[1]
;if(null==newTopic)_addText(parsedMessage.timestamp,'*','Topic for '+parsedMessage.params[0]+' has been unset by "'+parsedMessage.nick);else _addText(parsedMessage.timestamp,'*','Topic for '+parsedMessage.params[0]+' changed to "'+newTopic+'" by '+parsedMessage.nick)
;if(panelDivEl.hasAttribute('beep1-enabled')&&!window.globals.webState.cacheReloadInProgress)document.getElementById('beepSounds').playBeep1Sound();this._incUnreadWhenOther();this._displayWhenHidden()
}break;default:}};_handleEraseBeforeReload=()=>{this.shadowRoot.getElementById('panelMessageDisplayId').value='';this.shadowRoot.getElementById('panelMessageInputId').value=''
;this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate','0000-00-00')};_handleCacheReloadDone=event=>{let markerString='';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp);if(timestampString)markerString+=timestampString
;markerString+=' '+document.getElementById('globVars').constants('cacheReloadString')+'\n';if(this.shadowRoot.getElementById('panelDivId').hasAttribute('brief-enabled'))markerString+='\n'
;this.shadowRoot.getElementById('panelMessageDisplayId').value+=markerString;if(false===this.shadowRoot.getElementById('noScrollCheckboxId').checked)this._scrollTextAreaToRecent()
;if(this.webSocketFirstConnect){this.webConnectedLast=false;this.collapsePanel()}else{const now=Math.floor(Date.now()/1e3);const websocketConnectTime=now-window.globals.webState.times.webConnect
;if(websocketConnectTime<5&&this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))this.collapsePanel()}};_handleWebConnectChanged=()=>{
if(window.globals.webState.webConnected!==this.webConnectedLast){this.webConnectedLast=window.globals.webState.webConnected;if(!window.globals.webState.webConnected)this.webSocketFirstConnect=true}}
;_handleCacheReloadError=event=>{let errorString='\n';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=document.getElementById('displayUtils').unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString
;errorString+=' '+document.getElementById('globVars').constants('cacheErrorString')+'\n\n';this.shadowRoot.getElementById('panelMessageDisplayId').value=errorString}
;_adjustTextareaWidthDynamically=()=>{if(this.inhibitDynamicResize)return;const panelNickListEl=this.shadowRoot.getElementById('panelNickListId')
;const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');const mar1=window.globals.webState.dynamic.commonMarginRightPx
;const mar2=window.globals.webState.dynamic.commonMarginRightPx+5+window.globals.webState.dynamic.sendButtonWidthPx+window.globals.webState.dynamic.collapseButtonWidthPx
;const nicknameListPixelWidth=window.globals.webState.dynamic.textAreaPaddingPxWidth+this.channelNamesCharWidth*window.globals.webState.dynamic.testAreaColumnPxWidth
;const mar3=window.globals.webState.dynamic.commonMarginRightPx+nicknameListPixelWidth+6;if(window.globals.webState.dynamic.panelPxWidth>this.mobileBreakpointPx){
panelMessageDisplayEl.setAttribute('cols',document.getElementById('displayUtils').calcInputAreaColSize(mar3));panelNickListEl.removeAttribute('hidden')}else{
panelMessageDisplayEl.setAttribute('cols',document.getElementById('displayUtils').calcInputAreaColSize(mar1))
;if(this.shadowRoot.getElementById('panelDivId').hasAttribute('zoom'))panelNickListEl.setAttribute('hidden','');else panelNickListEl.removeAttribute('hidden')}
this.shadowRoot.getElementById('panelMessageInputId').setAttribute('cols',document.getElementById('displayUtils').calcInputAreaColSize(mar2));const bodyEl=document.querySelector('body')
;if(bodyEl.hasAttribute('zoomId')&&bodyEl.getAttribute('zoomId')==='channel:'+this.channelName.toLowerCase()){this.inhibitDynamicResize=true
;const panelNickListEl=this.shadowRoot.getElementById('panelNickListId');const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId')
;if(window.globals.webState.dynamic.textAreaRowPxHeight&&'number'===typeof window.globals.webState.dynamic.textAreaRowPxHeight&&window.globals.webState.dynamic.textAreaRowPxHeight>1&&window.globals.webState.dynamic.textareaPaddingPxHeight&&'number'===typeof window.globals.webState.dynamic.textareaPaddingPxHeight&&window.globals.webState.dynamic.textareaPaddingPxHeight>1){
let rows=window.globals.webState.dynamic.panelPxHeight-window.globals.webState.dynamic.textareaPaddingPxHeight-this.verticalZoomMarginPixels
;rows=parseInt(rows/window.globals.webState.dynamic.textAreaRowPxHeight)
;if(window.globals.webState.dynamic.panelPxWidth>this.mobileBreakpointPx)panelNickListEl.removeAttribute('hidden');else panelNickListEl.setAttribute('hidden','')
;panelMessageDisplayEl.setAttribute('rows',rows);panelNickListEl.setAttribute('rows',rows)}}};_handleResizeCustomElements=()=>{
if(window.globals.webState.dynamic.testAreaColumnPxWidth)this._adjustTextareaWidthDynamically()};_handleColorThemeChanged=event=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId')
;const nickCountIconEl=this.shadowRoot.getElementById('nickCountIconId');const messageCountIconIdEl=this.shadowRoot.getElementById('messageCountIconId');if('light'===event.detail.theme){
panelDivEl.classList.remove('channel-panel-theme-dark');panelDivEl.classList.add('channel-panel-theme-light');nickCountIconEl.classList.remove('global-border-theme-dark')
;nickCountIconEl.classList.add('global-border-theme-light');messageCountIconIdEl.classList.remove('global-border-theme-dark');messageCountIconIdEl.classList.add('global-border-theme-light')}else{
panelDivEl.classList.remove('channel-panel-theme-light');panelDivEl.classList.add('channel-panel-theme-dark');nickCountIconEl.classList.remove('global-border-theme-light')
;nickCountIconEl.classList.add('global-border-theme-dark');messageCountIconIdEl.classList.remove('global-border-theme-light');messageCountIconIdEl.classList.add('global-border-theme-dark')}
let newTextTheme='global-text-theme-dark';let oldTextTheme='global-text-theme-light';if('light'===document.querySelector('body').getAttribute('theme')){newTextTheme='global-text-theme-light'
;oldTextTheme='global-text-theme-dark'}const textareaEls=Array.from(this.shadowRoot.querySelectorAll('textarea'));textareaEls.forEach(el=>{el.classList.remove(oldTextTheme)
;el.classList.add(newTextTheme)})};_removeSelfFromDOM=()=>{if(!this.elementExistsInDom)throw new Error('Error, Request to remove self from DOM after already removed.');this.elementExistsInDom=false
;const webStateChannelIndex=window.globals.webState.channels.indexOf(this.channelName.toLowerCase());if(webStateChannelIndex>=0){window.globals.webState.channels.splice(webStateChannelIndex,1)
;window.globals.webState.channelStates.splice(webStateChannelIndex,1)}this.shadowRoot.getElementById('autocompleteCheckboxId').removeEventListener('click',this._handleAutoCompleteCheckboxClick)
;this.shadowRoot.getElementById('beep1CheckBoxId').removeEventListener('click',this._handleChannelBeep1CBInputElClick)
;this.shadowRoot.getElementById('beep2CheckBoxId').removeEventListener('click',this._handleChannelBeep2CBInputElClick)
;this.shadowRoot.getElementById('beep3CheckBoxId').removeEventListener('click',this._handleChannelBeep3CBInputElClick)
;this.shadowRoot.getElementById('bottomCollapseButtonId').removeEventListener('click',this._handleBottomCollapseButton)
;this.shadowRoot.getElementById('briefCheckboxId').removeEventListener('click',this._handleBriefCheckboxClick)
;this.shadowRoot.getElementById('clearButtonId').removeEventListener('click',this._handleClearButton)
;this.shadowRoot.getElementById('closePanelButtonId').removeEventListener('click',this._handleCloseButton)
;this.shadowRoot.getElementById('collapsePanelButtonId').removeEventListener('click',this._handleCollapseButton)
;this.shadowRoot.getElementById('joinButtonId').removeEventListener('click',this._handleChannelJoinButtonElClick)
;this.shadowRoot.getElementById('multiLineSendButtonId').removeEventListener('click',this._handleMultiLineSendButtonClick)
;this.shadowRoot.getElementById('normalButtonId').removeEventListener('click',this._handleNormalButton);this.shadowRoot.getElementById('panelDivId').removeEventListener('click',this._handlePanelClick)
;this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('keydown',this._channelAutoComplete,false)
;this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('paste',this._handleChannelInputAreaElPaste)
;this.shadowRoot.getElementById('partButtonId').removeEventListener('click',this._handleChannelPartButtonElClick)
;this.shadowRoot.getElementById('pruneButtonId').removeEventListener('click',this._handleChannelPruneButtonElClick)
;this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('input',this._handleChannelInputAreaElInput)
;this.shadowRoot.getElementById('refreshButtonId').removeEventListener('click',this._handleRefreshButton)
;this.shadowRoot.getElementById('sendButtonId').removeEventListener('click',this._handleChannelSendButtonElClick)
;this.shadowRoot.getElementById('tallerButtonId').removeEventListener('click',this._handleTallerButton)
;this.shadowRoot.getElementById('zoomButtonId').removeEventListener('click',this._handleChannelZoomButtonElClick);document.removeEventListener('cache-reload-done',this._handleCacheReloadDone)
;document.removeEventListener('cache-reload-error',this._handleCacheReloadError);document.removeEventListener('cancel-beep-sounds',this._handleCancelBeepSounds)
;document.removeEventListener('cancel-zoom',this._handleCancelZoomEvent);document.removeEventListener('collapse-all-panels',this._handleCollapseAllPanels)
;document.removeEventListener('color-theme-changed',this._handleColorThemeChanged);document.removeEventListener('erase-before-reload',this._handleEraseBeforeReload)
;document.removeEventListener('hide-all-panels',this._handleHideAllPanels);document.removeEventListener('irc-state-changed',this._handleIrcStateChanged)
;document.removeEventListener('resize-custom-elements',this._handleResizeCustomElements);document.removeEventListener('show-all-panels',this._handleShowAllPanels)
;document.removeEventListener('web-connect-changed',this._handleWebConnectChanged);const parentEl=document.getElementById('channelsContainerId')
;const childEl=document.getElementById('channel:'+this.channelName.toLowerCase());if(parentEl.contains(childEl))parentEl.removeChild(childEl)};_handleIrcStateChanged=()=>{
if(!this.elementExistsInDom)throw new Error('Calling irc-state-changed after channel element was destroyed.');this.channelIndex=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase())
;const ircStateIndex=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());const webStateIndex=window.globals.webState.channels.indexOf(this.channelName.toLowerCase())
;if(window.globals.ircState.ircConnected&&ircStateIndex<0&&webStateIndex>=0)this._removeSelfFromDOM();else if(!window.globals.ircState.ircConnected)this._removeSelfFromDOM();else if(window.globals.ircState.ircConnected){
if(null==window.globals.ircState.channelStates[this.channelIndex].topic)this.shadowRoot.getElementById('channelTopicDivId').textContent='';else this.shadowRoot.getElementById('channelTopicDivId').textContent=document.getElementById('displayUtils').cleanFormatting(window.globals.ircState.channelStates[this.channelIndex].topic)
;this._updateNickList();this._updateChannelTitle();this._updateVisibility()}};_handleCollapseAllPanels=event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){
if(event.detail.except!==this.id)this.collapsePanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()}
;_handleHideAllPanels=event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()};_handleShowAllPanels=event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.showPanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.showPanel()
}else this.showPanel()};_setFixedElementTitles=()=>{this.shadowRoot.getElementById('beenKickedIconId').title='Your nickname has been kicked from this IRC channel, use Join button to return'
;this.shadowRoot.getElementById('notInChannelIconId').title='Your nickname is not present thin this IRC channel, use Join button to return'
;this.shadowRoot.getElementById('nickCountIconId').title='Count of nicknames present in this channel'
;this.shadowRoot.getElementById('messageCountIconId').title='Count of unread messages for this channel'
;this.shadowRoot.getElementById('joinButtonId').title='Send /JOIN command to IRC server to re-join this channel'
;this.shadowRoot.getElementById('pruneButtonId').title='Delete this panel and remove all related messages from remote message cache'
;this.shadowRoot.getElementById('partButtonId').title='Send /PART command to IRC server to leave this channel. Panel remains visible'
;this.shadowRoot.getElementById('zoomButtonId').title='Block other panels from opening. Expand textarea to fill browser viewport.'
;this.shadowRoot.getElementById('panelMessageInputId').title='Channel message input area. IRC commands starting with / are accepted'
;this.shadowRoot.getElementById('sendButtonId').title='Send channel message or IRC command to IRC server'
;this.shadowRoot.getElementById('bottomCollapseButtonId').title='Show more options for this panel'
;this.shadowRoot.getElementById('multiLineSendButtonId').title='Using timer, send multi-line message one line at a time'
;this.shadowRoot.getElementById('refreshButtonId').title='Refresh from IRC message cache';this.shadowRoot.getElementById('clearButtonId').title='Clear Text Area (Does not clear cache)'
;this.shadowRoot.getElementById('tallerButtonId').title='Enlarge Channel Text Area Vertically';this.shadowRoot.getElementById('normalButtonId').title='Restore Channel Area to default size'
;this.shadowRoot.getElementById('noScrollCheckboxId').title='To allow scroll back to copy older messages to clipboard. '+'Scroll textarea to new messages is inhibited.'
;this.shadowRoot.getElementById('briefCheckboxId').title='Optimize message format to fit mobile device narrow screen'
;this.shadowRoot.getElementById('autocompleteCheckboxId').title='Enable with trigger (tab) or (space-space) on mobile, '+'disable if space character conflict with input'
;this.shadowRoot.getElementById('beep1CheckBoxId').title='Enable audio beep sound for each incoming message'
;this.shadowRoot.getElementById('beep2CheckBoxId').title='Enable audio beep sound when new nickname joins channel'
;this.shadowRoot.getElementById('beep3CheckBoxId').title='Enable audio beep sound when your own nickname is identified in text'};timerTickHandler=()=>{
if(this.activityIconInhibitTimer>0)this.activityIconInhibitTimer--};initializePlugin=()=>{const manageChannelsPanelEl=document.getElementById('manageChannelsPanel')
;if(window.globals.webState.channels.indexOf(this.channelName.toLowerCase())>=0)throw new Error('createChannelEl: channel already exist')
;window.globals.webState.channels.push(this.channelName.toLowerCase());this.initIrcStateIndex=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase())
;window.globals.webState.channelStates.push({lastJoined:window.globals.ircState.channelStates[this.initIrcStateIndex].joined})
;this.channelIndex=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());this._setFixedElementTitles()
;this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate','0000-00-00');this.shadowRoot.getElementById('channelNameDivId').textContent=this.channelCsName
;if(null==window.globals.ircState.channelStates[this.channelIndex].topic)this.shadowRoot.getElementById('channelTopicDivId').textContent='';else this.shadowRoot.getElementById('channelTopicDivId').textContent=document.getElementById('displayUtils').cleanFormatting(window.globals.ircState.channelStates[this.channelIndex].topic)
;this._loadBeepEnable();if(window.globals.webState.dynamic.panelPxWidth<this.mobileBreakpointPx){this.shadowRoot.getElementById('panelDivId').setAttribute('brief-enabled','')
;this.shadowRoot.getElementById('briefCheckboxId').checked=true}else{this.shadowRoot.getElementById('panelDivId').removeAttribute('brief-enabled')
;this.shadowRoot.getElementById('briefCheckboxId').checked=false}
if(window.InputEvent&&'function'===typeof InputEvent.prototype.getTargetRanges)this.shadowRoot.getElementById('panelDivId').setAttribute('auto-comp-enabled','');else{
this.shadowRoot.getElementById('panelDivId').setAttribute('auto-comp-enabled','');this.shadowRoot.getElementById('autocompleteCheckboxId').setAttribute('disabled','')}
const ircStateIndex=window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());if(window.globals.ircState.channelStates[ircStateIndex].joined){
this.shadowRoot.getElementById('notInChannelIconId').setAttribute('hidden','');this.shadowRoot.getElementById('joinButtonId').setAttribute('hidden','')
;this.shadowRoot.getElementById('pruneButtonId').setAttribute('hidden','');this.shadowRoot.getElementById('partButtonId').removeAttribute('hidden')}else{
this.shadowRoot.getElementById('notInChannelIconId').removeAttribute('hidden');this.shadowRoot.getElementById('joinButtonId').removeAttribute('hidden')
;this.shadowRoot.getElementById('pruneButtonId').removeAttribute('hidden');this.shadowRoot.getElementById('partButtonId').setAttribute('hidden','')}this._updateNickList();this._updateChannelTitle()
;this.shadowRoot.getElementById('panelNickListId').setAttribute('cols',this.channelNamesCharWidth.toString())
;this.shadowRoot.getElementById('panelNickListId').setAttribute('rows',this.textareaHeightInRows);this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows',this.textareaHeightInRows)
;this.activityIconInhibitTimer=0;document.dispatchEvent(new CustomEvent('debounced-update-from-cache'));this._handleColorThemeChanged({detail:{
theme:document.querySelector('body').getAttribute('theme')}});const pendingJoinChannelIndex=manageChannelsPanelEl.ircChannelsPendingJoin.indexOf(this.channelName.toLowerCase())
;if(pendingJoinChannelIndex>=0){manageChannelsPanelEl.ircChannelsPendingJoin.splice(pendingJoinChannelIndex,1);this.showPanel()}else this.collapsePanel();this._updateVisibility()
;this.webConnectedLast=true;this.webSocketFirstConnect=false;this._adjustTextareaWidthDynamically();setTimeout(this._adjustTextareaWidthDynamically.bind(this),100)};connectedCallback(){
this.shadowRoot.getElementById('autocompleteCheckboxId').addEventListener('click',this._handleAutoCompleteCheckboxClick)
;this.shadowRoot.getElementById('beep1CheckBoxId').addEventListener('click',this._handleChannelBeep1CBInputElClick)
;this.shadowRoot.getElementById('beep2CheckBoxId').addEventListener('click',this._handleChannelBeep2CBInputElClick)
;this.shadowRoot.getElementById('beep3CheckBoxId').addEventListener('click',this._handleChannelBeep3CBInputElClick)
;this.shadowRoot.getElementById('bottomCollapseButtonId').addEventListener('click',this._handleBottomCollapseButton)
;this.shadowRoot.getElementById('briefCheckboxId').addEventListener('click',this._handleBriefCheckboxClick)
;this.shadowRoot.getElementById('clearButtonId').addEventListener('click',this._handleClearButton)
;this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click',this._handleCollapseButton)
;this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',this._handleCloseButton)
;this.shadowRoot.getElementById('joinButtonId').addEventListener('click',this._handleChannelJoinButtonElClick)
;this.shadowRoot.getElementById('multiLineSendButtonId').addEventListener('click',this._handleMultiLineSendButtonClick)
;this.shadowRoot.getElementById('normalButtonId').addEventListener('click',this._handleNormalButton);this.shadowRoot.getElementById('panelDivId').addEventListener('click',this._handlePanelClick)
;this.shadowRoot.getElementById('panelMessageInputId').addEventListener('input',this._handleChannelInputAreaElInput)
;this.shadowRoot.getElementById('panelMessageInputId').addEventListener('keydown',this._channelAutoComplete,false)
;this.shadowRoot.getElementById('panelMessageInputId').addEventListener('paste',this._handleChannelInputAreaElPaste)
;this.shadowRoot.getElementById('partButtonId').addEventListener('click',this._handleChannelPartButtonElClick)
;this.shadowRoot.getElementById('pruneButtonId').addEventListener('click',this._handleChannelPruneButtonElClick)
;this.shadowRoot.getElementById('refreshButtonId').addEventListener('click',this._handleRefreshButton)
;this.shadowRoot.getElementById('sendButtonId').addEventListener('click',this._handleChannelSendButtonElClick)
;this.shadowRoot.getElementById('tallerButtonId').addEventListener('click',this._handleTallerButton)
;this.shadowRoot.getElementById('zoomButtonId').addEventListener('click',this._handleChannelZoomButtonElClick);document.addEventListener('cache-reload-done',this._handleCacheReloadDone)
;document.addEventListener('cache-reload-error',this._handleCacheReloadError);document.addEventListener('cancel-beep-sounds',this._handleCancelBeepSounds)
;document.addEventListener('cancel-zoom',this._handleCancelZoomEvent);document.addEventListener('collapse-all-panels',this._handleCollapseAllPanels)
;document.addEventListener('color-theme-changed',this._handleColorThemeChanged);document.addEventListener('erase-before-reload',this._handleEraseBeforeReload)
;document.addEventListener('hide-all-panels',this._handleHideAllPanels);document.addEventListener('irc-state-changed',this._handleIrcStateChanged)
;document.addEventListener('resize-custom-elements',this._handleResizeCustomElements);document.addEventListener('show-all-panels',this._handleShowAllPanels)
;document.addEventListener('web-connect-changed',this._handleWebConnectChanged)}});window.customElements.define('debug-panel',class extends HTMLElement{constructor(){super()
;const template=document.getElementById('debugPanelTemplate');const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))}_scrollToTop=()=>{
this.focus();const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');document.dispatchEvent(new CustomEvent('cancel-zoom'));this._scrollToTop()};collapsePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;appendDebugResult=formattedText=>{this.shadowRoot.getElementById('debugResponseSectionId').removeAttribute('hidden');this.shadowRoot.getElementById('debugResponsePreId').textContent+=formattedText}
;clearDebugResult=()=>{this.shadowRoot.getElementById('debugResponseSectionId').setAttribute('hidden','');this.shadowRoot.getElementById('debugResponsePreId').textContent=''};_test1ButtonHandler=()=>{
console.log('Test1 button pressed.');this.appendDebugResult('Memory Usage\nNodeJs garbage collect response\n');const fetchController=new AbortController;const fetchOptions={method:'GET',
redirect:'error',signal:fetchController.signal,headers:{Accept:'application/json'}};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/test1'
;const fetchTimerId=setTimeout(()=>fetchController.abort(),5e3);fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else return response.text().then(remoteErrorText=>{
const err=new Error('HTTP status error');err.status=response.status;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{
this.appendDebugResult(JSON.stringify(responseJson,null,2));console.log(JSON.stringify(responseJson,null,2));if(fetchTimerId)clearTimeout(fetchTimerId)
;if(responseJson.error)throw new Error(responseJson.error)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;console.error(message);message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})};_test2ButtonHandler=()=>{console.log('Test1 button pressed.')
;const fetchController=new AbortController;const fetchOptions={method:'GET',redirect:'error',signal:fetchController.signal,headers:{Accept:'application/json'}}
;const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/test2';const fetchTimerId=setTimeout(()=>fetchController.abort(),5e3);fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status;err.statusText=response.statusText
;err.remoteErrorText=remoteErrorText;throw err})}).then(responseJson=>{console.log(JSON.stringify(responseJson,null,2));if(fetchTimerId)clearTimeout(fetchTimerId)
;if(responseJson.error)throw new Error(responseJson.error)}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;console.error(message);message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})};_test3ButtonHandler=()=>{this.clearDebugResult();console.log('Test3 button pressed.')
;this.appendDebugResult('Websocket Ping\n');console.log('Echo request GET /irc/test3');window.globals.startTimeMsTest3=Date.now();const fetchController=new AbortController;const fetchOptions={
method:'GET',redirect:'error',signal:fetchController.signal,headers:{Accept:'application/json'}};const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/test3'
;const fetchTimerId=setTimeout(()=>fetchController.abort(),5e3);fetch(fetchURL,fetchOptions).then(response=>{if(201===response.status){const pong1=Date.now()-window.globals.startTimeMsTest3
;this.appendDebugResult('Fetch response:     '+pong1.toString()+' ms\n');console.log('Fetch response:  '+pong1.toString()+' ms');if(fetchTimerId)clearTimeout(fetchTimerId)
}else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error');err.status=response.status;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err
})}).catch(err=>{if(fetchTimerId)clearTimeout(fetchTimerId);let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;console.error(message);message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})};_test4ButtonHandler=()=>{console.log('Test 3 button: expire heart beat timer')
;setTimeout(()=>{const websocketPanelEl=document.getElementById('websocketPanel');websocketPanelEl.heartbeatUpCounter=websocketPanelEl.heartbeatExpirationTimeSeconds-1},2e3)};connectedCallback(){
if('#DEBUG'===document.location.hash){this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');console.log('Debug: Detected URL hash=#DEBUG. Opened Debug panel at page load.')
}this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')})
;this.shadowRoot.getElementById('forceDisconnectButtonId').addEventListener('click',()=>{document.getElementById('ircControlsPanel').forceDisconnectHandler().catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})})
;this.shadowRoot.getElementById('eraseCacheButtonId').addEventListener('click',()=>{document.getElementById('ircControlsPanel').eraseIrcCache('CACHE').catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})})
;this.shadowRoot.getElementById('serverTerminateButtonId').addEventListener('click',()=>{document.getElementById('ircControlsPanel').webServerTerminate().catch(err=>{console.log(err)
;let message=err.message||err.toString()||'Error occurred calling /irc/connect';message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})})
;document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('hide-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('show-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()}else if(event.detail&&event.detail.debug)this.showPanel()})
;this.shadowRoot.getElementById('button_1_1').addEventListener('click',()=>{this._test2ButtonHandler()});this.shadowRoot.getElementById('button_1_2').addEventListener('click',()=>{
this._test4ButtonHandler()});this.shadowRoot.getElementById('button_1_3').addEventListener('click',()=>{this._test1ButtonHandler()})
;this.shadowRoot.getElementById('button_1_4').addEventListener('click',()=>{this._test3ButtonHandler()});this.shadowRoot.getElementById('button_2_1').addEventListener('click',()=>{
document.dispatchEvent(new CustomEvent('show-all-panels',{detail:{except:[],debug:true}}))});this.shadowRoot.getElementById('button_2_2').addEventListener('click',()=>{
document.getElementById('activitySpinner').requestActivitySpinner();document.getElementById('headerBar').setHeaderBarIcons({hideNavMenu:false,webConnect:'connected',ircConnect:'connected',wait:true,
zoom:true,away:true,serverUnread:true,channelUnread:true,privMsgUnread:true,noticeUnread:true,wallopsUnread:true,nickRecovery:true,enableAudio:true})
;document.getElementById('headerBar')._updateDynamicElementTitles()});this.shadowRoot.getElementById('button_2_3').addEventListener('click',()=>{
document.getElementById('displayUtils').toggleColorTheme()});this.shadowRoot.getElementById('button_2_4').addEventListener('click',()=>{document.getElementById('displayUtils').manualRecalcPageWidth()
});this.shadowRoot.getElementById('button_3_1').addEventListener('click',()=>{document.getElementById('showIrcState').showPanel()})
;this.shadowRoot.getElementById('button_3_2').addEventListener('click',()=>{document.getElementById('showWebState').showPanel()})
;this.shadowRoot.getElementById('button_3_3').addEventListener('click',()=>{document.getElementById('showRaw').showPanel()});this.shadowRoot.getElementById('button_3_4').addEventListener('click',()=>{
document.getElementById('showEvents').showPanel()});this.shadowRoot.getElementById('button_4_1').addEventListener('click',()=>{document.getElementById('ircControlsPanel').getIrcState().catch(()=>{})})
;this.shadowRoot.getElementById('button_4_2').addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('update-from-cache'))})
;this.shadowRoot.getElementById('button_4_3').addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('irc-state-changed'))})
;this.shadowRoot.getElementById('button_4_4').addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('web-connect-changed'))})
;this.shadowRoot.getElementById('button_5_1').addEventListener('click',()=>{document.getElementById('beepSounds').testPlayBeepSound1()})
;this.shadowRoot.getElementById('button_5_2').addEventListener('click',()=>{document.getElementById('beepSounds').testPlayBeepSound2()})
;this.shadowRoot.getElementById('button_5_3').addEventListener('click',()=>{document.getElementById('beepSounds').testPlayBeepSound3()})
;this.shadowRoot.getElementById('button_6_1').addEventListener('click',()=>{console.log('Adhoc Function is not defined (debug-panel)');this.clearDebugResult()
;this.appendDebugResult('Adhoc function not defined\n')})}});window.customElements.define('show-raw',class extends HTMLElement{constructor(){super()
;const template=document.getElementById('showRawTemplate');const templateContent=template.content;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))}
_startCollectingRawMessages=()=>{this.shadowRoot.getElementById('pauseButtonId').textContent='Pause';this.shadowRoot.getElementById('titleDivId').textContent='Raw Server Messages'
;this.shadowRoot.getElementById('panelDivId').setAttribute('collecting','');this.shadowRoot.getElementById('panelMessageDisplayId').value+='----- Active -----\n'};_pauseCollectingRawMessages=()=>{
this.shadowRoot.getElementById('pauseButtonId').textContent='Start';this.shadowRoot.getElementById('titleDivId').textContent='Raw Server Messages (Paused)'
;this.shadowRoot.getElementById('panelDivId').removeAttribute('collecting');this.shadowRoot.getElementById('panelMessageDisplayId').value+='----- Paused -----\n'};_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this._scrollToTop()};collapsePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;displayRawIrcServerMessage=rawMessage=>{if(!window.globals.webState.cacheReloadInProgress)if(this.shadowRoot.getElementById('panelDivId').hasAttribute('collecting')){
this.shadowRoot.getElementById('panelMessageDisplayId').value+=rawMessage+'\n';if(this.shadowRoot.getElementById('showRawInHexCheckboxId').checked){
const uint8String=new TextEncoder('utf8').encode(rawMessage);let hexString='';for(let i=0;i<uint8String.length;i++)hexString+=uint8String[i].toString(16).padStart(2,'0')+' '
;this.shadowRoot.getElementById('panelMessageDisplayId').value+=hexString+'\n'}
this.shadowRoot.getElementById('panelMessageDisplayId').scrollTop=this.shadowRoot.getElementById('panelMessageDisplayId').scrollHeight}};displayParsedServerMessage=parsedMessage=>{
if(!window.globals.webState.cacheReloadInProgress&&this.shadowRoot.getElementById('panelDivId').hasAttribute('collecting')&&this.shadowRoot.getElementById('appendParsedMessageCheckboxId').checked){
this.shadowRoot.getElementById('panelMessageDisplayId').value+=JSON.stringify(parsedMessage,null,2)+'\n'
;this.shadowRoot.getElementById('panelMessageDisplayId').scrollTop=this.shadowRoot.getElementById('panelMessageDisplayId').scrollHeight}};connectedCallback(){if('#LOG_RAW'===document.location.hash){
this._startCollectingRawMessages();this.showPanel();document.getElementById('debugPanel').showPanel();console.log('Debug: Detected URL hash=#LOG_RAW. Enabled raw log before page initialization.')}
this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()});this.shadowRoot.getElementById('clearButtonId').addEventListener('click',()=>{
this.shadowRoot.getElementById('panelMessageDisplayId').value=''});this.shadowRoot.getElementById('bottomCollapseButtonId').addEventListener('click',()=>{
const bottomCollapseDivEl=this.shadowRoot.getElementById('bottomCollapseDivId');if(bottomCollapseDivEl.hasAttribute('hidden')){bottomCollapseDivEl.removeAttribute('hidden');this._scrollToTop()
}else bottomCollapseDivEl.setAttribute('hidden','')});this.shadowRoot.getElementById('showHelpButtonId').addEventListener('click',()=>{
const bottomCollapseDivEl=this.shadowRoot.getElementById('bottomCollapseDivId');const helpPanelEl=this.shadowRoot.getElementById('helpPanelId')
;const helpPanel2El=this.shadowRoot.getElementById('helpPanel2Id');if(helpPanelEl.hasAttribute('hidden')){bottomCollapseDivEl.removeAttribute('hidden');helpPanelEl.removeAttribute('hidden')
;helpPanel2El.removeAttribute('hidden');this._scrollToTop()}else{helpPanelEl.setAttribute('hidden','');helpPanel2El.setAttribute('hidden','')}})
;this.shadowRoot.getElementById('showHelpButton2Id').addEventListener('click',()=>{const bottomCollapseDivEl=this.shadowRoot.getElementById('bottomCollapseDivId')
;const helpPanelEl=this.shadowRoot.getElementById('helpPanelId');const helpPanel2El=this.shadowRoot.getElementById('helpPanel2Id');if(helpPanelEl.hasAttribute('hidden')){
bottomCollapseDivEl.removeAttribute('hidden');helpPanelEl.removeAttribute('hidden');helpPanel2El.removeAttribute('hidden');this._scrollToTop()}else{helpPanelEl.setAttribute('hidden','')
;helpPanel2El.setAttribute('hidden','')}});this.shadowRoot.getElementById('pauseButtonId').addEventListener('click',()=>{
if(this.shadowRoot.getElementById('panelDivId').hasAttribute('collecting'))this._pauseCollectingRawMessages();else this._startCollectingRawMessages()})
;this.shadowRoot.getElementById('cacheButtonId').addEventListener('click',()=>{const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');this._pauseCollectingRawMessages()
;panelMessageDisplayEl.value='';const fetchTimeout=document.getElementById('globVars').constants('fetchTimeout');const activitySpinnerEl=document.getElementById('activitySpinner')
;const fetchController=new AbortController;const fetchOptions={method:'GET',redirect:'error',signal:fetchController.signal,headers:{Accept:'application/json'}}
;const fetchURL=document.getElementById('globVars').webServerUrl+'/irc/cache';activitySpinnerEl.requestActivitySpinner();const fetchTimerId=setTimeout(()=>fetchController.abort(),fetchTimeout)
;fetch(fetchURL,fetchOptions).then(response=>{if(200===response.status)return response.json();else return response.text().then(remoteErrorText=>{const err=new Error('HTTP status error')
;err.status=response.status;err.statusText=response.statusText;err.remoteErrorText=remoteErrorText;throw err})}).then(responseArray=>{if(fetchTimerId)clearTimeout(fetchTimerId)
;activitySpinnerEl.cancelActivitySpinner();if(Array.isArray(responseArray)){let lineCount=0;let charCount=0;if(responseArray.length>1){const index=[]
;for(let i=0;i<responseArray.length;i++)index.push(i);for(let i=0;i<responseArray.length;i++){let inOrder=true;for(let j=0;j<responseArray.length-1;j++){
const date1=new Date(responseArray[index[j]].split(' ')[0].replace('@time=',''));const date2=new Date(responseArray[index[j+1]].split(' ')[0].replace('@time=',''));if(date1>date2){inOrder=false
;const tempIndex=index[j+1];index[j+1]=index[j];index[j]=tempIndex}}if(inOrder)break}for(let i=0;i<responseArray.length;i++){panelMessageDisplayEl.value+=responseArray[index[i]].toString()+'\n'
;lineCount++;charCount+=responseArray[index[i]].toString().length}
const statsStr='----------------------------\n'+charCount.toString()+' characters, '+lineCount.toString()+' lines\n'+'----------------------------\n'
;this.shadowRoot.getElementById('panelMessageDisplayId').value+=statsStr}else if(1===responseArray.length)panelMessageDisplayEl.value=responseArray[0]
;panelMessageDisplayEl.scrollTop=panelMessageDisplayEl.scrollHeight}}).catch(err=>{console.log(err);if(fetchTimerId)clearTimeout(fetchTimerId);activitySpinnerEl.cancelActivitySpinner()
;let message='Fetch error, '+fetchOptions.method+' '+fetchURL+', '+(err.message||err.toString()||'Error')
;if(err.status)message='HTTP status error, '+err.status.toString()+' '+err.statusText+', '+fetchOptions.method+' '+fetchURL;if(err.remoteErrorText)message+=', '+err.remoteErrorText
;message=message.split('\n')[0];document.getElementById('errorPanel').showError(message)})});this.shadowRoot.getElementById('exampleSampleMessageButtonId').addEventListener('click',()=>{
this.shadowRoot.getElementById('panelMessageInputId').value='@time=2023-09-08T14:53:41.504Z ERROR :This is example RFC-2812 formatted IRC '+'error message for display in IRC Server panel'})
;this.shadowRoot.getElementById('parseSampleMessageButtonId').addEventListener('click',()=>{const errorPanelEl=document.getElementById('errorPanel')
;const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId');if(!window.globals.ircState.ircConnected){
errorPanelEl.showError('Sample message parsing requires connection to IRC server');return}if(!panelMessageInputEl.value||panelMessageInputEl.value.length<1){
errorPanelEl.showError('Sample IRC message was empty string');return}if(1!==panelMessageInputEl.value.split('\n').length){
errorPanelEl.showError('Multi-line input not allowed. Omit end-of-line characters');return}if(this.shadowRoot.getElementById('panelDivId').hasAttribute('collecting')){
this.shadowRoot.getElementById('panelMessageDisplayId').value+=panelMessageInputEl.value+'\n'
;this.shadowRoot.getElementById('panelMessageDisplayId').scrollTop=this.shadowRoot.getElementById('panelMessageDisplayId').scrollHeight}
document.getElementById('remoteCommandParser').parseBufferMessage(panelMessageInputEl.value)});this.shadowRoot.getElementById('saveSampleMessageButtonId').addEventListener('click',()=>{
const panelMessageInputEl=this.shadowRoot.getElementById('panelMessageInputId')
;if(!panelMessageInputEl||panelMessageInputEl.value.length<1)window.localStorage.removeItem('savedExampleIrcMessage');else{const message=panelMessageInputEl.value
;window.localStorage.setItem('savedExampleIrcMessage',JSON.stringify({message:message}))}});this.shadowRoot.getElementById('loadSampleMessageButtonId').addEventListener('click',()=>{
let savedMessage=null;try{const savedObject=window.localStorage.getItem('savedExampleIrcMessage');if(savedObject)savedMessage=JSON.parse(savedObject).message}catch(error){console.log(error)}
if(savedMessage)this.shadowRoot.getElementById('panelMessageInputId').value=savedMessage});document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const panelMessageDisplayEd=this.shadowRoot.getElementById('panelMessageDisplayId');if('light'===event.detail.theme){
panelDivEl.classList.remove('show-raw-theme-dark');panelDivEl.classList.add('show-raw-theme-light');panelMessageDisplayEd.classList.remove('global-text-theme-dark')
;panelMessageDisplayEd.classList.add('global-text-theme-light')}else{panelDivEl.classList.remove('show-raw-theme-light');panelDivEl.classList.add('show-raw-theme-dark')
;panelMessageDisplayEd.classList.remove('global-text-theme-light');panelMessageDisplayEd.classList.add('global-text-theme-dark')}});document.addEventListener('hide-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('resize-custom-elements',()=>{
if(window.globals.webState.dynamic.testAreaColumnPxWidth){const calcInputAreaColSize=document.getElementById('displayUtils').calcInputAreaColSize
;const mar1=window.globals.webState.dynamic.commonMarginRightPx;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('cols',calcInputAreaColSize(mar1))
;this.shadowRoot.getElementById('panelMessageInputId').setAttribute('cols',calcInputAreaColSize(mar1))}});document.addEventListener('show-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()}else if(event.detail&&event.detail.debug)this.showPanel()})}})
;window.customElements.define('show-events',class extends HTMLElement{constructor(){super();const template=document.getElementById('showEventsTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true));this.loggingGlobalEvents=false}_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this._scrollToTop()};collapsePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;_startLogGlobalEvents=()=>{const panelMessageDisplayEl=this.shadowRoot.getElementById('panelMessageDisplayId');if(!this.loggingGlobalEvents){this.loggingGlobalEvents=true
;const eventList=['cache-reload-done','cache-reload-error','cancel-beep-sounds','cancel-zoom','collapse-all-panels','color-theme-changed','debounced-update-from-cache','erase-before-reload','global-scroll-to-top','hide-all-panels','irc-state-changed','irc-server-edit-open','resize-custom-elements','show-all-panels','update-channel-count','update-from-cache','web-connect-changed']
;panelMessageDisplayEl.textContent='Monitoring for the following events:\n';eventList.forEach(eventTag=>{panelMessageDisplayEl.textContent+='    '+eventTag+'\n'})
;panelMessageDisplayEl.textContent+='----------------------------------\n';eventList.forEach(eventTag=>{document.addEventListener(eventTag,event=>{const now=new Date
;panelMessageDisplayEl.textContent+=now.toISOString()+' '
;if(event.detail&&'string'===typeof event.detail)panelMessageDisplayEl.textContent+='Event: '+eventTag+' '+event.detail+'\n';else if(event.detail&&'object'===typeof event.detail)panelMessageDisplayEl.textContent+='Event: '+eventTag+' '+JSON.stringify(event.detail)+'\n';else panelMessageDisplayEl.textContent+='Event: '+eventTag+'\n'
;this.shadowRoot.getElementById('panelMessageDisplayId').scrollTop=this.shadowRoot.getElementById('panelMessageDisplayId').scrollHeight})})}};connectedCallback(){
this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()});this.shadowRoot.getElementById('startButtonId').addEventListener('click',()=>{
this._startLogGlobalEvents()});document.addEventListener('collapse-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){
if(event.detail.except!==this.id)this.collapsePanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()})
;document.addEventListener('color-theme-changed',event=>{const panelDivEl=this.shadowRoot.getElementById('panelDivId')
;const panelMessageDisplayEd=this.shadowRoot.getElementById('panelMessageDisplayId');if('light'===event.detail.theme){panelDivEl.classList.remove('show-events-theme-dark')
;panelDivEl.classList.add('show-events-theme-light');panelMessageDisplayEd.classList.remove('global-text-theme-dark');panelMessageDisplayEd.classList.add('global-text-theme-light')}else{
panelDivEl.classList.remove('show-events-theme-light');panelDivEl.classList.add('show-events-theme-dark');panelMessageDisplayEd.classList.remove('global-text-theme-light')
;panelMessageDisplayEd.classList.add('global-text-theme-dark')}});document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){
if(event.detail.except!==this.id)this.hidePanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()})
;document.addEventListener('resize-custom-elements',()=>{if(window.globals.webState.dynamic.testAreaColumnPxWidth){
const calcInputAreaColSize=document.getElementById('displayUtils').calcInputAreaColSize;const mar1=window.globals.webState.dynamic.commonMarginRightPx
;this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('cols',calcInputAreaColSize(mar1))}});document.addEventListener('show-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()}else if(event.detail&&event.detail.debug)this.showPanel()})}})
;window.customElements.define('show-ircstate',class extends HTMLElement{constructor(){super();const template=document.getElementById('showIrcStateTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))}_populateJsonData=()=>{
this.shadowRoot.getElementById('jsonDisplayPreId').textContent=JSON.stringify(window.globals.ircState,null,2)};_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this._populateJsonData();this._scrollToTop()};collapsePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()})
;this.shadowRoot.getElementById('refreshButtonId').addEventListener('click',()=>{this._populateJsonData()});document.addEventListener('collapse-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('irc-state-changed',()=>{
if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))this._populateJsonData()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const jsonDisplayDivEl=this.shadowRoot.getElementById('jsonDisplayDivId');if('light'===event.detail.theme){
panelDivEl.classList.remove('show-ircstate-theme-dark');panelDivEl.classList.add('show-ircstate-theme-light');jsonDisplayDivEl.classList.remove('global-text-theme-dark')
;jsonDisplayDivEl.classList.add('global-text-theme-light')}else{panelDivEl.classList.remove('show-ircstate-theme-light');panelDivEl.classList.add('show-ircstate-theme-dark')
;jsonDisplayDivEl.classList.remove('global-text-theme-light');jsonDisplayDivEl.classList.add('global-text-theme-dark')}});document.addEventListener('hide-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()}else this.hidePanel()});document.addEventListener('show-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()}else if(event.detail&&event.detail.debug)this.showPanel()})}})
;window.customElements.define('show-webstate',class extends HTMLElement{constructor(){super();const template=document.getElementById('showWebStateTemplate');const templateContent=template.content
;this.attachShadow({mode:'open'}).appendChild(templateContent.cloneNode(true))}_populateJsonData=()=>{
this.shadowRoot.getElementById('jsonDisplayPreId').textContent=JSON.stringify(window.globals.webState,null,2)};_scrollToTop=()=>{this.focus()
;const newVertPos=window.scrollY+this.getBoundingClientRect().top-50;window.scrollTo({top:newVertPos,behavior:'smooth'})};showPanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible','');this._populateJsonData();this._scrollToTop()};collapsePanel=()=>{
this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')};hidePanel=()=>{this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible')}
;connectedCallback(){this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click',()=>{this.hidePanel()})
;this.shadowRoot.getElementById('refreshButtonId').addEventListener('click',()=>{this._populateJsonData()});document.addEventListener('collapse-all-panels',event=>{
if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.collapsePanel()
}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.collapsePanel()}else this.collapsePanel()});document.addEventListener('color-theme-changed',event=>{
const panelDivEl=this.shadowRoot.getElementById('panelDivId');const jsonDisplayDivEl=this.shadowRoot.getElementById('jsonDisplayDivId');if('light'===event.detail.theme){
panelDivEl.classList.remove('show-webstate-theme-dark');panelDivEl.classList.add('show-webstate-theme-light');jsonDisplayDivEl.classList.remove('global-text-theme-dark')
;jsonDisplayDivEl.classList.add('global-text-theme-light')}else{panelDivEl.classList.remove('show-webstate-theme-light');panelDivEl.classList.add('show-webstate-theme-dark')
;jsonDisplayDivEl.classList.remove('global-text-theme-light');jsonDisplayDivEl.classList.add('global-text-theme-dark')}});document.addEventListener('irc-state-changed',()=>{
if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))this._populateJsonData()});document.addEventListener('hide-all-panels',event=>{if(event.detail&&event.detail.except){
if('string'===typeof event.detail.except){if(event.detail.except!==this.id)this.hidePanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0)this.hidePanel()
}else this.hidePanel()});document.addEventListener('show-all-panels',event=>{if(event.detail&&event.detail.except){if('string'===typeof event.detail.except){
if(event.detail.except!==this.id&&event.detail.debug)this.showPanel()}else if(Array.isArray(event.detail.except))if(event.detail.except.indexOf(this.id)<0&&event.detail.debug)this.showPanel()
}else if(event.detail&&event.detail.debug)this.showPanel()});document.addEventListener('web-connect-changed',()=>{
if(this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))this._populateJsonData()})}});if(!(window.customElements&&document.body.attachShadow)){
const bodyElement=document.querySelector('body');bodyElement.id='broken';bodyElement.innerHTML='<b>Your browser does not support Shadow DOM and Custom Elements v1.</b>'}else{
document.getElementById('globVars').initializePlugin();document.getElementById('displayUtils').initializePlugin();document.getElementById('beepSounds').initializePlugin()
;document.getElementById('websocketPanel').initializePlugin();document.getElementById('navMenu').initializePlugin();document.getElementById('headerBar').initializePlugin()
;document.getElementById('serverFormPanel').initializePlugin();document.getElementById('serverListPanel').initializePlugin();document.getElementById('ircControlsPanel').initializePlugin()
;document.getElementById('ircServerPanel').initializePlugin();document.getElementById('wallopsPanel').initializePlugin();document.getElementById('noticePanel').initializePlugin()
;document.getElementById('manageChannelsPanel').initializePlugin();document.getElementById('managePmPanels').initializePlugin();document.addEventListener('global-scroll-to-top',(function(e){
window.scrollTo(0,0)}));window.addEventListener('resize',event=>{document.getElementById('displayUtils').handleExternalWindowResizeEvent(event)
;document.dispatchEvent(new CustomEvent('resize-custom-elements'))});setInterval(()=>{document.getElementById('errorPanel').timerTickHandler()
;document.getElementById('displayUtils').timerTickHandler();document.getElementById('beepSounds').timerTickHandler();document.getElementById('headerBar').timerTickHandler()
;document.getElementById('websocketPanel').timerTickHandler();document.getElementById('ircServerPanel').timerTickHandler();document.getElementById('managePmPanels').timerTickHandler()
;document.getElementById('manageChannelsPanel').timerTickHandler()},1e3);document.getElementById('websocketPanel').firstWebSocketConnectOnPageLoad()}