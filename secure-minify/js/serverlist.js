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

let full=false;let editable=false;const _clearError=()=>{const errorDivEl=document.getElementById('errorDiv');errorDivEl.setAttribute('hidden','')
;while(errorDivEl.firstChild)errorDivEl.removeChild(errorDivEl.firstChild);document.getElementById('showRefreshButtonDiv').setAttribute('hidden','')};const _showError=errorString=>{
const errorDivEl=document.getElementById('errorDiv');errorDivEl.removeAttribute('hidden');const errorMessageEl=document.createElement('div')
;errorMessageEl.textContent=errorString||'Error: unknown error (4712)';errorDivEl.appendChild(errorMessageEl);document.getElementById('showRefreshButtonDiv').removeAttribute('hidden')
;window.scrollTo(0,document.querySelector('body').scrollHeight)};const fetchIrcState=()=>{const fetchURL=encodeURI('/irc/getircstate');const fetchOptions={method:'GET',headers:{
Accept:'application/json'}};return fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText+' '+fetchURL)})};const fetchServerList=(index,lock)=>{let urlStr='/irc/serverlist'
;if(index>=0){urlStr+='?index='+index.toString();if(lock>=0)urlStr+='&lock='+lock.toString()}const fetchURL=encodeURI(urlStr);const fetchOptions={method:'GET',headers:{Accept:'application/json'}}
;return fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else if(409===response.status){const err=new Error('IRC Connected or Database Locked');err.status=409
;throw err}else if(405===response.status){const err=new Error('Server List Editor Disabled');err.status=405;throw err
}else throw new Error('Fetch status '+response.status+' '+response.statusText+' '+fetchURL)})};const submitServer=(body,method,index)=>{
const csrfToken=document.querySelector('meta[name="csrf-token"]').getAttribute('content');let baseUrl='/irc/serverlist';if('action'in body)baseUrl='/irc/serverlist/tools'
;if(-1!==index)baseUrl+='?index='+index.toString();const fetchURL=encodeURI(baseUrl);const fetchOptions={method:method,headers:{'CSRF-Token':csrfToken,Accept:'application/json',
'Content-Type':'application/json'},body:JSON.stringify(body)};return fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else if(409===response.status){
const err=new Error('IRC Connected or Database Locked');err.status=409;throw err}else if(422===response.status){const err=new Error('Unprocessable Entity');err.status=422;throw err
}else throw new Error('Fetch status '+response.status+' '+response.statusText+' '+fetchURL)})};const clearIrcServerForm=()=>new Promise((resolve,reject)=>{
document.getElementById('saveNewButton').removeAttribute('hidden');document.getElementById('saveModifiedButton').setAttribute('hidden','');document.getElementById('indexInputId').value='-1'
;document.getElementById('disabledCheckboxId').checked=false;document.getElementById('groupInputId').value=0;document.getElementById('nameInputId').value=''
;document.getElementById('hostInputId').value='';document.getElementById('portInputId').value=6697;document.getElementById('tlsCheckboxId').checked=true
;document.getElementById('verifyCheckboxId').checked=true;document.getElementById('proxyCheckboxId').checked=false;document.getElementById('autoReconnectCheckboxId').checked=false
;document.getElementById('loggingCheckboxId').checked=false;document.getElementById('passwordInputId').setAttribute('disabled','');document.getElementById('passwordInputId').value='(Blank)'
;document.getElementById('replacePasswordButton').removeAttribute('hidden');document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','')
;document.getElementById('saslUsernameInputId').value='';document.getElementById('saslPasswordInputId').setAttribute('disabled','');document.getElementById('saslPasswordInputId').value='(Blank)'
;document.getElementById('replaceSaslPasswordButton').removeAttribute('hidden');document.getElementById('serverSaslPasswordWarningDiv').setAttribute('hidden','')
;document.getElementById('identifyNickInputId').value='';document.getElementById('identifyCommandInputId').setAttribute('disabled','');document.getElementById('identifyCommandInputId').value='(blank)'
;document.getElementById('replaceIdentifyCommandButton').removeAttribute('hidden');document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','')
;document.getElementById('nickInputId').value='';document.getElementById('altNickInputId').value='';document.getElementById('recoverNickCheckboxId').checked=false
;document.getElementById('userInputId').value='';document.getElementById('realInputId').value='';document.getElementById('modesInputId').value='';document.getElementById('channelListInputId').value=''
;resolve(null)});const populateIrcServerForm=data=>new Promise((resolve,reject)=>{clearIrcServerForm();document.getElementById('saveNewButton').setAttribute('hidden','')
;document.getElementById('saveModifiedButton').removeAttribute('hidden');document.getElementById('listVisibilityDiv').setAttribute('hidden','')
;document.getElementById('formVisibilityDiv').removeAttribute('hidden');document.getElementById('indexInputId').value=data.index.toString()
;if(data.disabled)document.getElementById('disabledCheckboxId').checked=true;else document.getElementById('disabledCheckboxId').checked=false
;if('group'in data)document.getElementById('groupInputId').value=parseInt(data.group);else document.getElementById('groupInputId').value=0;document.getElementById('nameInputId').value=data.name
;document.getElementById('hostInputId').value=data.host;document.getElementById('portInputId').value=parseInt(data.port)
;if(data.tls)document.getElementById('tlsCheckboxId').checked=true;else document.getElementById('tlsCheckboxId').checked=false
;if(data.verify)document.getElementById('verifyCheckboxId').checked=true;else document.getElementById('verifyCheckboxId').checked=false
;if(data.proxy)document.getElementById('proxyCheckboxId').checked=true;else document.getElementById('proxyCheckboxId').checked=false
;if(data.reconnect)document.getElementById('autoReconnectCheckboxId').checked=true;else document.getElementById('autoReconnectCheckboxId').checked=false
;if(data.logging)document.getElementById('loggingCheckboxId').checked=true;else document.getElementById('loggingCheckboxId').checked=false
;document.getElementById('passwordInputId').setAttribute('disabled','');document.getElementById('replacePasswordButton').removeAttribute('hidden')
;if(null===data.password)document.getElementById('passwordInputId').value='(hidden)';else document.getElementById('passwordInputId').value='(blank)'
;document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','');document.getElementById('saslUsernameInputId').value=data.saslUsername
;document.getElementById('saslPasswordInputId').setAttribute('disabled','');document.getElementById('replaceSaslPasswordButton').removeAttribute('hidden')
;if(null===data.saslPassword)document.getElementById('saslPasswordInputId').value='(hidden)';else document.getElementById('saslPasswordInputId').value='(blank)'
;document.getElementById('serverSaslPasswordWarningDiv').setAttribute('hidden','');document.getElementById('identifyNickInputId').value=data.identifyNick
;document.getElementById('identifyCommandInputId').setAttribute('disabled','');document.getElementById('replaceIdentifyCommandButton').removeAttribute('hidden')
;if(null===data.identifyCommand)document.getElementById('identifyCommandInputId').value='(hidden)';else document.getElementById('identifyCommandInputId').value='(blank)'
;document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','');document.getElementById('nickInputId').value=data.nick;document.getElementById('altNickInputId').value=data.altNick
;if(0===data.altNick.length)document.getElementById('recoverNickCheckboxId').checked=false;else if(data.recoverNick)document.getElementById('recoverNickCheckboxId').checked=true;else document.getElementById('recoverNickCheckboxId').checked=false
;document.getElementById('userInputId').value=data.user;document.getElementById('realInputId').value=data.real;document.getElementById('modesInputId').value=data.modes
;document.getElementById('channelListInputId').value=data.channelList;resolve(null)});const toggleDisabled=index=>{_clearError();submitServer({index:index,action:'toggle-disabled'
},'POST',index).then(data=>checkForApiError(data)).then(()=>fetchIrcState()).then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{
_showError(err.toString()||err);console.log(err)})};const openIrcServerEdit=index=>{_clearError()
;clearIrcServerForm().then(()=>fetchServerList(index,1)).then(data=>populateIrcServerForm(data)).catch(err=>{_showError(err.toString()||err);console.log(err)})};const copyIrcServerToNew=index=>{
_clearError();submitServer({index:index
},'COPY',index).then(data=>checkForApiError(data)).then(()=>fetchIrcState()).then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{
_showError(err.toString()||err);console.log(err)})};const deleteIrcServer=index=>{_clearError();submitServer({index:index
},'DELETE',index).then(data=>checkForApiError(data)).then(()=>fetchIrcState()).then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{
_showError(err.toString()||err);console.log(err)})};const moveUpInList=index=>{_clearError();submitServer({index:index,action:'move-up'
},'POST',index).then(data=>checkForApiError(data)).then(()=>fetchIrcState()).then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{
_showError(err.toString()||err);console.log(err)})};const parseFormInputValues=()=>new Promise((resolve,reject)=>{const index=parseInt(document.getElementById('indexInputId').value);const data={}
;if(-1!==index)data.index=parseInt(document.getElementById('indexInputId').value);if(document.getElementById('disabledCheckboxId').checked)data.disabled=true;else data.disabled=false
;data.group=parseInt(document.getElementById('groupInputId').value);data.name=document.getElementById('nameInputId').value;data.host=document.getElementById('hostInputId').value
;data.port=parseInt(document.getElementById('portInputId').value);if(document.getElementById('tlsCheckboxId').checked)data.tls=true;else data.tls=false
;if(document.getElementById('verifyCheckboxId').checked)data.verify=true;else data.verify=false;if(document.getElementById('proxyCheckboxId').checked)data.proxy=true;else data.proxy=false
;if(document.getElementById('autoReconnectCheckboxId').checked)data.reconnect=true;else data.reconnect=false
;if(document.getElementById('loggingCheckboxId').checked)data.logging=true;else data.logging=false
;if(!document.getElementById('passwordInputId').hasAttribute('disabled'))data.password=document.getElementById('passwordInputId').value
;data.saslUsername=document.getElementById('saslUsernameInputId').value
;if(!document.getElementById('saslPasswordInputId').hasAttribute('disabled'))data.saslPassword=document.getElementById('saslPasswordInputId').value
;data.identifyNick=document.getElementById('identifyNickInputId').value
;if(!document.getElementById('identifyCommandInputId').hasAttribute('disabled'))data.identifyCommand=document.getElementById('identifyCommandInputId').value
;data.nick=document.getElementById('nickInputId').value;data.altNick=document.getElementById('altNickInputId').value
;if(document.getElementById('recoverNickCheckboxId').checked)data.recoverNick=true;else data.recoverNick=false;data.user=document.getElementById('userInputId').value
;data.real=document.getElementById('realInputId').value;data.modes=document.getElementById('modesInputId').value;data.channelList=document.getElementById('channelListInputId').value;let errorStr=null
;if(isNaN(data.group))errorStr='Invalid group number';if(parseInt(data.group)<0)errorStr='Invalid group number';if(''===data.name)errorStr='Label is required input.'
;if(''===data.host)errorStr='Host/IP is required input.';if(isNaN(data.port))errorStr='Invalid port number';if(data.nick===data.altNick)errorStr='Nickname and alternate nickname must be different.'
;if(data.recoverNick&&0===data.altNick.length)errorStr='Nickname recovery checkbox set without valid alternate nickname';if(''===data.nick)errorStr='Nickname is required input.'
;if(''===data.user)errorStr='Unix ident user is required input.';if(''===data.real)errorStr='Real Name is required input.';if(errorStr)reject(new Error(errorStr));else resolve({data:data,index:index})
});const buildServerListTable=data=>new Promise((resolve,reject)=>{const tableNode=document.getElementById('tbodyId');while(tableNode.firstChild)tableNode.removeChild(tableNode.firstChild)
;const columnTitles=[];columnTitles.push('Index');columnTitles.push('Disabled');columnTitles.push('Group');columnTitles.push('Label');columnTitles.push('Host');columnTitles.push('Port')
;if(full)columnTitles.push('TLS');if(full)columnTitles.push('verify');if(full)columnTitles.push('proxy');if(full)columnTitles.push('password');if(full)columnTitles.push('sasl username')
;if(full)columnTitles.push('sasl password');columnTitles.push('Nick');if(full)columnTitles.push('Alternate');if(full)columnTitles.push('Recover');if(full)columnTitles.push('user')
;if(full)columnTitles.push('Real Name');if(full)columnTitles.push('Modes');if(full)columnTitles.push('Channels');if(full)columnTitles.push('identifyNick');if(full)columnTitles.push('command')
;if(full)columnTitles.push('reconnect');if(full)columnTitles.push('logging');if(editable)columnTitles.push('');if(editable)columnTitles.push('');if(editable)columnTitles.push('')
;if(editable)columnTitles.push('');const titleRowEl=document.createElement('tr');columnTitles.forEach(titleName=>{const tdEl=document.createElement('td');tdEl.textContent=titleName
;titleRowEl.appendChild(tdEl)});tableNode.appendChild(titleRowEl);if(Array.isArray(data)&&data.length>0)for(let i=0;i<data.length;i++){const rowEl=document.createElement('tr')
;rowEl.setAttribute('index',i.toString());if(data[i].disabled)rowEl.classList.add('disabled-tr');const td01El=document.createElement('td');td01El.textContent=i.toString();rowEl.appendChild(td01El)
;const td10El=document.createElement('td');const disabledCheckboxEl=document.createElement('input');disabledCheckboxEl.setAttribute('type','checkbox')
;if(editable)disabledCheckboxEl.removeAttribute('disabled');else disabledCheckboxEl.setAttribute('disabled','');disabledCheckboxEl.checked=data[i].disabled;td10El.appendChild(disabledCheckboxEl)
;rowEl.appendChild(td10El);const td11El=document.createElement('td');if('group'in data[i])td11El.textContent=data[i].group;else td11El.textContent=0
;if('group'in data[i]&&data[i].group>0&&data[i].group<6)td11El.classList.add('group-color-'+data[i].group.toString());rowEl.appendChild(td11El);const td12El=document.createElement('td')
;td12El.textContent=data[i].name;rowEl.appendChild(td12El);const td20El=document.createElement('td');td20El.textContent=data[i].host;rowEl.appendChild(td20El);const td21El=document.createElement('td')
;td21El.textContent=data[i].port;rowEl.appendChild(td21El);if(full){const td22El=document.createElement('td');const tlsIconEl=document.createElement('div')
;const tlsIconInnerEl=document.createElement('div');tlsIconEl.appendChild(tlsIconInnerEl);if(data[i].tls){tlsIconEl.classList.add('icon-true');tlsIconInnerEl.classList.add('icon-inner-true')}else{
tlsIconEl.classList.add('icon-false');tlsIconInnerEl.classList.add('icon-inner-false')}td22El.appendChild(tlsIconEl);rowEl.appendChild(td22El);const td23El=document.createElement('td')
;const verifyIconEl=document.createElement('div');const verifyIconInnerEl=document.createElement('div');verifyIconEl.appendChild(verifyIconInnerEl);if(data[i].verify){
verifyIconEl.classList.add('icon-true');verifyIconInnerEl.classList.add('icon-inner-true')}else{verifyIconEl.classList.add('icon-false');verifyIconInnerEl.classList.add('icon-inner-false')}
td23El.appendChild(verifyIconEl);rowEl.appendChild(td23El);const td24El=document.createElement('td');const proxyIconEl=document.createElement('div')
;const proxyIconInnerEl=document.createElement('div');proxyIconEl.appendChild(proxyIconInnerEl);if(data[i].proxy){proxyIconEl.classList.add('icon-true')
;proxyIconInnerEl.classList.add('icon-inner-true')}else{proxyIconEl.classList.add('icon-false');proxyIconInnerEl.classList.add('icon-inner-false')}td24El.appendChild(proxyIconEl)
;rowEl.appendChild(td24El);const td25El=document.createElement('td');if(null===data[i].password)td25El.textContent='(hidden)';else td25El.textContent='(blank)';rowEl.appendChild(td25El)
;const td26El=document.createElement('td');td26El.textContent=data[i].saslUsername;rowEl.appendChild(td26El);const td27El=document.createElement('td')
;if(null===data[i].saslPassword)td27El.textContent='(hidden)';else td27El.textContent='(blank)';rowEl.appendChild(td27El)}const td30El=document.createElement('td');td30El.textContent=data[i].nick
;rowEl.appendChild(td30El);if(full){const td31El=document.createElement('td');td31El.textContent=data[i].altNick;rowEl.appendChild(td31El);const td32El=document.createElement('td')
;const recoverNickIconEl=document.createElement('div');const recoverNickIconInnerEl=document.createElement('div');recoverNickIconEl.appendChild(recoverNickIconInnerEl);if(data[i].recoverNick){
recoverNickIconEl.classList.add('icon-true');recoverNickIconInnerEl.classList.add('icon-inner-true')}else{recoverNickIconEl.classList.add('icon-false')
;recoverNickIconInnerEl.classList.add('icon-inner-false')}td32El.appendChild(recoverNickIconEl);rowEl.appendChild(td32El);const td33El=document.createElement('td');td33El.textContent=data[i].user
;rowEl.appendChild(td33El);const td34El=document.createElement('td');td34El.textContent=data[i].real;rowEl.appendChild(td34El);const td35El=document.createElement('td')
;td35El.textContent=data[i].modes;rowEl.appendChild(td35El);const td40El=document.createElement('td');data[i].channelList.split(',').forEach(channel=>{const chanDiv=document.createElement('div')
;chanDiv.textContent=channel;td40El.appendChild(chanDiv)});rowEl.appendChild(td40El);const td50El=document.createElement('td');td50El.textContent=data[i].identifyNick;rowEl.appendChild(td50El)
;const td51El=document.createElement('td');if(null===data[i].identifyCommand)td51El.textContent='(hidden)';else td51El.textContent='(blank)';rowEl.appendChild(td51El)
;const td60El=document.createElement('td');const reconnectIconEl=document.createElement('div');const reconnectIconInnerEl=document.createElement('div')
;reconnectIconEl.appendChild(reconnectIconInnerEl);if(data[i].reconnect){reconnectIconEl.classList.add('icon-true');reconnectIconInnerEl.classList.add('icon-inner-true')}else{
reconnectIconEl.classList.add('icon-false');reconnectIconInnerEl.classList.add('icon-inner-false')}td60El.appendChild(reconnectIconEl);rowEl.appendChild(td60El)
;const td61El=document.createElement('td');const loggingIconEl=document.createElement('div');const loggingIconInnerEl=document.createElement('div');loggingIconEl.appendChild(loggingIconInnerEl)
;if(data[i].logging){loggingIconEl.classList.add('icon-true');loggingIconInnerEl.classList.add('icon-inner-true')}else{loggingIconEl.classList.add('icon-false')
;loggingIconInnerEl.classList.add('icon-inner-false')}td61El.appendChild(loggingIconEl);rowEl.appendChild(td61El)}if(editable){const td70El=document.createElement('td')
;const editButtonEl=document.createElement('button');editButtonEl.textContent='Edit';td70El.appendChild(editButtonEl);rowEl.appendChild(td70El);const td71El=document.createElement('td')
;const copyButtonEl=document.createElement('button');copyButtonEl.textContent='Copy';td71El.appendChild(copyButtonEl);rowEl.appendChild(td71El);const td72El=document.createElement('td')
;const deleteButtonEl=document.createElement('button');deleteButtonEl.textContent='Delete';td72El.appendChild(deleteButtonEl);rowEl.appendChild(td72El);const td73El=document.createElement('td')
;const moveUpButtonEl=document.createElement('button');moveUpButtonEl.textContent='move-up';if(i>0)td73El.appendChild(moveUpButtonEl);rowEl.appendChild(td73El)
;disabledCheckboxEl.addEventListener('click',()=>{toggleDisabled(parseInt(rowEl.getAttribute('index')))});editButtonEl.addEventListener('click',()=>{
openIrcServerEdit(parseInt(rowEl.getAttribute('index')))});copyButtonEl.addEventListener('click',()=>{copyIrcServerToNew(parseInt(rowEl.getAttribute('index')))})
;deleteButtonEl.addEventListener('click',()=>{deleteIrcServer(parseInt(rowEl.getAttribute('index')))});if(i>0)moveUpButtonEl.addEventListener('click',()=>{
moveUpInList(parseInt(rowEl.getAttribute('index')))})}tableNode.appendChild(rowEl)}resolve(null)});const checkForApiError=data=>new Promise((resolve,reject)=>{
if('success'===data.status)resolve(null);else reject(new Error('PATCH API did not return success status flag'))});const setDivVisibility=data=>{
document.getElementById('listVisibilityDiv').removeAttribute('hidden','');document.getElementById('formVisibilityDiv').setAttribute('hidden','')
;document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','');document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','');if(data.ircConnected||data.ircConnecting){
document.getElementById('createNewButton').setAttribute('hidden','');document.getElementById('warningVisibilityDiv').removeAttribute('hidden');editable=false}else{
document.getElementById('createNewButton').removeAttribute('hidden');document.getElementById('warningVisibilityDiv').setAttribute('hidden','');editable=true}
if(data.enableSocks5Proxy)document.getElementById('ircProxyDiv').textContent='Socks5 Proxy: Enabled Globally\nSocks5 Proxy: '+data.socks5Host+':'+data.socks5Port;else document.getElementById('ircProxyDiv').textContent='Socks5 Proxy: Disabled Globally'
;return Promise.resolve(null)};document.getElementById('groupInfoButton').addEventListener('click',()=>{
if(document.getElementById('groupInfoHiddenDiv').hasAttribute('hidden'))document.getElementById('groupInfoHiddenDiv').removeAttribute('hidden');else document.getElementById('groupInfoHiddenDiv').setAttribute('hidden','')
});document.getElementById('replacePasswordButton').addEventListener('click',()=>{document.getElementById('passwordInputId').removeAttribute('disabled')
;document.getElementById('passwordInputId').value='';document.getElementById('replacePasswordButton').setAttribute('hidden','')
;document.getElementById('serverPasswordWarningDiv').removeAttribute('hidden')});document.getElementById('replaceSaslPasswordButton').addEventListener('click',()=>{
document.getElementById('saslPasswordInputId').removeAttribute('disabled');document.getElementById('saslPasswordInputId').value=''
;document.getElementById('replaceSaslPasswordButton').setAttribute('hidden','');document.getElementById('serverSaslPasswordWarningDiv').removeAttribute('hidden')})
;document.getElementById('replaceIdentifyCommandButton').addEventListener('click',()=>{document.getElementById('identifyCommandInputId').removeAttribute('disabled')
;document.getElementById('identifyCommandInputId').value='';document.getElementById('replaceIdentifyCommandButton').setAttribute('hidden','')
;document.getElementById('nickservCommandWarningDiv').removeAttribute('hidden')});document.getElementById('createNewButton').addEventListener('click',()=>{_clearError()
;fetchServerList(0,1).then(()=>fetchServerList(0,0)).then(()=>clearIrcServerForm()).then(()=>{document.getElementById('listVisibilityDiv').setAttribute('hidden','')
;document.getElementById('formVisibilityDiv').removeAttribute('hidden');document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','')
;document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','')}).catch(err=>{_showError(err.toString()||err);console.log(err)})})
;document.getElementById('saveNewButton').addEventListener('click',()=>{_clearError()
;parseFormInputValues().then(data=>submitServer(data.data,'POST',-1)).then(data=>checkForApiError(data)).then(()=>fetchIrcState()).then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{
_showError(err.toString()||err);console.log(err)})});document.getElementById('saveModifiedButton').addEventListener('click',()=>{_clearError()
;parseFormInputValues().then(data=>submitServer(data.data,'PATCH',data.index)).then(data=>checkForApiError(data)).then(()=>fetchIrcState()).then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{
_showError(err.toString()||err);console.log(err)})});document.getElementById('cancelEditButton').addEventListener('click',()=>{_clearError()
;fetchIrcState().then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).then(()=>fetchServerList(0,0)).catch(err=>{_showError(err.toString()||err)
;console.log(err)})});document.getElementById('forceUnlockAll').addEventListener('click',()=>{_clearError();clearIrcServerForm().then(()=>fetchServerList(0,0)).catch(err=>{
_showError(err.toString()||err);console.log(err)})});document.getElementById('refreshButton').addEventListener('click',()=>{_clearError()
;fetchIrcState().then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{_showError(err.toString()||err);console.log(err)})})
;document.getElementById('fullButton').addEventListener('click',()=>{_clearError();if(full){full=false;document.getElementById('fullButton').textContent='Show All Columns'}else{full=true
;document.getElementById('fullButton').textContent='Hide Columns'}
fetchIrcState().then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{_showError(err.toString()||err);console.log(err)})})
;_clearError();fetchIrcState().then(data=>setDivVisibility(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{if(err.status&&405===err.status){
document.getElementById('serverListDisabledDiv').removeAttribute('hidden');document.getElementById('warningVisibilityDiv').setAttribute('hidden','')
;document.getElementById('listVisibilityDiv').setAttribute('hidden','');document.getElementById('formVisibilityDiv').setAttribute('hidden','')
;document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','');document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','')}else{_showError(err.toString()||err)
;console.log(err)}});