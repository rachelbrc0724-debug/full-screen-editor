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

editor.addEventListener('paste', (e) => {
  e.preventDefault();

  const text = e.clipboardData?.getData('text/plain');
  if (text == null) return;

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);

  if (!editor.contains(range.commonAncestorContainer)) return;

  // 删除当前选中的文字
  range.deleteContents();

  // 使用工具栏当前的字号和颜色
  const px = Math.max(8, Math.min(96, Number(size.value) || 16));
  const span = document.createElement('span');

  span.style.fontSize = `${px}px`;
  span.style.color = color.value;
  span.style.fontWeight = 'normal';
  span.style.fontStyle = 'normal';
  span.style.textDecoration = 'none';
  span.style.backgroundColor = 'transparent';
  span.style.whiteSpace = 'pre-wrap';

  span.textContent = text;
  range.insertNode(span);

  // 将光标移动到粘贴内容末尾
  const nextRange = document.createRange();
  nextRange.setStartAfter(span);
  nextRange.collapse(true);

  selection.removeAllRanges();
  selection.addRange(nextRange);
  savedRange = nextRange.cloneRange();

  editor.focus();
  mark();
});
// For selections, apply styles to the selected span. For a caret, use the browser's native inline typing style.

function styleSelection(property, value) {
  const range = savedRange?.cloneRange();
  if (!range || range.collapsed || !editor.contains(range.commonAncestorContainer)) {
    return false;
  }

  // 收集选中范围内的文字节点
  const walker = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT
  );

  const targets = [];
  let node;

  while ((node = walker.nextNode())) {
    if (!node.textContent.length || !range.intersectsNode(node)) {
      continue;
    }

    let start = 0;
    let end = node.length;

    if (node === range.startContainer) {
      start = range.startOffset;
    }

    if (node === range.endContainer) {
      end = range.endOffset;
    }

    if (start < end) {
      targets.push({ node, start, end });
    }
  }

  if (!targets.length) return false;

  const spans = [];

  // 从后往前处理，避免修改节点时影响后续定位
  for (let i = targets.length - 1; i >= 0; i--) {
    const { node, start, end } = targets[i];

    if (end < node.length) {
      node.splitText(end);
    }

    const selectedNode = start > 0
      ? node.splitText(start)
      : node;

    const span = document.createElement('span');
    span.style[property] = value;

    selectedNode.parentNode.insertBefore(span, selectedNode);
    span.appendChild(selectedNode);

    spans.unshift(span);
  }

  // 恢复修改后的文字选区
  const newRange = document.createRange();
  newRange.setStartBefore(spans[0]);
  newRange.setEndAfter(spans[spans.length - 1]);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(newRange);

  savedRange = newRange.cloneRange();
  mark();

  return true;
}
size.addEventListener('change', () => {
  const px = Math.max(8, Math.min(96, Number(size.value) || 16));
  size.value = px;

  // 有选区：只修改选中文字
  if (savedRange && !savedRange.collapsed) {
    if (styleSelection('fontSize', `${px}px`)) {
      return;
    }
  }

  // 没有选区：修改整个编辑区的默认字号
  editor.style.fontSize = `${px}px`;
  mark();
});
color.addEventListener('change', () => {
  if (!styleSelection('color', color.value)) {
    editor.style.color = color.value;
    mark();
  }
});
bold.addEventListener('click',()=>{recover();document.execCommand('bold');mark()});
const alignLeft = document.querySelector('#alignLeft');
const alignCenter = document.querySelector('#alignCenter');
const alignRight = document.querySelector('#alignRight');

function setAlignment(command) {
  recover();
  document.execCommand(command, false, null);
  mark();
}

alignLeft.addEventListener('click', () => setAlignment('justifyLeft'));
alignCenter.addEventListener('click', () => setAlignment('justifyCenter'));
alignRight.addEventListener('click', () => setAlignment('justifyRight'));
async function openFile(){try{const path=await open({multiple:false,filters:[{name:'文本 / HTML',extensions:['html','htm','txt']}]});if(!path)return;const data=await readTextFile(path);if(/\.html?$/i.test(path)){const doc=new DOMParser().parseFromString(data,'text/html');doc.querySelectorAll('script,iframe,object,embed,style').forEach(n=>n.remove());doc.querySelectorAll('*').forEach(n=>{[...n.attributes].forEach(a=>{if(/^on/i.test(a.name)||/^(href|src)$/i.test(a.name)&&/^javascript:/i.test(a.value))n.removeAttribute(a.name)})});editor.innerHTML=doc.body.innerHTML;}else editor.textContent=data;currentPath=path;dirty=false;setStatus('已打开')}catch(e){setStatus(`打开失败：${e.message}`)}}
async function saveFile(){try{let path=currentPath;if(!path){path=await save({defaultPath:'我的文稿.html',filters:[{name:'富文本 HTML',extensions:['html']},{name:'纯文本',extensions:['txt']}]});if(!path)return}const data=/\.txt$/i.test(path)?editor.innerText:`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>我的文稿</title></head><body>${editor.innerHTML}</body></html>`;await writeTextFile(path,data);currentPath=path;dirty=false;setStatus('已保存')}catch(e){setStatus(`保存失败：${e.message}`)}}
document.querySelector('#open').addEventListener('click',openFile);
document.querySelector('#save').addEventListener('click',saveFile);
document.addEventListener('keydown',e=>{if(e.key==='F11'){e.preventDefault();appWindow.isFullscreen().then(full=>appWindow.setFullscreen(!full)).catch(err=>setStatus('全屏切换失败：'+err.message));return}if(e.key==='Escape'){appWindow.isFullscreen().then(full=>{if(full)appWindow.setFullscreen(false)});return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveFile()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){e.preventDefault();openFile()}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
