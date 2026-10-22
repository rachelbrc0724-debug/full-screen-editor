import './style.css';
import { open, save } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
const editor=document.querySelector('#editor'), status=document.querySelector('#status');
const size=document.querySelector('#size'),color=document.querySelector('#color'),bold=document.querySelector('#bold');
let currentPath=null,savedRange=null,dirty=false,composing=false;
const appWindow=getCurrentWindow();
const setStatus=s=>status.textContent=s;
const escapeHtml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function selectionInside(){const sel=window.getSelection();return sel&&sel.rangeCount&&editor.contains(sel.anchorNode)&&editor.contains(sel.focusNode)}
document.addEventListener('selectionchange',()=>{if(selectionInside())savedRange=window.getSelection().getRangeAt(0).cloneRange()});
function recover(){editor.focus();if(savedRange){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(savedRange)}}
function mark(){dirty=true;setStatus('未保存')}
editor.addEventListener('input',()=>{if(!composing)mark()});
editor.addEventListener('compositionstart',()=>{composing=true});
editor.addEventListener('compositionend',()=>{composing=false;mark()});
// For selections, apply styles to the selected span. For a caret, use the browser's native inline typing style.
function styleSelection(property,value){recover();const sel=window.getSelection();if(!sel.rangeCount)return;const range=sel.getRangeAt(0);if(range.collapsed){document.execCommand('styleWithCSS',false,true);document.execCommand(property==='color'?'foreColor':'fontSize',false,property==='color'?value:'3');if(property==='fontSize'){let node=sel.anchorNode?.parentElement;if(node?.tagName==='FONT'){node.removeAttribute('size');node.style.fontSize=value}}}else{const fragment=range.extractContents(),span=document.createElement('span');span.style[property]=value;span.append(fragment);range.insertNode(span);sel.removeAllRanges();const r=document.createRange();r.selectNodeContents(span);sel.addRange(r);savedRange=r.cloneRange()}mark()}
size.addEventListener('change',()=>styleSelection('fontSize',`${Math.max(8,Math.min(96,Number(size.value)||16))}px`));
color.addEventListener('input',()=>styleSelection('color',color.value));
bold.addEventListener('click',()=>{recover();document.execCommand('bold');mark()});
async function openFile(){try{const path=await open({multiple:false,filters:[{name:'文本 / HTML',extensions:['html','htm','txt']}]});if(!path)return;const data=await readTextFile(path);if(/\.html?$/i.test(path)){const doc=new DOMParser().parseFromString(data,'text/html');doc.querySelectorAll('script,iframe,object,embed,style').forEach(n=>n.remove());doc.querySelectorAll('*').forEach(n=>{[...n.attributes].forEach(a=>{if(/^on/i.test(a.name)||/^(href|src)$/i.test(a.name)&&/^javascript:/i.test(a.value))n.removeAttribute(a.name)})});editor.innerHTML=doc.body.innerHTML;}else editor.textContent=data;currentPath=path;dirty=false;setStatus('已打开')}catch(e){setStatus(`打开失败：${e.message}`)}}
async function saveFile(){try{let path=currentPath;if(!path){path=await save({defaultPath:'我的文稿.html',filters:[{name:'富文本 HTML',extensions:['html']},{name:'纯文本',extensions:['txt']}]});if(!path)return}const data=/\.txt$/i.test(path)?editor.innerText:`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>我的文稿</title></head><body>${editor.innerHTML}</body></html>`;await writeTextFile(path,data);currentPath=path;dirty=false;setStatus('已保存')}catch(e){setStatus(`保存失败：${e.message}`)}}
document.querySelector('#open').addEventListener('click',openFile);
document.querySelector('#save').addEventListener('click',saveFile);
document.addEventListener('keydown',e=>{if(e.key==='F11'){e.preventDefault();appWindow.isFullscreen().then(full=>appWindow.setFullscreen(!full)).catch(err=>setStatus('全屏切换失败：'+err.message));return}if(e.key==='Escape'){appWindow.isFullscreen().then(full=>{if(full)appWindow.setFullscreen(false)});return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveFile()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){e.preventDefault();openFile()}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
