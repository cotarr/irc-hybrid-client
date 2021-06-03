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

"use strict";const channelPrefixChars="@#+!";const nicknamePrefixChars="~&@%+";const nickChannelSpacer=" | ";const pmNameSpacer=" - ";const activityIconInhibitTimerValue=10;var ircState={
ircConnectOn:false,ircConnecting:false,ircConnected:false,ircRegistered:false,ircIsAway:false,ircAutoReconnect:false,ircServerName:"",ircServerHost:"",ircServerPort:6667,ircTLSEnabled:false,
ircServerIndex:0,ircServerPrefix:"",channelList:[],nickName:"",userName:"",realName:"",userMode:"",userHost:"",channels:[],channelStates:[],progVersion:"0.0.0",progName:"",times:{programRun:0,
ircConnect:0},count:{ircConnect:0,ircConnectError:0},websocketCount:0};document.getElementById("webConnectIconId").removeAttribute("connected")
;document.getElementById("ircConnectIconId").removeAttribute("connected");document.getElementById("webConnectIconId").removeAttribute("connecting")
;document.getElementById("ircConnectIconId").removeAttribute("connecting");var webState={};webState.loginUser={};webState.webConnectOn=true;webState.webConnected=false;webState.webConnecting=false
;webState.ircConnecting=false;webState.websocketCount=0;webState.noticeOpen=false;webState.wallopsOpen=false;webState.viewRawMessages=false;webState.showRawInHex=false;webState.showCommsMessages=false
;webState.lastIrcServerIndex=-1;webState.channels=[];webState.channelStates=[];webState.resizableChanSplitTextareaIds=[];webState.resizableSendButtonTextareaIds=[];webState.lastPMNick=""
;webState.activePrivateMessageNicks=[];webState.resizablePrivMsgTextareaIds=[];webState.resizableSendButtonPMTextareaIds=[];webState.times={webConnect:0};webState.count={webConnect:0}
;webState.cacheInhibitTimer=0;var webServerUrl="https://";var webSocketUrl="wss://";if(document.location.protocol==="http:"){webServerUrl="http://";webSocketUrl="ws://"}
webServerUrl+=window.location.hostname+":"+window.location.port;webSocketUrl+=window.location.hostname+":"+window.location.port;var wsocket=null;const beep1=new Audio("sounds/short-beep1.mp3")
;const beep2=new Audio("sounds/short-beep2.mp3");const beep3=new Audio("sounds/short-beep3.mp3");var beep1InhibitTimer=0;var beep2InhibitTimer=0;var beep3InhibitTimer=0;function beepTimerTick(){
if(beep1InhibitTimer>0)beep1InhibitTimer--;if(beep2InhibitTimer>0)beep2InhibitTimer--;if(beep3InhibitTimer>0)beep3InhibitTimer--}function inhibitBeep(seconds){beep1InhibitTimer=seconds
;beep2InhibitTimer=seconds;beep3InhibitTimer=seconds}function playBeep1Sound(){if(beep1InhibitTimer===0){beep1.play();beep1InhibitTimer=5}}function playBeep2Sound(){if(beep2InhibitTimer===0){
beep2.play();beep2InhibitTimer=5}}function playBeep3Sound(){if(beep3InhibitTimer===0){beep3.play();beep3InhibitTimer=5}}const errorExpireSeconds=5;var errorRemainSeconds=0;function clearError(){
let errorDivEl=document.getElementById("errorDiv");errorDivEl.setAttribute("hidden","");let errorContentDivEl=document.getElementById("errorContentDiv");while(errorContentDivEl.firstChild){
errorContentDivEl.removeChild(errorContentDivEl.firstChild)}errorRemainSeconds=0}function showError(errorString){let errorDivEl=document.getElementById("errorDiv");errorDivEl.removeAttribute("hidden")
;let errorContentDivEl=document.getElementById("errorContentDiv");let errorMessageEl=document.createElement("div");errorMessageEl.textContent=errorString||"Error: unknown error (2993)"
;errorContentDivEl.appendChild(errorMessageEl);errorRemainSeconds=errorExpireSeconds}document.addEventListener("show-error-message",function(event){showError(event.detail.message)})
;document.getElementById("errorDiv").addEventListener("click",function(){clearError()});function errorTimerTickHandler(){if(errorRemainSeconds>0){errorRemainSeconds--;if(errorRemainSeconds===0){
clearError()}else{document.getElementById("errorTitle").textContent="Tap to Close ("+errorRemainSeconds.toString()+")"}}}function unixTimestamp(){let now=new Date
;return parseInt(now.valueOf()/1e3).toString()}function checkConnect(code){if(code>=1&&!webState.webConnected){showError("Error: not connected to web server");return false}
if(code>=2&&!ircState.ircConnected){showError("Error: Not connected to IRC server.");return false}if(code>=3&&!ircState.ircRegistered){showError("Error: Not connected to IRC server.");return false}
return true}function showRawMessageWindow(){document.getElementById("rawHiddenElements").removeAttribute("hidden");document.getElementById("rawHiddenElementsButton").textContent="-"
;document.getElementById("rawHeadRightButtons").removeAttribute("hidden");document.getElementById("rawMessageDisplay").scrollTop=document.getElementById("rawMessageDisplay").scrollHeight}
function hideRawMessageWindow(){document.getElementById("rawHiddenElements").setAttribute("hidden","");document.getElementById("rawHiddenElementsButton").textContent="+"
;document.getElementById("rawHeadRightButtons").setAttribute("hidden","")}function setNotActivityIcon(index){document.getElementById("notMsgIconId").removeAttribute("hidden")}
var lastPmActivityIconIndex=-1;function setPmActivityIcon(index){if(lastPmActivityIconIndex===-1){lastPmActivityIconIndex=index;document.getElementById("pmMsgIconId").removeAttribute("hidden")}}
var lastChanActivityIconIndex=-1;function setChanActivityIcon(index){if(lastChanActivityIconIndex===-1){lastChanActivityIconIndex=index
;document.getElementById("chanMsgIconId").removeAttribute("hidden")}}function resetNotActivityIcon(index){document.getElementById("notMsgIconId").setAttribute("hidden","")}
function resetPmActivityIcon(index){if(index===-1){lastPmActivityIconIndex=-1;document.getElementById("pmMsgIconId").setAttribute("hidden","")}else if(index===lastPmActivityIconIndex){
lastPmActivityIconIndex=-1;document.getElementById("pmMsgIconId").setAttribute("hidden","")}}function resetChanActivityIcon(index){if(index===-1){lastChanActivityIconIndex=-1
;document.getElementById("chanMsgIconId").setAttribute("hidden","")}else if(index===lastChanActivityIconIndex){lastChanActivityIconIndex=-1
;document.getElementById("chanMsgIconId").setAttribute("hidden","")}}document.getElementById("notMsgIconId").addEventListener("click",function(){resetNotActivityIcon()}.bind(this))
;document.getElementById("pmMsgIconId").addEventListener("click",function(){resetPmActivityIcon(-1)}.bind(this));document.getElementById("chanMsgIconId").addEventListener("click",function(){
resetChanActivityIcon(-1)}.bind(this));function updateDivVisibility(){if(webState.webConnected){document.getElementById("webDisconnectedVisibleDiv").setAttribute("hidden","")
;document.getElementById("webDisconnectedHiddenDiv").removeAttribute("hidden");document.getElementById("reconnectStatusDiv").textContent=""
;document.getElementById("webConnectIconId").setAttribute("connected","");document.getElementById("webConnectIconId").removeAttribute("connecting")
;document.getElementById("rawMessageInputId").removeAttribute("disabled");document.getElementById("sendRawMessageButton").removeAttribute("disabled")
;document.getElementById("loadFromCacheButton").removeAttribute("disabled");if(ircState.ircConnected){document.getElementById("cycleNextServerButton").setAttribute("disabled","")
;document.getElementById("ircConnectIconId").removeAttribute("unavailable");document.getElementById("waitConnectIconId").setAttribute("hidden","");if(ircState.ircRegistered){
document.getElementById("ircConnectIconId").removeAttribute("connecting");document.getElementById("ircConnectIconId").setAttribute("connected","")}else{
document.getElementById("ircConnectIconId").setAttribute("connecting","");document.getElementById("ircConnectIconId").removeAttribute("connected")}if(ircState.ircIsAway){
document.getElementById("ircIsAwayIconId").removeAttribute("hidden")}else{document.getElementById("ircIsAwayIconId").setAttribute("hidden","")}
document.getElementById("hideLoginSection").setAttribute("hidden","");document.getElementById("hideLoginSectionButton").textContent="+"
;document.getElementById("nickNameInputId").setAttribute("disabled","");document.getElementById("realNameInputId").setAttribute("disabled","")
;document.getElementById("userModeInputId").setAttribute("disabled","");document.getElementById("connectButton").setAttribute("disabled","")
;document.getElementById("quitButton").removeAttribute("disabled");document.getElementById("userAwayMessageId").removeAttribute("disabled")
;document.getElementById("setAwayButton").removeAttribute("disabled");document.getElementById("setBackButton").removeAttribute("disabled")
;document.getElementById("eraseCacheButton").setAttribute("disabled","");document.getElementById("ircDisconnectedHiddenDiv").removeAttribute("hidden");if(webState.noticeOpen){
document.getElementById("noticeSectionDiv").removeAttribute("hidden")}else{document.getElementById("noticeSectionDiv").setAttribute("hidden","")}if(webState.wallopsOpen){
document.getElementById("wallopsSectionDiv").removeAttribute("hidden")}else{document.getElementById("wallopsSectionDiv").setAttribute("hidden","")}}else{
document.getElementById("cycleNextServerButton").removeAttribute("disabled");if(webState.ircConnecting||ircState.ircConnecting){
document.getElementById("ircConnectIconId").removeAttribute("unavailable");document.getElementById("ircConnectIconId").setAttribute("connecting","")
;document.getElementById("ircConnectIconId").removeAttribute("connected")}else{document.getElementById("ircConnectIconId").removeAttribute("unavailable")
;document.getElementById("ircConnectIconId").removeAttribute("connecting");document.getElementById("ircConnectIconId").removeAttribute("connected")}
if(ircState.ircAutoReconnect&&ircState.ircConnectOn&&!ircState.ircConnected&&!ircState.ircConnecting){document.getElementById("waitConnectIconId").removeAttribute("hidden")}else{
document.getElementById("waitConnectIconId").setAttribute("hidden","")}resetNotActivityIcon();resetPmActivityIcon(-1);resetChanActivityIcon(-1)
;document.getElementById("ircIsAwayIconId").setAttribute("hidden","");document.getElementById("hideLoginSection").removeAttribute("hidden")
;document.getElementById("hideLoginSectionButton").textContent="-";document.getElementById("nickNameInputId").removeAttribute("disabled")
;document.getElementById("realNameInputId").removeAttribute("disabled");document.getElementById("userModeInputId").removeAttribute("disabled");if(ircState.ircConnecting){
document.getElementById("connectButton").setAttribute("disabled","");document.getElementById("quitButton").removeAttribute("disabled")}else{
document.getElementById("connectButton").removeAttribute("disabled");document.getElementById("quitButton").setAttribute("disabled","")}
document.getElementById("userAwayMessageId").setAttribute("disabled","");document.getElementById("setAwayButton").setAttribute("disabled","")
;document.getElementById("setBackButton").setAttribute("disabled","");document.getElementById("eraseCacheButton").removeAttribute("disabled")
;document.getElementById("ircDisconnectedHiddenDiv").setAttribute("hidden","");webState.noticeOpen=false;document.getElementById("noticeSectionDiv").setAttribute("hidden","")
;webState.wallopsOpen=false;document.getElementById("wallopsSectionDiv").setAttribute("hidden","")}}else{document.getElementById("webDisconnectedVisibleDiv").removeAttribute("hidden")
;document.getElementById("webDisconnectedHiddenDiv").setAttribute("hidden","");document.getElementById("waitConnectIconId").setAttribute("hidden","")
;document.getElementById("cycleNextServerButton").setAttribute("disabled","");if(webState.webConnecting){document.getElementById("webConnectIconId").removeAttribute("connected")
;document.getElementById("webConnectIconId").setAttribute("connecting","")}else{document.getElementById("webConnectIconId").removeAttribute("connected")
;document.getElementById("webConnectIconId").removeAttribute("connecting")}resetNotActivityIcon();resetPmActivityIcon(-1);resetChanActivityIcon(-1)
;document.getElementById("ircConnectIconId").setAttribute("unavailable","");document.getElementById("ircConnectIconId").removeAttribute("connected")
;document.getElementById("ircConnectIconId").removeAttribute("connecting");document.getElementById("ircIsAwayIconId").setAttribute("hidden","")
;document.getElementById("hideLoginSection").setAttribute("hidden","");document.getElementById("nickNameInputId").setAttribute("disabled","")
;document.getElementById("realNameInputId").setAttribute("disabled","");document.getElementById("userModeInputId").setAttribute("disabled","")
;document.getElementById("connectButton").setAttribute("disabled","");document.getElementById("quitButton").setAttribute("disabled","")
;document.getElementById("userAwayMessageId").setAttribute("disabled","");document.getElementById("setAwayButton").setAttribute("disabled","")
;document.getElementById("setBackButton").setAttribute("disabled","")}}document.addEventListener("show-all-divs",function(event){document.getElementById("hideLoginSection").removeAttribute("hidden")
;document.getElementById("hideLoginSectionButton").textContent="-";document.getElementById("privMsgMainHiddenDiv").removeAttribute("hidden")
;document.getElementById("privMsgMainHiddenButton").textContent="-";showRawMessageWindow();webState.noticeOpen=true;webState.wallopsOpen=true
;document.getElementById("noticeSectionDiv").removeAttribute("hidden");document.getElementById("wallopsSectionDiv").removeAttribute("hidden")
;document.getElementById("infoOpenCloseButton").textContent="-"});document.addEventListener("hide-all-divs",function(event){document.getElementById("hideLoginSection").setAttribute("hidden","")
;document.getElementById("hideLoginSectionButton").textContent="+";document.getElementById("privMsgMainHiddenDiv").setAttribute("hidden","")
;document.getElementById("privMsgMainHiddenButton").textContent="+";hideRawMessageWindow();webState.noticeOpen=false;document.getElementById("noticeSectionDiv").setAttribute("hidden","")
;webState.wallopsOpen=false;document.getElementById("wallopsSectionDiv").setAttribute("hidden","");document.getElementById("hiddenInfoDiv").setAttribute("hidden","")
;document.getElementById("infoOpenCloseButton").textContent="+"});function setVariablesShowingIRCDisconnected(){document.getElementById("headerUser").textContent=""
;document.getElementById("headerServer").textContent="";document.dispatchEvent(new CustomEvent("cancel-beep-sounds",{bubbles:true}))
;let channelContainerDivEl=document.getElementById("channelContainerDiv");while(channelContainerDivEl.firstChild){channelContainerDivEl.removeChild(channelContainerDivEl.firstChild)}
webState.channels=[];webState.channelStates=[];webState.resizableChanSplitTextareaIds=[];webState.resizableSendButtonTextareaIds=[]}const heartbeatExpirationTimeSeconds=15;var heartbeatUpCounter=0
;function resetHeartbeatTimer(){heartbeatUpCounter=0}function onHeartbeatReceived(){heartbeatUpCounter=0}function heartbeatTimerTickHandler(){heartbeatUpCounter++;if(webState.webConnected){
if(heartbeatUpCounter>heartbeatExpirationTimeSeconds+1){console.log("HEARTBEAT timeout + 2 seconds, socket unresponsive, forcing disconnect")
;document.getElementById("reconnectStatusDiv").textContent+="Web socket connection timeout, socket unresponsive, force disconnect\n";webState.webConnected=false;webState.webConnecting=false
;setVariablesShowingIRCDisconnected();updateDivVisibility()}else if(heartbeatUpCounter===heartbeatExpirationTimeSeconds){console.log("HEARTBEAT timeout + 0 seconds , attempting to closing socket")
;document.getElementById("reconnectStatusDiv").textContent+="Web socket connection timeout, attempting to close\n";if(wsocket){wsocket.close(3e3,"Heartbeat timeout")}}}}
function updateElapsedTimeDisplay(){function toTimeString(seconds){let remainSec=seconds;let day=0;let hour=0;let min=0;let sec=0;day=parseInt(remainSec/86400);remainSec-=day*86400
;hour=parseInt(remainSec/3600);remainSec-=hour*3600;min=parseInt(remainSec/60);sec=remainSec-min*60
;return day.toString().padStart(3," ")+" D "+hour.toString().padStart(2,"0")+":"+min.toString().padStart(2,"0")+":"+sec.toString().padStart(2,"0")}
let timePreEl=document.getElementById("elapsedTimeDiv");let now=unixTimestamp();let timeStr="";if(webState.webConnected){
timeStr+="Web Connected: "+toTimeString(now-webState.times.webConnect)+" ("+webState.count.webConnect.toString()+")\n"}else{timeStr+="Web Connected: N/A\n"}if(ircState.ircConnected){
timeStr+="IRC Connected: "+toTimeString(now-ircState.times.ircConnect)+" ("+ircState.count.ircConnect.toString()+")\n"}else{timeStr+="IRC Connected: N/A\n"}if(webState.webConnected){
timeStr+="Backend Start: "+toTimeString(now-ircState.times.programRun)}else{timeStr+="Backend Start: N/A"}timePreEl.textContent=timeStr}var lastConnectErrorCount=0;function getIrcState(callback){
let fetchURL=webServerUrl+"/irc/getircstate";let fetchOptions={method:"GET",headers:{Accept:"application/json"}};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()
}else{if(response.status===403)window.location.href="/login";throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{let lastIrcState=ircState
;ircState=responseJson;if(!ircState.ircConnected&&webState.lastIrcServerIndex!==ircState.ircServerIndex){webState.lastIrcServerIndex=ircState.ircServerIndex
;document.getElementById("ircServerNameInputId").value=ircState.ircServerName;document.getElementById("ircServerAddrInputId").value=ircState.ircServerHost
;document.getElementById("ircServerPortInputId").value=ircState.ircServerPort;if(ircState.ircTLSEnabled){document.getElementById("ircServerTlsCheck").setAttribute("checked","")}else{
document.getElementById("ircServerTlsCheck").removeAttribute("checked")}document.getElementById("nickNameInputId").value=ircState.nickName
;document.getElementById("userNameInputId").value=ircState.userName;document.getElementById("realNameInputId").value=ircState.realName
;document.getElementById("userModeInputId").value=ircState.userMode}if(ircState.ircConnected){document.getElementById("ircServerNameInputId").value=ircState.ircServerName
;document.getElementById("ircServerAddrInputId").value=ircState.ircServerHost;document.getElementById("ircServerPortInputId").value=ircState.ircServerPort;if(ircState.ircTLSEnabled){
document.getElementById("ircServerTlsCheck").setAttribute("checked","")}else{document.getElementById("ircServerTlsCheck").removeAttribute("checked")}
document.getElementById("headerServer").textContent=ircState.ircServerName;document.getElementById("headerUser").textContent=" ("+ircState.nickName+")"
;document.getElementById("nickNameInputId").value=ircState.nickName;document.getElementById("userNameInputId").value=ircState.userName
;document.getElementById("realNameInputId").value=ircState.realName;document.getElementById("userModeInputId").value=ircState.userMode;webState.ircConnecting=false}if(!ircState.ircConnected){
setVariablesShowingIRCDisconnected()}if(lastConnectErrorCount!==ircState.count.ircConnectError){lastConnectErrorCount=ircState.count.ircConnectError;if(ircState.count.ircConnectError>0){
if(webState.cacheInhibitTimer===0){showError("An IRC Server connection error occurred")}}webState.ircConnecting=false}document.dispatchEvent(new CustomEvent("irc-state-changed",{bubbles:true,detail:{}
}));updateDivVisibility();if(!document.getElementById("variablesDivId").hasAttribute("hidden")){
document.getElementById("variablesPreId").textContent="ircState = "+JSON.stringify(ircState,null,2)+"\n\n"+"webState = "+JSON.stringify(webState,null,2)}
document.getElementById("programVersionDiv").textContent=" version-"+ircState.progVersion;if(callback){callback(null,ircState)}}).catch(error=>{console.log(error);if(callback){callback(error,{})}})}
"use strict";function cleanFormatting(inString){let formattingChars=[2,7,15,17,22,29,30,31];let outString="";let l=inString.length;if(l===0)return outString;let i=0;let active=true;while(i<l){
active=true;if(active&&i<l&&formattingChars.indexOf(inString.charCodeAt(i))>=0){active=false;i++}if(active&&i<l&&inString.charCodeAt(i)===3){active=false;i++
;if(i<l&&inString.charAt(i)>="0"&&inString.charAt(i)<="9")i++;if(i<l&&inString.charAt(i)>="0"&&inString.charAt(i)<="9")i++;if(i<l&&inString.charAt(i)===","){i++
;if(i<l&&inString.charAt(i)>="0"&&inString.charAt(i)<="9")i++;if(i<l&&inString.charAt(i)>="0"&&inString.charAt(i)<="9")i++}}if(active&&i<l&&inString.charCodeAt(i)===4){active=false;i++
;if(inString.charAt(i)>="0"&&inString.charAt(i)<="9"||inString.toUpperCase().charAt(i)>="A"&&inString.toUpperCase().charAt(i)<="F"){for(let j=0;j<6;j++){if(i<l)i++}if(i<l&&inString.charAt(i)===","){
i++;for(let j=0;j<6;j++){if(i<l)i++}}}}if(active&&i<l){active=false;outString+=inString.charAt(i);i++}}return outString}function cleanCtcpDelimiter(inString){let ctcpDelim=1;let outString=""
;let l=inString.length;if(l===0)return outString;let i=0;while(i<l){if(i<l&&inString.charCodeAt(i)===ctcpDelim){i++}else{if(i<l)outString+=inString.charAt(i);i++}}return outString}
const timestampToHMS=function(timeString){let outString="";if(timeString.length===0){outString=null}else{if(timeString.indexOf("@time=")===0){
let timeObj=new Date(timeString.slice(6,timeString.length));outString+=timeObj.getHours().toString().padStart(2,"0")+":";outString+=timeObj.getMinutes().toString().padStart(2,"0")+":"
;outString+=timeObj.getSeconds().toString().padStart(2,"0")}else{outString=null}}return outString};const timestampToUnixSeconds=function(timeString){let outSeconds=null;if(timeString.length===0){
outSeconds=null}else{if(timeString.indexOf("@time=")===0){let timeObj=new Date(timeString.slice(6,timeString.length));outSeconds=parseInt(timeObj.valueOf()/1e3)}else{outSeconds=null}}return outSeconds
};function _parseIrcMessage(message){function _extractTimeString(start,end,messageString){let i=start;let timeString="";while(messageString.charAt(i)!==" "&&i<=end){timeString+=messageString.charAt(i)
;i++}let outString=timestampToHMS(timeString);return{data:outString,nextIndex:i+1}}function _isColonString(start,messageString){if(messageString.charAt(start)===":"){return{isColonStr:true,
nextIndex:start+1}}else{return{isColonStr:false,nextIndex:start}}}function _extractMidString(start,end,messageString){let i=start;let outString="";while(messageString.charAt(i)!==" "&&i<=end){
outString+=messageString.charAt(i);i++}if(outString.length===0)outString=null;return{data:outString,nextIndex:i+1}}function _extractFinalString(start,end,messageString){let i=start;let outString=""
;while(i<=end){outString+=messageString.charAt(i);i++}if(outString.length===0)outString=null;return{data:outString,nextIndex:i+1}}function _extractNickname(inText){if(inText){
if(inText.indexOf("!")>=0&&inText.indexOf("@")>=0&&inText.indexOf("!")<inText.indexOf("@")){let nick=inText.split("!")[0];return nick}else{return null}}else{return null}}
function _extractHostname(inText){if(inText){if(inText.indexOf("!")>=0&&inText.indexOf("@")>=0&&inText.indexOf("!")<inText.indexOf("@")){let host=inText.split("!")[1];return host}else{return null}
}else{return null}}let timestamp=null;let prefix=null;let extNick=null;let extHost=null;let hostname=null;let command=null;let params=[];let messageString=message.toString()
;let end=messageString.length-1;let temp={nextIndex:0};temp=_extractTimeString(temp.nextIndex,end,messageString);timestamp=temp.data;temp=_isColonString(temp.nextIndex,messageString)
;if(temp.isColonStr){temp=_extractMidString(temp.nextIndex,end,messageString);prefix=temp.data;extNick=_extractNickname(temp.data);extHost=_extractHostname(temp.data)}
temp=_extractMidString(temp.nextIndex,end,messageString);command=temp.data;let done=false;while(!done){if(temp.nextIndex>end){done=true}else{temp=_isColonString(temp.nextIndex,messageString)
;if(temp.isColonStr){temp=_extractFinalString(temp.nextIndex,end,messageString);params.push(temp.data);done=true}else{temp=_extractMidString(temp.nextIndex,end,messageString)
;if(temp.data&&temp.data.length>0){params.push(temp.data)}else{done=true}}}}return{timestamp:timestamp,prefix:prefix,nick:extNick,host:extHost,command:command,params:params}}
function displayChannelMessage(parsedMessage){document.dispatchEvent(new CustomEvent("channel-message",{bubbles:true,detail:{parsedMessage:parsedMessage}}))}
function displayPrivateMessage(parsedMessage){document.dispatchEvent(new CustomEvent("private-message",{bubbles:true,detail:{parsedMessage:parsedMessage}}))}
function displayNoticeMessage(parsedMessage){function _addText(text){document.getElementById("noticeMessageDisplay").value+=cleanFormatting(text)+"\n"
;document.getElementById("noticeMessageDisplay").scrollTop=document.getElementById("noticeMessageDisplay").scrollHeight}switch(parsedMessage.command){case"NOTICE":const ctcpDelim=1
;if(parsedMessage.params.length===2&&parsedMessage.params[1].charCodeAt(0)===ctcpDelim||parsedMessage.params.length===3&&parsedMessage.params[2].charCodeAt(0)===ctcpDelim){}else{
if(parsedMessage.params[0]===ircState.nickName){if(parsedMessage.nick){_addText(parsedMessage.timestamp+" "+parsedMessage.nick+nickChannelSpacer+parsedMessage.params[1])}else{
_addText(parsedMessage.timestamp+" "+parsedMessage.prefix+nickChannelSpacer+parsedMessage.params[1])}webState.noticeOpen=true;updateDivVisibility();if(webState.cacheInhibitTimer===0){
setNotActivityIcon()}}else if(ircState.channels.indexOf(parsedMessage.params[0].toLowerCase())>=0){document.dispatchEvent(new CustomEvent("channel-message",{bubbles:true,detail:{
parsedMessage:parsedMessage}}))}else if(parsedMessage.nick===ircState.nickName){_addText(parsedMessage.timestamp+" [to] "+parsedMessage.params[0]+nickChannelSpacer+parsedMessage.params[1])
;webState.noticeOpen=true;updateDivVisibility()}}break;default:}}function displayWallopsMessage(parsedMessage){function _addText(text){
document.getElementById("wallopsMessageDisplay").value+=cleanFormatting(text)+"\n"
;document.getElementById("wallopsMessageDisplay").scrollTop=document.getElementById("wallopsMessageDisplay").scrollHeight}switch(parsedMessage.command){case"WALLOPS":if(parsedMessage.nick){
_addText(parsedMessage.timestamp+" "+parsedMessage.nick+nickChannelSpacer+parsedMessage.params[0]);webState.wallopsOpen=true}else{
_addText(parsedMessage.timestamp+" "+parsedMessage.prefix+nickChannelSpacer+parsedMessage.params[0]);webState.wallopsOpen=true}updateDivVisibility();break;default:}}
function displayRawMessage(inString){document.getElementById("rawMessageDisplay").value+=inString+"\n"
;document.getElementById("rawMessageDisplay").scrollTop=document.getElementById("rawMessageDisplay").scrollHeight}function displayRawMessageInHex(message){
let uint8String=new TextEncoder("utf8").encode(message);let hexString="";for(let i=0;i<uint8String.length;i++){hexString+=uint8String[i].toString(16).padStart(2,"0")+" "}displayRawMessage(hexString)}
function displayFormattedServerMessage(parsedMessage,message){document.dispatchEvent(new CustomEvent("server-message",{bubbles:true,detail:{parsedMessage:parsedMessage,message:message}}))}
function _parseCtcpMessage(parsedMessage){function _addNoticeText(text){document.getElementById("noticeMessageDisplay").value+=text+"\n"
;document.getElementById("noticeMessageDisplay").scrollTop=document.getElementById("noticeMessageDisplay").scrollHeight}const ctcpDelim=1;let ctcpMessage=parsedMessage.params[1]
;let end=ctcpMessage.length-1;if(ctcpMessage.charCodeAt(0)!==1){console.log("_parseCtcpMessage() missing CTCP start delimiter");return}let i=1;let ctcpCommand="";let ctcpRest=""
;while(ctcpMessage.charAt(i)!==" "&&i<=end){if(ctcpMessage.charCodeAt(i)!==ctcpDelim){ctcpCommand+=ctcpMessage.charAt(i)}i++}ctcpCommand=ctcpCommand.toUpperCase()
;while(ctcpMessage.charAt(i)===" "&&i<=end){i++}while(ctcpMessage.charCodeAt(i)!==ctcpDelim&&i<=end){ctcpRest+=ctcpMessage.charAt(i);i++}if(ctcpCommand==="ACTION"){
let index=ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());if(index>=0){parsedMessage.params[1]=parsedMessage.nick+" "+ctcpRest;parsedMessage.nick="*"
;displayChannelMessage(parsedMessage)}else{parsedMessage.params[1]=ctcpRest;parsedMessage.isPmCtcpAction=true;displayPrivateMessage(parsedMessage)}}else{if(parsedMessage.nick===ircState.nickName){
if(parsedMessage.command.toUpperCase()==="PRIVMSG"){_addNoticeText(parsedMessage.timestamp+" "+"CTCP 1 Request to "+parsedMessage.params[0]+": "+ctcpCommand+" "+ctcpRest);webState.noticeOpen=true
}else{let replyContents="";if(parsedMessage.params.length>2){for(let i=2;i<parsedMessage.params.length;i++){if(parsedMessage.params[i].charCodeAt(0)!==ctcpDelim){
replyContents+=cleanCtcpDelimiter(parsedMessage.params[i]);if(i!==parsedMessage.params.length){replyContents+=" "}}}}
_addNoticeText(parsedMessage.timestamp+" "+"CTCP 2 Reply to "+parsedMessage.params[0]+": "+ctcpCommand+" "+replyContents);webState.noticeOpen=true}}else{
if(parsedMessage.command.toUpperCase()==="PRIVMSG"){_addNoticeText(parsedMessage.timestamp+" "+"CTCP 3 Request from "+parsedMessage.nick+": "+ctcpCommand+" "+ctcpRest);webState.noticeOpen=true}else{
_addNoticeText(parsedMessage.timestamp+" "+"CTCP 4 Reply from "+parsedMessage.nick+": "+ctcpCommand+" "+ctcpRest);webState.noticeOpen=true}}updateDivVisibility()}}
const ircMessageCommandDisplayFilter=["331","332","333","353","366","JOIN","KICK","MODE","NICK","NOTICE","PART","PING","PONG","PRIVMSG","QUIT","TOPIC","WALLOPS"];function _parseBufferMessage(message){
if(message==="HEARTBEAT"){onHeartbeatReceived();if(webState.showCommsMessages){displayRawMessage("HEARTBEAT")}}else if(message==="UPDATE"){getIrcState();if(webState.showCommsMessages){
displayRawMessage("UPDATE")}}else{function _showNotExpiredError(errStr){let timeNow=new Date;let timeNowSeconds=parseInt(timeNow/1e3)
;let timeMessageSeconds=timestampToUnixSeconds(message.split(" ")[0]);if(timeNowSeconds-timeMessageSeconds<errorExpireSeconds){showError(errStr)}}if(message.split(" ")[0]==="--\x3e"){
if(webState.showCommsMessages)displayRawMessage(message);return}if(message.split(" ")[0]==="webServer:"){if(webState.showCommsMessages)displayRawMessage(message);return}
if(message.split(" ")[0]==="webError:"){if(webState.showCommsMessages)displayRawMessage(message);if(message.length>10)showError(message.slice(10));return}let parsedMessage=_parseIrcMessage(message)
;if(webState.viewRawMessages){if(webState.showRawInHex)displayRawMessageInHex(message);displayRawMessage(message)}else{
if(ircMessageCommandDisplayFilter.indexOf(parsedMessage.command.toUpperCase())<0){displayFormattedServerMessage(parsedMessage,message)}}
if(parseInt(parsedMessage.command)>=400&&parseInt(parsedMessage.command)<500){_showNotExpiredError(message.slice(12,message.length))}switch(parsedMessage.command){case"ERROR":
if(!ircState.ircRegistered&&parsedMessage.params.length===1){if(webState.cacheInhibitTimer===0){showError("ERROR "+parsedMessage.params[0])}}break;case"KICK":displayChannelMessage(parsedMessage);break
;case"JOIN":displayChannelMessage(parsedMessage);break;case"MODE":if(true){if(parsedMessage.params[0]===ircState.nickName){if(!webState.viewRawMessages){
displayFormattedServerMessage(parsedMessage,message)}}else if(channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0))>=0){displayChannelMessage(parsedMessage)}else{
console.log("Error message MODE to unknown recipient")}}break;case"NICK":if(true){let pureNick1=parsedMessage.nick.toLowerCase();if(nicknamePrefixChars.indexOf(pureNick1.charAt(0))>=0){
pureNick1=pureNick1.slice(1,pureNick1.length)}let pureNick2=parsedMessage.params[0].toLowerCase();if(nicknamePrefixChars.indexOf(pureNick2.charAt(0))>=0){pureNick2=pureNick2.slice(1,pureNick2.length)}
let present=false;if(ircState.channels.length>0){for(let i=0;i<ircState.channels.length;i++){if(ircState.channelStates[i].joined&&ircState.channelStates[i].names.length>0){
for(let j=0;j<ircState.channelStates[i].names.length;j++){let checkNick=ircState.channelStates[i].names[j].toLowerCase();if(nicknamePrefixChars.indexOf(checkNick.charAt(0))>=0){
checkNick=checkNick.slice(1,checkNick.length)}if(checkNick===pureNick1)present=true;if(checkNick===pureNick2)present=true}}}}if(present){displayChannelMessage(parsedMessage)}else{
displayFormattedServerMessage(parsedMessage,message)}}break;case"PART":displayChannelMessage(parsedMessage);break;case"NOTICE":if(true){if(!parsedMessage.nick||parsedMessage.nick.length===0){
if(!webState.viewRawMessages){displayFormattedServerMessage(parsedMessage,message)}}else{const ctcpDelim=1;if(parsedMessage.params[1]===null)parsedMessage.params[1]=""
;if(parsedMessage.params[1].charCodeAt(0)===ctcpDelim){_parseCtcpMessage(parsedMessage)}else{displayNoticeMessage(parsedMessage)}}}break;case"PRIVMSG":if(true){const ctcpDelim=1
;if(parsedMessage.params[1].charCodeAt(0)===ctcpDelim){_parseCtcpMessage(parsedMessage)}else{let index=ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());if(index>=0){
displayChannelMessage(parsedMessage)}else{displayPrivateMessage(parsedMessage)}}}break;case"QUIT":if(true){let pureNick=parsedMessage.nick.toLowerCase()
;if(nicknamePrefixChars.indexOf(pureNick.charAt(0))>=0){pureNick=pureNick.slice(1,pureNick.length)}let present=false;if(ircState.channels.length>0){for(let i=0;i<ircState.channels.length;i++){
if(ircState.channelStates[i].joined&&ircState.channelStates[i].names.length>0){for(let j=0;j<ircState.channelStates[i].names.length;j++){let checkNick=ircState.channelStates[i].names[j].toLowerCase()
;if(nicknamePrefixChars.indexOf(checkNick.charAt(0))>=0){checkNick=checkNick.slice(1,checkNick.length)}if(checkNick===pureNick)present=true}}}}if(present){displayChannelMessage(parsedMessage)}else{
displayFormattedServerMessage(parsedMessage,message)}}break;case"TOPIC":if(true){if(channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0))>=0){displayChannelMessage(parsedMessage)}else{
console.log("Error message TOPIC to unknown channel")}}break;case"WALLOPS":displayWallopsMessage(parsedMessage);break;default:}}}"use strict";function initWebSocketAuth(callback){
let fetchURL=webServerUrl+"/irc/wsauth";let fetchOptions={method:"POST",headers:{"Content-type":"application/json",Accept:"application/json"},body:JSON.stringify({purpose:"websocket-auth"})}
;fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{if(callback){
callback(null,ircState)}}).catch(error=>{console.log(error);webState.webConnected=false;webState.webConnecting=false;updateDivVisibility();if(callback){callback(error,{})}})}
function connectWebSocket(){wsocket=new WebSocket(webSocketUrl+"/irc/ws");webState.websocketCount++;wsocket.addEventListener("open",function(event){webState.webConnected=true
;webState.webConnecting=false;webState.times.webConnect=unixTimestamp();webState.count.webConnect++;resetHeartbeatTimer();updateDivVisibility();getIrcState(function(err,data){if(!err){
document.dispatchEvent(new CustomEvent("update-from-cache",{bubbles:true}))}})});wsocket.addEventListener("close",function(event){if(webState.websocketCount>0){webState.websocketCount--
;if(webState.websocketCount===0){if(webState.webConnected){if("code"in event&&event.code===3001){document.getElementById("reconnectStatusDiv").textContent+="Web page disconnected at user request\n"
}else{document.getElementById("reconnectStatusDiv").textContent+="Web socket connection closed, count: "+webState.websocketCount+"\n"+"Code: "+event.code+" "+event.reason+"\n"
;if(!webState.webConnectOn){document.getElementById("reconnectStatusDiv").textContent+="Automatic web reconnect is disabled. \nPlease reconnect manually.\n"}}}webState.webConnected=false
;webState.webConnecting=false;setVariablesShowingIRCDisconnected();updateDivVisibility()}}});wsocket.addEventListener("error",function(error){console.log("Websocket error");webState.webConnected=false
;webState.webConnecting=false});var previousBufferFragment="";function parseStreamBuffer(inBuffer){if(!inBuffer)return;let data=previousBufferFragment.concat(inBuffer);previousBufferFragment=""
;let len=data.length;if(len===0)return;let index=0;let count=0;for(let i=0;i<len;i++){let charCode=data.charCodeAt(i);if(charCode!==10&&charCode!==13){count=count+1}else{if(count>0){
let message=data.slice(index,index+count);_parseBufferMessage(message)}index=i+1;count=0}}if(count>0){previousBufferFragment=data.slice(index,index+count)}}
wsocket.addEventListener("message",function(event){parseStreamBuffer(event.data)})}function _sendIrcServerMessage(message){if(!checkConnect(3))return;let body={message:message}
;let fetchURL=webServerUrl+"/irc/message";let fetchOptions={method:"POST",headers:{"Content-type":"application/json",Accept:"application/json"},body:JSON.stringify(body)}
;fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{if(response.status===403)window.location.href="/login"
;throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{if(responseJson.error){showError(responseJson.message)}}).catch(error=>{showError(error.toString())
;console.log(error)})}function reconnectWebSocketAfterDisconnect(){let statusURL=webServerUrl+"/status";let secureStatusURL=webServerUrl+"/secure";let fetchOptions={method:"GET",headers:{
Accept:"application/json"}};fetch(statusURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{throw new Error("Fetch status "+response.status+" "+response.statusText)}
}).then(responseJson=>{document.getElementById("reconnectStatusDiv").textContent+="Server found, Checking authoriztion.\n";fetch(secureStatusURL,fetchOptions).then(response=>{if(response.ok){
return response.json()}else{if(response.status===403)window.location.href="/login";throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{
document.getElementById("reconnectStatusDiv").textContent+="Authorizton confirmed, opening web socket.\n";initWebSocketAuth(function(err,data){if(err){showError("Error connecting web socket")
;console.log(err);document.getElementById("reconnectStatusDiv").textContent+="Error: authorizing websocket.\n";webState.webConnected=false;webState.webConnecting=false;updateDivVisibility()}else{
setTimeout(function(){connectWebSocket()}.bind(this),100)}})}).catch(error=>{console.log(error);document.getElementById("reconnectStatusDiv").textContent+="Error: Error checking authorization\n"
;webState.webConnected=false;webState.webConnecting=false;updateDivVisibility()})}).catch(error=>{console.log(error)
;document.getElementById("reconnectStatusDiv").textContent+="Error: No internet or server down\n";webState.webConnected=false;webState.webConnecting=false;updateDivVisibility()})}
function firstWebSocketConnectOnPageLoad(){if(!webState.webConnected&&!webState.webConnecting){webState.webConnecting=true;initWebSocketAuth(function(err,data){if(err){
showError("Error connecting web socket");console.log(err)}else{setTimeout(function(){connectWebSocket()}.bind(this),100)}})}}
document.getElementById("manualWebSocketReconnectButton").addEventListener("click",function(){if(!webState.webConnected&&!webState.webConnecting){webState.webConnectOn=true;webState.webConnecting=true
;updateDivVisibility();document.getElementById("reconnectStatusDiv").textContent+="Reconnect to web server initiated (Manual)\n";reconnectWebSocketAfterDisconnect()}})
;var webStatusIconTouchDebounce=false;document.getElementById("webConnectIconId").addEventListener("click",function(){if(webStatusIconTouchDebounce)return;webStatusIconTouchDebounce=true
;setTimeout(function(){webStatusIconTouchDebounce=false},1e3);if(!webState.webConnected&&!webState.webConnecting){webState.webConnectOn=true;webState.webConnecting=true;updateDivVisibility()
;document.getElementById("reconnectStatusDiv").textContent+="Reconnect to web server initiated (Manual)\n";reconnectWebSocketAfterDisconnect();return}if(webState.webConnected){
webState.webConnectOn=false;wsocket.close(3001,"Disconnect on reqeust")}});document.getElementById("stopWebSocketReconnectButton").addEventListener("click",function(){if(!webState.webConnected){
webState.webConnectOn=false;webState.webConnecting=false;document.getElementById("reconnectStatusDiv").textContent="Reconnect disabled\n"}});var wsReconnectCounter=0;var wsReconnectTimer=0
;function reconnectTimerTickHandler(){if(!webState.webConnectOn||webState.webConnected){wsReconnectCounter=0;wsReconnectTimer=0;return}if(webState.webConnecting)return;wsReconnectTimer++
;if(wsReconnectCounter===0){if(wsReconnectTimer>0){webState.webConnecting=true;updateDivVisibility();wsReconnectTimer=0;wsReconnectCounter++
;document.getElementById("reconnectStatusDiv").textContent+="Reconnect to web server initiated (Timer-1)\n";reconnectWebSocketAfterDisconnect()}return}else if(wsReconnectCounter===1){
if(wsReconnectTimer>5){webState.webConnecting=true;updateDivVisibility();wsReconnectTimer=0;wsReconnectCounter++
;document.getElementById("reconnectStatusDiv").textContent+="Reconnect to web server initiated (Timer-2)\n";reconnectWebSocketAfterDisconnect()}return}else if(wsReconnectCounter>10){
webState.webConnectOn=false;updateDivVisibility();if(wsReconnectCounter===11){document.getElementById("reconnectStatusDiv").textContent+="Reconnect disabled\n"}return}else{if(wsReconnectTimer>15){
webState.webConnecting=true;updateDivVisibility();wsReconnectTimer=0;wsReconnectCounter++;document.getElementById("reconnectStatusDiv").textContent+="Reconnect to web server initiated (Timer-3)\n"
;reconnectWebSocketAfterDisconnect()}return}return}"use strict";document.getElementById("cycleNextServerButton").addEventListener("click",function(){if(ircState.ircConnected){
showError("Can not change servers while connected");return}let fetchURL=webServerUrl+"/irc/server";let fetchOptions={method:"POST",headers:{"Content-type":"application/json",Accept:"application/json"
},body:JSON.stringify({index:-1})};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{throw new Error("Fetch status "+response.status+" "+response.statusText)}
}).then(responseJson=>{if(responseJson.error){showError(responseJson.message)}else{webState.lastIrcServerIndex=-1}}).catch(error=>{console.log(error);showError(error.toString())})})
;function connectButtonHandler(){if(!checkConnect(1))return;if(ircState.ircConnected||ircState.ircConnecting||webState.ircConnecting){showError("Error: Already connected to IRC server");return}
if(document.getElementById("nickNameInputId").value.length<1){showError("Invalid nick name.");return}webState.ircConnecting=true;let connectObject={}
;connectObject.nickName=document.getElementById("nickNameInputId").value;connectObject.userName=document.getElementById("userNameInputId").value
;connectObject.realName=document.getElementById("realNameInputId").value;connectObject.userMode=document.getElementById("userModeInputId").value;let fetchURL=webServerUrl+"/irc/connect"
;let fetchOptions={method:"POST",headers:{"Content-type":"application/json",Accept:"application/json"},body:JSON.stringify(connectObject)};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){
return response.json()}else{if(response.status===403)window.location.href="/login";throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{
if(responseJson.error){showError(responseJson.message)}}).catch(error=>{console.log(error)})}function forceDisconnectHandler(){console.log("Disconnect button pressed.")
;let fetchURL=webServerUrl+"/irc/disconnect";let fetchOptions={method:"POST",headers:{"Content-type":"application/json",Accept:"application/json"},body:JSON.stringify({})}
;fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{
console.log(JSON.stringify(responseJson,null,2));if(responseJson.error){showError(responseJson.message)}}).catch(error=>{console.log(error)})}
document.getElementById("connectButton").addEventListener("click",function(){connectButtonHandler()}.bind(this));document.getElementById("disconnectButton").addEventListener("click",function(){
forceDisconnectHandler()}.bind(this));var ircStatusIconTouchDebounce=false;document.getElementById("ircConnectIconId").addEventListener("click",function(){if(ircStatusIconTouchDebounce)return
;ircStatusIconTouchDebounce=true;setTimeout(function(){ircStatusIconTouchDebounce=false},1e3);if(ircState.ircConnected||ircState.ircConnecting||webState.ircConnecting){
if(webState.ircConnecting||ircState.webConnecting||ircState.ircConnected&&!ircState.ircRegistered){webState.ircConnecting=false;forceDisconnectHandler()}else{_sendIrcServerMessage("QUIT")}}else{
connectButtonHandler()}}.bind(this));document.getElementById("quitButton").addEventListener("click",function(){
if(webState.ircConnecting||ircState.webConnecting||ircState.ircConnected&&!ircState.ircRegistered){webState.ircConnecting=false;forceDisconnectHandler()}else{_sendIrcServerMessage("QUIT")}})
;document.getElementById("hideLoginSectionButton").addEventListener("click",function(){if(document.getElementById("hideLoginSection").hasAttribute("hidden")){
document.getElementById("hideLoginSection").removeAttribute("hidden");document.getElementById("hideLoginSectionButton").textContent="-"}else{
document.getElementById("hideLoginSection").setAttribute("hidden","");document.getElementById("hideLoginSectionButton").textContent="+"}})
;document.getElementById("webLogoutButton").addEventListener("click",function(){if(ircState.ircConnected&&webState.webConnected||!webState.webConnected){
document.getElementById("logoutConfirmDiv").removeAttribute("hidden")}else{window.location.href="/logout"}});document.getElementById("cancelLogoutConfirmButton").addEventListener("click",function(){
document.getElementById("logoutConfirmDiv").setAttribute("hidden","")});document.getElementById("ircIsAwayIconId").addEventListener("click",function(){if(ircState.ircConnected&&ircState.ircIsAway){
_sendIrcServerMessage("AWAY")}});document.getElementById("setAwayButton").addEventListener("click",function(){if(ircState.ircConnected&&document.getElementById("userAwayMessageId").value.length>0){
_sendIrcServerMessage("AWAY "+document.getElementById("userAwayMessageId").value)}});document.getElementById("setBackButton").addEventListener("click",function(){
if(ircState.ircConnected&&ircState.ircIsAway){_sendIrcServerMessage("AWAY")}});"use strict"
;const autoCompleteCommandList=["/ADMIN","/AWAY","/CTCP","/JOIN","/LIST","/ME","/MODE","/MOTD","/MSG","/NICK","/NOP","/NOTICE","/PART","/QUERY","/QUIT","/QUOTE","/TOPIC","/VERSION","/WHO","/WHOIS"]
;function detectMultiLineString(inString){let inLength=inString.length;if(inLength>0&&inString.charCodeAt(inLength-1)===10)inLength--;if(inLength>0){let countCR=0;for(let i=0;i<inLength;i++){
if(inString.charCodeAt(i)===10)countCR++}if(countCR===0){return false}else{return true}}else{return false}}function stripTrailingCrLf(inString){let inLength=inString.length
;if(inLength>0&&inString.charCodeAt(inLength-1)===10)inLength--;if(inLength>0&&inString.charCodeAt(inLength-1)===13)inLength--;if(inLength>0&&inString.charCodeAt(inLength-1)===32)inLength--
;if(inLength>0&&inString.charCodeAt(inLength-1)===32)inLength--;if(inLength===0){return""}else{return inString.slice(0,inLength)}}function textCommandParser(inputObj){function _isWS(inChar){
if(inChar.charAt(0)===" ")return true;if(inChar.charCodeAt(0)===9)return true;return false}function _isEOL(inChar){if(inChar.charAt(0)==="\n")return true;if(inChar.charAt(0)==="\r")return true
;return false}let inStr=inputObj.inputString;if(inStr.length>0&&_isEOL(inStr.charAt(inStr.length-1))){inStr=inStr.slice(0,inStr.length-1)}if(inStr.length>0&&_isEOL(inStr.charAt(inStr.length-1))){
inStr=inStr.slice(0,inStr.length-1)}let inStrLen=inStr.length;let parsedCommand={command:"",params:[],restOf:[]};if(inStr.length<2){return{error:true,message:"Error no command not found",
ircMessage:null}}if(inStr.charAt(0)!=="/"){return{error:true,message:"Error missing / before command",ircMessage:null}}if(_isWS(inStr.charAt(1))){return{error:true,message:"Error space after slash",
ircMessage:null}}var idx=1;while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){parsedCommand.command+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen){idx++}
parsedCommand.command=parsedCommand.command.toUpperCase();if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(null);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars1=""
;while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars1+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen){idx++}if(inStr.slice(idx,inStrLen).length>0){
parsedCommand.params.push(chars1);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars2="";while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars2+=inStr.charAt(idx);idx++}
while(_isWS(inStr.charAt(idx))&&idx<inStrLen){idx++}if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(chars2);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars3=""
;while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars3+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen){idx++}if(inStr.slice(idx,inStrLen).length>0){
parsedCommand.params.push(chars3);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars4="";while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars4+=inStr.charAt(idx);idx++}
while(_isWS(inStr.charAt(idx))&&idx<inStrLen){idx++}if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(chars4);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars5=""
;while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars5+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen){idx++}if(inStr.slice(idx,inStrLen).length>0){
parsedCommand.params.push(chars5);parsedCommand.restOf.push(inStr.slice(idx,inStrLen))}}}}}}let ircMessage=null;switch(parsedCommand.command){case"ADMIN":showRawMessageWindow();ircMessage="ADMIN"
;if(parsedCommand.restOf.length===1){ircMessage="ADMIN "+parsedCommand.restOf[0]}break;case"AWAY":ircMessage="AWAY";if(parsedCommand.restOf.length>0){ircMessage="AWAY :"+parsedCommand.restOf[0]}break
;case"CTCP":if(true){let ctcpDelim=1;if(parsedCommand.params.length!==2){return{error:true,message:"Expect: /CTCP <nickname> <ctcp_command>",ircMessage:null}}
ircMessage="PRIVMSG "+parsedCommand.params[1]+" :"+String.fromCharCode(ctcpDelim)+parsedCommand.restOf[1].toUpperCase()+String.fromCharCode(ctcpDelim)}break;case"JOIN":
if(parsedCommand.params.length<1){return{error:true,message:"Expect: /JOIN <#channel>",ircMessage:null}}if(parsedCommand.params.length===1){ircMessage="JOIN "+parsedCommand.restOf[0]}
if(parsedCommand.params.length===2){ircMessage="JOIN "+parsedCommand.params[1]+" "+parsedCommand.restOf[1]}break;case"LIST":showRawMessageWindow();if(parsedCommand.params.length===0){ircMessage="LIST"
}else{ircMessage="LIST "+parsedCommand.restOf[0]}break;case"ME":if(true){if(parsedCommand.params.length<1){return{error:true,message:"Expect: /ME <action-message>",ircMessage:null}}let ctcpDelim=1
;if(inputObj.originType==="channel"){ircMessage="PRIVMSG "+inputObj.originName+" :"+String.fromCharCode(ctcpDelim)+"ACTION "+parsedCommand.restOf[0]+String.fromCharCode(ctcpDelim)}
if(inputObj.originType==="private"){ircMessage="PRIVMSG "+inputObj.originName+" :"+String.fromCharCode(ctcpDelim)+"ACTION "+parsedCommand.restOf[0]+String.fromCharCode(ctcpDelim)}}break;case"MODE":
if(true){if(parsedCommand.restOf.length===0&&inputObj.originType!=="channel"){ircMessage="MODE "+ircState.nickName
}else if(parsedCommand.restOf.length===1&&parsedCommand.restOf[0].toLowerCase()===ircState.nickName.toLowerCase()){ircMessage="MODE "+ircState.nickName
}else if(parsedCommand.restOf.length===2&&parsedCommand.params[1].toLowerCase()===ircState.nickName.toLowerCase()&&parsedCommand.restOf[1].length>0){
ircMessage="MODE "+ircState.nickName+" "+parsedCommand.restOf[1]}else if(parsedCommand.restOf.length===0&&inputObj.originType==="channel"){ircMessage="MODE "+inputObj.originName
}else if(parsedCommand.restOf.length===1&&ircState.channels.indexOf(parsedCommand.restOf[0].toLowerCase())>=0){ircMessage="MODE "+parsedCommand.restOf[0]
}else if(parsedCommand.restOf.length>0&&inputObj.originType==="channel"&&(parsedCommand.restOf[0].charAt(0)==="+"||parsedCommand.restOf[0].charAt(0)==="-"||parsedCommand.restOf[0].charAt(0)==="b")){
ircMessage="MODE "+inputObj.originName+" "+parsedCommand.restOf[0]}else if(parsedCommand.restOf.length>1&&ircState.channels.indexOf(parsedCommand.params[1].toLowerCase())>=0){
ircMessage="MODE "+parsedCommand.params[1]+" "+parsedCommand.restOf[1]}else{return{error:true,message:"Expect: /MODE <nickname> [user-mode] or /MODE <#channel> <channel-mode>",ircMessage:null}}}break
;case"MOTD":showRawMessageWindow();ircMessage="MOTD";if(parsedCommand.restOf.length===1){ircMessage="MOTD "+parsedCommand.restOf[0]}break;case"MSG":
if(parsedCommand.params.length>1&&channelPrefixChars.indexOf(parsedCommand.params[1].charAt(0))<0){ircMessage="PRIVMSG "+parsedCommand.params[1]+" :"+parsedCommand.restOf[1]}else{return{error:true,
message:"Expect: /MSG <nickname> <message-text>",ircMessage:null}}break;case"NICK":if(parsedCommand.params.length<1){return{error:true,message:"Expect: /NICK <new-nickname>",ircMessage:null}}
showRawMessageWindow();ircMessage="NICK "+parsedCommand.restOf[0];break;case"NOP":console.log("textCommandParser inputObj:"+JSON.stringify(inputObj,null,2))
;console.log("parsedCommand "+JSON.stringify(parsedCommand,null,2));return{error:false,message:null,ircMessage:null};break;case"NOTICE":
if(parsedCommand.params.length>1&&parsedCommand.restOf[1].length>0){ircMessage="NOTICE "+parsedCommand.params[1]+" :"+parsedCommand.restOf[1]}else{return{error:true,
message:"Expect: /NOTICE <nickname> <message-text>",ircMessage:null}}break;case"PART":if(parsedCommand.params.length<1){if(inputObj.originType==="channel"){ircMessage="PART "+inputObj.originName}else{
return{error:true,message:"Expect: /PART #channel [Optional message]",ircMessage:null}}}else{if(parsedCommand.params.length===1){ircMessage="PART "+parsedCommand.restOf[0]}else{
ircMessage="PART "+parsedCommand.params[1]+" :"+parsedCommand.restOf[1]}}break;case"QUERY":if(parsedCommand.params.length>1&&channelPrefixChars.indexOf(parsedCommand.params[1].charAt(0))<0){
ircMessage="PRIVMSG "+parsedCommand.params[1]+" :"+parsedCommand.restOf[1]}else{return{error:true,message:"Expect: /QUERY <nickname> <message-text>",ircMessage:null}}break;case"QUIT":ircMessage="QUIT"
;if(parsedCommand.restOf.length>0){ircMessage="QUIT :"+parsedCommand.restOf[0]}break;case"QUOTE":if(parsedCommand.restOf.length>0){showRawMessageWindow();ircMessage=parsedCommand.restOf[0]}else{
return{error:true,message:"Expect: /QUOTE RAWCOMMAND [arguments]",ircMessage:null}}break;case"TOPIC":
if(parsedCommand.params.length>1&&ircState.channels.indexOf(parsedCommand.params[1].toLowerCase())>=0){ircMessage="TOPIC "+parsedCommand.params[1]+" :"+parsedCommand.restOf[1]
}else if(parsedCommand.params.length>0&&channelPrefixChars.indexOf(parsedCommand.restOf[0].charAt(0))<0&&inputObj.originType==="channel"){
ircMessage="TOPIC "+inputObj.originName+" :"+parsedCommand.restOf[0]}else{return{error:true,message:"Expect: /TOPIC <#channel> <New-channel-topic-message>",ircMessage:null}}break;case"VERSION":
showRawMessageWindow();ircMessage="VERSION";if(parsedCommand.restOf.length===1){ircMessage="VERSION "+parsedCommand.restOf[0]}break;case"WHO":if(parsedCommand.params.length===0){showRawMessageWindow()
;ircMessage="WHO"}else{showRawMessageWindow();ircMessage="WHO "+parsedCommand.restOf[0]}break;case"WHOIS":if(parsedCommand.params.length<1){return{error:true,message:"Expect: /WHOIS <nickname>",
ircMessage:null}}showRawMessageWindow();ircMessage="WHOIS "+parsedCommand.restOf[0];break;default:}if(ircMessage){return{error:false,message:null,ircMessage:ircMessage}}return{error:true,
message:'Command "/'+parsedCommand.command+'" unknown command.',ircMessage:null}}"use strict";function _sendTextToChannel(channelIndex,textAreaEl){let text=stripTrailingCrLf(textAreaEl.value)
;if(detectMultiLineString(text)){textAreaEl.value="";showError("Multi-line input is not supported.")}else{if(text.length>0){if(text.charAt(0)==="/"){let commandAction=textCommandParser({
inputString:text,originType:"channel",originName:ircState.channelStates[channelIndex].name});textAreaEl.value="";if(commandAction.error){showError(commandAction.message);return}else{
if(commandAction.ircMessage&&commandAction.ircMessage.length>0){_sendIrcServerMessage(commandAction.ircMessage)}return}}let message="PRIVMSG "+ircState.channelStates[channelIndex].name+" :"+text
;_sendIrcServerMessage(message);textAreaEl.value=""}}textAreaEl.value=""}function createChannelEl(name){if(webState.channels.indexOf(name.toLowerCase())>=0){
console.log("createChannelEl: channel already exist");return}const defaultHeightInRows="17";webState.channels.push(name.toLowerCase())
;let initIrcStateIndex=ircState.channels.indexOf(name.toLowerCase());webState.channelStates.push({lastJoined:ircState.channelStates[initIrcStateIndex].joined});var maxNickLength=0
;let channelIndex=ircState.channels.indexOf(name.toLowerCase());let channelContainerDivEl=document.getElementById("channelContainerDiv");let channelMainSectionEl=document.createElement("div")
;channelMainSectionEl.classList.add("color-channel");channelMainSectionEl.classList.add("aa-section-div");let channelTopDivEl=document.createElement("div")
;channelTopDivEl.classList.add("channel-top-div");channelTopDivEl.classList.add("head-flex");let channelTopLeftDivEl=document.createElement("div");channelTopLeftDivEl.classList.add("head-left")
;let channelTopRightDivEl=document.createElement("div");channelTopRightDivEl.classList.add("head-right");let channelTopRightHidableDivEl=document.createElement("div")
;channelTopRightHidableDivEl.classList.add("head-right-hidable-div");let channelHideButtonEl=document.createElement("button");channelHideButtonEl.textContent="-"
;channelHideButtonEl.classList.add("channel-button");let channelNameDivEl=document.createElement("div");channelNameDivEl.textContent=ircState.channelStates[channelIndex].name
;channelNameDivEl.classList.add("chan-name-div");let channelTallerButtonEl=document.createElement("button");channelTallerButtonEl.textContent="Taller"
;channelTallerButtonEl.classList.add("channel-button");let channelNormalButtonEl=document.createElement("button");channelNormalButtonEl.textContent="Normal"
;channelNormalButtonEl.classList.add("channel-button");let channelClearButtonEl=document.createElement("button");channelClearButtonEl.textContent="Clear"
;channelClearButtonEl.classList.add("channel-button");let channelBottomDivEl=document.createElement("div");channelBottomDivEl.classList.add("channel-bottom-div")
;let channelTopicDivEl=document.createElement("div");channelTopicDivEl.textContent=cleanFormatting(ircState.channelStates[channelIndex].topic);channelTopicDivEl.classList.add("chan-topic-div")
;let channelNamesDisplayEl=document.createElement("textarea");channelNamesDisplayEl.classList.add("channel-names-display");channelNamesDisplayEl.setAttribute("cols","20")
;channelNamesDisplayEl.setAttribute("rows",defaultHeightInRows);channelNamesDisplayEl.setAttribute("spellCheck","false");channelNamesDisplayEl.setAttribute("readonly","")
;let channelTextAreaEl=document.createElement("textarea");let channelTextAreaId="chan"+channelIndex.toString()+"TextAreaId";channelTextAreaEl.id=channelTextAreaId
;channelTextAreaEl.setAttribute("cols","30");channelTextAreaEl.setAttribute("rows",defaultHeightInRows);channelTextAreaEl.setAttribute("spellCheck","false")
;channelTextAreaEl.setAttribute("readonly","");let channelBottomDiv1El=document.createElement("div");channelBottomDiv1El.classList.add("button-div")
;let channelInputAreaEl=document.createElement("textarea");let channelInputAreaId="chan"+channelIndex.toString()+"InputInputId";channelInputAreaEl.id=channelInputAreaId
;channelInputAreaEl.setAttribute("cols","120");channelInputAreaEl.setAttribute("rows","1");channelInputAreaEl.classList.add("va-middle");channelInputAreaEl.classList.add("rm10")
;let channelSendButtonEl=document.createElement("button");channelSendButtonEl.textContent="Send";channelSendButtonEl.classList.add("va-middle");let channelBottomDiv2El=document.createElement("div")
;channelBottomDiv2El.classList.add("button-div");let channelJoinButtonEl=document.createElement("button");channelJoinButtonEl.textContent="Join";channelJoinButtonEl.classList.add("channel-button")
;let channelPartButtonEl=document.createElement("button");channelPartButtonEl.textContent="Leave";channelPartButtonEl.classList.add("channel-button")
;let channelPruneButtonEl=document.createElement("button");channelPruneButtonEl.textContent="Prune";channelPruneButtonEl.classList.add("channel-button")
;let channelRefreshButtonEl=document.createElement("button");channelRefreshButtonEl.textContent="Refresh";channelRefreshButtonEl.classList.add("channel-button")
;let channelBottomDiv3El=document.createElement("div");channelBottomDiv3El.classList.add("button-div");let channelFormatCBInputEl=document.createElement("input")
;channelFormatCBInputEl.classList.add("channel-cb-cb");channelFormatCBInputEl.setAttribute("type","checkbox");let channelFormatCBTitleEl=document.createElement("span")
;channelFormatCBTitleEl.classList.add("channel-cb-span");channelFormatCBTitleEl.textContent="Brief";let channelAutoCompCBInputEl=document.createElement("input")
;channelAutoCompCBInputEl.classList.add("channel-cb-cb");channelAutoCompCBInputEl.setAttribute("type","checkbox");let channelAutoCompCBTitleEl=document.createElement("span")
;channelAutoCompCBTitleEl.classList.add("channel-cb-span");channelAutoCompCBTitleEl.textContent="Auto-complete (tab, space-space)";let channelBottomDiv4El=document.createElement("div")
;channelBottomDiv4El.classList.add("button-div");let channelBeep1CBInputEl=document.createElement("input");channelBeep1CBInputEl.classList.add("channel-cb-cb")
;channelBeep1CBInputEl.setAttribute("type","checkbox");let channelBeep1CBTitleEl=document.createElement("span");channelBeep1CBTitleEl.classList.add("channel-cb-span")
;channelBeep1CBTitleEl.textContent="Line-beep";let channelBeep2CBInputEl=document.createElement("input");channelBeep2CBInputEl.classList.add("channel-cb-cb")
;channelBeep2CBInputEl.setAttribute("type","checkbox");let channelBeep2CBTitleEl=document.createElement("span");channelBeep2CBTitleEl.classList.add("channel-cb-span")
;channelBeep2CBTitleEl.textContent="Join-beep";let channelBeep3CBInputEl=document.createElement("input");channelBeep3CBInputEl.classList.add("channel-cb-cb")
;channelBeep3CBInputEl.setAttribute("type","checkbox");let channelBeep3CBTitleEl=document.createElement("span");channelBeep3CBTitleEl.classList.add("channel-cb-span")
;channelBeep3CBTitleEl.textContent="Name-beep";channelTopLeftDivEl.appendChild(channelHideButtonEl);channelTopLeftDivEl.appendChild(channelNameDivEl)
;channelTopRightHidableDivEl.appendChild(channelJoinButtonEl);channelTopRightHidableDivEl.appendChild(channelPruneButtonEl);channelTopRightHidableDivEl.appendChild(channelPartButtonEl)
;channelTopRightDivEl.appendChild(channelTopRightHidableDivEl);channelTopDivEl.appendChild(channelTopLeftDivEl);channelTopDivEl.appendChild(channelTopRightDivEl)
;channelBottomDiv1El.appendChild(channelInputAreaEl);channelBottomDiv1El.appendChild(channelSendButtonEl);channelBottomDiv2El.appendChild(channelRefreshButtonEl)
;channelBottomDiv2El.appendChild(channelClearButtonEl);channelBottomDiv2El.appendChild(channelTallerButtonEl);channelBottomDiv2El.appendChild(channelNormalButtonEl)
;channelBottomDiv3El.appendChild(channelFormatCBInputEl);channelBottomDiv3El.appendChild(channelFormatCBTitleEl);channelBottomDiv3El.appendChild(channelAutoCompCBInputEl)
;channelBottomDiv3El.appendChild(channelAutoCompCBTitleEl);channelBottomDiv4El.appendChild(channelBeep1CBInputEl);channelBottomDiv4El.appendChild(channelBeep1CBTitleEl)
;channelBottomDiv4El.appendChild(channelBeep2CBInputEl);channelBottomDiv4El.appendChild(channelBeep2CBTitleEl);channelBottomDiv4El.appendChild(channelBeep3CBInputEl)
;channelBottomDiv4El.appendChild(channelBeep3CBTitleEl);channelBottomDivEl.appendChild(channelTopicDivEl);channelBottomDivEl.appendChild(channelNamesDisplayEl)
;channelBottomDivEl.appendChild(channelTextAreaEl);channelBottomDivEl.appendChild(channelBottomDiv1El);channelBottomDivEl.appendChild(channelBottomDiv2El)
;channelBottomDivEl.appendChild(channelBottomDiv3El);channelBottomDivEl.appendChild(channelBottomDiv4El);channelMainSectionEl.appendChild(channelTopDivEl)
;channelMainSectionEl.appendChild(channelBottomDivEl);if(channelContainerDivEl.firstChild){channelContainerDivEl.insertBefore(channelMainSectionEl,channelContainerDivEl.firstChild)}else{
channelContainerDivEl.appendChild(channelMainSectionEl)}if(ircState.channelStates[initIrcStateIndex].joined){hideRawMessageWindow()}var activityIconInhibitTimer=0;setInterval(function(){
if(activityIconInhibitTimer>0)activityIconInhibitTimer--}.bind(this),1e3);channelHideButtonEl.addEventListener("click",function(){if(channelBottomDivEl.hasAttribute("hidden")){
channelBottomDivEl.removeAttribute("hidden");channelHideButtonEl.textContent="-";channelTopRightHidableDivEl.removeAttribute("hidden")}else{channelBottomDivEl.setAttribute("hidden","")
;channelHideButtonEl.textContent="+";channelTopRightHidableDivEl.setAttribute("hidden","")}});channelTallerButtonEl.addEventListener("click",function(){
let newRows=parseInt(channelTextAreaEl.getAttribute("rows"))+10;channelTextAreaEl.setAttribute("rows",newRows.toString());channelNamesDisplayEl.setAttribute("rows",newRows.toString())})
;channelNormalButtonEl.addEventListener("click",function(){channelTextAreaEl.setAttribute("rows",defaultHeightInRows);channelNamesDisplayEl.setAttribute("rows",defaultHeightInRows)})
;channelClearButtonEl.addEventListener("click",function(){channelTextAreaEl.value="";channelTextAreaEl.setAttribute("rows",defaultHeightInRows)
;channelNamesDisplayEl.setAttribute("rows",defaultHeightInRows)});document.addEventListener("show-all-divs",function(event){channelBottomDivEl.removeAttribute("hidden")
;channelHideButtonEl.textContent="-";channelTopRightHidableDivEl.removeAttribute("hidden")});document.addEventListener("hide-all-divs",function(event){channelBottomDivEl.setAttribute("hidden","")
;channelHideButtonEl.textContent="+";channelTopRightHidableDivEl.setAttribute("hidden","")});channelJoinButtonEl.addEventListener("click",function(){let message="JOIN "+name
;_sendIrcServerMessage(message)});channelPartButtonEl.addEventListener("click",function(){let message="PART "+name;_sendIrcServerMessage(message)})
;channelPruneButtonEl.addEventListener("click",function(){function _removeChannelFromDom(){let webStateChannelsIndex=webState.channels.indexOf(name.toLowerCase());if(webStateChannelsIndex>=0){
webState.channels.splice(webStateChannelsIndex,1);webState.channelStates.splice(webStateChannelsIndex,1)}let tempIndex1=webState.resizableSendButtonTextareaIds.indexOf(channelInputAreaId)
;if(tempIndex1>=0){webState.resizableSendButtonTextareaIds.splice(tempIndex1,1)}let tempIndex2=webState.resizableChanSplitTextareaIds.indexOf(channelTextAreaId);if(tempIndex2>=0){
webState.resizableChanSplitTextareaIds.splice(tempIndex2,1)}channelContainerDivEl.removeChild(channelMainSectionEl)}let index=ircState.channels.indexOf(name.toLowerCase());if(index>=0){
if(!ircState.channelStates[index].joined){let fetchURL=webServerUrl+"/irc/prune";let fetchOptions={method:"POST",headers:{"Content-type":"application/json",Accept:"application/json"},
body:JSON.stringify({channel:name})};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{throw new Error("Fetch status "+response.status+" "+response.statusText)}
}).then(responseJson=>{if(responseJson.error){showError(responseJson.message)}else{_removeChannelFromDom()}}).catch(error=>{console.log(error)})}}else{_removeChannelFromDom()}})
;channelRefreshButtonEl.addEventListener("click",function(){document.dispatchEvent(new CustomEvent("update-from-cache",{bubbles:true}));channelNamesDisplayEl.value=""
;_sendIrcServerMessage("NAMES "+name)});channelSendButtonEl.addEventListener("click",function(){_sendTextToChannel(channelIndex,channelInputAreaEl);channelInputAreaEl.focus()
;resetChanActivityIcon(channelIndex);activityIconInhibitTimer=activityIconInhibitTimerValue}.bind(this));channelInputAreaEl.addEventListener("input",function(event){
if(event.inputType==="insertText"&&event.data===null||event.inputType==="insertLineBreak"){_sendTextToChannel(channelIndex,channelInputAreaEl);resetChanActivityIcon(channelIndex)
;activityIconInhibitTimer=activityIconInhibitTimerValue}}.bind(this));channelMainSectionEl.addEventListener("click",function(){resetChanActivityIcon(channelIndex)
;activityIconInhibitTimer=activityIconInhibitTimerValue}.bind(this));function updateVisibility(){let index=ircState.channels.indexOf(name.toLowerCase());if(index>=0){
if(ircState.channelStates[index].joined){channelTopicDivEl.textContent=cleanFormatting(ircState.channelStates[index].topic);channelNamesDisplayEl.removeAttribute("disabled")
;channelTextAreaEl.removeAttribute("disabled");channelInputAreaEl.removeAttribute("disabled");channelSendButtonEl.removeAttribute("disabled");channelJoinButtonEl.setAttribute("hidden","")
;channelPruneButtonEl.setAttribute("hidden","");channelPartButtonEl.removeAttribute("hidden")}else{channelNamesDisplayEl.setAttribute("disabled","");channelTextAreaEl.setAttribute("disabled","")
;channelInputAreaEl.setAttribute("disabled","");channelSendButtonEl.setAttribute("disabled","");channelJoinButtonEl.removeAttribute("hidden");channelPruneButtonEl.removeAttribute("hidden")
;channelPartButtonEl.setAttribute("hidden","")}if(channelMainSectionEl.hasAttribute("beep1-enabled")){channelBeep1CBInputEl.checked=true}else{channelBeep1CBInputEl.checked=false}
if(channelMainSectionEl.hasAttribute("beep2-enabled")){channelBeep2CBInputEl.checked=true}else{channelBeep2CBInputEl.checked=false}if(channelMainSectionEl.hasAttribute("beep3-enabled")){
channelBeep3CBInputEl.checked=true}else{channelBeep3CBInputEl.checked=false}if(channelMainSectionEl.hasAttribute("brief-enabled")){channelFormatCBInputEl.checked=true}else{
channelFormatCBInputEl.checked=false}if(channelMainSectionEl.hasAttribute("auto-comp-enabled")){channelAutoCompCBInputEl.checked=true}else{channelAutoCompCBInputEl.checked=false}}}
channelBeep1CBInputEl.addEventListener("click",function(e){if(channelMainSectionEl.hasAttribute("beep1-enabled")){channelMainSectionEl.removeAttribute("beep1-enabled")}else{
channelMainSectionEl.setAttribute("beep1-enabled","");playBeep1Sound()}updateVisibility()});channelBeep2CBInputEl.addEventListener("click",function(e){
if(channelMainSectionEl.hasAttribute("beep2-enabled")){channelMainSectionEl.removeAttribute("beep2-enabled")}else{channelMainSectionEl.setAttribute("beep2-enabled","");playBeep1Sound()}
updateVisibility()});channelBeep3CBInputEl.addEventListener("click",function(e){if(channelMainSectionEl.hasAttribute("beep3-enabled")){channelMainSectionEl.removeAttribute("beep3-enabled")}else{
channelMainSectionEl.setAttribute("beep3-enabled","");playBeep2Sound()}updateVisibility()});document.addEventListener("cancel-beep-sounds",function(event){
channelMainSectionEl.removeAttribute("beep1-enabled");channelMainSectionEl.removeAttribute("beep2-enabled");channelMainSectionEl.removeAttribute("beep3-enabled")}.bind(this))
;channelFormatCBInputEl.addEventListener("click",function(){if(channelMainSectionEl.hasAttribute("brief-enabled")){channelMainSectionEl.removeAttribute("brief-enabled")}else{
channelMainSectionEl.setAttribute("brief-enabled","")}document.dispatchEvent(new CustomEvent("update-from-cache",{bubbles:true}))});if(window.innerWidth<600){
channelMainSectionEl.setAttribute("brief-enabled","");channelFormatCBInputEl.checked=true}else{channelMainSectionEl.removeAttribute("brief-enabled");channelFormatCBInputEl.checked=false}
updateVisibility();channelAutoCompCBInputEl.addEventListener("click",function(){if(channelMainSectionEl.hasAttribute("auto-comp-enabled")){channelMainSectionEl.removeAttribute("auto-comp-enabled")
}else{channelMainSectionEl.setAttribute("auto-comp-enabled","")}updateVisibility()});if(window.InputEvent&&typeof InputEvent.prototype.getTargetRanges==="function"){
channelMainSectionEl.setAttribute("auto-comp-enabled","");updateVisibility()}else{channelMainSectionEl.setAttribute("auto-comp-enabled","");updateVisibility()
;channelAutoCompCBInputEl.setAttribute("disabled","")}const _autoCompleteInputElement=function(snippet){let last="";const trailingSpaceKey=32;let matchedCommand=""
;if(autoCompleteCommandList.length>0){for(let i=0;i<autoCompleteCommandList.length;i++){if(autoCompleteCommandList[i].indexOf(snippet.toUpperCase())===0){matchedCommand=autoCompleteCommandList[i]}}}
if(matchedCommand.length>0){channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-snippet.length);channelInputAreaEl.value+=matchedCommand
;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=name}else if(name.toLowerCase().indexOf(snippet.toLowerCase())===0){
channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-snippet.length);channelInputAreaEl.value+=name;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey)
;last=name}else if(ircState.nickName.toLowerCase().indexOf(snippet.toLowerCase())===0){channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-snippet.length)
;channelInputAreaEl.value+=ircState.nickName;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=ircState.nickName}else{let completeNick=""
;let chanIndex=ircState.channels.indexOf(name.toLowerCase());if(chanIndex>=0){if(ircState.channelStates[chanIndex].names.length>0){for(let i=0;i<ircState.channelStates[chanIndex].names.length;i++){
let matchNick=ircState.channelStates[chanIndex].names[i];if(nicknamePrefixChars.indexOf(matchNick.charAt(0))>=0){matchNick=matchNick.slice(1,matchNick.length)}
if(matchNick.toLowerCase().indexOf(snippet.toLowerCase())===0){completeNick=matchNick}}}}if(completeNick.length>0){
channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-snippet.length);channelInputAreaEl.value+=completeNick
;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=completeNick}else{channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey)}}return last};var lastAutoCompleteMatch=""
;const channelAutoComplete=function(e){const autoCompleteTabKey=9;const autoCompleteSpaceKey=32;const trailingSpaceKey=32;if(channelAutoCompCBInputEl.hasAttribute("disabled"))return
;if(!channelMainSectionEl.hasAttribute("auto-comp-enabled"))return;if(!e.keyCode)return;if(e.keyCode&&e.keyCode===autoCompleteTabKey){if(channelInputAreaEl.value.length<2){e.preventDefault();return}
let snippet="";let snippetArray=channelInputAreaEl.value.split(" ");if(snippetArray.length>0){snippet=snippetArray[snippetArray.length-1]}if(snippet.length>0){
if(e.keyCode===autoCompleteTabKey&&snippet.length>0){_autoCompleteInputElement(snippet)}}else{channelInputAreaEl.value+=name;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey)}
e.preventDefault()}if(e.keyCode&&e.keyCode===autoCompleteSpaceKey){if(channelInputAreaEl.value.length>0){
if(channelInputAreaEl.value.charCodeAt(channelInputAreaEl.value.length-1)===autoCompleteSpaceKey){
if(channelInputAreaEl.value.length>1&&channelInputAreaEl.value.charCodeAt(channelInputAreaEl.value.length-2)===autoCompleteSpaceKey){
channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-1);channelInputAreaEl.value+=name;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey)
;e.preventDefault()}else{channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-1);let snippet="";let snippetArray=channelInputAreaEl.value.split(" ")
;if(snippetArray.length>0){snippet=snippetArray[snippetArray.length-1]}if(snippet.length>0){let matchStr=_autoCompleteInputElement(snippet);if(lastAutoCompleteMatch!==matchStr){
lastAutoCompleteMatch=matchStr;e.preventDefault()}}else{channelInputAreaEl.value+=String.fromCharCode(autoCompleteSpaceKey)}}}}else{}}}.bind(this)
;channelInputAreaEl.addEventListener("keydown",channelAutoComplete,false);function _updateNickList(){let index=ircState.channels.indexOf(name.toLowerCase());if(index>=0){maxNickLength=0
;if(ircState.channelStates[index].names.length>0){channelNamesDisplayEl.value="";let opList=[];let otherList=[];for(let i=0;i<ircState.channelStates[index].names.length;i++){
if(ircState.channelStates[index].names[i].charAt(0)==="@"){opList.push(ircState.channelStates[index].names[i])}else{otherList.push(ircState.channelStates[index].names[i])}}
let sortedOpList=opList.sort();let sortedOtherList=otherList.sort();if(sortedOpList.length>0){for(let i=0;i<sortedOpList.length;i++){channelNamesDisplayEl.value+=sortedOpList[i]+"\n"
;if(maxNickLength<sortedOpList[i].length){maxNickLength=sortedOpList[i].length}}}if(sortedOtherList.length>0){for(let i=0;i<sortedOtherList.length;i++){
channelNamesDisplayEl.value+=sortedOtherList[i]+"\n";if(maxNickLength<sortedOtherList[i].length){maxNickLength=sortedOtherList[i].length}}}}}}_updateNickList();function _updateChannelTitle(){
let titleStr=name+" (";let index=ircState.channels.indexOf(name.toLowerCase());if(index>=0){if(ircState.channelStates[index].joined){
titleStr+=parseInt(ircState.channelStates[index].names.length).toString()}else{if(ircState.channelStates[index].kicked){titleStr+="Kicked"}else{titleStr+="0"}}}
channelNameDivEl.textContent=titleStr+")"}_updateChannelTitle();function _isNickInChannel(nickString,channelString){if(!nickString||nickString.length===0)return false
;if(ircState.channels.length===0)return false;let channelIndex=-1;for(let i=0;i<ircState.channels.length;i++){if(channelString.toLowerCase()===ircState.channels[i].toLowerCase())channelIndex=i}
if(channelIndex<0)return false;if(ircState.channelStates[channelIndex].names.length===0)return false;let pureNick=nickString.toLowerCase();if(nicknamePrefixChars.indexOf(pureNick.charAt(0))>=0){
pureNick=pureNick.slice(1,pureNick.length)}let present=false;for(let i=0;i<ircState.channelStates[channelIndex].names.length;i++){
let checkNick=ircState.channelStates[channelIndex].names[i].toLowerCase();if(nicknamePrefixChars.indexOf(checkNick.charAt(0))>=0){checkNick=checkNick.slice(1,checkNick.length)}
if(checkNick===pureNick)present=true}return present}document.addEventListener("irc-state-changed",function(event){let ircStateIndex=ircState.channels.indexOf(name.toLowerCase())
;let webStateIndex=webState.channels.indexOf(name.toLowerCase());if(ircStateIndex>=0&&webStateIndex>=0){
if(ircState.channelStates[ircStateIndex].joined!==webState.channelStates[webStateIndex].lastJoined){if(ircState.channelStates[ircStateIndex].joined&&!webState.channelStates[webStateIndex].lastJoined){
channelBottomDivEl.removeAttribute("hidden");channelHideButtonEl.textContent="-";channelTopRightHidableDivEl.removeAttribute("hidden")}
webState.channelStates[webStateIndex].lastJoined=ircState.channelStates[ircStateIndex].joined}}_updateNickList();_updateChannelTitle();updateVisibility()}.bind(this))
;document.addEventListener("channel-message",function(event){function _addText(timestamp,nick,text){let out="";if(channelMainSectionEl.hasAttribute("brief-enabled")){out=timestamp+" ";if(nick==="*"){
out+=nick+nickChannelSpacer}else{out+=nick+nickChannelSpacer+"\n"}out+=cleanFormatting(text)+"\n\n"}else{out=timestamp+" "+nick.padStart(maxNickLength," ")+nickChannelSpacer+cleanFormatting(text)+"\n"
}channelTextAreaEl.value+=out;channelTextAreaEl.scrollTop=channelTextAreaEl.scrollHeight}let parsedMessage=event.detail.parsedMessage;switch(parsedMessage.command){case"KICK":
if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){let reason=" ";if(parsedMessage.params[2])reason=parsedMessage.params[2];if(channelMainSectionEl.hasAttribute("brief-enabled")){
_addText(parsedMessage.timestamp,"*",parsedMessage.nick+" has kicked "+parsedMessage.params[1])}else{
_addText(parsedMessage.timestamp,"*",parsedMessage.nick+" has kicked "+parsedMessage.params[1]+" ("+reason+")")}}break;case"JOIN":if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){
if(channelMainSectionEl.hasAttribute("brief-enabled")){_addText(parsedMessage.timestamp,"*",parsedMessage.nick+" has joined")}else{
_addText(parsedMessage.timestamp,"*",parsedMessage.nick+" ("+parsedMessage.host+") has joined")}if(channelMainSectionEl.hasAttribute("beep2-enabled")&&webState.cacheInhibitTimer===0){playBeep1Sound()}
channelBottomDivEl.removeAttribute("hidden");channelHideButtonEl.textContent="-"}break;case"MODE":if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){if(parsedMessage.nick){
_addText(parsedMessage.timestamp,"*","Mode "+JSON.stringify(parsedMessage.params)+" by "+parsedMessage.nick)}else{
_addText(parsedMessage.timestamp,"*","Mode "+JSON.stringify(parsedMessage.params)+" by "+parsedMessage.prefix)}}break;case"NICK":if(true){let present=false
;if(_isNickInChannel(parsedMessage.nick,name))present=true;if(_isNickInChannel(parsedMessage.params[0],name))present=true;if(present){
_addText(parsedMessage.timestamp,"*",parsedMessage.nick+" is now known as "+parsedMessage.params[0])}}break;case"NOTICE":if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){
_addText(parsedMessage.timestamp,"*","Notice("+parsedMessage.nick+" to "+parsedMessage.params[0]+") "+parsedMessage.params[1]);channelBottomDivEl.removeAttribute("hidden")
;channelHideButtonEl.textContent="-";if(document.activeElement!==channelInputAreaEl&&document.activeElement!==channelSendButtonEl&&webState.cacheInhibitTimer===0&&activityIconInhibitTimer===0){
setChanActivityIcon(channelIndex)}}break;case"PART":if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){let reason=" ";if(parsedMessage.params[1])reason=parsedMessage.params[1]
;if(channelMainSectionEl.hasAttribute("brief-enabled")){_addText(parsedMessage.timestamp,"*",parsedMessage.nick+" has left")}else{
_addText(parsedMessage.timestamp,"*",parsedMessage.nick+" ("+parsedMessage.host+") has left "+"("+reason+")")}}break;case"PRIVMSG":if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){
_addText(parsedMessage.timestamp,parsedMessage.nick,parsedMessage.params[1]);if(channelMainSectionEl.hasAttribute("beep1-enabled")&&webState.cacheInhibitTimer===0){playBeep1Sound()}
if(channelMainSectionEl.hasAttribute("beep3-enabled")){let checkLine=parsedMessage.params[1].toLowerCase();if(checkLine.indexOf(ircState.nickName.toLowerCase())>=0&&webState.cacheInhibitTimer===0){
setTimeout(playBeep2Sound,250)}}channelBottomDivEl.removeAttribute("hidden");channelHideButtonEl.textContent="-"
;if(document.activeElement!==channelInputAreaEl&&document.activeElement!==channelSendButtonEl&&webState.cacheInhibitTimer===0&&activityIconInhibitTimer===0){setChanActivityIcon(channelIndex)}}break
;case"QUIT":if(_isNickInChannel(parsedMessage.nick,name)){let reason=" ";if(parsedMessage.params[0])reason=parsedMessage.params[0];if(channelMainSectionEl.hasAttribute("brief-enabled")){
_addText(parsedMessage.timestamp,"*",parsedMessage.nick+" has quit")}else{_addText(parsedMessage.timestamp,"*",parsedMessage.nick+" ("+parsedMessage.host+") has quit "+"("+reason+")")}}break
;case"TOPIC":if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){
_addText(parsedMessage.timestamp,"*","Topic for "+parsedMessage.params[0]+' changed to "'+parsedMessage.params[1]+'" by '+parsedMessage.nick)}break;default:}})
;document.addEventListener("erase-before-reload",function(event){channelTextAreaEl.value="";channelInputAreaEl.value=""}.bind(this));updateVisibility()
;webState.resizableSendButtonTextareaIds.push(channelInputAreaId);webState.resizableChanSplitTextareaIds.push(channelTextAreaId);document.dispatchEvent(new CustomEvent("element-resize",{bubbles:true
}))}var lastJoinedChannelCount=-1;var lastIrcServerIndex=-1;document.addEventListener("irc-state-changed",function(event){if(ircState.channels.length>0){for(let i=0;i<ircState.channels.length;i++){
let name=ircState.channels[i];if(webState.channels.indexOf(name.toLowerCase())===-1){createChannelEl(name)}}}let needButtonUpdate=false;let joinedChannelCount=0;if(ircState.channels.length>0){
for(let i=0;i<ircState.channels.length;i++){if(ircState.channelStates[i].joined)joinedChannelCount++}}if(joinedChannelCount!==lastJoinedChannelCount){needButtonUpdate=true
;lastJoinedChannelCount=joinedChannelCount}if(ircState.ircServerIndex!==lastIrcServerIndex){needButtonUpdate=true;lastIrcServerIndex=ircState.ircServerIndex}if(needButtonUpdate){
let channelJoinButtonContainerEl=document.getElementById("channelJoinButtonContainer");while(channelJoinButtonContainerEl.firstChild){
channelJoinButtonContainerEl.removeChild(channelJoinButtonContainerEl.firstChild)}if(ircState.channelList.length>0){for(let i=0;i<ircState.channelList.length;i++){
let channelIndex=ircState.channels.indexOf(ircState.channelList[i].toLowerCase());if(channelIndex<0||!ircState.channelStates[channelIndex].joined){let joinButtonEl=document.createElement("button")
;joinButtonEl.textContent=ircState.channelList[i];joinButtonEl.classList.add("channel-button");channelJoinButtonContainerEl.appendChild(joinButtonEl);joinButtonEl.addEventListener("click",function(){
_sendIrcServerMessage("JOIN "+ircState.channelList[i]);hideRawMessageWindow()})}}}}});function _newChannel(){let newChannel=document.getElementById("newChannelNameInputId").value
;document.getElementById("newChannelNameInputId").value="";let chanPrefixChars="#&+!";if(newChannel.length>1&&chanPrefixChars.indexOf(newChannel.charAt(0))>=0){let message="JOIN "+newChannel
;_sendIrcServerMessage(message);hideRawMessageWindow()}else{showError("Invalid Channel Name")}}document.getElementById("newChannelNameInputId").addEventListener("input",function(event){
if(event.inputType==="insertText"&&event.data===null||event.inputType==="insertLineBreak"){_newChannel()}}.bind(this));document.getElementById("newChannelButton").addEventListener("click",function(){
_newChannel()});"use strict";function _sendPrivMessageToUser(targetNickname,textAreaEl){let text=stripTrailingCrLf(textAreaEl.value);if(detectMultiLineString(text)){textAreaEl.value=""
;showError("Multi-line input is not supported.")}else{if(text.length>0){if(text.charAt(0)==="/"){let commandAction=textCommandParser({inputString:text,originType:"private",originName:targetNickname})
;textAreaEl.value="";if(commandAction.error){showError(commandAction.message);return}else{if(commandAction.ircMessage&&commandAction.ircMessage.length>0){
_sendIrcServerMessage(commandAction.ircMessage)}return}}let message="PRIVMSG "+targetNickname+" :"+text;_sendIrcServerMessage(message);textAreaEl.value=""}}textAreaEl.value=""}
function createPrivateMessageEl(name,parsedMessage){if(webState.activePrivateMessageNicks.indexOf(name.toLowerCase())>=0){console.log("createPrivateMessageEl: Private message element already exist")
;return}webState.activePrivateMessageNicks.push(name.toLowerCase());let privMsgIndex=webState.activePrivateMessageNicks.indexOf(name.toLowerCase())
;let privMsgContainerDivEl=document.getElementById("privateMessageContainerDiv");let privMsgSectionEl=document.createElement("div");privMsgSectionEl.classList.add("aa-section-div")
;privMsgSectionEl.classList.add("color-pm");let privMsgTopDivEl=document.createElement("div");privMsgTopDivEl.classList.add("bm10");privMsgTopDivEl.classList.add("head-flex")
;let privMsgTopLeftDivEl=document.createElement("div");privMsgTopLeftDivEl.classList.add("head-left");let privMsgTopRightDivEl=document.createElement("div")
;privMsgTopRightDivEl.classList.add("head-right");let privMsgTopRightHidableDivEl=document.createElement("div");let privMsgHideButtonEl=document.createElement("button")
;privMsgHideButtonEl.textContent="-";privMsgHideButtonEl.classList.add("channel-button");let privMsgNameDivEl=document.createElement("div");privMsgNameDivEl.textContent=name
;privMsgNameDivEl.classList.add("chan-name-div");let privMsgTallerButtonEl=document.createElement("button");privMsgTallerButtonEl.textContent="Taller"
;privMsgTallerButtonEl.classList.add("channel-button");let privMsgNormalButtonEl=document.createElement("button");privMsgNormalButtonEl.textContent="Normal"
;privMsgNormalButtonEl.classList.add("channel-button");let privMsgClearButtonEl=document.createElement("button");privMsgClearButtonEl.textContent="Clear"
;privMsgClearButtonEl.classList.add("channel-button");let privMsgBottomDivEl=document.createElement("div");let privMsgTextAreaEl=document.createElement("textarea")
;let privMsgTextAreaId="privMsg"+privMsgIndex.toString()+"TextAreaId";privMsgTextAreaEl.id=privMsgTextAreaId;privMsgTextAreaEl.setAttribute("cols","120");privMsgTextAreaEl.setAttribute("rows","6")
;privMsgTextAreaEl.setAttribute("spellCheck","false");privMsgTextAreaEl.setAttribute("readonly","");let privMsgButtonDiv1El=document.createElement("div")
;privMsgButtonDiv1El.classList.add("button-div");let privMsgInputAreaEl=document.createElement("textarea");let privMsgInputAreaId="privMsg"+privMsgIndex.toString()+"InputAreaId"
;privMsgInputAreaEl.id=privMsgInputAreaId;privMsgInputAreaEl.classList.add("va-middle");privMsgInputAreaEl.classList.add("rm10");privMsgInputAreaEl.setAttribute("cols","120")
;privMsgInputAreaEl.setAttribute("rows","1");let privMsgSendButtonEl=document.createElement("button");privMsgSendButtonEl.textContent="Send";privMsgSendButtonEl.classList.add("va-middle")
;let privMsgBottomDiv4El=document.createElement("div");privMsgBottomDiv4El.classList.add("button-div");let privMsgBeep1CBInputEl=document.createElement("input")
;privMsgBeep1CBInputEl.classList.add("pm-cb-cb");privMsgBeep1CBInputEl.setAttribute("type","checkbox");let privMsgBeep1CBTitleEl=document.createElement("span")
;privMsgBeep1CBTitleEl.classList.add("pm-cb-span");privMsgBeep1CBTitleEl.textContent="Line-beep";privMsgTopLeftDivEl.appendChild(privMsgHideButtonEl);privMsgTopLeftDivEl.appendChild(privMsgNameDivEl)
;privMsgTopRightHidableDivEl.appendChild(privMsgTallerButtonEl);privMsgTopRightHidableDivEl.appendChild(privMsgNormalButtonEl);privMsgTopRightHidableDivEl.appendChild(privMsgClearButtonEl)
;privMsgTopRightDivEl.appendChild(privMsgTopRightHidableDivEl);privMsgTopDivEl.appendChild(privMsgTopLeftDivEl);privMsgTopDivEl.appendChild(privMsgTopRightDivEl)
;privMsgButtonDiv1El.appendChild(privMsgInputAreaEl);privMsgButtonDiv1El.appendChild(privMsgSendButtonEl);privMsgBottomDivEl.appendChild(privMsgTextAreaEl)
;privMsgBottomDivEl.appendChild(privMsgButtonDiv1El);privMsgBottomDiv4El.appendChild(privMsgBeep1CBInputEl);privMsgBottomDiv4El.appendChild(privMsgBeep1CBTitleEl)
;privMsgSectionEl.appendChild(privMsgTopDivEl);privMsgSectionEl.appendChild(privMsgBottomDivEl);privMsgSectionEl.appendChild(privMsgBottomDiv4El);privMsgContainerDivEl.appendChild(privMsgSectionEl)
;privMsgTextAreaEl.value+=parsedMessage.timestamp+" "+parsedMessage.nick+pmNameSpacer+cleanFormatting(parsedMessage.params[1])+"\n";privMsgTextAreaEl.scrollTop=privMsgTextAreaEl.scrollHeight
;var activityIconInhibitTimer=0;setInterval(function(){if(activityIconInhibitTimer>0)activityIconInhibitTimer--}.bind(this),1e3);document.addEventListener("erase-before-reload",function(event){
privMsgTextAreaEl.value="";privMsgInputAreaEl.value=""}.bind(this));document.addEventListener("priv-msg-hide-all",function(event){privMsgBottomDivEl.setAttribute("hidden","")
;privMsgHideButtonEl.textContent="+";privMsgTopRightHidableDivEl.setAttribute("hidden","");privMsgSectionEl.setAttribute("hidden","")}.bind(this))
;document.addEventListener("priv-msg-show-all",function(event){privMsgSectionEl.removeAttribute("hidden")}.bind(this));privMsgHideButtonEl.addEventListener("click",function(){
if(privMsgBottomDivEl.hasAttribute("hidden")){privMsgBottomDivEl.removeAttribute("hidden");privMsgHideButtonEl.textContent="-";privMsgTopRightHidableDivEl.removeAttribute("hidden")}else{
privMsgSectionEl.setAttribute("hidden","");privMsgBottomDivEl.setAttribute("hidden","");privMsgHideButtonEl.textContent="+";privMsgTopRightHidableDivEl.setAttribute("hidden","")}})
;privMsgTallerButtonEl.addEventListener("click",function(){let newRows=parseInt(privMsgTextAreaEl.getAttribute("rows"))+5;privMsgTextAreaEl.setAttribute("rows",newRows.toString())})
;privMsgNormalButtonEl.addEventListener("click",function(){privMsgTextAreaEl.setAttribute("rows","6")});privMsgClearButtonEl.addEventListener("click",function(){privMsgTextAreaEl.value=""
;privMsgTextAreaEl.setAttribute("rows","6")});document.addEventListener("show-all-divs",function(event){privMsgSectionEl.removeAttribute("hidden")})
;document.addEventListener("hide-all-divs",function(event){privMsgBottomDivEl.setAttribute("hidden","");privMsgHideButtonEl.textContent="+";privMsgTopRightHidableDivEl.setAttribute("hidden","")
;privMsgSectionEl.setAttribute("hidden","")});privMsgSendButtonEl.addEventListener("click",function(){_sendPrivMessageToUser(name,privMsgInputAreaEl);privMsgInputAreaEl.focus()
;resetPmActivityIcon(privMsgIndex);activityIconInhibitTimer=activityIconInhibitTimerValue}.bind(this));privMsgInputAreaEl.addEventListener("input",function(event){
if(event.inputType==="insertText"&&event.data===null||event.inputType==="insertLineBreak"){_sendPrivMessageToUser(name,privMsgInputAreaEl);resetPmActivityIcon(privMsgIndex)
;activityIconInhibitTimer=activityIconInhibitTimerValue}}.bind(this));privMsgSectionEl.addEventListener("click",function(){resetPmActivityIcon(privMsgIndex)
;activityIconInhibitTimer=activityIconInhibitTimerValue}.bind(this));function updateVisibility(){if(privMsgSectionEl.hasAttribute("beep1-enabled")){privMsgBeep1CBInputEl.checked=true}else{
privMsgBeep1CBInputEl.checked=false}}privMsgBeep1CBInputEl.addEventListener("click",function(e){if(privMsgSectionEl.hasAttribute("beep1-enabled")){privMsgSectionEl.removeAttribute("beep1-enabled")
}else{privMsgSectionEl.setAttribute("beep1-enabled","");playBeep3Sound()}updateVisibility()});document.addEventListener("cancel-beep-sounds",function(event){
privMsgSectionEl.removeAttribute("beep1-enabled")}.bind(this));document.addEventListener("private-message",function(event){function _addText(text){privMsgTextAreaEl.value+=cleanFormatting(text)+"\n"
;privMsgTextAreaEl.scrollTop=privMsgTextAreaEl.scrollHeight}let parsedMessage=event.detail.parsedMessage;switch(parsedMessage.command){case"PRIVMSG":if(parsedMessage.nick===ircState.nickName){
if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){if("isPmCtcpAction"in parsedMessage){_addText(parsedMessage.timestamp+pmNameSpacer+parsedMessage.nick+" "+parsedMessage.params[1])}else{
_addText(parsedMessage.timestamp+" "+parsedMessage.nick+pmNameSpacer+parsedMessage.params[1])}if(privMsgSectionEl.hasAttribute("beep1-enabled")&&webState.cacheInhibitTimer===0){playBeep3Sound()}
privMsgSectionEl.removeAttribute("hidden");privMsgBottomDivEl.removeAttribute("hidden");privMsgHideButtonEl.textContent="-";privMsgTopRightHidableDivEl.removeAttribute("hidden")
;document.getElementById("privMsgMainHiddenDiv").removeAttribute("hidden");document.getElementById("privMsgMainHiddenButton").textContent="-"}}else{
if(parsedMessage.nick.toLowerCase()===name.toLowerCase()){if("isPmCtcpAction"in parsedMessage){_addText(parsedMessage.timestamp+pmNameSpacer+parsedMessage.nick+" "+parsedMessage.params[1])}else{
_addText(parsedMessage.timestamp+" "+parsedMessage.nick+pmNameSpacer+parsedMessage.params[1])}if(privMsgSectionEl.hasAttribute("beep1-enabled")&&webState.cacheInhibitTimer===0){playBeep3Sound()}
privMsgSectionEl.removeAttribute("hidden");privMsgBottomDivEl.removeAttribute("hidden");privMsgHideButtonEl.textContent="-";privMsgTopRightHidableDivEl.removeAttribute("hidden")
;document.getElementById("privMsgMainHiddenDiv").removeAttribute("hidden");document.getElementById("privMsgMainHiddenButton").textContent="-"
;if(document.activeElement!==privMsgInputAreaEl&&document.activeElement!==privMsgSendButtonEl&&webState.cacheInhibitTimer===0&&activityIconInhibitTimer===0){setPmActivityIcon(privMsgIndex)}}}break
;default:}});if(webState.cacheInhibitTimer===0){setPmActivityIcon(privMsgIndex)}document.getElementById("privMsgMainHiddenDiv").removeAttribute("hidden")
;document.getElementById("privMsgMainHiddenButton").textContent="-";webState.resizablePrivMsgTextareaIds.push(privMsgTextAreaId);webState.resizableSendButtonPMTextareaIds.push(privMsgInputAreaId)
;document.dispatchEvent(new CustomEvent("element-resize",{bubbles:true}))}document.addEventListener("private-message",function(event){let name=event.detail.parsedMessage.nick
;if(name===ircState.nickName){name=event.detail.parsedMessage.params[0]}if(webState.activePrivateMessageNicks.indexOf(name.toLowerCase())<0){createPrivateMessageEl(name,event.detail.parsedMessage)}})
;function _buildPrivateMessageText(){if(document.getElementById("userPrivMsgInputId").value.length===0)return;let inputAreaEl=document.getElementById("userPrivMsgInputId")
;let text=stripTrailingCrLf(inputAreaEl.value);if(detectMultiLineString(text)){inputAreaEl.value="";showError("Multi-line input is not supported.")}else{if(text.length>0){if(text.charAt(0)==="/"){
let commandAction=textCommandParser({inputString:text,originType:"generic",originName:null});inputAreaEl.value="";if(commandAction.error){showError(commandAction.message);return}else{
if(commandAction.ircMessage&&commandAction.ircMessage.length>0){_sendIrcServerMessage(commandAction.ircMessage)}return}return}console.log("else not command")
;if(document.getElementById("pmNickNameInputId").value.length===0)return;let targetNickname=document.getElementById("pmNickNameInputId").value;let message="PRIVMSG "+targetNickname+" :"+text
;_sendIrcServerMessage(message);inputAreaEl.value=""}}inputAreaEl.value=""}document.getElementById("userPrivMsgInputId").addEventListener("input",function(event){
if(event.inputType==="insertText"&&event.data===null){_buildPrivateMessageText()}if(event.inputType==="insertLineBreak"){_buildPrivateMessageText()}}.bind(this))
;document.getElementById("UserPrivMsgSendButton").addEventListener("click",function(){_buildPrivateMessageText()}.bind(this));document.addEventListener("erase-before-reload",function(event){
document.getElementById("pmNickNameInputId").value="";document.getElementById("userPrivMsgInputId").value=""}.bind(this));document.getElementById("whoisButton").addEventListener("click",function(){
if(document.getElementById("pmNickNameInputId").value.length>0){showRawMessageWindow();let message="WHOIS "+document.getElementById("pmNickNameInputId").value;_sendIrcServerMessage(message)
;showRawMessageWindow()}else{showError("Input required")}});document.getElementById("privMsgMainHiddenButton").addEventListener("click",function(){
if(document.getElementById("privMsgMainHiddenDiv").hasAttribute("hidden")){document.getElementById("privMsgMainHiddenDiv").removeAttribute("hidden")
;document.getElementById("privMsgMainHiddenButton").textContent="-";document.dispatchEvent(new CustomEvent("priv-msg-show-all",{bubbles:true}))}else{
document.getElementById("privMsgMainHiddenDiv").setAttribute("hidden","");document.getElementById("privMsgMainHiddenButton").textContent="+"
;document.dispatchEvent(new CustomEvent("priv-msg-hide-all",{bubbles:true}))}}.bind(this));"use strict";document.getElementById("closeNoticeButton").addEventListener("click",function(){
webState.noticeOpen=false;updateDivVisibility()}.bind(this));document.getElementById("noticeClearButton").addEventListener("click",function(){document.getElementById("noticeMessageDisplay").value=""
;document.getElementById("noticeMessageDisplay").setAttribute("rows","5")});document.getElementById("noticeTallerButton").addEventListener("click",function(){
let newRows=parseInt(document.getElementById("noticeMessageDisplay").getAttribute("rows"))+5;document.getElementById("noticeMessageDisplay").setAttribute("rows",newRows.toString())}.bind(this))
;document.getElementById("noticeNormalButton").addEventListener("click",function(){document.getElementById("noticeMessageDisplay").setAttribute("rows","5")}.bind(this))
;document.getElementById("noticeSectionDiv").addEventListener("click",function(){resetNotActivityIcon()}.bind(this));document.getElementById("wallopsCloseButton").addEventListener("click",function(){
webState.wallopsOpen=false;updateDivVisibility()}.bind(this));document.getElementById("wallopsClearButton").addEventListener("click",function(){
document.getElementById("wallopsMessageDisplay").value="";document.getElementById("wallopsMessageDisplay").setAttribute("rows","5")}.bind(this))
;document.getElementById("wallopsTallerButton").addEventListener("click",function(){let newRows=parseInt(document.getElementById("wallopsMessageDisplay").getAttribute("rows"))+5
;document.getElementById("wallopsMessageDisplay").setAttribute("rows",newRows.toString())}.bind(this));document.getElementById("wallopsNormalButton").addEventListener("click",function(){
document.getElementById("wallopsMessageDisplay").setAttribute("rows","5")}.bind(this));"use strict";function _parseInputForIRCCommands(textAreaEl){let text=stripTrailingCrLf(textAreaEl.value)
;if(detectMultiLineString(text)){textAreaEl.value="";showError("Multi-line input is not supported.")}else{if(text.length>0){let commandAction=textCommandParser({inputString:text,originType:"generic",
originName:null});textAreaEl.value="";if(commandAction.error){showError(commandAction.message);return}else{if(commandAction.ircMessage&&commandAction.ircMessage.length>0){
_sendIrcServerMessage(commandAction.ircMessage)}return}}}textAreaEl.value=""}document.getElementById("sendRawMessageButton").addEventListener("click",function(){
_parseInputForIRCCommands(document.getElementById("rawMessageInputId"));document.getElementById("rawMessageInputId").focus()}.bind(this))
;document.getElementById("rawMessageInputId").addEventListener("input",function(event){if(event.inputType==="insertText"&&event.data===null||event.inputType==="insertLineBreak"){
_parseInputForIRCCommands(document.getElementById("rawMessageInputId"))}}.bind(this));function substituteHmsTime(inMessage){let timeString=inMessage.split(" ")[0]
;let restOfMessage=inMessage.slice(timeString.length+1,inMessage.length);let hmsString=timestampToHMS(timeString);return hmsString+" "+restOfMessage}
document.addEventListener("server-message",function(event){function _showAfterParamZero(parsedMessage,title){let msgString="";if(parsedMessage.params.length>1){
for(let i=1;i<parsedMessage.params.length;i++){msgString+=" "+parsedMessage.params[i]}}else{console.log("Error _showAfterParamZero() no parsed field")}let outMessage=parsedMessage.timestamp+msgString
;if(title){outMessage=title+msgString}displayRawMessage(cleanFormatting(cleanCtcpDelimiter(outMessage)))}switch(event.detail.parsedMessage.command){case"001":case"002":case"003":case"004":
_showAfterParamZero(event.detail.parsedMessage,null);break;case"005":break;case"250":case"251":case"252":case"254":case"255":case"265":case"265":_showAfterParamZero(event.detail.parsedMessage,null)
;break;case"256":case"257":case"258":case"259":_showAfterParamZero(event.detail.parsedMessage,null);break;case"315":displayRawMessage("WHO --End--");break;case"352":
_showAfterParamZero(event.detail.parsedMessage,"WHO");break;case"275":case"301":case"307":case"311":case"312":case"313":case"317":case"319":case"378":case"379":
_showAfterParamZero(event.detail.parsedMessage,"WHOIS");break;case"318":displayRawMessage("WHOIS --End--");break;case"322":if(event.detail.parsedMessage.params.length===4){
let outMessage="LIST "+event.detail.parsedMessage.params[1]+" "+event.detail.parsedMessage.params[2];if(event.detail.parsedMessage.params[3]){outMessage+=" "+event.detail.parsedMessage.params[3]}
displayRawMessage(cleanFormatting(cleanCtcpDelimiter(outMessage)))}else{console.log("Error Msg 322 not have 4 parsed parameters")}break;case"321":break;case"323":displayRawMessage("LIST --End--")
;break;case"372":_showAfterParamZero(event.detail.parsedMessage,null);break;case"375":case"376":break;case"MODE":
displayRawMessage(cleanFormatting(cleanCtcpDelimiter(event.detail.parsedMessage.timestamp+" "+"MODE "+event.detail.parsedMessage.params[0]+" "+event.detail.parsedMessage.params[1])));break;case"NICK":
displayRawMessage(cleanFormatting(cleanCtcpDelimiter(event.detail.parsedMessage.timestamp+" "+"(No channel) "+event.detail.parsedMessage.nick+" is now known as "+event.detail.parsedMessage.params[0])))
;break;case"NOTICE":
displayRawMessage(cleanFormatting(cleanCtcpDelimiter(event.detail.parsedMessage.timestamp+" "+"NOTICE "+event.detail.parsedMessage.params[0]+" "+event.detail.parsedMessage.params[1])));break
;case"QUIT":if(true){let reason=" ";if(event.detail.parsedMessage.params[0]){reason=event.detail.parsedMessage.params[0]
;displayRawMessage(cleanFormatting(cleanCtcpDelimiter(event.detail.parsedMessage.timestamp+" "+"(No channel) "+event.detail.parsedMessage.nick+" has quit ("+reason+")")))}}break;default:if(true){
displayRawMessage(cleanFormatting(cleanCtcpDelimiter(substituteHmsTime(event.detail.message))))}}if(webState.cacheInhibitTimer===0){showRawMessageWindow()}})
;document.getElementById("rawHiddenElementsButton").addEventListener("click",function(){if(document.getElementById("rawHiddenElements").hasAttribute("hidden")){showRawMessageWindow()}else{
hideRawMessageWindow()}});document.getElementById("rawClearButton").addEventListener("click",function(){document.getElementById("rawMessageDisplay").value=""
;document.getElementById("rawMessageDisplay").setAttribute("rows","10");document.getElementById("rawMessageInputId").value=""})
;document.getElementById("rawTallerButton").addEventListener("click",function(){let newRows=parseInt(document.getElementById("rawMessageDisplay").getAttribute("rows"))+10
;document.getElementById("rawMessageDisplay").setAttribute("rows",newRows.toString())}.bind(this));document.getElementById("rawNormalButton").addEventListener("click",function(){
document.getElementById("rawMessageDisplay").setAttribute("rows","10")}.bind(this));document.getElementById("showDebugButton").addEventListener("click",function(){
if(document.getElementById("hiddenDebugDiv").hasAttribute("hidden")){document.getElementById("hiddenDebugDiv").removeAttribute("hidden")}else{
document.getElementById("hiddenDebugDiv").setAttribute("hidden","");document.getElementById("variablesDivId").setAttribute("hidden","")}}.bind(this))
;document.getElementById("loadFromCacheButton").addEventListener("click",function(){document.dispatchEvent(new CustomEvent("update-from-cache",{bubbles:true}))}.bind(this))
;document.getElementById("showAllDivsButton").addEventListener("click",function(){document.dispatchEvent(new CustomEvent("show-all-divs",{bubbles:true}))}.bind(this))
;document.getElementById("hideAllDivsButton").addEventListener("click",function(){document.dispatchEvent(new CustomEvent("hide-all-divs",{bubbles:true}))}.bind(this))
;document.getElementById("variablesButtonId").addEventListener("click",function(){if(document.getElementById("variablesDivId").hasAttribute("hidden")){
document.getElementById("variablesDivId").removeAttribute("hidden")
;document.getElementById("variablesPreId").textContent="ircState = "+JSON.stringify(ircState,null,2)+"\n\n"+"webState = "+JSON.stringify(webState,null,2)}else{
document.getElementById("variablesDivId").setAttribute("hidden","")}}.bind(this));document.getElementById("viewRawMessagesCheckbox").addEventListener("click",function(e){
if(document.getElementById("viewRawMessagesCheckbox").checked){document.getElementById("showRawInHexCheckbox").removeAttribute("disabled")
;document.getElementById("showCommsCheckbox").removeAttribute("disabled");webState.viewRawMessages=true}else{document.getElementById("showRawInHexCheckbox").checked=false
;document.getElementById("showRawInHexCheckbox").setAttribute("disabled","");document.getElementById("showCommsCheckbox").checked=false
;document.getElementById("showCommsCheckbox").setAttribute("disabled","");webState.viewRawMessages=false;webState.showRawInHex=false;webState.showCommsMessages=false}
document.dispatchEvent(new CustomEvent("update-from-cache",{bubbles:true}))});document.getElementById("showRawInHexCheckbox").addEventListener("click",function(){
if(document.getElementById("showRawInHexCheckbox").checked){webState.showRawInHex=true}else{webState.showRawInHex=false}document.dispatchEvent(new CustomEvent("update-from-cache",{bubbles:true}))})
;document.getElementById("showCommsCheckbox").addEventListener("click",function(){if(document.getElementById("showCommsCheckbox").checked){webState.showCommsMessages=true}else{
webState.showCommsMessages=false}document.dispatchEvent(new CustomEvent("update-from-cache",{bubbles:true}))});document.getElementById("infoOpenCloseButton").addEventListener("click",function(){
if(document.getElementById("hiddenInfoDiv").hasAttribute("hidden")){document.getElementById("hiddenInfoDiv").removeAttribute("hidden");document.getElementById("infoOpenCloseButton").textContent="-"
}else{document.getElementById("hiddenInfoDiv").setAttribute("hidden","");document.getElementById("infoOpenCloseButton").textContent="+"}});function updateFromCache(){webState.cacheInhibitTimer=3
;resetNotActivityIcon();resetPmActivityIcon(-1);resetChanActivityIcon(-1);document.dispatchEvent(new CustomEvent("erase-before-reload",{bubbles:true,detail:{}}));let fetchURL=webServerUrl+"/irc/cache"
;let fetchOptions={method:"GET",headers:{Accept:"application/json"}};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{
throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseArray=>{if(Array.isArray(responseArray)&&responseArray.length>0){
let privMsgSessionEl=document.getElementById("privateMessageContainerDiv");while(privMsgSessionEl.firstChild){privMsgSessionEl.removeChild(privMsgSessionEl.firstChild)}webState.lastPMNick=""
;webState.activePrivateMessageNicks=[];webState.resizablePrivMsgTextareaIds=[];webState.resizableSendButtonPMTextareaIds=[];document.getElementById("noticeMessageDisplay").value=""
;document.getElementById("wallopsMessageDisplay").value="";document.getElementById("rawMessageDisplay").value="";document.getElementById("rawMessageInputId").value="";webState.noticeOpen=false
;webState.wallopsOpen=false;for(let i=0;i<responseArray.length;i++){if(responseArray[i].length>0){_parseBufferMessage(responseArray[i])}}}}).catch(error=>{console.log(error)})}
window.addEventListener("update-from-cache",function(event){updateFromCache()}.bind(this));function cacheInhibitTimerTick(){if(webState.cacheInhibitTimer>0)webState.cacheInhibitTimer--}
webState.cacheInhibitTimer=3;document.getElementById("serverTerminateButton").addEventListener("click",function(){console.log("Requesting backend server to terminate")
;let fetchURL=webServerUrl+"/terminate";let fetchOptions={method:"POST",headers:{"Content-type":"application/json",Accept:"application/json"},body:JSON.stringify({terminate:"YES"})}
;fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{
console.log(JSON.stringify(responseJson))}).catch(error=>{showError("Terminate: Unable to connect");console.log(error)})})
;document.getElementById("eraseCacheButton").addEventListener("click",function(){if(ircState.ircConnected){showError("You must be disconnected from IRC to clear cache.");return}
document.dispatchEvent(new CustomEvent("erase-before-reload",{bubbles:true,detail:{}}));let fetchURL=webServerUrl+"/irc/erase";let fetchOptions={method:"POST",headers:{
"Content-type":"application/json",Accept:"application/json"},body:JSON.stringify({erase:"YES"})};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{
throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{if(responseJson.error){showError(responseJson.message)}else{
let privMsgSessionEl=document.getElementById("privateMessageContainerDiv");while(privMsgSessionEl.firstChild){privMsgSessionEl.removeChild(privMsgSessionEl.firstChild)}
document.getElementById("noticeMessageDisplay").value="";document.getElementById("wallopsMessageDisplay").value="";document.getElementById("rawMessageDisplay").value=""
;document.getElementById("rawMessageInputId").value="";webState.privMsgOpen=false;webState.noticeOpen=false;webState.wallopsOpen=false;updateDivVisibility()}}).catch(error=>{console.log(error)})})
;function updateUsername(){let fetchURL=webServerUrl+"/userinfo";let fetchOptions={method:"GET",headers:{Accept:"application/json"}};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){
return response.json()}else{throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{webState.loginUser=responseJson}).catch(error=>{console.log(error)})}
updateUsername();document.getElementById("test1Button").addEventListener("click",function(){console.log("Test1 button pressed.");let fetchURL=webServerUrl+"/irc/test1";let fetchOptions={method:"GET",
headers:{Accept:"application/json"}};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{throw new Error("Fetch status "+response.status+" "+response.statusText)}
}).then(responseJson=>{console.log(JSON.stringify(responseJson,null,2));if(responseJson.error){showError(responseJson.message)}}).catch(error=>{console.log(error);if(error)showError(error.toString())
})});document.getElementById("test1ButtonDesc").textContent="Force garbage collect";document.getElementById("test2Button").addEventListener("click",function(){console.log("Test2 button pressed.")
;let fetchURL=webServerUrl+"/irc/test2";let fetchOptions={method:"GET",headers:{Accept:"application/json"}};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok){return response.json()}else{
console.log(response);throw new Error("Fetch status "+response.status+" "+response.statusText)}}).then(responseJson=>{console.log(JSON.stringify(responseJson,null,2));if(responseJson.error){
showError(responseJson.message)}}).catch(error=>{console.log(error);if(error)showError(error.toString())})});document.getElementById("test2ButtonDesc").textContent="Emulate IRC ping timeout"
;document.getElementById("test3Button").addEventListener("click",function(){console.log("Test 3 button pressed.");console.log("Test 3 button: expire heart beat timer")
;heartbeatUpCounter=heartbeatExpirationTimeSeconds-1});document.getElementById("test3ButtonDesc").textContent="Emulate websocket timeout"
;document.getElementById("test4Button").addEventListener("click",function(){console.log("Test 4 button pressed.");console.log("Test 4 getIrcState()");getIrcState()})
;document.getElementById("test4ButtonDesc").textContent="Call getIrcState()";const columnSize=(document.getElementById("rawMessageDisplay").getBoundingClientRect().width+10)/120
;const adjustInputToWidowWidth=function(innerWidth){let cols=parseInt(window.innerWidth/columnSize-5);document.getElementById("userPrivMsgInputId").setAttribute("cols",(cols-8).toString())
;document.getElementById("noticeMessageDisplay").setAttribute("cols",cols.toString());document.getElementById("wallopsMessageDisplay").setAttribute("cols",cols.toString())
;document.getElementById("rawMessageDisplay").setAttribute("cols",cols.toString());document.getElementById("rawMessageInputId").setAttribute("cols",(cols-8).toString())
;if(webState.resizableChanSplitTextareaIds.length>0){webState.resizableChanSplitTextareaIds.forEach(function(id){if(document.getElementById(id)){if(window.innerWidth>600){
document.getElementById(id).setAttribute("cols",(cols-23).toString())}else{document.getElementById(id).setAttribute("cols",cols.toString())}}else{console.log("Error: "+id)}})}
if(webState.resizableSendButtonTextareaIds.length>0){webState.resizableSendButtonTextareaIds.forEach(function(id){if(document.getElementById(id)){
document.getElementById(id).setAttribute("cols",(cols-8).toString())}else{console.log("Error: "+id)}})}if(webState.resizablePrivMsgTextareaIds.length>0){
webState.resizablePrivMsgTextareaIds.forEach(function(id){if(document.getElementById(id)){document.getElementById(id).setAttribute("cols",cols.toString())}else{console.log("Error: "+id)}})}
if(webState.resizableSendButtonPMTextareaIds.length>0){webState.resizableSendButtonPMTextareaIds.forEach(function(id){if(document.getElementById(id)){
document.getElementById(id).setAttribute("cols",(cols-8).toString())}else{console.log("Error: "+id)}})}document.getElementById("errorDiv").style.width="100%";if(!webState.watch)webState.watch={}
;webState.watch.innerWidth=window.innerWidth.toString()+"px";webState.watch.innerHeight=window.innerHeight.toString()+"px"};window.addEventListener("resize",function(event){if(columnSize){
adjustInputToWidowWidth(event.currentTarget.innerWidth)}}.bind(this));window.addEventListener("element-resize",function(event){adjustInputToWidowWidth(window.innerWidth)}.bind(this))
;adjustInputToWidowWidth(window.innerWidth);setInterval(function(){errorTimerTickHandler();heartbeatTimerTickHandler();reconnectTimerTickHandler();beepTimerTick();updateElapsedTimeDisplay()
;cacheInhibitTimerTick()}.bind(this),1e3);firstWebSocketConnectOnPageLoad();