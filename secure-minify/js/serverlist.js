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

const _clearError=()=>{const errorDivEl=document.getElementById('errorDiv');errorDivEl.setAttribute('hidden','');while(errorDivEl.firstChild)errorDivEl.removeChild(errorDivEl.firstChild)
;document.getElementById('showRefreshButtonDiv').setAttribute('hidden','')};const _showError=errorString=>{const errorDivEl=document.getElementById('errorDiv');errorDivEl.removeAttribute('hidden')
;const errorMessageEl=document.createElement('div');errorMessageEl.textContent=errorString||'Error: unknown error (4712)';errorDivEl.appendChild(errorMessageEl)
;document.getElementById('showRefreshButtonDiv').removeAttribute('hidden');window.scrollTo(0,document.querySelector('body').scrollHeight)};const fetchIrcState=()=>{
const fetchURL=encodeURI('/irc/getircstate');const fetchOptions={method:'GET',credentials:'include',headers:{Accept:'application/json'}};return fetch(fetchURL,fetchOptions).then(response=>{
if(response.ok)return response.json();else throw new Error('Fetch status '+response.status+' '+response.statusText+' '+fetchURL)})};const fetchServerList=(index,lock)=>{let urlStr='/irc/serverlist'
;if(index>=0){urlStr+='?index='+index.toString();if(lock>=0)urlStr+='&lock='+lock.toString()}const fetchURL=encodeURI(urlStr);const fetchOptions={method:'GET',credentials:'include',headers:{
Accept:'application/json'}};return fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else if(409===response.status){
const err=new Error('IRC Connected or Database Locked');err.status=409;throw err}else if(405===response.status){const err=new Error('Server List Editor Disabled');err.status=405;throw err
}else throw new Error('Fetch status '+response.status+' '+response.statusText+' '+fetchURL)})};const submitServer=(body,method,index)=>{
const csrfToken=document.querySelector('meta[name="csrf-token"]').getAttribute('content');let baseUrl='/irc/serverlist';if(-1!==index)baseUrl+='?index='+index.toString()
;const fetchURL=encodeURI(baseUrl);const fetchOptions={method:method,credentials:'include',headers:{'CSRF-Token':csrfToken,Accept:'application/json','Content-Type':'application/json'},
body:JSON.stringify(body)};return fetch(fetchURL,fetchOptions).then(response=>{if(response.ok)return response.json();else if(409===response.status){
const err=new Error('IRC Connected or Database Locked');err.status=409;throw err}else if(422===response.status){const err=new Error('Unprocessable Entity');err.status=422;throw err
}else throw new Error('Fetch status '+response.status+' '+response.statusText+' '+fetchURL)})};const clearIrcServerForm=()=>new Promise((resolve,reject)=>{
document.getElementById('saveNewButton').removeAttribute('hidden');document.getElementById('saveModifiedButton').setAttribute('hidden','');document.getElementById('indexInputId').value='-1'
;document.getElementById('disabledCheckboxId').checked=false;document.getElementById('nameInputId').value='';document.getElementById('hostInputId').value=''
;document.getElementById('portInputId').value=6697;document.getElementById('tlsCheckboxId').checked=true;document.getElementById('verifyCheckboxId').checked=true
;document.getElementById('proxyCheckboxId').checked=true;document.getElementById('autoReconnectCheckboxId').checked=false;document.getElementById('loggingCheckboxId').checked=false
;document.getElementById('passwordInputId').setAttribute('disabled','');document.getElementById('passwordInputId').value='(Hidden)';document.getElementById('identifyNickInputId').value=''
;document.getElementById('identifyCommandInputId').setAttribute('disabled','');document.getElementById('identifyCommandInputId').value='(Hidden)';document.getElementById('nickInputId').value=''
;document.getElementById('altNickInputId').value='';document.getElementById('recoverNickCheckboxId').checked=false;document.getElementById('userInputId').value=''
;document.getElementById('realInputId').value='';document.getElementById('modesInputId').value='';document.getElementById('channelListInputId').value='';resolve(null)})
;const populateIrcServerForm=data=>new Promise((resolve,reject)=>{clearIrcServerForm();document.getElementById('saveNewButton').setAttribute('hidden','')
;document.getElementById('saveModifiedButton').removeAttribute('hidden');document.getElementById('serverListDisabledDiv').setAttribute('hidden','')
;document.getElementById('warningVisibilityDiv').setAttribute('hidden','');document.getElementById('listVisibilityDiv').setAttribute('hidden','')
;document.getElementById('formVisibilityDiv').removeAttribute('hidden');document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','')
;document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','');document.getElementById('indexInputId').value=data.index.toString()
;if(data.disabled)document.getElementById('disabledCheckboxId').checked=true;else document.getElementById('disabledCheckboxId').checked=false;document.getElementById('nameInputId').value=data.name
;document.getElementById('hostInputId').value=data.host;document.getElementById('portInputId').value=parseInt(data.port)
;if(data.tls)document.getElementById('tlsCheckboxId').checked=true;else document.getElementById('tlsCheckboxId').checked=false
;if(data.verify)document.getElementById('verifyCheckboxId').checked=true;else document.getElementById('verifyCheckboxId').checked=false
;if(data.proxy)document.getElementById('proxyCheckboxId').checked=true;else document.getElementById('proxyCheckboxId').checked=false
;if(data.reconnect)document.getElementById('autoReconnectCheckboxId').checked=true;else document.getElementById('autoReconnectCheckboxId').checked=false
;if(data.logging)document.getElementById('loggingCheckboxId').checked=true;else document.getElementById('loggingCheckboxId').checked=false
;document.getElementById('passwordInputId').setAttribute('disabled','');document.getElementById('passwordInputId').value='(hidden)'
;document.getElementById('identifyNickInputId').value=data.identifyNick;document.getElementById('identifyCommandInputId').setAttribute('disabled','')
;document.getElementById('identifyCommandInputId').value='(hidden)';document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','')
;document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','');document.getElementById('nickInputId').value=data.nick;document.getElementById('altNickInputId').value=data.altNick
;if(0===data.altNick.length)document.getElementById('recoverNickCheckboxId').checked=false;else if(data.recoverNick)document.getElementById('recoverNickCheckboxId').checked=true;else document.getElementById('recoverNickCheckboxId').checked=false
;document.getElementById('userInputId').value=data.user;document.getElementById('realInputId').value=data.real;document.getElementById('modesInputId').value=data.modes
;document.getElementById('channelListInputId').value=data.channelList;resolve(null)});const openIrcServerEdit=index=>{_clearError()
;clearIrcServerForm().then(()=>fetchServerList(index,1)).then(data=>populateIrcServerForm(data)).catch(err=>{_showError(err.toString()||err);console.log(err)})};const copyIrcServerToNew=index=>{
_clearError();submitServer({index:index,action:'duplicate'},'COPY',index).then(data=>checkErrorAndCloseEdit(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{
_showError(err.toString()||err);console.log(err)})};const deleteIrcServer=index=>{_clearError();submitServer({index:index
},'DELETE',index).then(data=>checkErrorAndCloseEdit(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{_showError(err.toString()||err);console.log(err)})}
;const moveUpInList=index=>{_clearError();submitServer({index:index,action:'move-up'
},'COPY',index).then(data=>checkErrorAndCloseEdit(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{_showError(err.toString()||err);console.log(err)})}
;const parseFormInputValues=()=>new Promise((resolve,reject)=>{const index=parseInt(document.getElementById('indexInputId').value);const data={}
;if(-1!==index)data.index=parseInt(document.getElementById('indexInputId').value);if(document.getElementById('disabledCheckboxId').checked)data.disabled=true;else data.disabled=false
;data.name=document.getElementById('nameInputId').value;data.host=document.getElementById('hostInputId').value;data.port=parseInt(document.getElementById('portInputId').value)
;if(document.getElementById('tlsCheckboxId').checked)data.tls=true;else data.tls=false;if(document.getElementById('verifyCheckboxId').checked)data.verify=true;else data.verify=false
;if(document.getElementById('proxyCheckboxId').checked)data.proxy=true;else data.proxy=false;if(document.getElementById('autoReconnectCheckboxId').checked)data.reconnect=true;else data.reconnect=false
;if(document.getElementById('loggingCheckboxId').checked)data.logging=true;else data.logging=false
;if(!document.getElementById('passwordInputId').hasAttribute('disabled'))data.password=document.getElementById('passwordInputId').value
;data.identifyNick=document.getElementById('identifyNickInputId').value
;if(!document.getElementById('identifyCommandInputId').hasAttribute('disabled'))data.identifyCommand=document.getElementById('identifyCommandInputId').value
;data.nick=document.getElementById('nickInputId').value;data.altNick=document.getElementById('altNickInputId').value
;if(0===data.altNick.length)data.recoverNick=false;else if(document.getElementById('recoverNickCheckboxId').checked)data.recoverNick=true;else data.recoverNick=false
;data.user=document.getElementById('userInputId').value;data.real=document.getElementById('realInputId').value;data.modes=document.getElementById('modesInputId').value
;data.channelList=document.getElementById('channelListInputId').value;let errorStr=null;if(''===data.name)errorStr='Label is required input.';if(''===data.host)errorStr='Host/IP is required input.'
;if(isNaN(data.port))errorStr='Invalid port number';if(''===data.nick)errorStr='Nickname is required input.';if(''===data.user)errorStr='Unix ident user is required input.'
;if(''===data.real)errorStr='Real Name is required input.';if(errorStr)reject(new Error(errorStr));else resolve({data:data,index:index})})
;const buildServerListTable=data=>new Promise((resolve,reject)=>{const tableNode=document.getElementById('tbodyId');while(tableNode.firstChild)tableNode.removeChild(tableNode.firstChild)
;const columnTitles=['Index','Disabled','Label','Host','Port','Nick','','','',''];const titleRowEl=document.createElement('tr');columnTitles.forEach(titleName=>{const tdEl=document.createElement('td')
;tdEl.textContent=titleName;titleRowEl.appendChild(tdEl)});tableNode.appendChild(titleRowEl);if(Array.isArray(data)&&data.length>0)for(let i=0;i<data.length;i++){
const rowEl=document.createElement('tr');rowEl.setAttribute('index',i.toString());const td01El=document.createElement('td');const td02El=document.createElement('td')
;const td03El=document.createElement('td');const td04El=document.createElement('td');const td05El=document.createElement('td');const td06El=document.createElement('td')
;const td07El=document.createElement('td');const td08El=document.createElement('td');const td09El=document.createElement('td');const td10El=document.createElement('td')
;const disabledCheckboxEl=document.createElement('input');disabledCheckboxEl.setAttribute('type','checkbox');disabledCheckboxEl.setAttribute('disabled','')
;const editButtonEl=document.createElement('button');const copyButtonEl=document.createElement('button');const deleteButtonEl=document.createElement('button')
;const moveUpButtonEl=document.createElement('button');editButtonEl.textContent='Edit';copyButtonEl.textContent='Copy';deleteButtonEl.textContent='Delete';moveUpButtonEl.textContent='move-up'
;td01El.textContent=i.toString();disabledCheckboxEl.checked=data[i].disabled;td02El.appendChild(disabledCheckboxEl);td03El.textContent=data[i].name;td04El.textContent=data[i].host
;td05El.textContent=data[i].port;td06El.textContent=data[i].nick;td07El.appendChild(editButtonEl);td08El.appendChild(copyButtonEl);td09El.appendChild(deleteButtonEl)
;if(i>0)td10El.appendChild(moveUpButtonEl);rowEl.appendChild(td01El);rowEl.appendChild(td02El);rowEl.appendChild(td03El);rowEl.appendChild(td04El);rowEl.appendChild(td05El);rowEl.appendChild(td06El)
;rowEl.appendChild(td07El);rowEl.appendChild(td08El);rowEl.appendChild(td09El);rowEl.appendChild(td10El);tableNode.appendChild(rowEl);editButtonEl.addEventListener('click',()=>{
openIrcServerEdit(parseInt(rowEl.getAttribute('index')))});copyButtonEl.addEventListener('click',()=>{copyIrcServerToNew(parseInt(rowEl.getAttribute('index')))})
;deleteButtonEl.addEventListener('click',()=>{deleteIrcServer(parseInt(rowEl.getAttribute('index')))});if(i>0)moveUpButtonEl.addEventListener('click',()=>{
moveUpInList(parseInt(rowEl.getAttribute('index')))})}resolve(null)});const checkErrorAndCloseEdit=data=>new Promise((resolve,reject)=>{if('success'===data.status){
document.getElementById('serverListDisabledDiv').setAttribute('hidden','');document.getElementById('warningVisibilityDiv').setAttribute('hidden','')
;document.getElementById('listVisibilityDiv').removeAttribute('hidden');document.getElementById('formVisibilityDiv').setAttribute('hidden','');resolve(null)
}else reject(new Error('PATCH API did not return success status flag'))});document.getElementById('replacePasswordButton').addEventListener('click',()=>{
document.getElementById('passwordInputId').removeAttribute('disabled');document.getElementById('passwordInputId').value='';document.getElementById('serverPasswordWarningDiv').removeAttribute('hidden')
});document.getElementById('replaceIdentifyCommandButton').addEventListener('click',()=>{document.getElementById('identifyCommandInputId').removeAttribute('disabled')
;document.getElementById('identifyCommandInputId').value='';document.getElementById('nickservCommandWarningDiv').removeAttribute('hidden')})
;document.getElementById('createNewButton').addEventListener('click',()=>{_clearError();fetchServerList(0,1).then(()=>fetchServerList(0,0)).then(()=>clearIrcServerForm()).then(()=>{
document.getElementById('serverListDisabledDiv').setAttribute('hidden','');document.getElementById('warningVisibilityDiv').setAttribute('hidden','')
;document.getElementById('listVisibilityDiv').setAttribute('hidden','');document.getElementById('formVisibilityDiv').removeAttribute('hidden')
;document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','');document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','')}).catch(err=>{
_showError(err.toString()||err);console.log(err)})});document.getElementById('saveNewButton').addEventListener('click',()=>{_clearError()
;parseFormInputValues().then(data=>submitServer(data.data,'POST',-1)).then(data=>checkErrorAndCloseEdit(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{
_showError(err.toString()||err);console.log(err)})});document.getElementById('saveModifiedButton').addEventListener('click',()=>{_clearError()
;parseFormInputValues().then(data=>submitServer(data.data,'PATCH',data.index)).then(data=>checkErrorAndCloseEdit(data)).then(()=>fetchServerList(-1,-1)).then(data=>buildServerListTable(data)).catch(err=>{
_showError(err.toString()||err);console.log(err)})});document.getElementById('cancelEditButton').addEventListener('click',()=>{_clearError()
;document.getElementById('serverListDisabledDiv').setAttribute('hidden','');document.getElementById('warningVisibilityDiv').setAttribute('hidden','')
;document.getElementById('listVisibilityDiv').removeAttribute('hidden');document.getElementById('formVisibilityDiv').setAttribute('hidden','')
;fetchServerList(0,0).then(()=>fetchServerList(0,0)).catch(err=>{_showError(err.toString()||err);console.log(err)})});document.getElementById('forceUnlockAll').addEventListener('click',()=>{
_clearError();clearIrcServerForm().then(()=>fetchServerList(0,0)).catch(err=>{_showError(err.toString()||err);console.log(err)})});_clearError();fetchIrcState().then(data=>{
if(data.ircConnected||data.ircConnecting){document.getElementById('serverListDisabledDiv').setAttribute('hidden','');document.getElementById('warningVisibilityDiv').removeAttribute('hidden')
;document.getElementById('listVisibilityDiv').setAttribute('hidden','');document.getElementById('formVisibilityDiv').setAttribute('hidden','')
;document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','');document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','');Promise.resolve({serverArray:[]})}else{
if(data.enableSocks5Proxy)document.getElementById('ircProxyDiv').textContent='Socks5 Proxy: Enabled Globally\nSocks5 Proxy: '+data.socks5Host+':'+data.socks5Port;else document.getElementById('ircProxyDiv').textContent='Socks5 Proxy: Disabled Globally'
;return fetchServerList(-1,-1)}}).then(data=>buildServerListTable(data)).catch(err=>{if(err.status&&405===err.status){document.getElementById('serverListDisabledDiv').removeAttribute('hidden')
;document.getElementById('warningVisibilityDiv').setAttribute('hidden','');document.getElementById('listVisibilityDiv').setAttribute('hidden','')
;document.getElementById('formVisibilityDiv').setAttribute('hidden','');document.getElementById('serverPasswordWarningDiv').setAttribute('hidden','')
;document.getElementById('nickservCommandWarningDiv').setAttribute('hidden','')}else{_showError(err.toString()||err);console.log(err)}});