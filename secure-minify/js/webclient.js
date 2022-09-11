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

const channelPrefixChars='@#+!';const nicknamePrefixChars='~&@%+';const nickChannelSpacer=' | ';const pmNameSpacer=' - ';const activityIconInhibitTimerValue=10
;const cacheReloadString='-----IRC Cache Reload-----';const cacheErrorString='-----IRC Cache Error-----';const csrfToken=document.querySelector('meta[name="csrf-token"]').getAttribute('content')
;var ircState={ircConnectOn:false,ircConnecting:false,ircConnected:false,ircRegistered:false,ircIsAway:false,ircAutoReconnect:false,lastPing:'0.000',ircServerName:'',ircServerHost:'',
ircServerPort:6667,ircTLSEnabled:false,ircServerIndex:0,ircServerPrefix:'',channelList:[],nickName:'',userName:'',realName:'',userMode:'',userHost:'',channels:[],channelStates:[],progVersion:'0.0.0',
progName:'',times:{programRun:0,ircConnect:0},count:{ircConnect:0,ircConnectError:0},websocketCount:0};document.getElementById('webConnectIconId').removeAttribute('connected')
;document.getElementById('ircConnectIconId').removeAttribute('connected');document.getElementById('webConnectIconId').removeAttribute('connecting')
;document.getElementById('ircConnectIconId').removeAttribute('connecting');const webState={};webState.loginUser={};webState.webConnectOn=true;webState.webConnected=false;webState.webConnecting=false
;webState.ircConnecting=false;webState.websocketCount=0;webState.noticeOpen=false;webState.wallopsOpen=false;webState.viewRawMessages=false;webState.showRawInHex=false;webState.showCommsMessages=false
;webState.lastIrcServerIndex=-1;webState.channels=[];webState.channelStates=[];webState.lastPMNick='';webState.activePrivateMessageNicks=[];webState.times={webConnect:0};webState.count={webConnect:0,
webStateCalls:0};webState.cacheReloadInProgress=false;webState.lag={last:0,min:9999,max:0};webState.dynamic={inputAreaCharWidthPx:null,inputAreaSideWidthPx:null,sendButtonWidthPx:null,commonMargin:50,
lastDevicePixelRatio:1,bodyClientWidth:document.querySelector('body').clientWidth,lastClientWidth:document.querySelector('body').clientWidth}
;if(window.devicePixelRatio)webState.dynamic.lastDevicePixelRatio=window.devicePixelRatio;let webServerUrl='https://';let webSocketUrl='wss://';if('http:'===document.location.protocol){
webServerUrl='http://';webSocketUrl='ws://'}webServerUrl+=window.location.hostname+':'+window.location.port;webSocketUrl+=window.location.hostname+':'+window.location.port;var wsocket=null
;const beep1=new Audio('sounds/short-beep1.mp3');const beep2=new Audio('sounds/short-beep2.mp3');const beep3=new Audio('sounds/short-beep3.mp3');let beep1InhibitTimer=0;let beep2InhibitTimer=0
;let beep3InhibitTimer=0;function beepTimerTick(){if(beep1InhibitTimer>0)beep1InhibitTimer--;if(beep2InhibitTimer>0)beep2InhibitTimer--;if(beep3InhibitTimer>0)beep3InhibitTimer--}
function inhibitBeep(seconds){beep1InhibitTimer=seconds;beep2InhibitTimer=seconds;beep3InhibitTimer=seconds}
const audioPromiseErrorStr='Browser policy has blocked Audio.play() '+'because user must interact with page or manually play sound first.';function playBeep1Sound(){if(0===beep1InhibitTimer){
beep1.play().then((function(){document.getElementById('enableAudioButton').setAttribute('hidden','')})).catch((function(error){
if('NotAllowedError'===error.name)console.info('playBeep1Sound() '+audioPromiseErrorStr);else console.error(error)}));beep1InhibitTimer=5}}function playBeep2Sound(){if(0===beep2InhibitTimer){
beep2.play().catch((function(error){if('NotAllowedError'===error.name);else console.error(error)}));beep2InhibitTimer=5}}function playBeep3Sound(){if(0===beep3InhibitTimer){
beep3.play().catch((function(error){if('NotAllowedError'===error.name)console.info('playBeep3Sound() '+audioPromiseErrorStr);else console.error(error)}));beep3InhibitTimer=5}}
function areBeepsConfigured(){let isAnyBeepEnabled=false;let beepEnableChanArray=null;beepEnableChanArray=JSON.parse(window.localStorage.getItem('beepEnableChanArray'))
;if(beepEnableChanArray&&Array.isArray(beepEnableChanArray))if(beepEnableChanArray.length>0)for(let i=0;i<beepEnableChanArray.length;i++){if(beepEnableChanArray[i].beep1)isAnyBeepEnabled=true
;if(beepEnableChanArray[i].beep2)isAnyBeepEnabled=true;if(beepEnableChanArray[i].beep3)isAnyBeepEnabled=true}return isAnyBeepEnabled}function userInitiatedAudioPlay(){
document.getElementById('enableAudioButton').setAttribute('hidden','');if(areBeepsConfigured()){playBeep2Sound();setTimeout(playBeep1Sound,500)}}
document.getElementById('enableAudioButton').addEventListener('click',userInitiatedAudioPlay);if(areBeepsConfigured())document.getElementById('enableAudioButton').removeAttribute('hidden')
;const errorExpireSeconds=5;let errorRemainSeconds=0;function clearError(){const errorDivEl=document.getElementById('errorDiv');errorDivEl.setAttribute('hidden','')
;const errorContentDivEl=document.getElementById('errorContentDiv');while(errorContentDivEl.firstChild)errorContentDivEl.removeChild(errorContentDivEl.firstChild);errorRemainSeconds=0}
function showError(errorString){const errorDivEl=document.getElementById('errorDiv');errorDivEl.removeAttribute('hidden');const errorContentDivEl=document.getElementById('errorContentDiv')
;const errorMessageEl=document.createElement('div');errorMessageEl.textContent=errorString||'Error: unknown error (2993)';errorContentDivEl.appendChild(errorMessageEl)
;errorRemainSeconds=errorExpireSeconds}document.addEventListener('show-error-message',(function(event){showError(event.detail.message)}))
;document.getElementById('errorDiv').addEventListener('click',(function(){clearError()}));function errorTimerTickHandler(){if(errorRemainSeconds>0){errorRemainSeconds--
;if(0===errorRemainSeconds)clearError();else document.getElementById('errorTitle').textContent='Tap to Close ('+errorRemainSeconds.toString()+')'}}function unixTimestamp(){const now=new Date
;return parseInt(now.valueOf()/1e3)}function clearLastZoom(){const now=unixTimestamp()}function checkConnect(code){if(code>=1&&!webState.webConnected){showError('Error: not connected to web server')
;return false}if(code>=2&&!ircState.ircConnected){showError('Error: Not connected to IRC server.');return false}if(code>=3&&!ircState.ircRegistered){showError('Error: Not connected to IRC server.')
;return false}return true}function showRawMessageWindow(){document.getElementById('rawHiddenElements').removeAttribute('hidden');document.getElementById('rawHiddenElementsButton').textContent='-'
;document.getElementById('rawHeadRightButtons').removeAttribute('hidden')
;if(!webState.cacheReloadInProgress)document.getElementById('rawMessageDisplay').scrollTop=document.getElementById('rawMessageDisplay').scrollHeight}function hideRawMessageWindow(){
document.getElementById('rawHiddenElements').setAttribute('hidden','');document.getElementById('rawHiddenElementsButton').textContent='+'
;document.getElementById('rawHeadRightButtons').setAttribute('hidden','');document.getElementById('hiddenDebugDiv').setAttribute('hidden','')
;document.getElementById('variablesDivId').setAttribute('hidden','');document.getElementById('showDebugButton').textContent='More...'}function setNotActivityIcon(index){
document.getElementById('noticeUnreadExistIcon').removeAttribute('hidden')}function resetNotActivityIcon(index){document.getElementById('noticeUnreadExistIcon').setAttribute('hidden','')}
document.getElementById('noticeUnreadExistIcon').addEventListener('click',(function(){resetNotActivityIcon()}));document.getElementById('groupInfoButton').addEventListener('click',(function(){
if(document.getElementById('groupInfoHiddenDiv').hasAttribute('hidden'))document.getElementById('groupInfoHiddenDiv').removeAttribute('hidden');else document.getElementById('groupInfoHiddenDiv').setAttribute('hidden','')
}));document.getElementById('annunciatorBackgroundDivId').removeAttribute('hidden');document.getElementById('annunciatiorDivId').removeAttribute('hidden')
;document.getElementById('scrollableDivId').removeAttribute('hidden');hideRawMessageWindow();function updateDivVisibility(){if(webState.webConnected){
document.getElementById('webDisconnectedVisibleDiv').setAttribute('hidden','');document.getElementById('webDisconnectedHiddenDiv1').removeAttribute('hidden')
;document.getElementById('webDisconnectedHiddenDiv2').removeAttribute('hidden');document.getElementById('reconnectStatusDiv').textContent=''
;document.getElementById('webConnectIconId').setAttribute('connected','');document.getElementById('webConnectIconId').removeAttribute('connecting')
;document.getElementById('rawMessageInputId').removeAttribute('disabled');document.getElementById('sendRawMessageButton').removeAttribute('disabled')
;document.getElementById('loadFromCacheButton').removeAttribute('disabled');if(ircState.ircConnected){document.getElementById('cyclePrevServerButton').setAttribute('disabled','')
;document.getElementById('cycleNextServerButton').setAttribute('disabled','');document.getElementById('ircConnectIconId').removeAttribute('unavailable')
;document.getElementById('waitConnectIconId').setAttribute('hidden','');if(ircState.ircRegistered){document.getElementById('ircConnectIconId').removeAttribute('connecting')
;document.getElementById('ircConnectIconId').setAttribute('connected','')}else{document.getElementById('ircConnectIconId').setAttribute('connecting','')
;document.getElementById('ircConnectIconId').removeAttribute('connected')}
if(ircState.ircIsAway)document.getElementById('ircIsAwayIconId').removeAttribute('hidden');else document.getElementById('ircIsAwayIconId').setAttribute('hidden','')
;if(ircState.nickRecoveryActive)document.getElementById('nickRecovIconId').removeAttribute('hidden','');else document.getElementById('nickRecovIconId').setAttribute('hidden','')
;document.getElementById('hideLoginSection').setAttribute('hidden','');document.getElementById('hideLoginSectionButton').textContent='+'
;document.getElementById('nickNameInputId').setAttribute('disabled','');document.getElementById('connectButton').setAttribute('disabled','')
;document.getElementById('quitButton').removeAttribute('disabled');document.getElementById('userAwayMessageId').removeAttribute('disabled')
;document.getElementById('setAwayButton').removeAttribute('disabled');document.getElementById('setBackButton').removeAttribute('disabled')
;document.getElementById('ircDisconnectedHiddenDiv').removeAttribute('hidden')
;if(webState.noticeOpen)document.getElementById('noticeSectionDiv').removeAttribute('hidden');else document.getElementById('noticeSectionDiv').setAttribute('hidden','')
;if(webState.wallopsOpen)document.getElementById('wallopsSectionDiv').removeAttribute('hidden');else document.getElementById('wallopsSectionDiv').setAttribute('hidden','')}else{
if(webState.ircConnecting||ircState.ircConnecting){document.getElementById('ircConnectIconId').removeAttribute('unavailable');document.getElementById('ircConnectIconId').setAttribute('connecting','')
;document.getElementById('ircConnectIconId').removeAttribute('connected')}else{document.getElementById('ircConnectIconId').removeAttribute('unavailable')
;document.getElementById('ircConnectIconId').removeAttribute('connecting');document.getElementById('ircConnectIconId').removeAttribute('connected')}
if(ircState.ircAutoReconnect&&ircState.ircConnectOn&&!ircState.ircConnected&&!ircState.ircConnecting)document.getElementById('waitConnectIconId').removeAttribute('hidden');else document.getElementById('waitConnectIconId').setAttribute('hidden','')
;resetNotActivityIcon();document.getElementById('ircIsAwayIconId').setAttribute('hidden','');document.getElementById('nickRecovIconId').setAttribute('hidden','')
;document.getElementById('hideLoginSection').removeAttribute('hidden');document.getElementById('hideLoginSectionButton').textContent='-'
;if(document.getElementById('waitConnectIconId').hasAttribute('hidden')){document.getElementById('cyclePrevServerButton').removeAttribute('disabled')
;document.getElementById('cycleNextServerButton').removeAttribute('disabled');document.getElementById('nickNameInputId').removeAttribute('disabled')}else{
document.getElementById('cyclePrevServerButton').setAttribute('disabled','');document.getElementById('cycleNextServerButton').setAttribute('disabled','')
;document.getElementById('nickNameInputId').setAttribute('disabled','')}if(ircState.ircConnecting){document.getElementById('connectButton').setAttribute('disabled','')
;document.getElementById('quitButton').removeAttribute('disabled')}else{document.getElementById('connectButton').removeAttribute('disabled')
;if(document.getElementById('waitConnectIconId').hasAttribute('hidden'))document.getElementById('quitButton').setAttribute('disabled','');else document.getElementById('quitButton').removeAttribute('disabled')
}document.getElementById('userAwayMessageId').setAttribute('disabled','');document.getElementById('setAwayButton').setAttribute('disabled','')
;document.getElementById('setBackButton').setAttribute('disabled','');document.getElementById('ircDisconnectedHiddenDiv').setAttribute('hidden','');webState.noticeOpen=false
;document.getElementById('noticeSectionDiv').setAttribute('hidden','');webState.wallopsOpen=false;document.getElementById('wallopsSectionDiv').setAttribute('hidden','')
;document.getElementById('ircChannelsMainHiddenDiv').removeAttribute('hidden');document.getElementById('ircChannelsMainHiddenButton').textContent='-'}
if(ircState.disableServerListEditor)document.getElementById('editServerListButton').setAttribute('disabled','');else document.getElementById('editServerListButton').removeAttribute('disabled')
;document.getElementById('groupInfoHiddenDiv').setAttribute('hidden','')}else{document.getElementById('hiddenInfoDiv').setAttribute('hidden','')
;document.getElementById('infoOpenCloseButton').textContent='+';hideRawMessageWindow();document.getElementById('webDisconnectedVisibleDiv').removeAttribute('hidden')
;document.getElementById('webDisconnectedHiddenDiv1').setAttribute('hidden','');document.getElementById('webDisconnectedHiddenDiv2').setAttribute('hidden','')
;document.getElementById('waitConnectIconId').setAttribute('hidden','');document.getElementById('cyclePrevServerButton').setAttribute('disabled','')
;document.getElementById('cycleNextServerButton').setAttribute('disabled','');if(webState.webConnecting){document.getElementById('webConnectIconId').removeAttribute('connected')
;document.getElementById('webConnectIconId').setAttribute('connecting','')}else{document.getElementById('webConnectIconId').removeAttribute('connected')
;document.getElementById('webConnectIconId').removeAttribute('connecting')}resetNotActivityIcon();document.getElementById('ircConnectIconId').setAttribute('unavailable','')
;document.getElementById('ircConnectIconId').removeAttribute('connected');document.getElementById('ircConnectIconId').removeAttribute('connecting')
;document.getElementById('ircIsAwayIconId').setAttribute('hidden','');document.getElementById('nickRecovIconId').setAttribute('hidden','')
;document.getElementById('hideLoginSection').setAttribute('hidden','');document.getElementById('nickNameInputId').setAttribute('disabled','')
;document.getElementById('connectButton').setAttribute('disabled','');document.getElementById('quitButton').setAttribute('disabled','')
;document.getElementById('userAwayMessageId').setAttribute('disabled','');document.getElementById('setAwayButton').setAttribute('disabled','')
;document.getElementById('setBackButton').setAttribute('disabled','');document.getElementById('groupInfoHiddenDiv').setAttribute('hidden','')}}
document.addEventListener('show-all-divs',(function(event){document.getElementById('hideLoginSection').removeAttribute('hidden');document.getElementById('hideLoginSectionButton').textContent='-'
;document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');document.getElementById('privMsgMainHiddenButton').textContent='-'
;document.getElementById('ircChannelsMainHiddenDiv').removeAttribute('hidden');document.getElementById('ircChannelsMainHiddenButton').textContent='-';showRawMessageWindow();webState.noticeOpen=true
;webState.wallopsOpen=true;document.getElementById('noticeSectionDiv').removeAttribute('hidden');document.getElementById('wallopsSectionDiv').removeAttribute('hidden')}))
;document.addEventListener('hide-or-zoom',(function(event){document.getElementById('hideLoginSection').setAttribute('hidden','');document.getElementById('hideLoginSectionButton').textContent='+'
;document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden','');document.getElementById('privMsgMainHiddenButton').textContent='+'
;document.getElementById('ircChannelsMainHiddenDiv').setAttribute('hidden','');document.getElementById('ircChannelsMainHiddenButton').textContent='+';hideRawMessageWindow();webState.noticeOpen=false
;document.getElementById('noticeSectionDiv').setAttribute('hidden','');webState.wallopsOpen=false;document.getElementById('wallopsSectionDiv').setAttribute('hidden','')
;document.getElementById('hiddenInfoDiv').setAttribute('hidden','');document.getElementById('infoOpenCloseButton').textContent='+'}));function setVariablesShowingIRCDisconnected(){
document.getElementById('headerUser').textContent='';document.getElementById('headerServer').textContent='';document.dispatchEvent(new CustomEvent('cancel-beep-sounds',{bubbles:true}))
;const channelContainerDivEl=document.getElementById('channelContainerDiv');while(channelContainerDivEl.firstChild)channelContainerDivEl.removeChild(channelContainerDivEl.firstChild)
;webState.channels=[];webState.channelStates=[];webState.lag={last:0,min:9999,max:0}}const heartbeatExpirationTimeSeconds=15;let heartbeatUpCounter=0;function resetHeartbeatTimer(){
heartbeatUpCounter=0}function onHeartbeatReceived(){heartbeatUpCounter=0}function heartbeatTimerTickHandler(){heartbeatUpCounter++
;if(webState.webConnected)if(heartbeatUpCounter>heartbeatExpirationTimeSeconds+1){console.log('HEARTBEAT timeout + 2 seconds, socket unresponsive, forcing disconnect')
;document.getElementById('reconnectStatusDiv').textContent+='Web socket connection timeout, socket unresponsive, force disconnect\n';webState.webConnected=false;webState.webConnecting=false
;setVariablesShowingIRCDisconnected();updateDivVisibility()}else if(heartbeatUpCounter===heartbeatExpirationTimeSeconds){console.log('HEARTBEAT timeout + 0 seconds , attempting to closing socket')
;document.getElementById('reconnectStatusDiv').textContent+='Web socket connection timeout, attempting to close\n';if(wsocket)wsocket.close(3e3,'Heartbeat timeout')}}
function updateElapsedTimeDisplay(){function toTimeString(seconds){let remainSec=seconds;let day=0;let hour=0;let min=0;let sec=0;day=parseInt(remainSec/86400);remainSec-=86400*day
;hour=parseInt(remainSec/3600);remainSec-=3600*hour;min=parseInt(remainSec/60);sec=remainSec-60*min
;return day.toString().padStart(3,' ')+' D '+hour.toString().padStart(2,'0')+':'+min.toString().padStart(2,'0')+':'+sec.toString().padStart(2,'0')}
const timePreEl=document.getElementById('elapsedTimeDiv');const now=unixTimestamp();let timeStr=''
;if(webState.webConnected)timeStr+='Web Connected: '+toTimeString(now-webState.times.webConnect)+' ('+webState.count.webConnect.toString()+')\n';else timeStr+='Web Connected: N/A\n'
;if(ircState.ircConnected)timeStr+='IRC Connected: '+toTimeString(now-ircState.times.ircConnect)+' ('+ircState.count.ircConnect.toString()+')\n';else timeStr+='IRC Connected: N/A\n'
;if(webState.webConnected)timeStr+='Backend Start: '+toTimeString(now-ircState.times.programRun)+'\n';else timeStr+='Backend Start: N/A\n'
;if(ircState.ircConnected&&webState.lag.min<9998)timeStr+='IRC Lag: '+webState.lag.last.toFixed(3)+' Min: '+webState.lag.min.toFixed(3)+' Max: '+webState.lag.max.toFixed(3);else timeStr+='IRC Lag: (Waiting next ping)'
;timePreEl.textContent=timeStr}function updateTrueFalseIcons(id,value){if(value){document.getElementById(id).classList.remove('icon-false')
;document.getElementById(id+'Dot').classList.remove('icon-inner-false');document.getElementById(id).classList.add('icon-true');document.getElementById(id+'Dot').classList.add('icon-inner-true')}else{
document.getElementById(id).classList.remove('icon-true');document.getElementById(id+'Dot').classList.remove('icon-inner-true');document.getElementById(id).classList.add('icon-false')
;document.getElementById(id+'Dot').classList.add('icon-inner-false')}}let lastConnectErrorCount=0;function getIrcState(callback){webState.count.webStateCalls++
;const fetchURL=webServerUrl+'/irc/getircstate';const fetchOptions={method:'GET',headers:{Accept:'application/json'}};fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else{if(403===response.status)window.location.href='/login';throw new Error('Fetch status '+response.status+' '+response.statusText)}}).then(responseJson=>{
ircState=responseJson;if(!ircState.ircConnected&&webState.lastIrcServerIndex!==ircState.ircServerIndex){webState.lastIrcServerIndex=ircState.ircServerIndex
;document.getElementById('ircServerIndexInputId').value=ircState.ircServerIndex;document.getElementById('ircServerGroupInputId').value=ircState.ircServerGroup
;document.getElementById('ircServerNameInputId').value=ircState.ircServerName;document.getElementById('ircServerAddrInputId').value=ircState.ircServerHost
;document.getElementById('ircServerPortInputId').value=ircState.ircServerPort;updateTrueFalseIcons('ircServerTlsEnable',ircState.ircTLSEnabled)
;updateTrueFalseIcons('ircServerTlsVerify',ircState.ircTLSVerify);updateTrueFalseIcons('ircServerReconnectEnable',ircState.ircAutoReconnect)
;updateTrueFalseIcons('ircServerRotateEnable',ircState.ircServerRotation);if(ircState.enableSocks5Proxy&&ircState.ircProxy){document.getElementById('socks5HidableDiv').removeAttribute('hidden')
;updateTrueFalseIcons('socks5EnabledCheckbox',true);document.getElementById('socks5AddrInputId').value=ircState.socks5Host;document.getElementById('socks5PortInputId').value=ircState.socks5Port}else{
updateTrueFalseIcons('socks5EnabledCheckbox',false);document.getElementById('socks5AddrInputId').value='';document.getElementById('socks5PortInputId').value=''}
document.getElementById('nickNameInputId').value=ircState.nickName;document.getElementById('userNameInputId').textContent='"'+ircState.userName+'"'
;document.getElementById('realNameInputId').textContent='"'+ircState.realName+'"';document.getElementById('userModeInputId').textContent='"'+ircState.userMode+'"'}if(ircState.ircConnected){
document.title='IRC-'+ircState.ircServerName;document.getElementById('ircServerIndexInputId').value=ircState.ircServerIndex
;document.getElementById('ircServerGroupInputId').value=ircState.ircServerGroup;document.getElementById('ircServerNameInputId').value=ircState.ircServerName
;document.getElementById('ircServerAddrInputId').value=ircState.ircServerHost;document.getElementById('ircServerPortInputId').value=ircState.ircServerPort
;updateTrueFalseIcons('ircServerTlsEnable',ircState.ircTLSEnabled);updateTrueFalseIcons('ircServerTlsVerify',ircState.ircTLSVerify)
;updateTrueFalseIcons('ircServerReconnectEnable',ircState.ircAutoReconnect);updateTrueFalseIcons('ircServerRotateEnable',ircState.ircServerRotation);if(ircState.enableSocks5Proxy&&ircState.ircProxy){
document.getElementById('socks5HidableDiv').removeAttribute('hidden');updateTrueFalseIcons('socks5EnabledCheckbox',true);document.getElementById('socks5AddrInputId').value=ircState.socks5Host
;document.getElementById('socks5PortInputId').value=ircState.socks5Port}else{updateTrueFalseIcons('socks5EnabledCheckbox',false);document.getElementById('socks5AddrInputId').value=''
;document.getElementById('socks5PortInputId').value=''}document.getElementById('headerServer').textContent=ircState.ircServerName
;document.getElementById('headerUser').textContent=' ('+ircState.nickName+')';document.getElementById('nickNameInputId').value=ircState.nickName
;document.getElementById('userNameInputId').textContent='"'+ircState.userName+'"';document.getElementById('realNameInputId').textContent='"'+ircState.realName+'"'
;document.getElementById('userModeInputId').textContent='"'+ircState.userMode+'"';webState.ircConnecting=false}if(!ircState.ircConnected){
document.getElementById('nickNameInputId').value=ircState.nickName
;if(-1===ircState.ircServerIndex)document.getElementById('emptyServerListDiv').removeAttribute('hidden');else document.getElementById('emptyServerListDiv').setAttribute('hidden','')
;setVariablesShowingIRCDisconnected();document.title='irc-hybrid-client'}if(lastConnectErrorCount!==ircState.count.ircConnectError){lastConnectErrorCount=ircState.count.ircConnectError
;if(ircState.count.ircConnectError>0)if(webState.count.webStateCalls>1)showError('An IRC Server connection error occurred');webState.ircConnecting=false}
document.dispatchEvent(new CustomEvent('irc-state-changed',{bubbles:true,detail:{}}));updateDivVisibility()
;if(!document.getElementById('variablesDivId').hasAttribute('hidden'))document.getElementById('variablesPreId').textContent='ircState = '+JSON.stringify(ircState,null,2)+'\n\n'+'webState = '+JSON.stringify(webState,null,2)
;document.getElementById('programVersionDiv').textContent=' version-'+ircState.progVersion;if(callback)callback(null,ircState)}).catch(error=>{console.log(error);if(callback)callback(error,{})})}
function cleanFormatting(inString){const formattingChars=[2,7,15,17,22,29,30,31];let outString='';const l=inString.length;if(0===l)return outString;let i=0;let active=true;while(i<l){active=true
;if(active&&i<l&&formattingChars.indexOf(inString.charCodeAt(i))>=0){active=false;i++}if(active&&i<l&&3===inString.charCodeAt(i)){active=false;i++
;if(i<l&&inString.charAt(i)>='0'&&inString.charAt(i)<='9')i++;if(i<l&&inString.charAt(i)>='0'&&inString.charAt(i)<='9')i++;if(i<l&&','===inString.charAt(i)){i++
;if(i<l&&inString.charAt(i)>='0'&&inString.charAt(i)<='9')i++;if(i<l&&inString.charAt(i)>='0'&&inString.charAt(i)<='9')i++}}if(active&&i<l&&4===inString.charCodeAt(i)){active=false;i++
;if(inString.charAt(i)>='0'&&inString.charAt(i)<='9'||inString.toUpperCase().charAt(i)>='A'&&inString.toUpperCase().charAt(i)<='F'){for(let j=0;j<6;j++)if(i<l)i++;if(i<l&&','===inString.charAt(i)){i++
;for(let j=0;j<6;j++)if(i<l)i++}}}if(active&&i<l){active=false;outString+=inString.charAt(i);i++}}return outString}function cleanCtcpDelimiter(inString){const ctcpDelim=1;let outString=''
;const l=inString.length;if(0===l)return outString;let i=0;while(i<l)if(i<l&&inString.charCodeAt(i)===ctcpDelim)i++;else{if(i<l)outString+=inString.charAt(i);i++}return outString}
const timestampToHMS=function(timeString){let outString='';if(0===timeString.length)outString=null;else if(0===timeString.indexOf('@time=')){
const timeObj=new Date(timeString.slice(6,timeString.length));outString+=timeObj.getHours().toString().padStart(2,'0')+':';outString+=timeObj.getMinutes().toString().padStart(2,'0')+':'
;outString+=timeObj.getSeconds().toString().padStart(2,'0')}else outString=null;return outString};const timestampToYMD=function(timeString){let outString=''
;if(0===timeString.length)outString=null;else if(0===timeString.indexOf('@time=')){const timeObj=new Date(timeString.slice(6,timeString.length))
;outString+=timeObj.getFullYear().toString().padStart(4,'0')+'-';outString+=(timeObj.getMonth()+1).toString().padStart(2,'0')+'-';outString+=timeObj.getDate().toString().padStart(2,'0')
}else outString=null;return outString};const unixTimestampToHMS=function(seconds){let outString='';if('number'===typeof seconds&&Number.isInteger(seconds)&&seconds>1e9&&seconds<1e12){
const timeObj=new Date(1e3*seconds);let language;if(window.navigator.languages)language=window.navigator.languages[0];else language=window.navigator.userLanguage||window.navigator.language||'en-US'
;outString=timeObj.toLocaleTimeString(language,{hour12:false})}else outString=null;return outString};const timestampToUnixSeconds=function(timeString){let outSeconds=null
;if(0===timeString.length)outSeconds=null;else if(0===timeString.indexOf('@time=')){const timeObj=new Date(timeString.slice(6,timeString.length));outSeconds=parseInt(timeObj.valueOf()/1e3)
}else outSeconds=null;return outSeconds};function _parseIrcMessage(message){function _extractTimeString(start,end,messageString){let i=start;let timeString=''
;while(' '!==messageString.charAt(i)&&i<=end){timeString+=messageString.charAt(i);i++}const outStringHMS=timestampToHMS(timeString);const outStringYMD=timestampToYMD(timeString);return{
dataHMS:outStringHMS,dataYMD:outStringYMD,nextIndex:i+1}}function _isColonString(start,messageString){if(':'===messageString.charAt(start))return{isColonStr:true,nextIndex:start+1};else return{
isColonStr:false,nextIndex:start}}function _extractMidString(start,end,messageString){let i=start;let outString='';while(' '!==messageString.charAt(i)&&i<=end){outString+=messageString.charAt(i);i++}
if(0===outString.length)outString=null;return{data:outString,nextIndex:i+1}}function _extractFinalString(start,end,messageString){let i=start;let outString='';while(i<=end){
outString+=messageString.charAt(i);i++}if(0===outString.length)outString=null;return{data:outString,nextIndex:i+1}}function _extractNickname(inText){
if(inText)if(inText.indexOf('!')>=0&&inText.indexOf('@')>=0&&inText.indexOf('!')<inText.indexOf('@')){const nick=inText.split('!')[0];return nick}else return null;else return null}
function _extractHostname(inText){if(inText)if(inText.indexOf('!')>=0&&inText.indexOf('@')>=0&&inText.indexOf('!')<inText.indexOf('@')){const host=inText.split('!')[1];return host
}else return null;else return null}let timestamp=null;let datestamp=null;let prefix=null;let extNick=null;let extHost=null;let command=null;const params=[];const messageString=message.toString()
;const end=messageString.length-1;let temp={nextIndex:0};temp=_extractTimeString(temp.nextIndex,end,messageString);timestamp=temp.dataHMS;datestamp=temp.dataYMD
;temp=_isColonString(temp.nextIndex,messageString);if(temp.isColonStr){temp=_extractMidString(temp.nextIndex,end,messageString);prefix=temp.data;extNick=_extractNickname(temp.data)
;extHost=_extractHostname(temp.data)}temp=_extractMidString(temp.nextIndex,end,messageString);command=temp.data;let done=false;while(!done)if(temp.nextIndex>end)done=true;else{
temp=_isColonString(temp.nextIndex,messageString);if(temp.isColonStr){temp=_extractFinalString(temp.nextIndex,end,messageString);params.push(temp.data);done=true}else{
temp=_extractMidString(temp.nextIndex,end,messageString);if(temp.data&&temp.data.length>0)params.push(temp.data);else done=true}}return{timestamp:timestamp,datestamp:datestamp,prefix:prefix,
nick:extNick,host:extHost,command:command,params:params}}function displayChannelMessage(parsedMessage){document.dispatchEvent(new CustomEvent('channel-message',{bubbles:true,detail:{
parsedMessage:parsedMessage}}))}function displayPrivateMessage(parsedMessage){document.dispatchEvent(new CustomEvent('private-message',{bubbles:true,detail:{parsedMessage:parsedMessage}}))}
function displayNoticeMessage(parsedMessage){function _addText(text){document.getElementById('noticeMessageDisplay').value+=cleanFormatting(text)+'\n'
;if(!webState.cacheReloadInProgress)document.getElementById('noticeMessageDisplay').scrollTop=document.getElementById('noticeMessageDisplay').scrollHeight}switch(parsedMessage.command){case'NOTICE':{
const ctcpDelim=1
;if(2===parsedMessage.params.length&&parsedMessage.params[1].charCodeAt(0)===ctcpDelim||3===parsedMessage.params.length&&parsedMessage.params[2].charCodeAt(0)===ctcpDelim);else if(parsedMessage.params[0]===ircState.nickName){
if(parsedMessage.nick)_addText(parsedMessage.timestamp+' '+parsedMessage.nick+nickChannelSpacer+parsedMessage.params[1]);else _addText(parsedMessage.timestamp+' '+parsedMessage.prefix+nickChannelSpacer+parsedMessage.params[1])
;webState.noticeOpen=true;updateDivVisibility();if(!webState.cacheReloadInProgress)setNotActivityIcon()
}else if(ircState.channels.indexOf(parsedMessage.params[0].toLowerCase())>=0)document.dispatchEvent(new CustomEvent('channel-message',{bubbles:true,detail:{parsedMessage:parsedMessage}
}));else if(parsedMessage.nick===ircState.nickName){_addText(parsedMessage.timestamp+' [to] '+parsedMessage.params[0]+nickChannelSpacer+parsedMessage.params[1]);webState.noticeOpen=true
;updateDivVisibility()}}break;default:}}document.addEventListener('erase-before-reload',(function(event){document.getElementById('noticeMessageDisplay').value='';webState.noticeOpen=false
;document.getElementById('noticeUnreadExistIcon').setAttribute('hidden','');updateDivVisibility()}));document.addEventListener('cache-reload-done',(function(event){let markerString=''
;let timestampString='';if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)markerString+=timestampString
;markerString+=' '+cacheReloadString+'\n';if(''!==document.getElementById('noticeMessageDisplay').value){document.getElementById('noticeMessageDisplay').value+=markerString
;document.getElementById('noticeMessageDisplay').scrollTop=document.getElementById('noticeMessageDisplay').scrollHeight}}));document.addEventListener('cache-reload-error',(function(event){
let errorString='\n';let timestampString='';if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString
;errorString+=' '+cacheErrorString+'\n\n';document.getElementById('noticeMessageDisplay').value=errorString}));function displayWallopsMessage(parsedMessage){function _addText(text){
document.getElementById('wallopsMessageDisplay').value+=cleanFormatting(text)+'\n'
;if(!webState.cacheReloadInProgress)document.getElementById('wallopsMessageDisplay').scrollTop=document.getElementById('wallopsMessageDisplay').scrollHeight}switch(parsedMessage.command){
case'WALLOPS':if(parsedMessage.nick){_addText(parsedMessage.timestamp+' '+parsedMessage.nick+nickChannelSpacer+parsedMessage.params[0]);webState.wallopsOpen=true}else{
_addText(parsedMessage.timestamp+' '+parsedMessage.prefix+nickChannelSpacer+parsedMessage.params[0]);webState.wallopsOpen=true}updateDivVisibility();break;default:}}
document.addEventListener('erase-before-reload',(function(event){document.getElementById('wallopsMessageDisplay').value='';webState.wallopsOpen=false;updateDivVisibility()}))
;document.addEventListener('cache-reload-done',(function(event){let markerString='';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)markerString+=timestampString;markerString+=' '+cacheReloadString+'\n'
;if(''!==document.getElementById('wallopsMessageDisplay').value){document.getElementById('wallopsMessageDisplay').value+=markerString
;document.getElementById('wallopsMessageDisplay').scrollTop=document.getElementById('wallopsMessageDisplay').scrollHeight}}));document.addEventListener('cache-reload-error',(function(event){
let errorString='\n';let timestampString='';if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString
;errorString+=' '+cacheErrorString+'\n\n';document.getElementById('wallopsMessageDisplay').value=errorString}));function displayRawMessage(inString){
document.getElementById('rawMessageDisplay').value+=inString+'\n'
;if(!webState.cacheReloadInProgress)document.getElementById('rawMessageDisplay').scrollTop=document.getElementById('rawMessageDisplay').scrollHeight}function displayRawMessageInHex(message){
const uint8String=new TextEncoder('utf8').encode(message);let hexString='';for(let i=0;i<uint8String.length;i++)hexString+=uint8String[i].toString(16).padStart(2,'0')+' ';displayRawMessage(hexString)}
function displayFormattedServerMessage(parsedMessage,message){document.dispatchEvent(new CustomEvent('server-message',{bubbles:true,detail:{parsedMessage:parsedMessage,message:message}}))}
function _parseCtcpMessage(parsedMessage,message){function _addNoticeText(text){document.getElementById('noticeMessageDisplay').value+=text+'\n'
;if(!webState.cacheReloadInProgress)document.getElementById('noticeMessageDisplay').scrollTop=document.getElementById('noticeMessageDisplay').scrollHeight}const ctcpDelim=1
;const ctcpMessage=parsedMessage.params[1];const end=ctcpMessage.length-1;if(1!==ctcpMessage.charCodeAt(0)){console.log('_parseCtcpMessage() missing CTCP start delimiter');return}let i=1
;let ctcpCommand='';let ctcpRest='';while(' '!==ctcpMessage.charAt(i)&&i<=end){if(ctcpMessage.charCodeAt(i)!==ctcpDelim)ctcpCommand+=ctcpMessage.charAt(i);i++}ctcpCommand=ctcpCommand.toUpperCase()
;while(' '===ctcpMessage.charAt(i)&&i<=end)i++;while(ctcpMessage.charCodeAt(i)!==ctcpDelim&&i<=end){ctcpRest+=ctcpMessage.charAt(i);i++}if('ACTION'===ctcpCommand){
const chanPrefixIndex=channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0));const index=ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());if(index>=0){
parsedMessage.params[1]=parsedMessage.nick+' '+ctcpRest;parsedMessage.nick='*';displayChannelMessage(parsedMessage)
}else if(chanPrefixIndex>=0)displayFormattedServerMessage(parsedMessage,message);else{parsedMessage.params[1]=ctcpRest;parsedMessage.isPmCtcpAction=true;displayPrivateMessage(parsedMessage)}}else{
if(parsedMessage.nick===ircState.nickName)if('PRIVMSG'===parsedMessage.command.toUpperCase()){
_addNoticeText(parsedMessage.timestamp+' '+'CTCP 1 Request to '+parsedMessage.params[0]+': '+ctcpCommand+' '+ctcpRest);webState.noticeOpen=true}else{let replyContents=''
;if(parsedMessage.params.length>2)for(let i=2;i<parsedMessage.params.length;i++)if(parsedMessage.params[i].charCodeAt(0)!==ctcpDelim){replyContents+=cleanCtcpDelimiter(parsedMessage.params[i])
;if(i!==parsedMessage.params.length)replyContents+=' '}_addNoticeText(parsedMessage.timestamp+' '+'CTCP 2 Reply to '+parsedMessage.params[0]+': '+ctcpCommand+' '+replyContents)
;webState.noticeOpen=true}else if('PRIVMSG'===parsedMessage.command.toUpperCase()){_addNoticeText(parsedMessage.timestamp+' '+'CTCP 3 Request from '+parsedMessage.nick+': '+ctcpCommand+' '+ctcpRest)
;webState.noticeOpen=true}else{_addNoticeText(parsedMessage.timestamp+' '+'CTCP 4 Reply from '+parsedMessage.nick+': '+ctcpCommand+' '+ctcpRest);webState.noticeOpen=true}updateDivVisibility()}}
const ircMessageCommandDisplayFilter=['331','332','333','353','366','JOIN','KICK','MODE','NICK','NOTICE','PART','PING','PONG','PRIVMSG','cachedQUIT'.toUpperCase(),'QUIT','TOPIC','WALLOPS']
;function _parseBufferMessage(message){if('HEARTBEAT'===message){onHeartbeatReceived();if(webState.showCommsMessages)displayRawMessage('HEARTBEAT')}else if('UPDATE'===message){getIrcState()
;if(webState.showCommsMessages)displayRawMessage('UPDATE')}else if('CACHERESET'===message){document.dispatchEvent(new CustomEvent('erase-before-reload',{bubbles:true}))
;if(webState.showCommsMessages)displayRawMessage('CACHERESET')}else if(message.startsWith('LAG=')&&9===message.length){if(webState.showCommsMessages)displayRawMessage(message)
;const pingStr=message.split('=')[1];let pingFloat=null;try{pingFloat=parseFloat(pingStr)}catch(err){pingFloat=null}if(pingFloat&&'number'===typeof pingFloat){webState.lag.last=pingFloat
;if(pingFloat<webState.lag.min)webState.lag.min=pingFloat;if(pingFloat>webState.lag.max)webState.lag.max=pingFloat}}else{function _showNotExpiredError(errStr){const timeNow=new Date
;const timeNowSeconds=parseInt(timeNow/1e3);const timeMessageSeconds=timestampToUnixSeconds(message.split(' ')[0]);if(timeNowSeconds-timeMessageSeconds<errorExpireSeconds)showError(errStr)}
if('--\x3e'===message.split(' ')[0]){if(webState.showCommsMessages)displayRawMessage(message);return}if('webServer:'===message.split(' ')[0]){if(webState.showCommsMessages)displayRawMessage(message)
;return}if('webError:'===message.split(' ')[0]){if(webState.showCommsMessages)displayRawMessage(message);if(message.length>10)showError(message.slice(10));return}
const parsedMessage=_parseIrcMessage(message);if(webState.viewRawMessages){if(webState.showRawInHex)displayRawMessageInHex(message);displayRawMessage(message)
}else if(ircMessageCommandDisplayFilter.indexOf(parsedMessage.command.toUpperCase())<0)displayFormattedServerMessage(parsedMessage,message)
;if(parseInt(parsedMessage.command)>=400&&parseInt(parsedMessage.command)<500)_showNotExpiredError(message.slice(12,message.length));switch(parsedMessage.command){case'ERROR':
if(!ircState.ircRegistered&&1===parsedMessage.params.length)if(!webState.cacheReloadInProgress)showError('ERROR '+parsedMessage.params[0]);break;case'KICK':displayChannelMessage(parsedMessage);break
;case'JOIN':displayChannelMessage(parsedMessage);break;case'MODE':if(parsedMessage.params[0]===ircState.nickName){if(!webState.viewRawMessages)displayFormattedServerMessage(parsedMessage,message)
}else if(channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0))>=0)displayChannelMessage(parsedMessage);else console.log('Error message MODE to unknown recipient');break;case'NICK':{
let pureNick1=parsedMessage.nick.toLowerCase();if(nicknamePrefixChars.indexOf(pureNick1.charAt(0))>=0)pureNick1=pureNick1.slice(1,pureNick1.length);let pureNick2=parsedMessage.params[0].toLowerCase()
;if(nicknamePrefixChars.indexOf(pureNick2.charAt(0))>=0)pureNick2=pureNick2.slice(1,pureNick2.length);let present=false
;if(ircState.channels.length>0)for(let i=0;i<ircState.channels.length;i++)if(ircState.channelStates[i].joined&&ircState.channelStates[i].names.length>0)for(let j=0;j<ircState.channelStates[i].names.length;j++){
let checkNick=ircState.channelStates[i].names[j].toLowerCase();if(nicknamePrefixChars.indexOf(checkNick.charAt(0))>=0)checkNick=checkNick.slice(1,checkNick.length)
;if(checkNick===pureNick1)present=true;if(checkNick===pureNick2)present=true}if(present)displayChannelMessage(parsedMessage);else displayFormattedServerMessage(parsedMessage,message)}break;case'PART':
displayChannelMessage(parsedMessage);break;case'NOTICE':if(!parsedMessage.nick||0===parsedMessage.nick.length){if(!webState.viewRawMessages)displayFormattedServerMessage(parsedMessage,message)}else{
const ctcpDelim=1;if(null===parsedMessage.params[1])parsedMessage.params[1]=''
;if(parsedMessage.params[1].charCodeAt(0)===ctcpDelim)_parseCtcpMessage(parsedMessage,message);else displayNoticeMessage(parsedMessage)}break;case'PRIVMSG':{const ctcpDelim=1
;if(parsedMessage.params[1].charCodeAt(0)===ctcpDelim)_parseCtcpMessage(parsedMessage,message);else{const chanPrefixIndex=channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0))
;const channelIndex=ircState.channels.indexOf(parsedMessage.params[0].toLowerCase())
;if(channelIndex>=0)displayChannelMessage(parsedMessage);else if(chanPrefixIndex>=0)displayFormattedServerMessage(parsedMessage,message);else displayPrivateMessage(parsedMessage)}}break
;case'cachedQUIT':case'QUIT':displayChannelMessage(parsedMessage);break;case'TOPIC':
if(channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0))>=0)displayChannelMessage(parsedMessage);else console.log('Error message TOPIC to unknown channel');break;case'WALLOPS':
displayWallopsMessage(parsedMessage);break;default:}}}function initWebSocketAuth(callback){const fetchURL=webServerUrl+'/irc/wsauth';const fetchOptions={method:'POST',headers:{'CSRF-Token':csrfToken,
'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify({purpose:'websocket-auth'})};fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseJson=>{if(callback)callback(null,ircState)}).catch(error=>{
console.log(error);webState.webConnected=false;webState.webConnecting=false;updateDivVisibility();if(callback)callback(error,{})})}function connectWebSocket(){
wsocket=new WebSocket(webSocketUrl+'/irc/ws');webState.websocketCount++;wsocket.addEventListener('open',(function(event){webState.webConnected=true;webState.webConnecting=false
;webState.times.webConnect=unixTimestamp();webState.count.webConnect++;resetHeartbeatTimer();updateDivVisibility();getIrcState((function(err,data){
if(!err)document.dispatchEvent(new CustomEvent('update-from-cache',{bubbles:true}))}))}));wsocket.addEventListener('close',(function(event){if(webState.websocketCount>0){webState.websocketCount--
;if(0===webState.websocketCount){
if(webState.webConnected)if('code'in event&&3001===event.code)document.getElementById('reconnectStatusDiv').textContent+='Web page disconnected at user request\n';else{
document.getElementById('reconnectStatusDiv').textContent+='Web socket connection closed, count: '+webState.websocketCount+'\n'+'Code: '+event.code+' '+event.reason+'\n'
;if(!webState.webConnectOn)document.getElementById('reconnectStatusDiv').textContent+='Automatic web reconnect is disabled. \nPlease reconnect manually.\n'}webState.webConnected=false
;webState.webConnecting=false;setVariablesShowingIRCDisconnected();updateDivVisibility()}}}));wsocket.addEventListener('error',(function(error){if(error)console.log(error);webState.webConnected=false
;webState.webConnecting=false}));let previousBufferFragment='';function parseStreamBuffer(inBuffer){if(!inBuffer)return;const data=previousBufferFragment.concat(inBuffer);previousBufferFragment=''
;const len=data.length;if(0===len)return;let index=0;let count=0;for(let i=0;i<len;i++){const charCode=data.charCodeAt(i);if(10!==charCode&&13!==charCode)count+=1;else{if(count>0){
const message=data.slice(index,index+count);_parseBufferMessage(message)}index=i+1;count=0}}if(count>0)previousBufferFragment=data.slice(index,index+count)}
wsocket.addEventListener('message',(function(event){parseStreamBuffer(event.data)}))}function _sendIrcServerMessage(message){if(!checkConnect(3))return;const body={message:message}
;const fetchURL=webServerUrl+'/irc/message';const fetchOptions={method:'POST',headers:{'CSRF-Token':csrfToken,'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify(body)}
;fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else{if(403===response.status)window.location.href='/login'
;throw new Error('Fetch status '+response.status+' '+response.statusText)}}).then(responseJson=>{if(responseJson.error)showError(responseJson.message)}).catch(error=>{showError(error.toString())
;console.log(error)})}function reconnectWebSocketAfterDisconnect(){const statusURL=webServerUrl+'/status';const secureStatusURL=webServerUrl+'/secure';const fetchOptions={method:'GET',headers:{
Accept:'application/json'}};fetch(statusURL,fetchOptions).then(response=>{if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)
}).then(responseJson=>{document.getElementById('reconnectStatusDiv').textContent+='Server found, Checking authoriztion.\n';fetch(secureStatusURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else{if(403===response.status)window.location.href='/login';throw new Error('Fetch status '+response.status+' '+response.statusText)}}).then(responseJson=>{
document.getElementById('reconnectStatusDiv').textContent+='Authorizton confirmed, opening web socket.\n';initWebSocketAuth((function(err,data){if(err){showError('Error connecting web socket')
;console.log(err);document.getElementById('reconnectStatusDiv').textContent+='Error: authorizing websocket.\n';webState.webConnected=false;webState.webConnecting=false;updateDivVisibility()
}else setTimeout((function(){connectWebSocket()}),100)}))}).catch(error=>{console.log(error);document.getElementById('reconnectStatusDiv').textContent+='Error: Error checking authorization\n'
;webState.webConnected=false;webState.webConnecting=false;updateDivVisibility()})}).catch(error=>{console.log(error)
;document.getElementById('reconnectStatusDiv').textContent+='Error: No internet or server down\n';webState.webConnected=false;webState.webConnecting=false;updateDivVisibility()})}
function firstWebSocketConnectOnPageLoad(){if(!webState.webConnected&&!webState.webConnecting){webState.webConnecting=true;initWebSocketAuth((function(err,data){if(err){
showError('Error connecting web socket');console.log(err)}else setTimeout((function(){connectWebSocket()}),100)}))}}
document.getElementById('manualWebSocketReconnectButton').addEventListener('click',(function(){if(!webState.webConnected&&!webState.webConnecting){webState.webConnectOn=true
;webState.webConnecting=true;updateDivVisibility();document.getElementById('reconnectStatusDiv').textContent+='Reconnect to web server initiated (Manual)\n';reconnectWebSocketAfterDisconnect()}}))
;let webStatusIconTouchDebounce=false;document.getElementById('webConnectIconId').addEventListener('click',(function(){if(webStatusIconTouchDebounce)return;webStatusIconTouchDebounce=true
;setTimeout((function(){webStatusIconTouchDebounce=false}),1e3);if(!webState.webConnected&&!webState.webConnecting){webState.webConnectOn=true;webState.webConnecting=true;updateDivVisibility()
;document.getElementById('reconnectStatusDiv').textContent+='Reconnect to web server initiated (Manual)\n';reconnectWebSocketAfterDisconnect();return}if(webState.webConnected){
webState.webConnectOn=false;wsocket.close(3001,'Disconnect on request')}}));document.getElementById('stopWebSocketReconnectButton').addEventListener('click',(function(){if(!webState.webConnected){
webState.webConnectOn=false;webState.webConnecting=false;document.getElementById('reconnectStatusDiv').textContent='Reconnect disabled\n'}}));let wsReconnectCounter=0;let wsReconnectTimer=0
;function reconnectTimerTickHandler(){if(!webState.webConnectOn||webState.webConnected){wsReconnectCounter=0;wsReconnectTimer=0;return}if(webState.webConnecting)return;wsReconnectTimer++
;if(0===wsReconnectCounter){if(wsReconnectTimer>0){webState.webConnecting=true;updateDivVisibility();wsReconnectTimer=0;wsReconnectCounter++
;document.getElementById('reconnectStatusDiv').textContent+='Reconnect to web server initiated (Timer-1)\n';reconnectWebSocketAfterDisconnect()}}else if(1===wsReconnectCounter){if(wsReconnectTimer>5){
webState.webConnecting=true;updateDivVisibility();wsReconnectTimer=0;wsReconnectCounter++;document.getElementById('reconnectStatusDiv').textContent+='Reconnect to web server initiated (Timer-2)\n'
;reconnectWebSocketAfterDisconnect()}}else if(wsReconnectCounter>10){webState.webConnectOn=false;updateDivVisibility()
;if(11===wsReconnectCounter)document.getElementById('reconnectStatusDiv').textContent+='Reconnect disabled\n'}else if(wsReconnectTimer>15){webState.webConnecting=true;updateDivVisibility()
;wsReconnectTimer=0;wsReconnectCounter++;document.getElementById('reconnectStatusDiv').textContent+='Reconnect to web server initiated (Timer-3)\n';reconnectWebSocketAfterDisconnect()}}
document.getElementById('cyclePrevServerButton').addEventListener('click',(function(){if(ircState.ircConnected){showError('Can not change servers while connected');return}
const fetchURL=webServerUrl+'/irc/server';const fetchOptions={method:'POST',headers:{'CSRF-Token':csrfToken,'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify({index:-2})
};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseJson=>{
if(responseJson.error)showError(responseJson.message);else webState.lastIrcServerIndex=-2}).catch(error=>{console.log(error);showError(error.toString())})}))
;document.getElementById('cycleNextServerButton').addEventListener('click',(function(){if(ircState.ircConnected){showError('Can not change servers while connected');return}
const fetchURL=webServerUrl+'/irc/server';const fetchOptions={method:'POST',headers:{'CSRF-Token':csrfToken,'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify({index:-1})
};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseJson=>{
if(responseJson.error)showError(responseJson.message);else webState.lastIrcServerIndex=-1}).catch(error=>{console.log(error);showError(error.toString())})}));function connectButtonHandler(){
if(!checkConnect(1))return;if(ircState.ircConnected||ircState.ircConnecting||webState.ircConnecting){showError('Error: Already connected to IRC server');return}if(-1===ircState.ircServerIndex){
showError('Empty Server List');return}if(document.getElementById('nickNameInputId').value.length<1){showError('Invalid nick name.');return}webState.ircConnecting=true;const connectObject={}
;connectObject.nickName=document.getElementById('nickNameInputId').value;connectObject.realName=ircState.realName;connectObject.userMode=ircState.userMode;const fetchURL=webServerUrl+'/irc/connect'
;const fetchOptions={method:'POST',headers:{'CSRF-Token':csrfToken,'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify(connectObject)}
;fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else{if(403===response.status)window.location.href='/login'
;throw new Error('Fetch status '+response.status+' '+response.statusText)}}).then(responseJson=>{if(responseJson.error)showError(responseJson.message)}).catch(error=>{console.log(error)})}
function forceDisconnectHandler(){const fetchURL=webServerUrl+'/irc/disconnect';const fetchOptions={method:'POST',headers:{'CSRF-Token':csrfToken,'Content-type':'application/json',
Accept:'application/json'},body:JSON.stringify({})};fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseJson=>{if(responseJson.error)showError(responseJson.message)
}).catch(error=>{console.log(error)})}document.getElementById('connectButton').addEventListener('click',(function(){connectButtonHandler()}))
;document.getElementById('disconnectButton').addEventListener('click',(function(){forceDisconnectHandler()}));let ircStatusIconTouchDebounce=false
;document.getElementById('ircConnectIconId').addEventListener('click',(function(){if(ircStatusIconTouchDebounce)return;ircStatusIconTouchDebounce=true;setTimeout((function(){
ircStatusIconTouchDebounce=false}),1e3)
;if(ircState.ircConnected||ircState.ircConnecting||webState.ircConnecting)if(webState.ircConnecting||ircState.webConnecting||ircState.ircConnected&&!ircState.ircRegistered){
webState.ircConnecting=false;forceDisconnectHandler()}else _sendIrcServerMessage('QUIT :'+ircState.progName+' '+ircState.progVersion);else connectButtonHandler()}))
;document.getElementById('quitButton').addEventListener('click',(function(){if(webState.ircConnecting||ircState.webConnecting||ircState.ircConnected&&!ircState.ircRegistered){
webState.ircConnecting=false;forceDisconnectHandler()
}else if(ircState.ircAutoReconnect&&ircState.ircConnectOn&&!ircState.ircConnected&&!ircState.ircConnecting)forceDisconnectHandler();else _sendIrcServerMessage('QUIT :'+ircState.progName+' '+ircState.progVersion)
}));document.getElementById('hideLoginSectionButton').addEventListener('click',(function(){if(document.getElementById('hideLoginSection').hasAttribute('hidden')){
document.getElementById('hideLoginSection').removeAttribute('hidden');document.getElementById('hideLoginSectionButton').textContent='-'}else{
document.getElementById('hideLoginSection').setAttribute('hidden','');document.getElementById('hideLoginSectionButton').textContent='+'}}))
;document.getElementById('webLogoutButton').addEventListener('click',(function(){
if(ircState.ircConnected&&webState.webConnected||!webState.webConnected)document.getElementById('logoutConfirmDiv').removeAttribute('hidden');else{window.localStorage.clear()
;window.location.href='/logout'}}));document.getElementById('confirmedWebLogoutButton').addEventListener('click',(function(){window.localStorage.clear();window.location.href='/logout'}))
;document.getElementById('cancelLogoutConfirmButton').addEventListener('click',(function(){document.getElementById('logoutConfirmDiv').setAttribute('hidden','')}))
;document.getElementById('ircIsAwayIconId').addEventListener('click',(function(){if(ircState.ircConnected&&ircState.ircIsAway)_sendIrcServerMessage('AWAY')}))
;document.getElementById('setAwayButton').addEventListener('click',(function(){
if(ircState.ircConnected&&document.getElementById('userAwayMessageId').value.length>0)_sendIrcServerMessage('AWAY '+document.getElementById('userAwayMessageId').value)}))
;document.getElementById('setBackButton').addEventListener('click',(function(){if(ircState.ircConnected&&ircState.ircIsAway)_sendIrcServerMessage('AWAY')}))
;const autoCompleteCommandList=['/ADMIN','/AWAY','/CTCP','/DEOP','/DEVOICE','/JOIN','/LIST','/ME','/MODE','/MOTD','/MSG','/NICK','/NOP','/NOTICE','/OP','/PART','/QUERY','/QUIT','/QUOTE','/TOPIC','/VERSION','/VOICE','/WHO','/WHOIS']

;const autoCompleteRawCommandList=['ADMIN','AWAY','CAP','CONNECT','DIE','DISCONNECT','ERROR','GLINE','HELP','INFO','INVITE','ISON','JOIN','KICK','KILL','KLINE','LINKS','LIST','LUSERS','MODE','MOTD','NAMES','NICK','NOTICE','OPER','PART','PASS','PING','PONG','PRIVMSG','QUIT','REHASH','RESTART','SERVLIST','SQUERY','SQUIT','STATS','SUMMON','TIME','TOPIC','TRACE','USER','USERHOST','USERS','VERSION','WALLOPS','WHO','WHOIS','WHOWAS']
;function detectMultiLineString(inString){let inLength=inString.length;if(inLength>0&&10===inString.charCodeAt(inLength-1))inLength--;if(inLength>0){let countCR=0
;for(let i=0;i<inLength;i++)if(10===inString.charCodeAt(i))countCR++;if(0===countCR)return false;else return true}else return false}function stripTrailingCrLf(inString){let inLength=inString.length
;if(inLength>0&&10===inString.charCodeAt(inLength-1))inLength--;if(inLength>0&&13===inString.charCodeAt(inLength-1))inLength--;if(inLength>0&&32===inString.charCodeAt(inLength-1))inLength--
;if(inLength>0&&32===inString.charCodeAt(inLength-1))inLength--;if(0===inLength)return'';else return inString.slice(0,inLength)}function stripOneCrLfFromElement(textAreaElement){
if(!textAreaElement.value)return;const inString=textAreaElement.value.toString();let crCount=0;let lfCount=0;if(inString.length>0)for(let i=0;i<inString.length;i++){
if(13===inString.charCodeAt(i))crCount++;if(10===inString.charCodeAt(i))lfCount++}if(0===crCount&&1===lfCount){let newString=''
;for(let i=0;i<inString.length;i++)if(10!==inString.charCodeAt(i))newString+=inString.charAt(i);textAreaElement.value=newString}if(1===crCount&&1===lfCount){let newString=''
;for(let i=0;i<inString.length;i++)if(10!==inString.charCodeAt(i)&&13!==inString.charCodeAt(i))newString+=inString.charAt(i);textAreaElement.value=newString}}function textCommandParser(inputObj){
function _isWS(inChar){if(' '===inChar.charAt(0))return true;if(9===inChar.charCodeAt(0))return true;return false}function _isEOL(inChar){if('\n'===inChar.charAt(0))return true
;if('\r'===inChar.charAt(0))return true;return false}let inStr=inputObj.inputString;if(inStr.length>0&&_isEOL(inStr.charAt(inStr.length-1)))inStr=inStr.slice(0,inStr.length-1)
;if(inStr.length>0&&_isEOL(inStr.charAt(inStr.length-1)))inStr=inStr.slice(0,inStr.length-1);const inStrLen=inStr.length;const parsedCommand={command:'',params:[],restOf:[]};if(inStr.length<2)return{
error:true,message:'Error no command not found',ircMessage:null};if('/'!==inStr.charAt(0))return{error:true,message:'Error missing / before command',ircMessage:null};if(_isWS(inStr.charAt(1)))return{
error:true,message:'Error space after slash',ircMessage:null};let idx=1;while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){parsedCommand.command+=inStr.charAt(idx);idx++}
while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++;parsedCommand.command=parsedCommand.command.toUpperCase();if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(null)
;parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars1='';while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars1+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++
;if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(chars1);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars2='';while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){
chars2+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++;if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(chars2)
;parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars3='';while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars3+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++
;if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(chars3);parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars4='';while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){
chars4+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++;if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(chars4)
;parsedCommand.restOf.push(inStr.slice(idx,inStrLen));let chars5='';while(!_isWS(inStr.charAt(idx))&&idx<inStrLen){chars5+=inStr.charAt(idx);idx++}while(_isWS(inStr.charAt(idx))&&idx<inStrLen)idx++
;if(inStr.slice(idx,inStrLen).length>0){parsedCommand.params.push(chars5);parsedCommand.restOf.push(inStr.slice(idx,inStrLen))}}}}}}
function _parseChannelModes(modeValue,chanUserMode,ircCommand,parsedCommand,inputObj){if('channel'!==inputObj.originType)return{error:true,message:ircCommand+' must be used in channel widnow',
ircMessage:null};else if(parsedCommand.params.length>0){const nameArray=[];if(1===parsedCommand.params.length)nameArray.push(parsedCommand.restOf[0]);else{
for(let i=1;i<parsedCommand.params.length;i++)nameArray.push(parsedCommand.params[i]);nameArray.push(parsedCommand.restOf[parsedCommand.restOf.length-1])}if(nameArray.length>5)return{error:true,
message:ircCommand+' command maximum of 5 names exceeded',ircMessage:null};else if(channelPrefixChars.indexOf(nameArray[0].charAt(0))>=0)return{error:true,
message:ircCommand+' command does not accept the channel name.',ircMessage:null};else{const returnObj={error:false,message:'',ircMessage:null};returnObj.ircMessage='MODE '
;returnObj.ircMessage+=inputObj.originName+' '+modeValue;for(let i=0;i<nameArray.length;i++)returnObj.ircMessage+=chanUserMode;for(let i=0;i<nameArray.length;i++)returnObj.ircMessage+=' '+nameArray[i]
;return returnObj}}else return{error:true,message:'Expect: /'+ircCommand+' <nick1> ... [nick5]',ircMessage:null}}let ircMessage=null;switch(parsedCommand.command){case'ADMIN':showRawMessageWindow()
;ircMessage='ADMIN';if(1===parsedCommand.restOf.length)ircMessage='ADMIN '+parsedCommand.restOf[0];break;case'AWAY':ircMessage='AWAY'
;if(parsedCommand.restOf.length>0)ircMessage='AWAY :'+parsedCommand.restOf[0];break;case'CTCP':{const ctcpDelim=1;if(2!==parsedCommand.params.length)return{error:true,
message:'Expect: /CTCP <nickname> <ctcp_command>',ircMessage:null}
;ircMessage='PRIVMSG '+parsedCommand.params[1]+' :'+String.fromCharCode(ctcpDelim)+parsedCommand.restOf[1].toUpperCase()+String.fromCharCode(ctcpDelim)}break;case'DEOP':{
const ro=_parseChannelModes('-','o','DEOP',parsedCommand,inputObj);if(ro.error)return ro;else ircMessage=ro.ircMessage}break;case'DEVOICE':{
const ro=_parseChannelModes('-','v','DEVOICE',parsedCommand,inputObj);if(ro.error)return ro;else ircMessage=ro.ircMessage}break;case'JOIN':if(parsedCommand.params.length<1)return{error:true,
message:'Expect: /JOIN <#channel>',ircMessage:null};if(1===parsedCommand.params.length)ircMessage='JOIN '+parsedCommand.restOf[0]
;if(2===parsedCommand.params.length)ircMessage='JOIN '+parsedCommand.params[1]+' '+parsedCommand.restOf[1];break;case'LIST':showRawMessageWindow()
;if(0===parsedCommand.params.length)ircMessage='LIST';else ircMessage='LIST '+parsedCommand.restOf[0];break;case'ME':{if(parsedCommand.params.length<1)return{error:true,
message:'Expect: /ME <action-message>',ircMessage:null};const ctcpDelim=1
;if('channel'===inputObj.originType)ircMessage='PRIVMSG '+inputObj.originName+' :'+String.fromCharCode(ctcpDelim)+'ACTION '+parsedCommand.restOf[0]+String.fromCharCode(ctcpDelim)
;if('private'===inputObj.originType)ircMessage='PRIVMSG '+inputObj.originName+' :'+String.fromCharCode(ctcpDelim)+'ACTION '+parsedCommand.restOf[0]+String.fromCharCode(ctcpDelim)}break;case'MODE':
if(0===parsedCommand.restOf.length&&'channel'!==inputObj.originType)ircMessage='MODE '+ircState.nickName;else if(1===parsedCommand.restOf.length&&parsedCommand.restOf[0].toLowerCase()===ircState.nickName.toLowerCase())ircMessage='MODE '+ircState.nickName;else if(2===parsedCommand.restOf.length&&parsedCommand.params[1].toLowerCase()===ircState.nickName.toLowerCase()&&parsedCommand.restOf[1].length>0)ircMessage='MODE '+ircState.nickName+' '+parsedCommand.restOf[1];else if(0===parsedCommand.restOf.length&&'channel'===inputObj.originType)ircMessage='MODE '+inputObj.originName;else if(1===parsedCommand.restOf.length&&ircState.channels.indexOf(parsedCommand.restOf[0].toLowerCase())>=0)ircMessage='MODE '+parsedCommand.restOf[0];else if(parsedCommand.restOf.length>0&&'channel'===inputObj.originType&&('+'===parsedCommand.restOf[0].charAt(0)||'-'===parsedCommand.restOf[0].charAt(0)||'b'===parsedCommand.restOf[0].charAt(0)))ircMessage='MODE '+inputObj.originName+' '+parsedCommand.restOf[0];else if(parsedCommand.restOf.length>1&&ircState.channels.indexOf(parsedCommand.params[1].toLowerCase())>=0)ircMessage='MODE '+parsedCommand.params[1]+' '+parsedCommand.restOf[1];else return{
error:true,message:'Expect: /MODE <nickname> [user-mode] or /MODE <#channel> <channel-mode>',ircMessage:null};break;case'MOTD':showRawMessageWindow();ircMessage='MOTD'
;if(1===parsedCommand.restOf.length)ircMessage='MOTD '+parsedCommand.restOf[0];break;case'MSG':
if(parsedCommand.params.length>1&&channelPrefixChars.indexOf(parsedCommand.params[1].charAt(0))<0)ircMessage='PRIVMSG '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];else return{error:true,
message:'Expect: /MSG <nickname> <message-text>',ircMessage:null};break;case'NICK':if(parsedCommand.params.length<1)return{error:true,message:'Expect: /NICK <new-nickname>',ircMessage:null}
;showRawMessageWindow();ircMessage='NICK '+parsedCommand.restOf[0];break;case'NOP':console.log('textCommandParser inputObj:'+JSON.stringify(inputObj,null,2))
;console.log('parsedCommand '+JSON.stringify(parsedCommand,null,2));return{error:false,message:null,ircMessage:null};case'NOTICE':
if(parsedCommand.params.length>1&&parsedCommand.restOf[1].length>0)ircMessage='NOTICE '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];else return{error:true,
message:'Expect: /NOTICE <nickname> <message-text>',ircMessage:null};break;case'OP':{const ro=_parseChannelModes('+','o','OP',parsedCommand,inputObj)
;if(ro.error)return ro;else ircMessage=ro.ircMessage}break;case'PART':if(parsedCommand.params.length<1)if('channel'===inputObj.originType)ircMessage='PART '+inputObj.originName;else return{error:true,
message:'Expect: /PART #channel [Optional message]',ircMessage:null
};else if(1===parsedCommand.params.length)ircMessage='PART '+parsedCommand.restOf[0];else ircMessage='PART '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];break;case'QUERY':
if(parsedCommand.params.length>1&&channelPrefixChars.indexOf(parsedCommand.params[1].charAt(0))<0)ircMessage='PRIVMSG '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];else return{error:true,
message:'Expect: /QUERY <nickname> <message-text>',ircMessage:null};break;case'QUIT':ircMessage='QUIT';if(parsedCommand.restOf.length>0)ircMessage='QUIT :'+parsedCommand.restOf[0];break;case'QUOTE':
if(parsedCommand.restOf.length>0){showRawMessageWindow();ircMessage=parsedCommand.restOf[0]}else return{error:true,message:'Expect: /QUOTE RAWCOMMAND [arguments]',ircMessage:null};break;case'TOPIC':
if(parsedCommand.params.length>1&&ircState.channels.indexOf(parsedCommand.params[1].toLowerCase())>=0)ircMessage='TOPIC '+parsedCommand.params[1]+' :'+parsedCommand.restOf[1];else if(parsedCommand.params.length>0&&channelPrefixChars.indexOf(parsedCommand.restOf[0].charAt(0))<0&&'channel'===inputObj.originType)ircMessage='TOPIC '+inputObj.originName+' :'+parsedCommand.restOf[0];else return{
error:true,message:'Expect: /TOPIC <#channel> <New-channel-topic-message>',ircMessage:null};break;case'VERSION':showRawMessageWindow();ircMessage='VERSION'
;if(1===parsedCommand.restOf.length)ircMessage='VERSION '+parsedCommand.restOf[0];break;case'VOICE':{const ro=_parseChannelModes('+','v','VOICE',parsedCommand,inputObj)
;if(ro.error)return ro;else ircMessage=ro.ircMessage}break;case'WHO':if(0===parsedCommand.params.length){showRawMessageWindow();ircMessage='WHO'}else{showRawMessageWindow()
;ircMessage='WHO '+parsedCommand.restOf[0]}break;case'WHOIS':if(parsedCommand.params.length<1)return{error:true,message:'Expect: /WHOIS <nickname>',ircMessage:null};showRawMessageWindow()
;ircMessage='WHOIS '+parsedCommand.restOf[0];break;default:}if(ircMessage)return{error:false,message:null,ircMessage:ircMessage};return{error:true,
message:'Command "/'+parsedCommand.command+'" unknown command.',ircMessage:null}}function _sendTextToChannel(channelIndex,textAreaEl){const text=stripTrailingCrLf(textAreaEl.value)
;if(detectMultiLineString(text)){textAreaEl.value='';showError('Multi-line input is not supported.')}else if(text.length>0){if('/'===text.charAt(0)){const commandAction=textCommandParser({
inputString:text,originType:'channel',originName:ircState.channelStates[channelIndex].name});textAreaEl.value='';if(commandAction.error){showError(commandAction.message);return}else{
if(commandAction.ircMessage&&commandAction.ircMessage.length>0)_sendIrcServerMessage(commandAction.ircMessage);return}}if(ircState.ircConnected&&ircState.ircIsAway)setTimeout((function(){
if(ircState.ircConnected&&ircState.ircIsAway)_sendIrcServerMessage('AWAY')}),1e3);const message='PRIVMSG '+ircState.channelStates[channelIndex].name+' :'+text;_sendIrcServerMessage(message)
;textAreaEl.value=''}textAreaEl.value=''}const mobileBreakpointPx=600;function createChannelEl(name){if(webState.channels.indexOf(name.toLowerCase())>=0){
console.log('createChannelEl: channel already exist');return}const defaultHeightInRows='17';webState.channels.push(name.toLowerCase())
;const initIrcStateIndex=ircState.channels.indexOf(name.toLowerCase());webState.channelStates.push({lastJoined:ircState.channelStates[initIrcStateIndex].joined});let maxNickLength=0
;const channelIndex=ircState.channels.indexOf(name.toLowerCase());const channelContainerDivEl=document.getElementById('channelContainerDiv');const channelMainSectionEl=document.createElement('div')
;channelMainSectionEl.classList.add('color-channel');channelMainSectionEl.classList.add('aa-section-div');channelMainSectionEl.setAttribute('lastDate','0000-00-00')
;const channelTopDivEl=document.createElement('div');channelTopDivEl.classList.add('channel-top-div');channelTopDivEl.classList.add('head-flex');const channelTopLeftDivEl=document.createElement('div')
;channelTopLeftDivEl.classList.add('head-left');const channelTopSpacerDivEl=document.createElement('div');channelTopSpacerDivEl.classList.add('vh5')
;const channelTopRightDivEl=document.createElement('div');channelTopRightDivEl.classList.add('head-right');const channelTopRightHidableDivEl=document.createElement('div')
;channelTopRightHidableDivEl.classList.add('head-right-hidable-div');const channelHideButtonEl=document.createElement('button');channelHideButtonEl.textContent='-'
;channelHideButtonEl.classList.add('channel-button');const channelNameDivEl=document.createElement('div');channelNameDivEl.textContent=ircState.channelStates[channelIndex].csName
;channelNameDivEl.classList.add('chan-name-div');const channelBeenKickedIconEl=document.createElement('div');channelBeenKickedIconEl.textContent='Kicked'
;channelBeenKickedIconEl.classList.add('been-kicked-icon');channelBeenKickedIconEl.setAttribute('hidden','');const channelNickCounterEl=document.createElement('div')
;channelNickCounterEl.textContent='0';channelNickCounterEl.classList.add('nick-count');const channelMessageCounterEl=document.createElement('div');channelMessageCounterEl.textContent='0'
;channelMessageCounterEl.classList.add('message-count');channelMessageCounterEl.classList.add('channel-count-class');channelMessageCounterEl.setAttribute('hidden','')
;const channelTallerButtonEl=document.createElement('button');channelTallerButtonEl.textContent='Taller';channelTallerButtonEl.classList.add('channel-button')
;const channelNormalButtonEl=document.createElement('button');channelNormalButtonEl.textContent='Normal';channelNormalButtonEl.classList.add('channel-button')
;const channelClearButtonEl=document.createElement('button');channelClearButtonEl.textContent='Clear';channelClearButtonEl.classList.add('channel-button')
;const channelBottomDivEl=document.createElement('div');channelBottomDivEl.classList.add('channel-bottom-div');const channelTopicDivEl=document.createElement('div')
;channelTopicDivEl.textContent=cleanFormatting(ircState.channelStates[channelIndex].topic);channelTopicDivEl.classList.add('chan-topic-div');const channelNamesCharWidth=20
;const channelNamesDisplayEl=document.createElement('textarea');channelNamesDisplayEl.classList.add('channel-names-display');channelNamesDisplayEl.setAttribute('cols',channelNamesCharWidth.toString())
;channelNamesDisplayEl.setAttribute('rows',defaultHeightInRows);channelNamesDisplayEl.setAttribute('spellCheck','false');channelNamesDisplayEl.setAttribute('readonly','')
;const channelTextAreaEl=document.createElement('textarea');const channelTextAreaId='chan'+channelIndex.toString()+'TextAreaId';channelTextAreaEl.id=channelTextAreaId
;channelTextAreaEl.setAttribute('cols','30');channelTextAreaEl.setAttribute('rows',defaultHeightInRows);channelTextAreaEl.setAttribute('spellCheck','false')
;channelTextAreaEl.setAttribute('readonly','');const channelBottomDiv1El=document.createElement('div');channelBottomDiv1El.classList.add('button-div')
;const channelInputAreaEl=document.createElement('textarea');const channelInputAreaId='chan'+channelIndex.toString()+'InputInputId';channelInputAreaEl.id=channelInputAreaId
;channelInputAreaEl.setAttribute('cols','120');channelInputAreaEl.setAttribute('rows','1');channelInputAreaEl.classList.add('va-middle');channelInputAreaEl.classList.add('rm5')
;const channelSendButtonEl=document.createElement('button');channelSendButtonEl.textContent='Send';channelSendButtonEl.classList.add('va-middle')
;const channelBottomDiv2El=document.createElement('div');channelBottomDiv2El.classList.add('button-div');const channelJoinButtonEl=document.createElement('button')
;channelJoinButtonEl.textContent='Join';channelJoinButtonEl.classList.add('channel-button');const channelPruneButtonEl=document.createElement('button');channelPruneButtonEl.textContent='Prune'
;channelPruneButtonEl.classList.add('channel-button');const channelPartButtonEl=document.createElement('button');channelPartButtonEl.textContent='Leave'
;channelPartButtonEl.classList.add('channel-button');const channelZoomButtonEl=document.createElement('button');const zoomOffText='Zoom';const zoomOnText='Un-zoom'
;channelZoomButtonEl.textContent=zoomOffText;channelZoomButtonEl.classList.add('channel-button');const channelRefreshButtonEl=document.createElement('button')
;channelRefreshButtonEl.textContent='Refresh';channelRefreshButtonEl.classList.add('channel-button');const channelBottomDiv3El=document.createElement('div')
;channelBottomDiv3El.classList.add('button-div');const channelFormatCBInputEl=document.createElement('input');channelFormatCBInputEl.classList.add('channel-cb-cb')
;channelFormatCBInputEl.setAttribute('type','checkbox');const channelFormatCBTitleEl=document.createElement('span');channelFormatCBTitleEl.classList.add('channel-cb-span')
;channelFormatCBTitleEl.textContent='Brief';const channelAutoCompCBInputEl=document.createElement('input');channelAutoCompCBInputEl.classList.add('channel-cb-cb')
;channelAutoCompCBInputEl.setAttribute('type','checkbox');const channelAutoCompCBTitleEl=document.createElement('span');channelAutoCompCBTitleEl.classList.add('channel-cb-span')
;channelAutoCompCBTitleEl.textContent='Auto-complete (tab, space-space)';const channelBottomDiv4El=document.createElement('div');channelBottomDiv4El.classList.add('button-div')
;const channelBeep1CBInputEl=document.createElement('input');channelBeep1CBInputEl.classList.add('channel-cb-cb');channelBeep1CBInputEl.setAttribute('type','checkbox')
;const channelBeep1CBTitleEl=document.createElement('span');channelBeep1CBTitleEl.classList.add('channel-cb-span');channelBeep1CBTitleEl.textContent='Line-beep'
;const channelBeep2CBInputEl=document.createElement('input');channelBeep2CBInputEl.classList.add('channel-cb-cb');channelBeep2CBInputEl.setAttribute('type','checkbox')
;const channelBeep2CBTitleEl=document.createElement('span');channelBeep2CBTitleEl.classList.add('channel-cb-span');channelBeep2CBTitleEl.textContent='Join-beep'
;const channelBeep3CBInputEl=document.createElement('input');channelBeep3CBInputEl.classList.add('channel-cb-cb');channelBeep3CBInputEl.setAttribute('type','checkbox')
;const channelBeep3CBTitleEl=document.createElement('span');channelBeep3CBTitleEl.classList.add('channel-cb-span');channelBeep3CBTitleEl.textContent='Name-beep'
;channelTopLeftDivEl.appendChild(channelHideButtonEl);channelTopLeftDivEl.appendChild(channelNameDivEl);channelTopLeftDivEl.appendChild(channelBeenKickedIconEl)
;channelTopLeftDivEl.appendChild(channelNickCounterEl);channelTopLeftDivEl.appendChild(channelMessageCounterEl);channelTopRightHidableDivEl.appendChild(channelJoinButtonEl)
;channelTopRightHidableDivEl.appendChild(channelPruneButtonEl);channelTopRightHidableDivEl.appendChild(channelPartButtonEl);channelTopRightHidableDivEl.appendChild(channelZoomButtonEl)
;channelTopRightDivEl.appendChild(channelTopRightHidableDivEl);channelTopDivEl.appendChild(channelTopLeftDivEl);channelTopDivEl.appendChild(channelTopRightDivEl)
;channelBottomDiv1El.appendChild(channelInputAreaEl);channelBottomDiv1El.appendChild(channelSendButtonEl);channelBottomDiv2El.appendChild(channelRefreshButtonEl)
;channelBottomDiv2El.appendChild(channelClearButtonEl);channelBottomDiv2El.appendChild(channelTallerButtonEl);channelBottomDiv2El.appendChild(channelNormalButtonEl)
;channelBottomDiv3El.appendChild(channelFormatCBInputEl);channelBottomDiv3El.appendChild(channelFormatCBTitleEl);channelBottomDiv3El.appendChild(channelAutoCompCBInputEl)
;channelBottomDiv3El.appendChild(channelAutoCompCBTitleEl);channelBottomDiv4El.appendChild(channelBeep1CBInputEl);channelBottomDiv4El.appendChild(channelBeep1CBTitleEl)
;channelBottomDiv4El.appendChild(channelBeep2CBInputEl);channelBottomDiv4El.appendChild(channelBeep2CBTitleEl);channelBottomDiv4El.appendChild(channelBeep3CBInputEl)
;channelBottomDiv4El.appendChild(channelBeep3CBTitleEl);channelBottomDivEl.appendChild(channelTopicDivEl);channelBottomDivEl.appendChild(channelNamesDisplayEl)
;channelBottomDivEl.appendChild(channelTextAreaEl);channelBottomDivEl.appendChild(channelBottomDiv1El);channelBottomDivEl.appendChild(channelBottomDiv2El)
;channelBottomDivEl.appendChild(channelBottomDiv3El);channelBottomDivEl.appendChild(channelBottomDiv4El);channelMainSectionEl.appendChild(channelTopDivEl)
;channelMainSectionEl.appendChild(channelTopSpacerDivEl);channelMainSectionEl.appendChild(channelBottomDivEl)
;if(channelContainerDivEl.firstChild)channelContainerDivEl.insertBefore(channelMainSectionEl,channelContainerDivEl.firstChild);else channelContainerDivEl.appendChild(channelMainSectionEl)
;let activityIconInhibitTimer=0;const channelIntervalTimer=setInterval((function(){if(activityIconInhibitTimer>0)activityIconInhibitTimer--}),1e3)
;document.dispatchEvent(new CustomEvent('debounced-update-from-cache',{bubbles:true}));function updateChannelCount(){document.dispatchEvent(new CustomEvent('update-channel-count',{bubbles:true}))}
function incrementMessageCount(){let count=parseInt(channelMessageCounterEl.textContent);count++;channelMessageCounterEl.textContent=count.toString();channelMessageCounterEl.removeAttribute('hidden')
;updateChannelCount()}function resetMessageCount(){const count=0;channelMessageCounterEl.textContent=count.toString();channelMessageCounterEl.setAttribute('hidden','');updateChannelCount()}
function handleChannelHideButtonElClick(event){if(channelMainSectionEl.hasAttribute('opened')){channelMainSectionEl.removeAttribute('opened');channelMainSectionEl.removeAttribute('zoom')}else{
channelMainSectionEl.setAttribute('opened','');channelMainSectionEl.removeAttribute('zoom');clearLastZoom()}updateVisibility()}
channelHideButtonEl.addEventListener('click',handleChannelHideButtonElClick);function handleChannelTallerButtonElClick(event){const newRows=parseInt(channelTextAreaEl.getAttribute('rows'))+10
;channelTextAreaEl.setAttribute('rows',newRows.toString());channelNamesDisplayEl.setAttribute('rows',newRows.toString());channelInputAreaEl.setAttribute('rows','3')}
channelTallerButtonEl.addEventListener('click',handleChannelTallerButtonElClick);function handleChannelNormalButtonElClick(event){channelTextAreaEl.setAttribute('rows',defaultHeightInRows)
;channelNamesDisplayEl.setAttribute('rows',defaultHeightInRows);channelInputAreaEl.setAttribute('rows','1')}channelNormalButtonEl.addEventListener('click',handleChannelNormalButtonElClick)
;function handleChannelClearButtonElClick(event){channelTextAreaEl.value='';channelMainSectionEl.setAttribute('lastDate','0000-00-00');channelTextAreaEl.setAttribute('rows',defaultHeightInRows)
;channelNamesDisplayEl.setAttribute('rows',defaultHeightInRows);channelInputAreaEl.setAttribute('rows','1')}channelClearButtonEl.addEventListener('click',handleChannelClearButtonElClick)
;function handleChannelJoinButtonElClick(event){const message='JOIN '+name;_sendIrcServerMessage(message)}channelJoinButtonEl.addEventListener('click',handleChannelJoinButtonElClick)
;function handleChannelPartButtonElClick(event){const message='PART '+name+' :'+ircState.progName+' '+ircState.progVersion;_sendIrcServerMessage(message)}
channelPartButtonEl.addEventListener('click',handleChannelPartButtonElClick);function handleChannelPruneButtonElClick(event){const index=ircState.channels.indexOf(name.toLowerCase())
;if(index>=0)if(!ircState.channelStates[index].joined){const fetchURL=webServerUrl+'/irc/prune';const fetchOptions={method:'POST',headers:{'CSRF-Token':csrfToken,'Content-type':'application/json',
Accept:'application/json'},body:JSON.stringify({channel:name})};fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseJson=>{if(responseJson.error)showError(responseJson.message)
}).catch(error=>{console.log(error)})}}channelPruneButtonEl.addEventListener('click',handleChannelPruneButtonElClick);function handleChannelRefreshButtonElClick(event){
if(!webState.cacheReloadInProgress)document.dispatchEvent(new CustomEvent('update-from-cache',{bubbles:true}))}channelRefreshButtonEl.addEventListener('click',handleChannelRefreshButtonElClick)
;function handleChannelSendButtonElClick(event){_sendTextToChannel(channelIndex,channelInputAreaEl);channelInputAreaEl.focus();resetMessageCount()
;activityIconInhibitTimer=activityIconInhibitTimerValue}channelSendButtonEl.addEventListener('click',handleChannelSendButtonElClick);function handleChannelInputAreaElInput(event){
if('insertText'===event.inputType&&null===event.data||'insertLineBreak'===event.inputType){stripOneCrLfFromElement(channelInputAreaEl);_sendTextToChannel(channelIndex,channelInputAreaEl)
;resetMessageCount();activityIconInhibitTimer=activityIconInhibitTimerValue}}channelInputAreaEl.addEventListener('input',handleChannelInputAreaElInput);function handleChannelBottomDivElClick(event){
resetMessageCount();activityIconInhibitTimer=activityIconInhibitTimerValue}channelBottomDivEl.addEventListener('click',handleChannelBottomDivElClick)
;function handleChannelMessageCounterElClick(event){resetMessageCount();activityIconInhibitTimer=activityIconInhibitTimerValue}
channelMessageCounterEl.addEventListener('click',handleChannelMessageCounterElClick);function handleChannelUnreadCountDivClick(){resetMessageCount()}
document.getElementById('channelUnreadCountDiv').addEventListener('click',handleChannelUnreadCountDivClick);function handleChannelUnreadExistIconClick(){resetMessageCount()}
document.getElementById('channelUnreadExistIcon').addEventListener('click',handleChannelUnreadExistIconClick);function updateVisibility(){const index=ircState.channels.indexOf(name.toLowerCase())
;if(index>=0)if(channelMainSectionEl.hasAttribute('opened')){channelBottomDivEl.removeAttribute('hidden');channelHideButtonEl.textContent='-';if(ircState.channelStates[index].joined){
channelTopicDivEl.textContent=cleanFormatting(ircState.channelStates[index].topic);channelNamesDisplayEl.removeAttribute('disabled');channelTextAreaEl.removeAttribute('disabled')
;channelInputAreaEl.removeAttribute('disabled');channelSendButtonEl.removeAttribute('disabled');channelJoinButtonEl.setAttribute('hidden','');channelPruneButtonEl.setAttribute('hidden','')
;channelPartButtonEl.removeAttribute('hidden')}else{channelNamesDisplayEl.setAttribute('disabled','');channelTextAreaEl.setAttribute('disabled','');channelInputAreaEl.setAttribute('disabled','')
;channelSendButtonEl.setAttribute('disabled','');channelJoinButtonEl.removeAttribute('hidden');channelPruneButtonEl.removeAttribute('hidden');channelPartButtonEl.setAttribute('hidden','')
;channelTopicDivEl.removeAttribute('hidden');channelBottomDiv2El.removeAttribute('hidden');channelBottomDiv3El.removeAttribute('hidden');channelBottomDiv4El.removeAttribute('hidden')
;channelNamesDisplayEl.removeAttribute('hidden')}if(channelMainSectionEl.hasAttribute('zoom')){channelZoomButtonEl.textContent=zoomOnText;channelTopicDivEl.setAttribute('hidden','')
;channelBottomDiv2El.setAttribute('hidden','');channelBottomDiv3El.setAttribute('hidden','');channelBottomDiv4El.setAttribute('hidden','')
;if(webState.dynamic.bodyClientWidth>mobileBreakpointPx)channelNamesDisplayEl.removeAttribute('hidden');else channelNamesDisplayEl.setAttribute('hidden','')}else{
channelZoomButtonEl.textContent=zoomOffText;channelTopicDivEl.removeAttribute('hidden');channelBottomDiv2El.removeAttribute('hidden');channelBottomDiv3El.removeAttribute('hidden')
;channelBottomDiv4El.removeAttribute('hidden');channelNamesDisplayEl.removeAttribute('hidden')}
if(channelMainSectionEl.hasAttribute('beep1-enabled'))channelBeep1CBInputEl.checked=true;else channelBeep1CBInputEl.checked=false
;if(channelMainSectionEl.hasAttribute('beep2-enabled'))channelBeep2CBInputEl.checked=true;else channelBeep2CBInputEl.checked=false
;if(channelMainSectionEl.hasAttribute('beep3-enabled'))channelBeep3CBInputEl.checked=true;else channelBeep3CBInputEl.checked=false
;if(channelMainSectionEl.hasAttribute('brief-enabled'))channelFormatCBInputEl.checked=true;else channelFormatCBInputEl.checked=false
;if(channelMainSectionEl.hasAttribute('auto-comp-enabled'))channelAutoCompCBInputEl.checked=true;else channelAutoCompCBInputEl.checked=false}else{channelZoomButtonEl.textContent=zoomOffText
;channelBottomDivEl.setAttribute('hidden','');channelPruneButtonEl.setAttribute('hidden','');channelJoinButtonEl.setAttribute('hidden','');channelPartButtonEl.setAttribute('hidden','')
;channelHideButtonEl.textContent='+'}else{channelZoomButtonEl.textContent=zoomOffText;channelBottomDivEl.setAttribute('hidden','');channelPruneButtonEl.setAttribute('hidden','')
;channelJoinButtonEl.setAttribute('hidden','');channelPartButtonEl.setAttribute('hidden','');channelHideButtonEl.textContent='+'}}function handleChannelZoomButtonElClick(event){
if(channelMainSectionEl.hasAttribute('zoom')){channelMainSectionEl.removeAttribute('zoom');updateVisibility();channelTextAreaEl.scrollTop=channelTextAreaEl.scrollHeight}else{
const timestamp=unixTimestamp();const lastZoomObj={timestamp:timestamp,zoomType:'channel',zoomValue:name.toLowerCase()};document.dispatchEvent(new CustomEvent('hide-or-zoom',{bubbles:true,
detail:lastZoomObj}))}}channelZoomButtonEl.addEventListener('click',handleChannelZoomButtonElClick);function handleShowAllDivs(event){channelMainSectionEl.removeAttribute('zoom')
;channelMainSectionEl.setAttribute('opened','');updateVisibility()}document.addEventListener('show-all-divs',handleShowAllDivs);function handleHideOrZoom(event){
if(event.detail&&event.detail.zoomType&&event.detail.zoomValue&&'channel'===event.detail.zoomType&&event.detail.zoomValue===name.toLowerCase()){
const index=ircState.channels.indexOf(name.toLowerCase());if(index>=0)if(ircState.channelStates[index].joined){channelMainSectionEl.setAttribute('zoom','')
;channelMainSectionEl.setAttribute('opened','');updateVisibility();channelTextAreaEl.scrollTop=channelTextAreaEl.scrollHeight;return}}channelMainSectionEl.removeAttribute('zoom')
;channelMainSectionEl.removeAttribute('opened');updateVisibility()}document.addEventListener('hide-or-zoom',handleHideOrZoom);function updateLocalStorageBeepEnable(){const now=unixTimestamp()
;const beepEnableObj={timestamp:now,channel:name.toLowerCase(),beep1:channelMainSectionEl.hasAttribute('beep1-enabled'),beep2:channelMainSectionEl.hasAttribute('beep2-enabled'),
beep3:channelMainSectionEl.hasAttribute('beep3-enabled')};let beepChannelIndex=-1;let beepEnableChanArray=null;beepEnableChanArray=JSON.parse(window.localStorage.getItem('beepEnableChanArray'))
;if(beepEnableChanArray&&Array.isArray(beepEnableChanArray)){
if(beepEnableChanArray.length>0)for(let i=0;i<beepEnableChanArray.length;i++)if(beepEnableChanArray[i].channel===name.toLowerCase())beepChannelIndex=i}else beepEnableChanArray=[]
;if(beepChannelIndex>=0)beepEnableChanArray[beepChannelIndex]=beepEnableObj;else beepEnableChanArray.push(beepEnableObj)
;window.localStorage.setItem('beepEnableChanArray',JSON.stringify(beepEnableChanArray))}function loadBeepEnable(){let beepChannelIndex=-1;let beepEnableChanArray=null
;beepEnableChanArray=JSON.parse(window.localStorage.getItem('beepEnableChanArray'))
;if(beepEnableChanArray&&Array.isArray(beepEnableChanArray))if(beepEnableChanArray.length>0)for(let i=0;i<beepEnableChanArray.length;i++)if(beepEnableChanArray[i].channel===name.toLowerCase())beepChannelIndex=i
;if(beepChannelIndex>=0){if(beepEnableChanArray[beepChannelIndex].beep1)channelMainSectionEl.setAttribute('beep1-enabled','')
;if(beepEnableChanArray[beepChannelIndex].beep2)channelMainSectionEl.setAttribute('beep2-enabled','')
;if(beepEnableChanArray[beepChannelIndex].beep3)channelMainSectionEl.setAttribute('beep3-enabled','')}}loadBeepEnable();function handleChannelBeep1CBInputElClick(event){
if(channelMainSectionEl.hasAttribute('beep1-enabled'))channelMainSectionEl.removeAttribute('beep1-enabled');else{channelMainSectionEl.setAttribute('beep1-enabled','');playBeep1Sound()}
updateLocalStorageBeepEnable();updateVisibility()}channelBeep1CBInputEl.addEventListener('click',handleChannelBeep1CBInputElClick);function handleChannelBeep2CBInputElClick(event){
if(channelMainSectionEl.hasAttribute('beep2-enabled'))channelMainSectionEl.removeAttribute('beep2-enabled');else{channelMainSectionEl.setAttribute('beep2-enabled','');playBeep1Sound()}
updateLocalStorageBeepEnable();updateVisibility()}channelBeep2CBInputEl.addEventListener('click',handleChannelBeep2CBInputElClick);function handleChannelBeep3CBInputElClick(event){
if(channelMainSectionEl.hasAttribute('beep3-enabled'))channelMainSectionEl.removeAttribute('beep3-enabled');else{channelMainSectionEl.setAttribute('beep3-enabled','');playBeep2Sound()}
updateLocalStorageBeepEnable();updateVisibility()}channelBeep3CBInputEl.addEventListener('click',handleChannelBeep3CBInputElClick);function handleCancelBeepSounds(event){
channelMainSectionEl.removeAttribute('beep1-enabled');channelMainSectionEl.removeAttribute('beep2-enabled');channelMainSectionEl.removeAttribute('beep3-enabled')}
document.addEventListener('cancel-beep-sounds',handleCancelBeepSounds);function handleChannelFormatCBInputElClick(event){
if(channelMainSectionEl.hasAttribute('brief-enabled'))channelMainSectionEl.removeAttribute('brief-enabled');else channelMainSectionEl.setAttribute('brief-enabled','')
;document.dispatchEvent(new CustomEvent('update-from-cache',{bubbles:true}))}channelFormatCBInputEl.addEventListener('click',handleChannelFormatCBInputElClick)
;if(webState.dynamic.bodyClientWidth<mobileBreakpointPx){channelMainSectionEl.setAttribute('brief-enabled','');channelFormatCBInputEl.checked=true}else{
channelMainSectionEl.removeAttribute('brief-enabled');channelFormatCBInputEl.checked=false}function handleChannelAutoCompCBInputElClick(event){
if(channelMainSectionEl.hasAttribute('auto-comp-enabled'))channelMainSectionEl.removeAttribute('auto-comp-enabled');else channelMainSectionEl.setAttribute('auto-comp-enabled','');updateVisibility()}
channelAutoCompCBInputEl.addEventListener('click',handleChannelAutoCompCBInputElClick)
;if(window.InputEvent&&'function'===typeof InputEvent.prototype.getTargetRanges)channelMainSectionEl.setAttribute('auto-comp-enabled','');else{channelMainSectionEl.setAttribute('auto-comp-enabled','')
;channelAutoCompCBInputEl.setAttribute('disabled','')}const _autoCompleteInputElement=function(snippet){let last='';const trailingSpaceKey=32;let matchedCommand=''
;if(autoCompleteCommandList.length>0)for(let i=0;i<autoCompleteCommandList.length;i++)if(0===autoCompleteCommandList[i].indexOf(snippet.toUpperCase()))matchedCommand=autoCompleteCommandList[i]
;let matchedRawCommand=''
;if(autoCompleteRawCommandList.length>0)for(let i=0;i<autoCompleteRawCommandList.length;i++)if(0===autoCompleteRawCommandList[i].indexOf(snippet.toUpperCase()))matchedRawCommand=autoCompleteRawCommandList[i]
;if(matchedCommand.length>0&&channelInputAreaEl.value===snippet){channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-snippet.length)
;channelInputAreaEl.value+=matchedCommand;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=matchedCommand
}else if(matchedRawCommand.length>0&&'/QUOTE '===channelInputAreaEl.value.slice(0,7).toUpperCase()){
channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-snippet.length);channelInputAreaEl.value+=matchedRawCommand
;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=matchedRawCommand}else if(0===name.toLowerCase().indexOf(snippet.toLowerCase())){
channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-snippet.length);channelInputAreaEl.value+=name;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey)
;last=name}else if(0===ircState.nickName.toLowerCase().indexOf(snippet.toLowerCase())){channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-snippet.length)
;channelInputAreaEl.value+=ircState.nickName;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=ircState.nickName}else{let completeNick=''
;const chanIndex=ircState.channels.indexOf(name.toLowerCase());if(chanIndex>=0)if(ircState.channelStates[chanIndex].names.length>0)for(let i=0;i<ircState.channelStates[chanIndex].names.length;i++){
let matchNick=ircState.channelStates[chanIndex].names[i];if(nicknamePrefixChars.indexOf(matchNick.charAt(0))>=0)matchNick=matchNick.slice(1,matchNick.length)
;if(0===matchNick.toLowerCase().indexOf(snippet.toLowerCase()))completeNick=matchNick}if(completeNick.length>0){
channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-snippet.length);channelInputAreaEl.value+=completeNick
;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=completeNick}else channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey)}return last};let lastAutoCompleteMatch=''
;const channelAutoComplete=function(e){const autoCompleteTabKey=9;const autoCompleteSpaceKey=32;const trailingSpaceKey=32;if(channelAutoCompCBInputEl.hasAttribute('disabled'))return
;if(!channelMainSectionEl.hasAttribute('auto-comp-enabled'))return;if(!e.keyCode)return;if(e.keyCode&&e.keyCode===autoCompleteTabKey){if(channelInputAreaEl.value.length<2){e.preventDefault();return}
let snippet='';const snippetArray=channelInputAreaEl.value.split(' ');if(snippetArray.length>0)snippet=snippetArray[snippetArray.length-1];if(snippet.length>0){
if(e.keyCode===autoCompleteTabKey&&snippet.length>0)_autoCompleteInputElement(snippet)}else{
if(channelInputAreaEl.value.toUpperCase()==='/PART '+name.toUpperCase()+' ')channelInputAreaEl.value+=ircState.progName+' '+ircState.progVersion;else if('/QUIT '===channelInputAreaEl.value.toUpperCase())channelInputAreaEl.value+=ircState.progName+' '+ircState.progVersion;else channelInputAreaEl.value+=name
;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey)}e.preventDefault()}
if(e.keyCode&&e.keyCode===autoCompleteSpaceKey)if(channelInputAreaEl.value.length>0)if(channelInputAreaEl.value.charCodeAt(channelInputAreaEl.value.length-1)===autoCompleteSpaceKey)if(channelInputAreaEl.value.length>1&&channelInputAreaEl.value.charCodeAt(channelInputAreaEl.value.length-2)===autoCompleteSpaceKey){
channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-1)
;if(channelInputAreaEl.value.toUpperCase()==='/PART '+name.toUpperCase()+' ')channelInputAreaEl.value+=ircState.progName+' '+ircState.progVersion;else if('/QUIT '===channelInputAreaEl.value.toUpperCase())channelInputAreaEl.value+=ircState.progName+' '+ircState.progVersion;else channelInputAreaEl.value+=name
;channelInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);e.preventDefault()}else{channelInputAreaEl.value=channelInputAreaEl.value.slice(0,channelInputAreaEl.value.length-1);let snippet=''
;const snippetArray=channelInputAreaEl.value.split(' ');if(snippetArray.length>0)snippet=snippetArray[snippetArray.length-1];if(snippet.length>0){const matchStr=_autoCompleteInputElement(snippet)
;if(lastAutoCompleteMatch!==matchStr){lastAutoCompleteMatch=matchStr;e.preventDefault()}}else channelInputAreaEl.value+=String.fromCharCode(autoCompleteSpaceKey)}}
;channelInputAreaEl.addEventListener('keydown',channelAutoComplete,false);function _updateNickList(){const index=ircState.channels.indexOf(name.toLowerCase());if(index>=0){maxNickLength=0
;if(ircState.channelStates[index].names.length>0){channelNamesDisplayEl.value='';const opList=[];const otherList=[]
;for(let i=0;i<ircState.channelStates[index].names.length;i++)if('@'===ircState.channelStates[index].names[i].charAt(0))opList.push(ircState.channelStates[index].names[i]);else otherList.push(ircState.channelStates[index].names[i])
;const sortedOpList=opList.sort();const sortedOtherList=otherList.sort();if(sortedOpList.length>0)for(let i=0;i<sortedOpList.length;i++){channelNamesDisplayEl.value+=sortedOpList[i]+'\n'
;if(maxNickLength<sortedOpList[i].length)maxNickLength=sortedOpList[i].length}if(sortedOtherList.length>0)for(let i=0;i<sortedOtherList.length;i++){channelNamesDisplayEl.value+=sortedOtherList[i]+'\n'
;if(maxNickLength<sortedOtherList[i].length)maxNickLength=sortedOtherList[i].length}}}}_updateNickList();function _updateChannelTitle(){const titleStr=name;let nickCount=0
;const index=ircState.channels.indexOf(name.toLowerCase());if(index>=0){if(ircState.channelStates[index].kicked)channelBeenKickedIconEl.removeAttribute('hidden');else{
channelBeenKickedIconEl.setAttribute('hidden','');nickCount=ircState.channelStates[index].names.length}channelNameDivEl.textContent=ircState.channelStates[index].csName}
channelNameDivEl.textContent=titleStr;channelNickCounterEl.textContent=nickCount.toString()}_updateChannelTitle();function _isNickInChannel(nickString,channelString){
if(!nickString||0===nickString.length)return false;if(0===ircState.channels.length)return false;let channelIndex=-1
;for(let i=0;i<ircState.channels.length;i++)if(channelString.toLowerCase()===ircState.channels[i].toLowerCase())channelIndex=i;if(channelIndex<0)return false
;if(0===ircState.channelStates[channelIndex].names.length)return false;let pureNick=nickString.toLowerCase()
;if(nicknamePrefixChars.indexOf(pureNick.charAt(0))>=0)pureNick=pureNick.slice(1,pureNick.length);let present=false;for(let i=0;i<ircState.channelStates[channelIndex].names.length;i++){
let checkNick=ircState.channelStates[channelIndex].names[i].toLowerCase();if(nicknamePrefixChars.indexOf(checkNick.charAt(0))>=0)checkNick=checkNick.slice(1,checkNick.length)
;if(checkNick===pureNick)present=true}return present}function handleIrcStateChanged(event){function _removeSelfFromDOM(){const webStateChannelIndex=webState.channels.indexOf(name.toLowerCase())
;if(webStateChannelIndex>=0){webState.channels.splice(webStateChannelIndex,1);webState.channelStates.splice(webStateChannelIndex,1)}clearInterval(channelIntervalTimer)
;channelHideButtonEl.removeEventListener('click',handleChannelHideButtonElClick);channelTallerButtonEl.removeEventListener('click',handleChannelTallerButtonElClick)
;channelNormalButtonEl.removeEventListener('click',handleChannelNormalButtonElClick);channelClearButtonEl.removeEventListener('click',handleChannelClearButtonElClick)
;channelJoinButtonEl.removeEventListener('click',handleChannelJoinButtonElClick);channelPartButtonEl.removeEventListener('click',handleChannelPartButtonElClick)
;channelPruneButtonEl.removeEventListener('click',handleChannelPruneButtonElClick);channelRefreshButtonEl.removeEventListener('click',handleChannelRefreshButtonElClick)
;channelSendButtonEl.removeEventListener('click',handleChannelSendButtonElClick);channelInputAreaEl.removeEventListener('input',handleChannelInputAreaElInput)
;channelBottomDivEl.removeEventListener('click',handleChannelBottomDivElClick);channelMessageCounterEl.removeEventListener('click',handleChannelMessageCounterElClick)
;document.getElementById('channelUnreadCountDiv').removeEventListener('click',handleChannelUnreadCountDivClick)
;document.getElementById('channelUnreadExistIcon').removeEventListener('click',handleChannelUnreadExistIconClick);channelZoomButtonEl.removeEventListener('click',handleChannelZoomButtonElClick)
;document.removeEventListener('show-all-divs',handleShowAllDivs);document.removeEventListener('hide-or-zoom',handleHideOrZoom)
;channelBeep1CBInputEl.removeEventListener('click',handleChannelBeep1CBInputElClick);channelBeep2CBInputEl.removeEventListener('click',handleChannelBeep2CBInputElClick)
;channelBeep3CBInputEl.removeEventListener('click',handleChannelBeep3CBInputElClick);document.removeEventListener('cancel-beep-sounds',handleCancelBeepSounds)
;channelFormatCBInputEl.removeEventListener('click',handleChannelFormatCBInputElClick);channelAutoCompCBInputEl.removeEventListener('click',handleChannelAutoCompCBInputElClick)
;channelInputAreaEl.removeEventListener('keydown',channelAutoComplete,false);document.removeEventListener('irc-state-changed',handleIrcStateChanged)
;document.removeEventListener('channel-message',handleChannelMessage);document.removeEventListener('erase-before-reload',handleEraseBeforeReload)
;document.removeEventListener('cache-reload-done',handleCacheReloadDone);document.removeEventListener('cache-reload-error',handleCacheReloadError)
;window.removeEventListener('resize-custom-elements',handleResizeCustomElements);if(channelContainerDivEl.contains(channelMainSectionEl))channelContainerDivEl.removeChild(channelMainSectionEl)}
const ircStateIndex=ircState.channels.indexOf(name.toLowerCase());const webStateIndex=webState.channels.indexOf(name.toLowerCase())
;if(ircState.ircConnected&&ircStateIndex<0&&webStateIndex>=0)_removeSelfFromDOM();else if(!ircState.ircConnected)_removeSelfFromDOM();else if(ircState.ircConnected){
if(ircStateIndex>=0&&webStateIndex>=0)if(ircState.channelStates[ircStateIndex].joined!==webState.channelStates[webStateIndex].lastJoined){
if(ircState.channelStates[ircStateIndex].joined&&!webState.channelStates[webStateIndex].lastJoined){channelBottomDivEl.removeAttribute('hidden');channelHideButtonEl.textContent='-'}
webState.channelStates[webStateIndex].lastJoined=ircState.channelStates[ircStateIndex].joined}_updateNickList();_updateChannelTitle();updateVisibility()}}
document.addEventListener('irc-state-changed',handleIrcStateChanged);function handleChannelMessage(event){function _addText(timestamp,nick,text){let out=''
;if(channelMainSectionEl.hasAttribute('brief-enabled')){out=timestamp+' ';if('*'===nick)out+=nick+nickChannelSpacer;else out+=nick+nickChannelSpacer+'\n';out+=cleanFormatting(text)+'\n\n'
}else out=timestamp+' '+nick.padStart(maxNickLength,' ')+nickChannelSpacer+cleanFormatting(text)+'\n';channelTextAreaEl.value+=out
;if(!webState.cacheReloadInProgress)channelTextAreaEl.scrollTop=channelTextAreaEl.scrollHeight}const parsedMessage=event.detail.parsedMessage
;if(parsedMessage.params[0].toLowerCase()===name.toLowerCase())if(channelMainSectionEl.getAttribute('lastDate')!==parsedMessage.datestamp){
channelMainSectionEl.setAttribute('lastDate',parsedMessage.datestamp);channelTextAreaEl.value+='\n=== '+parsedMessage.datestamp+' ===\n\n'}switch(parsedMessage.command){case'KICK':
if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){let reason=' ';if(parsedMessage.params[2])reason=parsedMessage.params[2]
;if(channelMainSectionEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has kicked '+parsedMessage.params[1]);else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has kicked '+parsedMessage.params[1]+' ('+reason+')')
}break;case'JOIN':if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){
if(channelMainSectionEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has joined');else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' ('+parsedMessage.host+') has joined')
;if(channelMainSectionEl.hasAttribute('beep2-enabled')&&!webState.cacheReloadInProgress)playBeep1Sound();channelBottomDivEl.removeAttribute('hidden');channelHideButtonEl.textContent='-'}break
;case'MODE':
if(parsedMessage.params[0].toLowerCase()===name.toLowerCase())if(parsedMessage.nick)_addText(parsedMessage.timestamp,'*','Mode '+JSON.stringify(parsedMessage.params)+' by '+parsedMessage.nick);else _addText(parsedMessage.timestamp,'*','Mode '+JSON.stringify(parsedMessage.params)+' by '+parsedMessage.prefix)
;break;case'NICK':{let present=false;if(_isNickInChannel(parsedMessage.nick,name))present=true;if(_isNickInChannel(parsedMessage.params[0],name))present=true
;if(present)_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' is now known as '+parsedMessage.params[0])}break;case'NOTICE':if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){
_addText(parsedMessage.timestamp,'*','Notice('+parsedMessage.nick+' to '+parsedMessage.params[0]+') '+parsedMessage.params[1]);channelBottomDivEl.removeAttribute('hidden')
;channelHideButtonEl.textContent='-'
;if(document.activeElement!==channelInputAreaEl&&document.activeElement!==channelSendButtonEl&&!webState.cacheReloadInProgress&&0===activityIconInhibitTimer)incrementMessageCount()}break;case'PART':
if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){let reason=' ';if(parsedMessage.params[1])reason=parsedMessage.params[1]
;if(channelMainSectionEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has left');else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' ('+parsedMessage.host+') has left '+'('+reason+')')
}break;case'PRIVMSG':if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){_addText(parsedMessage.timestamp,parsedMessage.nick,parsedMessage.params[1])
;if(channelMainSectionEl.hasAttribute('beep1-enabled')&&!webState.cacheReloadInProgress)playBeep1Sound();if(channelMainSectionEl.hasAttribute('beep3-enabled')){
const checkLine=parsedMessage.params[1].toLowerCase();if(checkLine.indexOf(ircState.nickName.toLowerCase())>=0&&!webState.cacheReloadInProgress)setTimeout(playBeep2Sound,250)}let lastZoomObj=null
;lastZoomObj=JSON.parse(window.localStorage.getItem('lastZoom'))
;if(lastZoomObj&&lastZoomObj.zoomType&&lastZoomObj.zoomValue&&'channel'===lastZoomObj.zoomType&&lastZoomObj.zoomValue===name.toLowerCase());else if(!webState.cacheReloadInProgress)clearLastZoom()
;channelMainSectionEl.setAttribute('opened','');updateVisibility()
;if(document.activeElement!==channelInputAreaEl&&document.activeElement!==channelSendButtonEl&&!webState.cacheReloadInProgress&&0===activityIconInhibitTimer)incrementMessageCount()}break
;case'cachedQUIT':if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){let reason=' ';if(parsedMessage.params[1])reason=parsedMessage.params[1]
;if(channelMainSectionEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has quit');else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' ('+parsedMessage.host+') has quit '+'('+reason+')')
}break;case'QUIT':if(_isNickInChannel(parsedMessage.nick,name)){let reason=' ';if(parsedMessage.params[0])reason=parsedMessage.params[0]
;if(channelMainSectionEl.hasAttribute('brief-enabled'))_addText(parsedMessage.timestamp,'*',parsedMessage.nick+' has quit');else _addText(parsedMessage.timestamp,'*',parsedMessage.nick+' ('+parsedMessage.host+') has quit '+'('+reason+')')
}break;case'TOPIC':if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){const newTopic=parsedMessage.params[1]
;if(null==newTopic)_addText(parsedMessage.timestamp,'*','Topic for '+parsedMessage.params[0]+' has been unset by "'+parsedMessage.nick);else _addText(parsedMessage.timestamp,'*','Topic for '+parsedMessage.params[0]+' changed to "'+newTopic+'" by '+parsedMessage.nick)
}break;default:}}document.addEventListener('channel-message',handleChannelMessage);function handleEraseBeforeReload(event){channelTextAreaEl.value='';channelInputAreaEl.value=''
;channelMainSectionEl.setAttribute('lastDate','0000-00-00');resetMessageCount()}document.addEventListener('erase-before-reload',handleEraseBeforeReload);function handleCacheReloadDone(event){
let markerString='';let timestampString='';if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)markerString+=timestampString
;markerString+=' '+cacheReloadString+'\n';if(channelMainSectionEl.hasAttribute('brief-enabled'))markerString+='\n';channelTextAreaEl.value+=markerString;let lastZoomObj=null
;lastZoomObj=JSON.parse(window.localStorage.getItem('lastZoom'))
;if(lastZoomObj&&lastZoomObj.zoomType&&lastZoomObj.zoomValue&&'channel'===lastZoomObj.zoomType&&lastZoomObj.zoomValue===name.toLowerCase()){const now=unixTimestamp()
;if('timestamp'in lastZoomObj&&now-lastZoomObj.timestamp<86400){const newZoomObj={timestamp:now,zoomType:'channel',zoomValue:name.toLowerCase()};setTimeout((function(){
document.dispatchEvent(new CustomEvent('hide-or-zoom',{bubbles:true,detail:newZoomObj}))}),100)}}else channelTextAreaEl.scrollTop=channelTextAreaEl.scrollHeight}
document.addEventListener('cache-reload-done',handleCacheReloadDone);function handleCacheReloadError(event){let errorString='\n';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString;errorString+=' '+cacheErrorString+'\n\n'
;channelTextAreaEl.value=errorString}document.addEventListener('cache-reload-error',handleCacheReloadError);const adjustChannelInputToWidowWidth=function(){const mar1=webState.dynamic.commonMargin
;const mar2=webState.dynamic.commonMargin+5+webState.dynamic.sendButtonWidthPx
;const nicknameListPixelWidth=webState.dynamic.inputAreaSideWidthPx+channelNamesCharWidth*webState.dynamic.inputAreaCharWidthPx;const mar3=webState.dynamic.commonMargin+nicknameListPixelWidth+6
;if(webState.dynamic.bodyClientWidth>mobileBreakpointPx){channelTextAreaEl.setAttribute('cols',calcInputAreaColSize(mar3));channelNamesDisplayEl.removeAttribute('hidden')}else{
channelTextAreaEl.setAttribute('cols',calcInputAreaColSize(mar1))
;if(channelMainSectionEl.hasAttribute('zoom'))channelNamesDisplayEl.setAttribute('hidden','');else channelNamesDisplayEl.removeAttribute('hidden')}
channelInputAreaEl.setAttribute('cols',calcInputAreaColSize(mar2))};function handleResizeCustomElements(event){if(webState.dynamic.inputAreaCharWidthPx)adjustChannelInputToWidowWidth()}
window.addEventListener('resize-custom-elements',handleResizeCustomElements);channelMainSectionEl.setAttribute('opened','');channelMainSectionEl.removeAttribute('zoom');updateVisibility()
;adjustChannelInputToWidowWidth();setTimeout(adjustChannelInputToWidowWidth,100)}let lastJoinedChannelCount=-1;let lastIrcServerIndex=-1;document.addEventListener('irc-state-changed',(function(event){
if(ircState.channels.length>0)for(let i=0;i<ircState.channels.length;i++){const name=ircState.channels[i];if(-1===webState.channels.indexOf(name.toLowerCase()))createChannelEl(name)}
let needButtonUpdate=false;let joinedChannelCount=0;if(ircState.channels.length>0)for(let i=0;i<ircState.channels.length;i++)if(ircState.channelStates[i].joined)joinedChannelCount++
;if(joinedChannelCount!==lastJoinedChannelCount){needButtonUpdate=true;lastJoinedChannelCount=joinedChannelCount}if(ircState.ircServerIndex!==lastIrcServerIndex){needButtonUpdate=true
;lastIrcServerIndex=ircState.ircServerIndex}document.getElementById('activeChannelCount').textContent=joinedChannelCount.toString();function _handleChannelButtonClick(event){
const channelName=document.getElementById(event.target.id).textContent;if(channelName.length>0)_sendIrcServerMessage('JOIN '+channelName)}if(needButtonUpdate){
const channelJoinButtonContainerEl=document.getElementById('channelJoinButtonContainer');while(channelJoinButtonContainerEl.firstChild){
channelJoinButtonContainerEl.firstChild.removeEventListener('click',_handleChannelButtonClick);channelJoinButtonContainerEl.removeChild(channelJoinButtonContainerEl.firstChild)}
if(ircState.channelList.length>0)for(let i=0;i<ircState.channelList.length;i++){const channelIndex=ircState.channels.indexOf(ircState.channelList[i].toLowerCase())
;if(channelIndex<0||!ircState.channelStates[channelIndex].joined){const joinButtonEl=document.createElement('button');joinButtonEl.textContent=ircState.channelList[i]
;joinButtonEl.classList.add('channel-button');joinButtonEl.id='joinButton'+i.toString();channelJoinButtonContainerEl.appendChild(joinButtonEl)
;joinButtonEl.addEventListener('click',_handleChannelButtonClick)}}}}));document.addEventListener('erase-before-reload',(function(event){document.getElementById('newChannelNameInputId').value=''
;document.getElementById('channelUnreadCountDiv').textContent='0';document.getElementById('channelUnreadCountDiv').setAttribute('hidden','')
;document.getElementById('channelUnreadExistIcon').setAttribute('hidden','')}));document.getElementById('ircChannelsMainHiddenButton').addEventListener('click',(function(){
if(document.getElementById('ircChannelsMainHiddenDiv').hasAttribute('hidden')){document.getElementById('ircChannelsMainHiddenDiv').removeAttribute('hidden')
;document.getElementById('ircChannelsMainHiddenButton').textContent='-'}else{document.getElementById('ircChannelsMainHiddenDiv').setAttribute('hidden','')
;document.getElementById('ircChannelsMainHiddenButton').textContent='+'}}));function _newChannel(){const newChannel=document.getElementById('newChannelNameInputId').value
;document.getElementById('newChannelNameInputId').value='';if(newChannel.length>1&&channelPrefixChars.indexOf(newChannel.charAt(0))>=0){const message='JOIN '+newChannel;_sendIrcServerMessage(message)
}else showError('Invalid Channel Name')}document.getElementById('newChannelNameInputId').addEventListener('input',(function(event){
if('insertText'===event.inputType&&null===event.data||'insertLineBreak'===event.inputType)_newChannel()}));document.getElementById('newChannelButton').addEventListener('click',(function(){
_newChannel()}));document.addEventListener('update-channel-count',(function(event){let totalCount=0;document.querySelectorAll('.channel-count-class').forEach((function(el){
totalCount+=parseInt(el.textContent)}));document.getElementById('channelUnreadCountDiv').textContent=totalCount.toString();if(totalCount>0){
document.getElementById('channelUnreadCountDiv').removeAttribute('hidden');document.getElementById('channelUnreadExistIcon').removeAttribute('hidden')}else{
document.getElementById('channelUnreadCountDiv').setAttribute('hidden','');document.getElementById('channelUnreadExistIcon').setAttribute('hidden','')}}))
;function _sendPrivMessageToUser(targetNickname,textAreaEl){const text=stripTrailingCrLf(textAreaEl.value);if(detectMultiLineString(text)){textAreaEl.value=''
;showError('Multi-line input is not supported.')}else if(text.length>0){if('/'===text.charAt(0)){const commandAction=textCommandParser({inputString:text,originType:'private',originName:targetNickname
});textAreaEl.value='';if(commandAction.error){showError(commandAction.message);return}else{
if(commandAction.ircMessage&&commandAction.ircMessage.length>0)_sendIrcServerMessage(commandAction.ircMessage);return}}const message='PRIVMSG '+targetNickname+' :'+text;_sendIrcServerMessage(message)
;textAreaEl.value=''}textAreaEl.value=''}function createPrivateMessageEl(name,parsedMessage){if(webState.activePrivateMessageNicks.indexOf(name.toLowerCase())>=0){
console.log('createPrivateMessageEl: Private message element already exist');return}webState.activePrivateMessageNicks.push(name.toLowerCase())
;document.getElementById('privMsgWindowCountDiv').textContent=webState.activePrivateMessageNicks.length.toString();document.getElementById('privMsgWindowCountDiv').removeAttribute('hidden')
;const privMsgIndex=webState.activePrivateMessageNicks.indexOf(name.toLowerCase());const privMsgContainerDivEl=document.getElementById('privateMessageContainerDiv')
;const privMsgSectionEl=document.createElement('div');privMsgSectionEl.classList.add('aa-section-div');privMsgSectionEl.classList.add('color-pm');const privMsgTopDivEl=document.createElement('div')
;privMsgTopDivEl.classList.add('bm10');privMsgTopDivEl.classList.add('head-flex');const privMsgTopLeftDivEl=document.createElement('div');privMsgTopLeftDivEl.classList.add('head-left')
;const privMsgTopRightDivEl=document.createElement('div');privMsgTopRightDivEl.classList.add('head-right');const privMsgTopRightHidableDivEl=document.createElement('div')
;const privMsgHideButtonEl=document.createElement('button');privMsgHideButtonEl.textContent='-';privMsgHideButtonEl.classList.add('channel-button');const privMsgNameDivEl=document.createElement('div')
;privMsgNameDivEl.textContent=name;privMsgNameDivEl.classList.add('chan-name-div');const privMsgCounterEl=document.createElement('div');privMsgCounterEl.textContent='0'
;privMsgCounterEl.classList.add('message-count');privMsgCounterEl.classList.add('pm-count-class');privMsgCounterEl.setAttribute('hidden','')
;const privMsgTallerButtonEl=document.createElement('button');privMsgTallerButtonEl.textContent='Taller';privMsgTallerButtonEl.classList.add('channel-button')
;const privMsgNormalButtonEl=document.createElement('button');privMsgNormalButtonEl.textContent='Normal';privMsgNormalButtonEl.classList.add('channel-button')
;const privMsgClearButtonEl=document.createElement('button');privMsgClearButtonEl.textContent='Clear';privMsgClearButtonEl.classList.add('channel-button')
;const privMsgBottomDivEl=document.createElement('div');const privMsgTextAreaEl=document.createElement('textarea');const privMsgTextAreaId='privMsg'+privMsgIndex.toString()+'TextAreaId'
;privMsgTextAreaEl.id=privMsgTextAreaId;privMsgTextAreaEl.setAttribute('cols','120');privMsgTextAreaEl.setAttribute('rows','6');privMsgTextAreaEl.setAttribute('spellCheck','false')
;privMsgTextAreaEl.setAttribute('readonly','');const privMsgButtonDiv1El=document.createElement('div');privMsgButtonDiv1El.classList.add('button-div')
;const privMsgInputAreaEl=document.createElement('textarea');const privMsgInputAreaId='privMsg'+privMsgIndex.toString()+'InputAreaId';privMsgInputAreaEl.id=privMsgInputAreaId
;privMsgInputAreaEl.classList.add('va-middle');privMsgInputAreaEl.classList.add('rm5');privMsgInputAreaEl.setAttribute('cols','120');privMsgInputAreaEl.setAttribute('rows','1')
;const privMsgSendButtonEl=document.createElement('button');privMsgSendButtonEl.textContent='Send';privMsgSendButtonEl.classList.add('va-middle')
;const privMsgBottomDiv4El=document.createElement('div');privMsgBottomDiv4El.classList.add('button-div');const privMsgBeep1CBInputEl=document.createElement('input')
;privMsgBeep1CBInputEl.classList.add('pm-cb-cb');privMsgBeep1CBInputEl.setAttribute('type','checkbox');const privMsgBeep1CBTitleEl=document.createElement('span')
;privMsgBeep1CBTitleEl.classList.add('pm-cb-span');privMsgBeep1CBTitleEl.textContent='Line-beep';privMsgTopLeftDivEl.appendChild(privMsgHideButtonEl);privMsgTopLeftDivEl.appendChild(privMsgNameDivEl)
;privMsgTopLeftDivEl.appendChild(privMsgCounterEl);privMsgTopRightHidableDivEl.appendChild(privMsgTallerButtonEl);privMsgTopRightHidableDivEl.appendChild(privMsgNormalButtonEl)
;privMsgTopRightHidableDivEl.appendChild(privMsgClearButtonEl);privMsgTopRightDivEl.appendChild(privMsgTopRightHidableDivEl);privMsgTopDivEl.appendChild(privMsgTopLeftDivEl)
;privMsgTopDivEl.appendChild(privMsgTopRightDivEl);privMsgButtonDiv1El.appendChild(privMsgInputAreaEl);privMsgButtonDiv1El.appendChild(privMsgSendButtonEl)
;privMsgBottomDiv4El.appendChild(privMsgBeep1CBInputEl);privMsgBottomDiv4El.appendChild(privMsgBeep1CBTitleEl);privMsgBottomDivEl.appendChild(privMsgTextAreaEl)
;privMsgBottomDivEl.appendChild(privMsgButtonDiv1El);privMsgBottomDivEl.appendChild(privMsgBottomDiv4El);privMsgSectionEl.appendChild(privMsgTopDivEl);privMsgSectionEl.appendChild(privMsgBottomDivEl)
;privMsgContainerDivEl.appendChild(privMsgSectionEl);privMsgTextAreaEl.value+=parsedMessage.timestamp+' '+parsedMessage.nick+pmNameSpacer+cleanFormatting(parsedMessage.params[1])+'\n'
;if(!webState.cacheReloadInProgress)privMsgTextAreaEl.scrollTop=privMsgTextAreaEl.scrollHeight;let activityIconInhibitTimer=0;const iconInhibitTimer=setInterval((function(){
if(activityIconInhibitTimer>0)activityIconInhibitTimer--}),1e3);function updateTotalPmCount(){document.dispatchEvent(new CustomEvent('update-pm-count',{bubbles:true}))}
function incrementPrivMsgCount(){let count=parseInt(privMsgCounterEl.textContent);count++;privMsgCounterEl.textContent=count.toString();privMsgCounterEl.removeAttribute('hidden');updateTotalPmCount()}
function resetPrivMsgCount(){privMsgCounterEl.textContent='0';privMsgCounterEl.setAttribute('hidden','');updateTotalPmCount()}function handleCacheReloadDone(event){let markerString=''
;let timestampString='';if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)markerString+=timestampString
;markerString+=' '+cacheReloadString+'\n';privMsgTextAreaEl.value+=markerString;privMsgTextAreaEl.scrollTop=privMsgTextAreaEl.scrollHeight}
document.addEventListener('cache-reload-done',handleCacheReloadDone);function handelCacheReloadError(event){let errorString='\n';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString;errorString+=' '+cacheErrorString+'\n\n'
;privMsgTextAreaEl.value=errorString}document.addEventListener('cache-reload-error',handelCacheReloadError);function handlePrivMsgHideAll(event){privMsgBottomDivEl.setAttribute('hidden','')
;privMsgHideButtonEl.textContent='+';privMsgTopRightHidableDivEl.setAttribute('hidden','');privMsgSectionEl.setAttribute('hidden','')}
document.addEventListener('priv-msg-hide-all',handlePrivMsgHideAll);function handlePrivMsgShowAll(event){privMsgSectionEl.removeAttribute('hidden')}
document.addEventListener('priv-msg-show-all',handlePrivMsgShowAll);function handlePrivMsgHideButtonElClick(event){if(privMsgBottomDivEl.hasAttribute('hidden')){
privMsgBottomDivEl.removeAttribute('hidden');privMsgHideButtonEl.textContent='-';privMsgTopRightHidableDivEl.removeAttribute('hidden');clearLastZoom()}else{privMsgSectionEl.setAttribute('hidden','')
;privMsgBottomDivEl.setAttribute('hidden','');privMsgHideButtonEl.textContent='+';privMsgTopRightHidableDivEl.setAttribute('hidden','')}}
privMsgHideButtonEl.addEventListener('click',handlePrivMsgHideButtonElClick);function handlePrivMsgTallerButtonElClick(event){const newRows=parseInt(privMsgTextAreaEl.getAttribute('rows'))+5
;privMsgTextAreaEl.setAttribute('rows',newRows.toString());privMsgInputAreaEl.setAttribute('rows','3')}privMsgTallerButtonEl.addEventListener('click',handlePrivMsgTallerButtonElClick)
;function handlePrivMsgNormalButtonElClick(event){privMsgTextAreaEl.setAttribute('rows','6');privMsgInputAreaEl.setAttribute('rows','1')}
privMsgNormalButtonEl.addEventListener('click',handlePrivMsgNormalButtonElClick);function handlePrivMsgClearButtonElClick(event){privMsgTextAreaEl.value='';privMsgTextAreaEl.setAttribute('rows','6')
;privMsgInputAreaEl.setAttribute('rows','1')}privMsgClearButtonEl.addEventListener('click',handlePrivMsgClearButtonElClick);function handleShowAllDivs(event){
privMsgBottomDivEl.removeAttribute('hidden');privMsgHideButtonEl.textContent='-';privMsgTopRightHidableDivEl.removeAttribute('hidden');privMsgSectionEl.removeAttribute('hidden')}
document.addEventListener('show-all-divs',handleShowAllDivs);function handleHideOrZoom(event){privMsgBottomDivEl.setAttribute('hidden','');privMsgHideButtonEl.textContent='+'
;privMsgTopRightHidableDivEl.setAttribute('hidden','');privMsgSectionEl.setAttribute('hidden','')}document.addEventListener('hide-or-zoom',handleHideOrZoom)
;function handlePrivMsgSendButtonElClick(event){_sendPrivMessageToUser(name,privMsgInputAreaEl);privMsgInputAreaEl.focus();resetPrivMsgCount();activityIconInhibitTimer=activityIconInhibitTimerValue}
privMsgSendButtonEl.addEventListener('click',handlePrivMsgSendButtonElClick);function handlePrivMsgInputAreaElInput(event){
if('insertText'===event.inputType&&null===event.data||'insertLineBreak'===event.inputType){stripOneCrLfFromElement(privMsgInputAreaEl);_sendPrivMessageToUser(name,privMsgInputAreaEl)
;resetPrivMsgCount();activityIconInhibitTimer=activityIconInhibitTimerValue}}privMsgInputAreaEl.addEventListener('input',handlePrivMsgInputAreaElInput);function handlePrivMsgCounterElClick(event){
resetPrivMsgCount()}privMsgCounterEl.addEventListener('click',handlePrivMsgCounterElClick);function handlePrivMsgCountDivClick(){resetPrivMsgCount()}
document.getElementById('privMsgCountDiv').addEventListener('click',handlePrivMsgCountDivClick);function handlePrivMsgUnreadExistIconClick(){resetPrivMsgCount()}
document.getElementById('privMsgUnreadExistIcon').addEventListener('click',handlePrivMsgUnreadExistIconClick);function handlePrivMsgBottomDivElClick(event){resetPrivMsgCount()
;activityIconInhibitTimer=activityIconInhibitTimerValue}privMsgBottomDivEl.addEventListener('click',handlePrivMsgBottomDivElClick);function updateVisibility(){
if(privMsgSectionEl.hasAttribute('beep1-enabled'))privMsgBeep1CBInputEl.checked=true;else privMsgBeep1CBInputEl.checked=false}function handlePrivMsgBeep1CBInputElClick(event){
if(privMsgSectionEl.hasAttribute('beep1-enabled'))privMsgSectionEl.removeAttribute('beep1-enabled');else{privMsgSectionEl.setAttribute('beep1-enabled','');playBeep3Sound()}updateVisibility()}
privMsgBeep1CBInputEl.addEventListener('click',handlePrivMsgBeep1CBInputElClick);function handleCancelBeepSounds(event){privMsgSectionEl.removeAttribute('beep1-enabled')}
document.addEventListener('cancel-beep-sounds',handleCancelBeepSounds);function handlePrivateMessage(event){function _addText(text){privMsgTextAreaEl.value+=cleanFormatting(text)+'\n'
;if(!webState.cacheReloadInProgress)privMsgTextAreaEl.scrollTop=privMsgTextAreaEl.scrollHeight}const parsedMessage=event.detail.parsedMessage;switch(parsedMessage.command){case'PRIVMSG':
if(parsedMessage.nick===ircState.nickName){if(parsedMessage.params[0].toLowerCase()===name.toLowerCase()){
if('isPmCtcpAction'in parsedMessage)_addText(parsedMessage.timestamp+pmNameSpacer+parsedMessage.nick+' '+parsedMessage.params[1]);else _addText(parsedMessage.timestamp+' '+parsedMessage.nick+pmNameSpacer+parsedMessage.params[1])
;if(privMsgSectionEl.hasAttribute('beep1-enabled')&&!webState.cacheReloadInProgress)playBeep3Sound();privMsgSectionEl.removeAttribute('hidden');privMsgBottomDivEl.removeAttribute('hidden')
;privMsgHideButtonEl.textContent='-';privMsgTopRightHidableDivEl.removeAttribute('hidden');document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden')
;document.getElementById('privMsgMainHiddenButton').textContent='-'}}else if(parsedMessage.nick.toLowerCase()===name.toLowerCase()){
if('isPmCtcpAction'in parsedMessage)_addText(parsedMessage.timestamp+pmNameSpacer+parsedMessage.nick+' '+parsedMessage.params[1]);else _addText(parsedMessage.timestamp+' '+parsedMessage.nick+pmNameSpacer+parsedMessage.params[1])
;if(privMsgSectionEl.hasAttribute('beep1-enabled')&&!webState.cacheReloadInProgress)playBeep3Sound();privMsgSectionEl.removeAttribute('hidden');privMsgBottomDivEl.removeAttribute('hidden')
;privMsgHideButtonEl.textContent='-';privMsgTopRightHidableDivEl.removeAttribute('hidden');if(!webState.cacheReloadInProgress)clearLastZoom()
;document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');document.getElementById('privMsgMainHiddenButton').textContent='-'
;if(document.activeElement!==privMsgInputAreaEl&&document.activeElement!==privMsgSendButtonEl&&!webState.cacheReloadInProgress&&0===activityIconInhibitTimer)incrementPrivMsgCount()}break;default:}}
document.addEventListener('private-message',handlePrivateMessage);if(!webState.cacheReloadInProgress)incrementPrivMsgCount();document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden')
;document.getElementById('privMsgMainHiddenButton').textContent='-';const adjustPMInputToWidowWidth=function(){const mar1=webState.dynamic.commonMargin
;const mar2=webState.dynamic.commonMargin+5+webState.dynamic.sendButtonWidthPx;privMsgTextAreaEl.setAttribute('cols',calcInputAreaColSize(mar1))
;privMsgInputAreaEl.setAttribute('cols',calcInputAreaColSize(mar2))};function handleResizeCustomElements(event){if(webState.dynamic.inputAreaCharWidthPx)adjustPMInputToWidowWidth()}
window.addEventListener('resize-custom-elements',handleResizeCustomElements);adjustPMInputToWidowWidth();setTimeout(adjustPMInputToWidowWidth,150);function handleEraseBeforeReload(event){
clearInterval(iconInhibitTimer);document.removeEventListener('cache-reload-done',handleCacheReloadDone);document.removeEventListener('cache-reload-error',handelCacheReloadError)
;document.removeEventListener('priv-msg-hide-all',handlePrivMsgHideAll);document.removeEventListener('priv-msg-show-all',handlePrivMsgShowAll)
;privMsgHideButtonEl.removeEventListener('click',handlePrivMsgHideButtonElClick);privMsgTallerButtonEl.removeEventListener('click',handlePrivMsgTallerButtonElClick)
;privMsgNormalButtonEl.removeEventListener('click',handlePrivMsgNormalButtonElClick);privMsgClearButtonEl.removeEventListener('click',handlePrivMsgClearButtonElClick)
;document.removeEventListener('show-all-divs',handleShowAllDivs);document.removeEventListener('hide-or-zoom',handleHideOrZoom)
;privMsgSendButtonEl.removeEventListener('click',handlePrivMsgSendButtonElClick);privMsgInputAreaEl.removeEventListener('input',handlePrivMsgInputAreaElInput)
;privMsgCounterEl.removeEventListener('click',handlePrivMsgCounterElClick);document.getElementById('privMsgCountDiv').removeEventListener('click',handlePrivMsgCountDivClick)
;document.getElementById('privMsgUnreadExistIcon').removeEventListener('click',handlePrivMsgUnreadExistIconClick);privMsgBottomDivEl.removeEventListener('click',handlePrivMsgBottomDivElClick)
;privMsgBeep1CBInputEl.removeEventListener('click',handlePrivMsgBeep1CBInputElClick);document.removeEventListener('cancel-beep-sounds',handleCancelBeepSounds)
;document.removeEventListener('private-message',handlePrivateMessage);window.removeEventListener('resize-custom-elements',handleResizeCustomElements)
;document.removeEventListener('erase-before-reload',handleEraseBeforeReload);if(privMsgContainerDivEl.contains(privMsgSectionEl))privMsgContainerDivEl.removeChild(privMsgSectionEl)}
document.addEventListener('erase-before-reload',handleEraseBeforeReload)}document.addEventListener('private-message',(function(event){let name=event.detail.parsedMessage.nick
;if(name===ircState.nickName)name=event.detail.parsedMessage.params[0];if(webState.activePrivateMessageNicks.indexOf(name.toLowerCase())<0)createPrivateMessageEl(name,event.detail.parsedMessage)}))
;function _buildPrivateMessageText(){if(0===document.getElementById('userPrivMsgInputId').value.length)return;const inputAreaEl=document.getElementById('userPrivMsgInputId')
;const text=stripTrailingCrLf(inputAreaEl.value);if(detectMultiLineString(text)){showError('Multi-line input is not supported.');inputAreaEl.value=''
}else if(0===text.length)inputAreaEl.value='';else if('/'===text.charAt(0)){const commandAction=textCommandParser({inputString:text,originType:'generic',originName:null});inputAreaEl.value=''
;if(commandAction.error)showError(commandAction.message);else if(commandAction.ircMessage&&commandAction.ircMessage.length>0)_sendIrcServerMessage(commandAction.ircMessage)}else{
if(0===document.getElementById('pmNickNameInputId').value.length)return;const targetNickname=document.getElementById('pmNickNameInputId').value;const message='PRIVMSG '+targetNickname+' :'+text
;_sendIrcServerMessage(message);inputAreaEl.value=''}}document.getElementById('userPrivMsgInputId').addEventListener('input',(function(event){if('insertText'===event.inputType&&null===event.data){
stripOneCrLfFromElement(document.getElementById('userPrivMsgInputId'));_buildPrivateMessageText()}if('insertLineBreak'===event.inputType){
stripOneCrLfFromElement(document.getElementById('userPrivMsgInputId'));_buildPrivateMessageText()}}));document.getElementById('UserPrivMsgSendButton').addEventListener('click',(function(){
_buildPrivateMessageText()}));document.addEventListener('erase-before-reload',(function(event){document.getElementById('pmNickNameInputId').value=''
;document.getElementById('userPrivMsgInputId').value='';webState.activePrivateMessageNicks=[];webState.lastPMNick='';document.getElementById('privMsgWindowCountDiv').textContent='0'
;document.getElementById('privMsgWindowCountDiv').setAttribute('hidden','');document.getElementById('privMsgCountDiv').textContent='0'
;document.getElementById('privMsgCountDiv').setAttribute('hidden','');document.getElementById('privMsgUnreadExistIcon').setAttribute('hidden','')
;document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden','');document.getElementById('privMsgMainHiddenButton').textContent='+'}))
;document.getElementById('whoisButton').addEventListener('click',(function(){if(document.getElementById('pmNickNameInputId').value.length>0){showRawMessageWindow()
;const message='WHOIS '+document.getElementById('pmNickNameInputId').value;_sendIrcServerMessage(message);showRawMessageWindow()}else showError('Input required')}))
;document.getElementById('privMsgMainHiddenButton').addEventListener('click',(function(){if(document.getElementById('privMsgMainHiddenDiv').hasAttribute('hidden')){
document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');document.getElementById('privMsgMainHiddenButton').textContent='-'
;document.dispatchEvent(new CustomEvent('priv-msg-show-all',{bubbles:true}))}else{document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden','')
;document.getElementById('privMsgMainHiddenButton').textContent='+';document.dispatchEvent(new CustomEvent('priv-msg-hide-all',{bubbles:true}))}}))
;document.addEventListener('update-pm-count',(function(event){let totalCount=0;document.querySelectorAll('.pm-count-class').forEach((function(el){totalCount+=parseInt(el.textContent)}))
;document.getElementById('privMsgCountDiv').textContent=totalCount.toString();if(totalCount>0){document.getElementById('privMsgCountDiv').removeAttribute('hidden')
;document.getElementById('privMsgUnreadExistIcon').removeAttribute('hidden')}else{document.getElementById('privMsgCountDiv').setAttribute('hidden','')
;document.getElementById('privMsgUnreadExistIcon').setAttribute('hidden','')}}));document.getElementById('closeNoticeButton').addEventListener('click',(function(){webState.noticeOpen=false
;updateDivVisibility()}));document.getElementById('noticeClearButton').addEventListener('click',(function(){document.getElementById('noticeMessageDisplay').value=''
;document.getElementById('noticeMessageDisplay').setAttribute('rows','5')}));document.getElementById('noticeTallerButton').addEventListener('click',(function(){
const newRows=parseInt(document.getElementById('noticeMessageDisplay').getAttribute('rows'))+5;document.getElementById('noticeMessageDisplay').setAttribute('rows',newRows.toString())}))
;document.getElementById('noticeNormalButton').addEventListener('click',(function(){document.getElementById('noticeMessageDisplay').setAttribute('rows','5')}))
;document.getElementById('noticeSectionDiv').addEventListener('click',(function(){resetNotActivityIcon()}));document.getElementById('wallopsCloseButton').addEventListener('click',(function(){
webState.wallopsOpen=false;updateDivVisibility()}));document.getElementById('wallopsClearButton').addEventListener('click',(function(){document.getElementById('wallopsMessageDisplay').value=''
;document.getElementById('wallopsMessageDisplay').setAttribute('rows','5')}));document.getElementById('wallopsTallerButton').addEventListener('click',(function(){
const newRows=parseInt(document.getElementById('wallopsMessageDisplay').getAttribute('rows'))+5;document.getElementById('wallopsMessageDisplay').setAttribute('rows',newRows.toString())}))
;document.getElementById('wallopsNormalButton').addEventListener('click',(function(){document.getElementById('wallopsMessageDisplay').setAttribute('rows','5')}))
;function _parseInputForIRCCommands(textAreaEl){const text=stripTrailingCrLf(textAreaEl.value);if(detectMultiLineString(text)){textAreaEl.value='';showError('Multi-line input is not supported.')
}else if(text.length>0){const commandAction=textCommandParser({inputString:text,originType:'generic',originName:null});textAreaEl.value='';if(commandAction.error){showError(commandAction.message)
;return}else{if(commandAction.ircMessage&&commandAction.ircMessage.length>0)_sendIrcServerMessage(commandAction.ircMessage);return}}textAreaEl.value=''}
document.getElementById('sendRawMessageButton').addEventListener('click',(function(){_parseInputForIRCCommands(document.getElementById('rawMessageInputId'))
;document.getElementById('rawMessageInputId').focus()}));document.getElementById('rawMessageInputId').addEventListener('input',(function(event){
if('insertText'===event.inputType&&null===event.data||'insertLineBreak'===event.inputType){stripOneCrLfFromElement(document.getElementById('rawMessageInputId'))
;_parseInputForIRCCommands(document.getElementById('rawMessageInputId'))}}));const _autoCompleteServInputElement=function(snippet){const serverInputAreaEl=document.getElementById('rawMessageInputId')
;let last='';const trailingSpaceKey=32;let matchedCommand=''
;if(autoCompleteCommandList.length>0)for(let i=0;i<autoCompleteCommandList.length;i++)if(0===autoCompleteCommandList[i].indexOf(snippet.toUpperCase()))matchedCommand=autoCompleteCommandList[i]
;let matchedRawCommand=''
;if(autoCompleteRawCommandList.length>0)for(let i=0;i<autoCompleteRawCommandList.length;i++)if(0===autoCompleteRawCommandList[i].indexOf(snippet.toUpperCase()))matchedRawCommand=autoCompleteRawCommandList[i]
;if(matchedCommand.length>0&&serverInputAreaEl.value===snippet){serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-snippet.length)
;serverInputAreaEl.value+=matchedCommand;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=matchedCommand
}else if(matchedRawCommand.length>0&&'/QUOTE '===serverInputAreaEl.value.slice(0,7).toUpperCase()){
serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-snippet.length);serverInputAreaEl.value+=matchedRawCommand
;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=matchedRawCommand}else if(0===ircState.nickName.toLowerCase().indexOf(snippet.toLowerCase())){
serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-snippet.length);serverInputAreaEl.value+=ircState.nickName
;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);last=ircState.nickName}else serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);return last};let lastServAutoCompleteMatch=''
;const serverAutoComplete=function(e){const serverInputAreaEl=document.getElementById('rawMessageInputId');const autoCompleteTabKey=9;const autoCompleteSpaceKey=32;const trailingSpaceKey=32
;if(!e.keyCode)return;if(e.keyCode&&e.keyCode===autoCompleteTabKey){if(serverInputAreaEl.value.length<2){e.preventDefault();return}let snippet='';const snippetArray=serverInputAreaEl.value.split(' ')
;if(snippetArray.length>0)snippet=snippetArray[snippetArray.length-1];if(snippet.length>0){if(e.keyCode===autoCompleteTabKey&&snippet.length>0)_autoCompleteServInputElement(snippet)}else{
if('/QUIT '===serverInputAreaEl.value.toUpperCase())serverInputAreaEl.value+=ircState.progName+' '+ircState.progVersion;else serverInputAreaEl.value+=ircState.nickName
;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey)}e.preventDefault()}
if(e.keyCode&&e.keyCode===autoCompleteSpaceKey)if(serverInputAreaEl.value.length>0)if(serverInputAreaEl.value.charCodeAt(serverInputAreaEl.value.length-1)===autoCompleteSpaceKey)if(serverInputAreaEl.value.length>1&&serverInputAreaEl.value.charCodeAt(serverInputAreaEl.value.length-2)===autoCompleteSpaceKey){
serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-1)
;if('/QUIT '===serverInputAreaEl.value.toUpperCase())serverInputAreaEl.value+=ircState.progName+' '+ircState.progVersion;else serverInputAreaEl.value+=ircState.nickName
;serverInputAreaEl.value+=String.fromCharCode(trailingSpaceKey);e.preventDefault()}else{serverInputAreaEl.value=serverInputAreaEl.value.slice(0,serverInputAreaEl.value.length-1);let snippet=''
;const snippetArray=serverInputAreaEl.value.split(' ');if(snippetArray.length>0)snippet=snippetArray[snippetArray.length-1];if(snippet.length>0){const matchStr=_autoCompleteServInputElement(snippet)
;if(lastServAutoCompleteMatch!==matchStr){lastServAutoCompleteMatch=matchStr;e.preventDefault()}}else serverInputAreaEl.value+=String.fromCharCode(autoCompleteSpaceKey)}}
;document.getElementById('rawMessageInputId').addEventListener('keydown',serverAutoComplete,false);function substituteHmsTime(inMessage){const timeString=inMessage.split(' ')[0]
;const restOfMessage=inMessage.slice(timeString.length+1,inMessage.length);const hmsString=timestampToHMS(timeString);return hmsString+' '+restOfMessage}
document.addEventListener('server-message',(function(event){function _showAfterParamZero(parsedMessage,title){let msgString=''
;if(parsedMessage.params.length>1)for(let i=1;i<parsedMessage.params.length;i++)msgString+=' '+parsedMessage.params[i];else console.log('Error _showAfterParamZero() no parsed field')
;let outMessage=parsedMessage.timestamp+msgString;if(title)outMessage=title+msgString;displayRawMessage(cleanFormatting(cleanCtcpDelimiter(outMessage)))}switch(event.detail.parsedMessage.command){
case'001':case'002':case'003':case'004':_showAfterParamZero(event.detail.parsedMessage,null);break;case'005':break;case'250':case'251':case'252':case'254':case'255':case'265':
_showAfterParamZero(event.detail.parsedMessage,null);break;case'256':case'257':case'258':case'259':_showAfterParamZero(event.detail.parsedMessage,null);break;case'315':displayRawMessage('WHO --End--')
;break;case'352':_showAfterParamZero(event.detail.parsedMessage,'WHO');break;case'275':case'307':case'311':case'312':case'313':case'317':case'319':case'330':case'338':case'378':case'379':case'671':
_showAfterParamZero(event.detail.parsedMessage,'WHOIS');break;case'301':if(3!==event.detail.parsedMessage.params.length)_showAfterParamZero(event.detail.parsedMessage,'WHOIS');else{
const outMessage='WHOIS '+event.detail.parsedMessage.params[1]+' is away: '+event.detail.parsedMessage.params[2];displayRawMessage(cleanFormatting(cleanCtcpDelimiter(outMessage)))}break;case'318':
displayRawMessage('WHOIS --End--');break;case'322':if(4===event.detail.parsedMessage.params.length){let outMessage='LIST '+event.detail.parsedMessage.params[1]+' '+event.detail.parsedMessage.params[2]
;if(event.detail.parsedMessage.params[3])outMessage+=' '+event.detail.parsedMessage.params[3];displayRawMessage(cleanFormatting(cleanCtcpDelimiter(outMessage)))
}else console.log('Error Msg 322 not have 4 parsed parameters');break;case'321':break;case'323':displayRawMessage('LIST --End--');break;case'372':_showAfterParamZero(event.detail.parsedMessage,null)
;break;case'375':case'376':break;case'900':case'903':_showAfterParamZero(event.detail.parsedMessage,null);break;case'MODE':
displayRawMessage(cleanFormatting(cleanCtcpDelimiter(event.detail.parsedMessage.timestamp+' '+'MODE '+event.detail.parsedMessage.params[0]+' '+event.detail.parsedMessage.params[1])));break;case'NICK':
displayRawMessage(cleanFormatting(cleanCtcpDelimiter(event.detail.parsedMessage.timestamp+' '+'(No channel) '+event.detail.parsedMessage.nick+' is now known as '+event.detail.parsedMessage.params[0])))
;break;case'NOTICE':
displayRawMessage(cleanFormatting(cleanCtcpDelimiter(event.detail.parsedMessage.timestamp+' '+'NOTICE '+event.detail.parsedMessage.params[0]+' '+event.detail.parsedMessage.params[1])));break;default:
displayRawMessage(cleanFormatting(cleanCtcpDelimiter(substituteHmsTime(event.detail.message))))}if(!webState.cacheReloadInProgress)showRawMessageWindow()}))
;document.addEventListener('erase-before-reload',(function(event){document.getElementById('rawMessageDisplay').value='';document.getElementById('rawMessageInputId').value=''}))
;document.addEventListener('cache-reload-done',(function(event){if(webState.viewRawMessages&&!webState.showRawInHex){
const tempRawMessages=document.getElementById('rawMessageDisplay').value.split('\n');if(tempRawMessages.length>1){const tempTimestampArray=[];const tempSortIndexArray=[]
;const lineCount=tempRawMessages.length;for(let i=0;i<lineCount;i++){tempTimestampArray.push(new Date(tempRawMessages[i].split(' ')[0].split('=')[1]));tempSortIndexArray.push(i)}let tempIndex=0
;for(let i=0;i<lineCount;i++)for(let j=0;j<lineCount-1;j++)if(tempTimestampArray[tempSortIndexArray[j]]>tempTimestampArray[tempSortIndexArray[j+1]]){tempIndex=tempSortIndexArray[j]
;tempSortIndexArray[j]=tempSortIndexArray[j+1];tempSortIndexArray[j+1]=tempIndex}document.getElementById('rawMessageDisplay').value=''
;for(let i=0;i<lineCount;i++)document.getElementById('rawMessageDisplay').value+=tempRawMessages[tempSortIndexArray[i]]+'\n'}}let markerString='';let timestampString=''
;if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)markerString+=timestampString;markerString+=' '+cacheReloadString+'\n'
;if(''!==document.getElementById('rawMessageDisplay').value){document.getElementById('rawMessageDisplay').value+=markerString
;document.getElementById('rawMessageDisplay').scrollTop=document.getElementById('rawMessageDisplay').scrollHeight}}));document.addEventListener('cache-reload-error',(function(event){
let errorString='\n';let timestampString='';if('detail'in event&&'timestamp'in event.detail)timestampString=unixTimestampToHMS(event.detail.timestamp);if(timestampString)errorString+=timestampString
;errorString+=' '+cacheErrorString+'\n\n';document.getElementById('rawMessageDisplay').value=errorString}));document.getElementById('rawHiddenElementsButton').addEventListener('click',(function(){
if(document.getElementById('rawHiddenElements').hasAttribute('hidden'))showRawMessageWindow();else hideRawMessageWindow()}))
;document.getElementById('rawClearButton').addEventListener('click',(function(){document.getElementById('rawMessageDisplay').value=''
;document.getElementById('rawMessageDisplay').setAttribute('rows','10');document.getElementById('rawMessageInputId').value=''}))
;document.getElementById('rawTallerButton').addEventListener('click',(function(){const newRows=parseInt(document.getElementById('rawMessageDisplay').getAttribute('rows'))+10
;document.getElementById('rawMessageDisplay').setAttribute('rows',newRows.toString())}));document.getElementById('rawNormalButton').addEventListener('click',(function(){
document.getElementById('rawMessageDisplay').setAttribute('rows','10')}));document.getElementById('showDebugButton').addEventListener('click',(function(){
if(document.getElementById('hiddenDebugDiv').hasAttribute('hidden')){document.getElementById('hiddenDebugDiv').removeAttribute('hidden')
;document.getElementById('showDebugButton').textContent='Less...'}else{document.getElementById('hiddenDebugDiv').setAttribute('hidden','')
;document.getElementById('variablesDivId').setAttribute('hidden','');document.getElementById('showDebugButton').textContent='More...'}}))
;document.getElementById('loadFromCacheButton').addEventListener('click',(function(){if(!webState.cacheReloadInProgress)document.dispatchEvent(new CustomEvent('update-from-cache',{bubbles:true}))}))
;document.getElementById('showAllDivsButton').addEventListener('click',(function(){clearLastZoom();document.dispatchEvent(new CustomEvent('show-all-divs',{bubbles:true}))}))
;document.getElementById('hideAllDivsButton').addEventListener('click',(function(){clearLastZoom();document.dispatchEvent(new CustomEvent('hide-or-zoom',{bubbles:true}))}))
;document.getElementById('variablesButtonId').addEventListener('click',(function(){if(document.getElementById('variablesDivId').hasAttribute('hidden')){
document.getElementById('variablesDivId').removeAttribute('hidden')
;document.getElementById('variablesPreId').textContent='ircState = '+JSON.stringify(ircState,null,2)+'\n\n'+'webState = '+JSON.stringify(webState,null,2)
}else document.getElementById('variablesDivId').setAttribute('hidden','')}));document.getElementById('viewRawMessagesCheckbox').addEventListener('click',(function(e){
if(document.getElementById('viewRawMessagesCheckbox').checked){document.getElementById('showRawInHexCheckbox').removeAttribute('disabled')
;document.getElementById('showCommsCheckbox').removeAttribute('disabled');webState.viewRawMessages=true}else{document.getElementById('showRawInHexCheckbox').checked=false
;document.getElementById('showRawInHexCheckbox').setAttribute('disabled','');document.getElementById('showCommsCheckbox').checked=false
;document.getElementById('showCommsCheckbox').setAttribute('disabled','');webState.viewRawMessages=false;webState.showRawInHex=false;webState.showCommsMessages=false}
document.dispatchEvent(new CustomEvent('update-from-cache',{bubbles:true}))}));document.getElementById('showRawInHexCheckbox').addEventListener('click',(function(){
if(document.getElementById('showRawInHexCheckbox').checked)webState.showRawInHex=true;else webState.showRawInHex=false;document.dispatchEvent(new CustomEvent('update-from-cache',{bubbles:true}))}))
;document.getElementById('showCommsCheckbox').addEventListener('click',(function(){
if(document.getElementById('showCommsCheckbox').checked)webState.showCommsMessages=true;else webState.showCommsMessages=false;document.dispatchEvent(new CustomEvent('update-from-cache',{bubbles:true
}))}));document.getElementById('infoOpenCloseButton').addEventListener('click',(function(){if(document.getElementById('hiddenInfoDiv').hasAttribute('hidden')){
document.getElementById('hiddenInfoDiv').removeAttribute('hidden');document.getElementById('infoOpenCloseButton').textContent='-'}else{
document.getElementById('hiddenInfoDiv').setAttribute('hidden','');document.getElementById('infoOpenCloseButton').textContent='+'}}));function updateFromCache(){if(webState.cacheReloadInProgress){
console.log('Attempt cache reload, while previous in progress');return}webState.cacheReloadInProgress=true;resetNotActivityIcon();document.dispatchEvent(new CustomEvent('erase-before-reload',{
bubbles:true,detail:{}}));const fetchURL=webServerUrl+'/irc/cache';const fetchOptions={method:'GET',headers:{Accept:'application/json'}};fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseArray=>{if(Array.isArray(responseArray)){webState.lastPMNick=''
;webState.activePrivateMessageNicks=[];if(responseArray.length>0)for(let i=0;i<responseArray.length;i++)if(responseArray[i].length>0)_parseBufferMessage(responseArray[i])}
const timestamp=unixTimestamp();document.dispatchEvent(new CustomEvent('cache-reload-done',{bubbles:true,detail:{timestamp:timestamp}}))}).catch(error=>{const timestamp=unixTimestamp()
;console.log(error);document.dispatchEvent(new CustomEvent('cache-reload-error',{bubbles:true,detail:{timestamp:timestamp}}))})}window.addEventListener('update-from-cache',(function(event){
updateFromCache()}));let updateCacheDebounceActive=false;window.addEventListener('debounced-update-from-cache',(function(event){if(!updateCacheDebounceActive){updateCacheDebounceActive=true
;setTimeout((function(){updateCacheDebounceActive=false;if(!webState.cacheReloadInProgress)updateFromCache()}),1e3)}}));window.addEventListener('cache-reload-done',(function(event){
webState.cacheReloadInProgress=false}));window.addEventListener('cache-reload-error',(function(event){webState.cacheReloadInProgress=false}))
;document.getElementById('serverTerminateButton').addEventListener('click',(function(){console.log('Requesting backend server to terminate');const fetchURL=webServerUrl+'/terminate'
;const fetchOptions={method:'POST',headers:{'CSRF-Token':csrfToken,'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify({terminate:'YES'})}
;fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseJson=>{
console.log(JSON.stringify(responseJson))}).catch(error=>{showError('Terminate: Unable to connect');console.log(error)})}))
;document.getElementById('eraseCacheButton').addEventListener('click',(function(){document.dispatchEvent(new CustomEvent('erase-before-reload',{bubbles:true,detail:{}}))
;const fetchURL=webServerUrl+'/irc/erase';const fetchOptions={method:'POST',headers:{'CSRF-Token':csrfToken,'Content-type':'application/json',Accept:'application/json'},body:JSON.stringify({
erase:'YES'})};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseJson=>{
if(responseJson.error)showError(responseJson.message)}).catch(error=>{console.log(error)})}));function detectWebUseridChanged(){let lastLoginUser=null
;lastLoginUser=JSON.parse(window.localStorage.getItem('lastLoginUser'));if(lastLoginUser&&lastLoginUser.userid&&lastLoginUser.userid!==webState.loginUser.userid){
console.log('User id changed, clearing local storage');window.localStorage.clear()}const newLoginTimestamp=unixTimestamp();const newLoginUser={timestamp:newLoginTimestamp,
userid:webState.loginUser.userid};window.localStorage.setItem('lastLoginUser',JSON.stringify(newLoginUser))}function updateUsername(){const fetchURL=webServerUrl+'/userinfo';const fetchOptions={
method:'GET',headers:{Accept:'application/json'}};fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseJson=>{webState.loginUser=responseJson;detectWebUseridChanged()
}).catch(error=>{console.log(error)})}updateUsername();document.getElementById('test1Button').addEventListener('click',(function(){console.log('Test1 button pressed.')
;const fetchURL=webServerUrl+'/irc/test1';const fetchOptions={method:'GET',headers:{Accept:'application/json'}};fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText)}).then(responseJson=>{console.log(JSON.stringify(responseJson,null,2))
;if(responseJson.error)showError(responseJson.message)}).catch(error=>{console.log(error);if(error)showError(error.toString())})}))
;document.getElementById('test1ButtonDesc').textContent='Force garbage collect';document.getElementById('test2Button').addEventListener('click',(function(){console.log('Test2 button pressed.')
;const fetchURL=webServerUrl+'/irc/test2';const fetchOptions={method:'GET',headers:{Accept:'application/json'}};fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else{
console.log(response);throw new Error('Fetch status '+response.status+' '+response.statusText)}}).then(responseJson=>{console.log(JSON.stringify(responseJson,null,2))
;if(responseJson.error)showError(responseJson.message)}).catch(error=>{console.log(error);if(error)showError(error.toString())})}))
;document.getElementById('test2ButtonDesc').textContent='Emulate IRC ping timeout';document.getElementById('test3Button').addEventListener('click',(function(){console.log('Test 3 button pressed.')
;console.log('Test 3 button: expire heart beat timer');heartbeatUpCounter=heartbeatExpirationTimeSeconds-1}));document.getElementById('test3ButtonDesc').textContent='Emulate websocket timeout'
;document.getElementById('test4Button').addEventListener('click',(function(){console.log('Test 4 button pressed.');getIrcState()}))
;document.getElementById('test4ButtonDesc').textContent='Call getIrcState()';const updatePageMeasurements=function(){
webState.dynamic.bodyClientWidth=document.querySelector('body').clientWidth.toString();if(!webState.watch)webState.watch={};webState.watch.innerHeight=window.innerHeight.toString()+'px'
;webState.watch.innerWidth=window.innerWidth.toString()+'px';webState.watch.bodyClientWidth=webState.dynamic.bodyClientWidth.toString()+'px';webState.watch.devicePixelRatio=window.devicePixelRatio}
;const calibrateElementSize=function(){const rulerDivEl=document.getElementById('rulerDiv');const rulerX1=10;const rulerX2=20;const rulerTextareaEl1=document.createElement('textarea')
;rulerTextareaEl1.setAttribute('cols',rulerX1.toString());rulerTextareaEl1.setAttribute('rows','1');rulerDivEl.appendChild(rulerTextareaEl1);const rulerTextareaEl2=document.createElement('textarea')
;rulerTextareaEl2.setAttribute('cols',rulerX2.toString());rulerTextareaEl2.setAttribute('rows','1');rulerDivEl.appendChild(rulerTextareaEl2);const rulerButtonEl=document.createElement('button')
;rulerButtonEl.textContent='Send';rulerDivEl.appendChild(rulerButtonEl);const rulerY1=rulerTextareaEl1.getBoundingClientRect().width;const rulerY2=rulerTextareaEl2.getBoundingClientRect().width
;webState.dynamic.inputAreaCharWidthPx=(rulerY2-rulerY1)/(rulerX2-rulerX1);webState.dynamic.inputAreaSideWidthPx=rulerY1-rulerX1*webState.dynamic.inputAreaCharWidthPx
;webState.dynamic.sendButtonWidthPx=rulerButtonEl.getBoundingClientRect().width;rulerDivEl.removeChild(rulerTextareaEl1);rulerDivEl.removeChild(rulerTextareaEl2);rulerDivEl.removeChild(rulerButtonEl)}
;const calcInputAreaColSize=function(marginPxWidth){
if('number'===typeof marginPxWidth&&webState.dynamic.inputAreaCharWidthPx&&'number'===typeof webState.dynamic.inputAreaCharWidthPx&&webState.dynamic.inputAreaCharWidthPx>1&&webState.dynamic.inputAreaSideWidthPx&&'number'===typeof webState.dynamic.inputAreaSideWidthPx&&webState.dynamic.inputAreaSideWidthPx>1){
let margin=marginPxWidth;if(margin<0)margin=0;const cols=parseInt((webState.dynamic.bodyClientWidth-webState.dynamic.inputAreaSideWidthPx-margin)/webState.dynamic.inputAreaCharWidthPx)
;return cols.toString()}else{console.log('alcInputAreaColSize() invalid input');return null}};const adjustInputToWidowWidth=function(){const mar1=webState.dynamic.commonMargin
;document.getElementById('rawMessageDisplay').setAttribute('cols',calcInputAreaColSize(mar1));document.getElementById('noticeMessageDisplay').setAttribute('cols',calcInputAreaColSize(mar1))
;document.getElementById('wallopsMessageDisplay').setAttribute('cols',calcInputAreaColSize(mar1));const mar2=webState.dynamic.commonMargin+5+webState.dynamic.sendButtonWidthPx
;document.getElementById('rawMessageInputId').setAttribute('cols',calcInputAreaColSize(mar2));document.getElementById('userPrivMsgInputId').setAttribute('cols',calcInputAreaColSize(mar2))
;document.getElementById('errorDiv').style.width='100%'};window.addEventListener('resize-custom-elements',(function(event){if(webState.dynamic.inputAreaCharWidthPx)adjustInputToWidowWidth()}))
;window.addEventListener('resize',(function(event){updatePageMeasurements();if(webState.dynamic.inputAreaCharWidthPx){
if(window.devicePixelRatio)if(webState.dynamic.lastDevicePixelRatio!==window.devicePixelRatio){webState.dynamic.lastDevicePixelRatio=window.devicePixelRatio;calibrateElementSize()}
document.dispatchEvent(new CustomEvent('resize-custom-elements',{bubbles:true,detail:{}}));webState.dynamic.lastClientWidth=webState.dynamic.bodyClientWidth}}))
;const checkVerticalSliderPageWidth=function(){updatePageMeasurements();if(webState.dynamic.inputAreaCharWidthPx)if(webState.dynamic.lastClientWidth!==webState.dynamic.bodyClientWidth){
webState.dynamic.lastClientWidth=webState.dynamic.bodyClientWidth;document.dispatchEvent(new CustomEvent('resize-custom-elements',{bubbles:true,detail:{}}))}}
;document.addEventListener('recalcPageWidthButtonId',(function(){updatePageMeasurements();calibrateElementSize();document.dispatchEvent(new CustomEvent('resize-custom-elements',{bubbles:true,detail:{}
}))}));updatePageMeasurements();webState.dynamic.lastClientWidth=webState.dynamic.bodyClientWidth;calibrateElementSize();document.dispatchEvent(new CustomEvent('resize-custom-elements',{bubbles:true,
detail:{}}));setTimeout((function(){calibrateElementSize();document.dispatchEvent(new CustomEvent('resize-custom-elements',{bubbles:true,detail:{}}))}),900);setInterval((function(){
errorTimerTickHandler();heartbeatTimerTickHandler();reconnectTimerTickHandler();beepTimerTick();updateElapsedTimeDisplay();checkVerticalSliderPageWidth()}),1e3);firstWebSocketConnectOnPageLoad();