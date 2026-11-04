// Optional real-browser integration test; requires Chromium and ChromeDriver.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname,'..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'qnx-browser-'));
const children = [], browsers = [];
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function wait(check, label) {
  for(let i=0;i<150;i++) { const result = await check(); if(result) return result; await pause(100); }
  throw new Error('Timed out: '+label);
}
async function launch(command,args,pattern,options={}) {
  const child=spawn(command,args,{...options,stdio:['ignore','pipe','pipe']}); children.push(child);
  let output=''; let error;
  child.on('error',e=>error=e);
  for(const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>output+=chunk);
  const match=await wait(()=>{if(error)throw error;if(child.exitCode!==null)throw new Error(output);return output.match(pattern)},'start '+command);
  return {child,port:match[1]};
}
async function browser() {
  const driver=await launch(process.env.CHROMEDRIVER || 'chromedriver',['--port=0','--allowed-ips=127.0.0.1'],/started successfully on port (\d+)/);
  const base='http://127.0.0.1:'+driver.port;
  async function command(route,method='POST',body={}) {
    const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    const result=await response.json();if(!response.ok||result.value?.error)throw new Error(JSON.stringify(result));return result.value;
  }
  const session=await command('/session','POST',{capabilities:{alwaysMatch:{browserName:'chrome','goog:chromeOptions':{binary:process.env.CHROMIUM || '/usr/bin/chromium',args:['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking']}}}});
  const prefix='/session/'+session.sessionId;
  const result={
    go:url=>command(prefix+'/url','POST',{url}),
    run:(script,...args)=>command(prefix+'/execute/sync','POST',{script,args}),
    cdp:(cmd,params)=>command(prefix+'/goog/cdp/execute','POST',{cmd,params}),
    close:()=>command(prefix,'DELETE')
  };
  browsers.push(result); return result;
}
async function fill(browser,fields,form) {
  await browser.run('for(const [id,value] of Object.entries(arguments[0])) document.getElementById(id).value=value; document.getElementById(arguments[1]).requestSubmit();',fields,form);
}
(async()=>{
  let staticServer;
  try {
    for(const folder of ['public','config','scripts','database'])fs.cpSync(path.join(root,folder),path.join(dir,folder),{recursive:true});
    fs.copyFileSync(path.join(root, 'package.json'), path.join(dir, 'package.json'));
  fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
    const app=await launch(process.execPath,['public/js/server.js'],/http:\/\/localhost:(\d+)/,{cwd:dir,env:{...process.env,DB_PATH:'data/browser.db',JWT_SECRET:require('node:crypto').randomBytes(48).toString('hex'),SERVER_PORT:'0',SERVER_HOST:'127.0.0.1'}});
    const base='http://127.0.0.1:'+app.port;
    const db=await open({filename:path.join(dir,'data/browser.db'),driver:sqlite3.Database});
    await db.run('INSERT INTO Usuarios(nombre,email,password,rol) VALUES(?,?,?,?)',['Browser admin','browser-admin@example.org',await bcrypt.hash('Browser-password-987!',10),'admin']);await db.close();
    const admin=await browser(), visitor=await browser();
    await admin.go(base+'/pages/login.html');
    await fill(admin,{email:'browser-admin@example.org',password:'Browser-password-987!'},'loginForm');
    await wait(()=>admin.run('return location.pathname.endsWith("catalogo.html") && document.querySelectorAll("#tablaLibros tbody tr").length>1 && isAdmin();'),'admin UI login');
    const title='<img src=x onerror="window.qnxXss=1"> Shared browser book';
    await fill(admin,{fTitulo:title,fAutor:'Browser author',fStock:'2'},'formLibro');
    await wait(()=>admin.run('return document.getElementById("toastBox")?.textContent.includes("Libro creado");'),'UI save confirmation');
    await admin.run('document.getElementById("filtroCatalogo").value="Shared browser book";document.getElementById("filtroCatalogo").dispatchEvent(new Event("input"));');
    const id=await wait(()=>admin.run('return librosCache.find(book=>book.titulo===arguments[0])?.id;',title),'UI book creation');
    await admin.run('document.querySelector("#tablaLibros tbody button[data-action=edit]").click();');
    await fill(admin,{fAutor:'Edited browser author'},'formLibro');
    await wait(()=>admin.run('return librosCache.find(book=>book.id===arguments[0])?.autor==="Edited browser author";',id),'UI book edit');
    await visitor.go(base+'/pages/registro.html');
    await fill(visitor,{nombre:'Browser visitor',email:'browser-visitor@example.org',password:'Browser-visitor-password-987!'},'registroForm');
    await wait(()=>visitor.run('return location.pathname.endsWith("catalogo.html") && !!getUser();'),'visitor UI registration');
    await visitor.run('document.getElementById("filtroCatalogo").value="Shared browser book";document.getElementById("filtroCatalogo").dispatchEvent(new Event("input"));');
    await wait(()=>visitor.run('return document.querySelector("#tablaLibros tbody")?.textContent.includes("Shared browser book");'),'shared book rendering');
    assert.equal(await visitor.run('return window.qnxXss || 0;'),0);
    await visitor.run('const script=document.createElement("script");script.textContent="window.qnxInlineRan=1";document.body.appendChild(script);const button=document.createElement("button");button.setAttribute("onclick","window.qnxInlineEventRan=1");document.body.appendChild(button);button.click();');
    assert.equal(await visitor.run('return window.qnxInlineRan || 0;'),0);
    assert.equal(await visitor.run('return window.qnxInlineEventRan || 0;'),0);
    await visitor.go(base+'/pages/libro.html?id='+id);
    await wait(()=>visitor.run('return document.querySelector("#detalleBox h1")?.textContent===arguments[0];',title),'safe detail rendering');
    assert.equal(await visitor.run('return window.qnxXss || 0;'),0);
    await visitor.go(base+'/pages/catalogo.html');
    await visitor.run('document.getElementById("filtroCatalogo").value="Shared browser book";document.getElementById("filtroCatalogo").dispatchEvent(new Event("input"));');
    await wait(()=>visitor.run('return document.querySelector("#tablaLibros tbody")?.textContent.includes("Shared browser book");'),'catalogue after detail');

    assert.equal(await visitor.run('return document.querySelector("#tablaLibros tbody img") !== null;'),false);
    await visitor.run('document.querySelector("#tablaLibros tbody button").click();');
    await wait(()=>admin.run('return QNX.book(arguments[0]).then(book=>book.stock===1);',id),'shared stock decrease');
    await visitor.go(base+'/pages/prestamos.html');
    await wait(()=>visitor.run('return document.querySelector("#prestamosBox tbody button") !== null;'),'loan UI rendering');
    await visitor.run('window.confirm=()=>true;document.querySelector("#prestamosBox tbody button").click();');
    await wait(()=>admin.run('return QNX.book(arguments[0]).then(book=>book.stock===2);',id),'shared stock return');

    await admin.run('document.querySelector("#tablaLibros tbody button[data-action=archive]").click();');
    await wait(()=>admin.run('return getComputedStyle(document.getElementById("modalBackdrop")).display!=="none";'),'archive modal visible');
    await admin.run('document.getElementById("modalConfirmBtn").click();');
    await wait(()=>admin.run('return document.getElementById("toastBox")?.textContent.includes("Libro archivado");'),'archive completed');
    await visitor.go(base+'/pages/prestamos.html');
    await wait(()=>visitor.run('return document.querySelector("#prestamosBox tbody")?.textContent.includes("Shared browser book");'),'archived book history preserved');
    assert.equal(await visitor.run('return document.querySelector("#prestamosBox tbody a")!==null;'),false);

    await visitor.cdp('Emulation.setTimezoneOverride',{timezoneId:'America/Santiago'});
    assert.equal(await visitor.run('return calendarDate("2026-11-03")===new Date(2026,10,3,12).toLocaleDateString();'),true);
    assert.equal(await visitor.run('return utcDate("2026-11-03 00:00:00")===new Date("2026-11-03T00:00:00Z").toLocaleDateString();'),true);
    await admin.run('return (async()=>{for(let i=0;i<9;i++)await QNX.saveBook(null,{titulo:"Pagination lifecycle "+i,autor:"QA",stock:1,genero:"Pagination QA"});document.getElementById("filtroCatalogo").value="Pagination lifecycle";estado.search="Pagination lifecycle";estado.page=2;await cargar();})();');
    assert.equal(await admin.run('return estado.page===2 && librosCache.length===1;'),true);
    await admin.run('document.querySelector("#tablaLibros tbody button[data-action=archive]").click();document.getElementById("modalConfirmBtn").click();');
    await wait(()=>admin.run('return estado.page===1 && librosCache.length===8;'),'last-page archive clamps pagination');
    await admin.run('return (async()=>{await QNX.saveBook(null,{titulo:"Genre lifecycle",autor:"QA",stock:1,genero:"Only remaining genre"});await cargarGeneros();estado.search="Genre lifecycle";estado.genero="Only remaining genre";document.getElementById("filtroGenero").value=estado.genero;await cargar();})();');
    await admin.run('document.querySelector("#tablaLibros tbody button[data-action=archive]").click();document.getElementById("modalConfirmBtn").click();');
    await wait(()=>admin.run('return estado.genero==="" && document.getElementById("filtroGenero").value==="";'),'removed genre resets filter');
    // Forging localStorage must not expose the admin form after reload.
    await visitor.run('localStorage.setItem("qnx_user",JSON.stringify({rol:"admin",id:1}));');
    await visitor.go(base+'/pages/catalogo.html');
    await wait(()=>visitor.run('return !!getUser();'),'verified visitor session');
    assert.equal(await visitor.run('return isAdmin();'),false);
    assert.equal(await visitor.run('return getComputedStyle(document.getElementById("formLibro").closest("section")).display;'),'none');
    // Exercise the actual static files on another origin.
    const express=require('express');staticServer=express().use(express.static(path.join(dir,'public'))).listen(0,'127.0.0.1');await once(staticServer,'listening');
    const staticBase='http://127.0.0.1:'+staticServer.address().port;
    await visitor.go(staticBase+'/pages/catalogo.html');
    await wait(()=>visitor.run('return typeof QNX!=="undefined" && QNX.mode==="static" && document.querySelectorAll("#tablaLibros tbody tr").length>1;'),'static catalogue');
    await visitor.run('const data=JSON.parse(localStorage.getItem("qnx_db"));data.libros[0].titulo="Preserved legacy title";data.usuarios=[{id:9,password_hash:"changed"}];data.prestamos=[{id:7}];delete data.schemaVersion;localStorage.setItem("qnx_db",JSON.stringify(data));localStorage.setItem("qnx_user",JSON.stringify({rol:"admin"}));');
    await visitor.go(staticBase+'/pages/catalogo.html');
    await wait(()=>visitor.run('return document.querySelector("#tablaLibros tbody")?.textContent.includes("Preserved legacy title");'),'legacy data preservation');
    assert.equal(await visitor.run('return isAdmin();'),false);
    assert.equal(await visitor.run('return JSON.parse(localStorage.getItem("qnx_db")).prestamos.length;'),1);
    assert.equal(await visitor.run('return [...document.querySelectorAll("#tablaLibros tbody button")].every(button=>button.disabled);'),true);
    await visitor.go(staticBase+'/pages/login.html');
    await wait(()=>visitor.run('return document.querySelector("#loginForm button").disabled;'),'static login disabled');
    console.log('Browser smoke passed: login, registration, book creation/edit/archive, retained history, shared loan/return, CSP and XSS, forged roles, static read-only, legacy preservation, calendar dates, pagination and genre refresh.');
  } finally {
    for(const browser of browsers)await browser.close().catch(()=>{});
    for(const child of children)if(child.exitCode===null&&child.signalCode===null){const done=once(child,'exit');child.kill();await done;}
    if(staticServer)await new Promise(resolve=>staticServer.close(resolve));
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1});
