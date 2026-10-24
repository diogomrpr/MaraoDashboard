const { capture: captureScreenshot } = require('./verification-browser');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { applyVisualPreferences } = require('./test-ha-dashboard-accessibility');

async function editorDragChecks(page, panel, { scenario, theme, output, client, config, persist = false, geometryOnly = false }) {
  const baseline = await panel.evaluate(p => ({ source: p._source(), dirty: p._dirty }));
  const stored = (await client.call({ type: 'marao_dashboard/config/get' })).config;
  const fixture = JSON.parse(baseline.source), pageIndex = fixture.pages.findIndex(p => p.path === 'studio');
  assert.ok(pageIndex >= 0);
  const destination = fixture.pages[pageIndex].sections.find(section => section.entities?.some(card => card.id === 'studio-media'));
  assert.ok(destination, 'The realistic Studio fixture must retain its named media destination');
  const destinationCard = destination.entities.find(card => card.id === 'studio-media');
  fixture.pages[pageIndex].sections = [
    { columns: 2, future: [], entities: [
      { id: 'drag-a', entity_id: 'light.marao_dashboard_test_light', name: 'Reading light', variables: { enable_slider: false, future: [] } },
      { id: 'drag-b', entity_id: 'light.marao_dashboard_test_light', name: 'Evening light', variables: { custom_label: 'Independent duplicate' } },
      { id: 'drag-c', template: 'md_title_card', name: 'Studio heading' },
      { id: 'drag-d', page: fixture.landing_page, name: 'Home shortcut' },
    ], cards: [{ type: 'markdown', content: 'Raw stays in section one.' }] },
    { entities: [], future: { empty: [] } },
    { columns: 1, entities: [destinationCard], cards: destination.cards },
  ];
  let session;
  const sourceText = () => panel.evaluate(p => p._source());
  // Setup uses the same Visual/JSON boundary as an administrator's local draft.
  const reset = async () => {
    await panel.evaluate(async (p, { fixture, pageIndex }) => {
      await p._switchTab('json'); p._monaco.setValue(JSON.stringify(fixture, null, 2)); await p._switchTab('visual');
      p._savedSource = p._source(); p._dirty = false; p._updateHeader();
    }, { fixture, pageIndex });
    await require('./editor-rendering-checks').openPage(panel, pageIndex);
    await applyVisualPreferences(page, scenario, theme);
    await panel.locator(`[data-card-list][data-move-page="page:${pageIndex}"]`).first().waitFor({ state: 'visible' });
  };
  const row = (section, index) => panel.locator(`[data-kind="page"][data-room="${pageIndex}:${section}"][data-card-drag="${index}"]`);
  const list = section => panel.locator(`[data-card-list][data-move-page="page:${pageIndex}"][data-move-section="${section}"]`);
  const currentIds = section => panel.evaluate((p, { pageIndex, section }) => p._model.pages[pageIndex].sections[section].entities.map(c => c.id), { pageIndex, section });
  const reveal = async locator => {
    await locator.evaluate(e => (e.closest('.entity-row') || e).scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(80);
    return locator.boundingBox();
  };
  const point = async locator => { const r = await locator.boundingBox(); assert.ok(r); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const touch = async (type, p) => session.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
  const begin = async (section = 0, index = 0, mouse = false) => {
    const handle = row(section,index).locator('[data-card-handle]'); await reveal(handle);
    const p = await point(handle);
    const haptics = await panel.evaluate(p => p.__moveHaptics.length);
    if (mouse) { await page.mouse.move(p.x,p.y); await page.mouse.down(); await page.mouse.move(p.x+10,p.y+10); }
    else { await touch('touchStart',p); await touch('touchMove',{x:p.x+10,y:p.y+10}); }
    assert.equal(await panel.locator('.drag-source').count(),1,'Handle gesture did not activate');
    assert.deepEqual(await panel.evaluate((p,start) => p.__moveHaptics.slice(start),haptics),['heavy'],'Drag activation must emit one strong haptic');
    return p;
  };
  const release = async (p, mouse = false) => {
    const commits = await panel.evaluate(p=>p.__moveCommits);
    if (mouse) { await page.mouse.move(p.x,p.y); await page.mouse.up(); }
    else { await touch('touchMove',p); await touch('touchEnd'); }
    await page.waitForTimeout(80);
    assert.equal(await panel.locator('.card-drop-cue').count(),0,'Insertion marker leaked after release');
    assert.equal(await panel.locator('.drag-source').count(),0,'Source marker leaked after release');
    assert.ok(await panel.evaluate((p,commits)=>p.__moveCommits-commits<=1,commits),'One release committed more than once');
  };
  const clean = async expected => {
    assert.equal(await sourceText(),expected); assert.equal(await panel.evaluate(p=>p._dirty),false);
    assert.equal(await panel.locator('.card-drop-cue,.drag-source').count(),0);
  };
  const dragSnapshot = async locator => locator.evaluate(e => {
    const p = e.getRootNode().host;
    let scroll = p;
    for (; scroll; scroll = scroll.parentElement || scroll.getRootNode()?.host) {
      if (scroll.scrollHeight > scroll.clientHeight && /(auto|scroll)/.test(getComputedStyle(scroll).overflowY)) break;
    }
    scroll ||= document.scrollingElement;
    return { offset: scroll.scrollTop, bounds: e.getBoundingClientRect().toJSON(), source: p._source(), dirty: p._dirty };
  });
  const positionPickup = async (locator, position) => {
    await locator.evaluate((e, position) => {
      const p = e.getRootNode().host;
      let scroll = p;
      for (; scroll; scroll = scroll.parentElement || scroll.getRootNode()?.host) {
        if (scroll.scrollHeight > scroll.clientHeight && /(auto|scroll)/.test(getComputedStyle(scroll).overflowY)) break;
      }
      scroll ||= document.scrollingElement;
      const top = Math.max(0, scroll.getBoundingClientRect().top, p.shadowRoot.querySelector('.editor-header').getBoundingClientRect().bottom);
      const bottom = Math.min(innerHeight, scroll === document.scrollingElement ? innerHeight : scroll.getBoundingClientRect().bottom);
      const desired = position === 'top' ? top + 28 : position === 'partial' ? top + 5 : position === 'bottom' ? bottom - 28 : (top + bottom) / 2;
      const r = e.querySelector('[data-card-handle]').getBoundingClientRect();
      scroll.scrollTop += r.top + r.height / 2 - desired;
    }, position);
    await page.waitForTimeout(100);
    const handle = locator.locator('[data-card-handle]'), p = await point(handle);
    const bounds = await panel.locator('.editor-header').boundingBox();
    assert.ok(p.y > bounds.y + bounds.height && p.y < await page.evaluate(() => innerHeight), 'Pickup handle must be visibly reachable');
    assert.ok((await dragSnapshot(locator)).offset > 0, 'Pickup must use a genuinely scrolled editor');
    return p;
  };
  // No reveal/scroll setup is allowed between this baseline and the final cancellation.
  const stablePickup = async (position, mouse, diagonal = false) => {
    const sourceRow = row(0,2), p = await positionPickup(sourceRow, position), before = await dragSnapshot(sourceRow);
    const haptics = await panel.evaluate(p => p.__moveHaptics.length);
    const stable = async stage => {
      const after = await dragSnapshot(sourceRow), context = `${mouse ? 'mouse' : 'touch'} ${position} ${diagonal ? 'diagonal' : 'horizontal'} ${stage}`;
      assert.ok(Math.abs(after.offset - before.offset) <= .75, `${context}: pickup changed scroll offset (${before.offset} → ${after.offset})`);
      for (const key of ['left','top','width','height']) assert.ok(Math.abs(after.bounds[key] - before.bounds[key]) <= .75, `${context}: source-row ${key} moved`);
      assert.equal(after.source, before.source, `${context}: preview changed source`);
      assert.equal(after.dirty, before.dirty, `${context}: preview changed dirty state`);
    };
    const move = async p => mouse ? page.mouse.move(p.x,p.y) : touch('touchMove',p);
    if (mouse) { await page.mouse.move(p.x,p.y); await page.mouse.down(); } else await touch('touchStart',p);
    try {
      await page.waitForTimeout(100); await stable('press');
      await move({x:p.x+3,y:p.y}); await page.waitForTimeout(80); await stable('subthreshold');
      assert.equal(await panel.evaluate(p => p.__moveHaptics.length),haptics,'Subthreshold pickup emitted drag feedback');
      const y = p.y + (diagonal ? position === 'bottom' ? -10 : 10 : 0);
      await move({x:p.x+10,y}); await page.waitForTimeout(160); await stable('activation and stationary hold');
      assert.equal(await panel.locator('.drag-source').count(),1,'Pickup should still acknowledge drag activation');
      assert.deepEqual(await panel.evaluate((p,start) => p.__moveHaptics.slice(start),haptics),['heavy'],'Pickup activation must emit one strong haptic');
      await move({x:p.x+14,y}); await page.waitForTimeout(80); await stable('horizontal motion');
      if (position !== 'middle') {
        await move({x:p.x+14,y:y+(position === 'bottom' ? -8 : 8)});
        await page.waitForTimeout(160); await stable('inward motion and hold');
      }
      assert.deepEqual(await panel.evaluate(p=>p.__moveWrites),[],'Pickup dispatched save/entity action');
    } finally {
      await page.keyboard.press('Escape');
      if (mouse) await page.mouse.up(); else await touch('touchEnd');
    }
    assert.deepEqual(await panel.evaluate((p,start) => p.__moveHaptics.slice(start),haptics),['heavy'],'Cancelled pickup emitted extra haptic feedback');
    await clean(before.source);
    assert.equal(await sourceRow.locator('[data-card-handle]').evaluate(e => {
      const id=e.getRootNode().host.__movePointer;return e.hasPointerCapture(id);
    }),false,'Cancelled pickup retained pointer capture');
  };
  const armBottom = async () => {
    const x=await list(0).evaluate(l=>l.getBoundingClientRect().left+24), bottom=await page.evaluate(()=>innerHeight);
    await touch('touchMove',{x,y:bottom-56});
    await touch('touchMove',{x,y:bottom-16});
    await page.waitForTimeout(80);
  };
  const liveBounds = async () => {
    const sourceRow=row(0,2), p=await positionPickup(sourceRow,'middle'), viewport=page.viewportSize();
    await touch('touchStart',p);await touch('touchMove',{x:p.x+10,y:p.y});
    const before=await dragSnapshot(sourceRow);
    try {
      await page.setViewportSize({...viewport,height:viewport.height+32});
      await panel.locator('.editor-header').evaluate(e=>{e.__dragTransform=e.style.transform;e.style.transform='translateY(8px)';});
      await page.waitForTimeout(160);
      await touch('touchMove',{x:p.x+14,y:p.y});await page.waitForTimeout(100);
      assert.ok(Math.abs((await dragSnapshot(sourceRow)).offset-before.offset)<=.75,'Viewport/header changes armed an unarmed pickup');
      assert.equal(await sourceText(),before.source);
    } finally {
      await page.keyboard.press('Escape');await touch('touchEnd');
      await panel.locator('.editor-header').evaluate(e=>{e.style.transform=e.__dragTransform;delete e.__dragTransform;});
      await page.setViewportSize(viewport);
    }
    await clean(before.source);
  };
  const geometry = async () => {
    const issues = await panel.evaluate(p => {
      const issues = [], width = innerWidth;
      const dragLabel = String(p._hass?.language || 'en').toLowerCase().startsWith('pt') ? 'Arrastar cartão' : 'Drag card';
      for (const row of p.shadowRoot.querySelectorAll('.entity-row')) {
        if (!row.getClientRects().length) continue;
        const r=row.getBoundingClientRect();
        if (r.left<0 || r.right>width+1 || row.scrollWidth>row.clientWidth+1) issues.push('Row overflow');
        for (const action of row.querySelectorAll('[data-card-handle],ha-icon-button,.icon-action')) {
          if(action.matches('[data-card-handle]') && (action.localName !== 'button' || action.getAttribute('aria-label') !== `${dragLabel}: ${row.querySelector('.entity-name').textContent}`))issues.push('Localized drag handle accessible name');
          const b=action.getBoundingClientRect();
          if(b.width<48||b.height<48||b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1)issues.push('Move action geometry');
          const icon=action.querySelector('ha-icon')?.getBoundingClientRect();
          if(icon && (Math.abs(icon.left+icon.width/2-b.left-b.width/2)>.5||Math.abs(icon.top+icon.height/2-b.top-b.height/2)>.5))issues.push('Move icon alignment: '+action.getAttribute('data-action')+' '+JSON.stringify({button:b.toJSON(),icon:icon.toJSON()}));
        }
      }
      if(p.shadowRoot.querySelector('.page').scrollWidth>width+1)issues.push('Horizontal page overflow');
      return issues;
    });
    assert.deepEqual(issues,[]);
  };
  try {
    session = await page.context().newCDPSession(page);
    await reset();
    // Observe all management writes and services without changing dispatch behavior.
    await panel.evaluate(p => {
      const own=Object.getOwnPropertyDescriptor(p,'hass'), descriptor=own||Object.getOwnPropertyDescriptor(Object.getPrototypeOf(p),'hass'); let last=p._hass;
      p.__moveWrites=[];p.__moveFail=false;p.__moveCommits=0;p.__moveHaptics=[];
      const commit=p._commitCardMove;p._commitCardMove=function(...args){p.__moveCommits++;return commit.apply(this,args);};
      p.__moveEvents=new AbortController();p.shadowRoot.addEventListener('pointerdown',e=>{p.__movePointer=e.pointerId;},{capture:true,signal:p.__moveEvents.signal});
      p.addEventListener('haptic',e=>{p.__moveHaptics.push(e.detail);},{signal:p.__moveEvents.signal});
      Object.defineProperty(p,'hass',{configurable:true,set(value){last=value;descriptor.set.call(this,{...value,
        callWS(message){if(message.type==='marao_dashboard/config/generate'||message.type==='call_service'){p.__moveWrites.push(message.type);if(p.__moveFail)return Promise.reject(new Error('Fixture save failure'));}return value.callWS(message);},
        callService(){p.__moveWrites.push('call_service');throw Error('Editor movement dispatched a service');}
      });}});p.hass=last;
      p.__restoreMoveMonitor=()=>{p.__moveEvents.abort();p._commitCardMove=commit;if(own)Object.defineProperty(p,'hass',own);else delete p.hass;descriptor.set.call(p,last);};
    });
    await geometry(); await reveal(row(0,0));
    const before=await sourceText();
    await row(0,0).locator('[data-card-handle]').tap(); await clean(before);
    // Geometry profiles exercise the actual gesture too, including short/enlarged viewports.
    for (const position of geometryOnly ? ['top','bottom','partial'] : ['top','middle','bottom','partial']) {
      for (const mouse of geometryOnly ? [false] : [false,true]) {
        await stablePickup(position,mouse);
        if (!geometryOnly) await stablePickup(position,mouse,true);
      }
    }
    if (!geometryOnly) {
      await liveBounds();
      await begin(); await release(await point(row(0,0).locator('[data-card-handle]'))); await clean(before);
      await begin(); await release({x:1,y:400}); await clean(before);
      const extra=await begin();
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:extra.x+10,y:extra.y+10,id:1},{x:extra.x+70,y:extra.y+20,id:2}]});
      assert.equal(await panel.locator('.drag-source').count(),1,'A second pointer started another move');
      await touch('touchCancel');await clean(before);
      const start=await begin(); await touch('touchMove',{x:start.x,y:start.y+30});
      assert.equal(await sourceText(),before,'Preview must not mutate');
      await page.keyboard.press('Escape'); await touch('touchEnd'); await clean(before);
      await begin(); await touch('touchCancel'); await clean(before);
      // Native scrolling outside the handle does not begin a move.
      const text=await point(row(0,0).locator('.entity-main'));
      const scrollBefore=await panel.evaluate(p=>{let n=p;for(;n;n=n.parentElement||n.getRootNode()?.host)if(n.scrollHeight>n.clientHeight&&/(auto|scroll)/.test(getComputedStyle(n).overflowY))return n.scrollTop;return document.scrollingElement.scrollTop;});
      await touch('touchStart',text); await touch('touchMove',{x:text.x,y:text.y-100});await touch('touchEnd');await page.waitForTimeout(1200);
      assert.equal(await sourceText(),before);assert.equal(await panel.locator('.drag-source').count(),0);
      const scrollAfter=await panel.evaluate(p=>{let n=p;for(;n;n=n.parentElement||n.getRootNode()?.host)if(n.scrollHeight>n.clientHeight&&/(auto|scroll)/.test(getComputedStyle(n).overflowY))return n.scrollTop;return document.scrollingElement.scrollTop;});
      assert.ok(scrollAfter>scrollBefore,'Non-handle touch must scroll');
      // Mouse downward and upward use before-removal boundaries.
      await begin(0,0,true); await reveal(row(0,1));
      let box=await row(0,1).boundingBox(); await release({x:box.x+box.width/2,y:box.y+box.height-6},true);
      assert.deepEqual(await currentIds(0),['drag-b','drag-a','drag-c','drag-d']);
      await begin(0,1,true); await reveal(row(0,0));box=await row(0,0).boundingBox();
      await release({x:box.x+box.width/2,y:box.y+box.height*.3},true);
      assert.deepEqual(await currentIds(0),['drag-a','drag-b','drag-c','drag-d']);
      await reset();
      // Every terminal path cancels without a model write.
      for (const action of ['lost','busy','modal','render','json','disconnect']) {
        await begin();await armBottom();
        assert.equal(await sourceText(),before,'Armed preview changed source');
        const commits=await panel.evaluate(p=>p.__moveCommits);
        const haptics=await panel.evaluate(p=>p.__moveHaptics.length);
        await panel.evaluate((p,action)=>{
          const h=p.shadowRoot.querySelector('.drag-source [data-card-handle]');
          if(action==='lost')h.releasePointerCapture(p.__movePointer);
          if(action==='busy'){p._setBusy(true);p._setBusy(false);}
          if(action==='modal'){p.__dragDialog=p._dialog('Cancel moving');p.__dragDialog.querySelector('.dialog-content').textContent='Cancel moving';}
          if(action==='render')p._renderVisual();
          if(action==='json')return p._switchTab('json');
          if(action==='disconnect'){
            const capturedBefore=h.hasPointerCapture(p.__movePointer),activeBefore=!!p.shadowRoot.querySelector('.drag-source');
            p.disconnectedCallback();
            p.__moveDisconnect={capturedBefore,activeBefore,capturedAfter:h.hasPointerCapture(p.__movePointer),feedbackAfter:!!p.shadowRoot.querySelector('.card-drop-cue,.drag-source'),controllerDisposed:p._cardDrag===null};
            p.connectedCallback();
          }
        },action);
        if(action==='disconnect')assert.deepEqual(await panel.evaluate(p=>p.__moveDisconnect),{capturedBefore:true,activeBefore:true,capturedAfter:false,feedbackAfter:false,controllerDisposed:true},'Disconnect must independently dispose an active captured drag');
        await touch('touchEnd');
        if(action==='modal'){await panel.locator('ha-dialog .dialog-content').waitFor({state:'visible'});await panel.evaluate(p=>p._closeDialog(p.__dragDialog));await panel.locator('ha-dialog').waitFor({state:'detached'});}
        if(action==='json')await panel.evaluate(p=>p._switchTab('visual'));
        await clean(before);
        assert.equal(await panel.evaluate(p=>p.__moveCommits),commits,'Interrupted gesture committed');
        assert.equal(await panel.evaluate(p=>p.__moveHaptics.length),haptics,'Interrupted gesture emitted completion feedback');
        const stopped=await dragSnapshot(row(0,0));await page.waitForTimeout(160);
        assert.ok(Math.abs((await dragSnapshot(row(0,0))).offset-stopped.offset)<=.75,'Scrolling survived interruption');
        await begin();const fresh=await dragSnapshot(row(0,0));await page.waitForTimeout(160);
        assert.ok(Math.abs((await dragSnapshot(row(0,0))).offset-fresh.offset)<=.75,'New gesture inherited edge intent');
        await touch('touchCancel');await clean(before);
      }
      // Edge scrolling, driven by a real touch, reaches the initially offscreen empty section.
      await begin();
      const transfersBefore=await panel.evaluate(p=>p.__moveCommits);
      await touch('touchMove',{x:await list(0).evaluate(l=>l.getBoundingClientRect().left+24),y:await page.evaluate(()=>innerHeight-12)});
      await page.waitForFunction(({p,index})=>{
        const l=p.shadowRoot.querySelector(`[data-move-page="page:${index}"][data-move-section="1"]`),r=l.getBoundingClientRect();
        return r.top>=p.shadowRoot.querySelector('.editor-header').getBoundingClientRect().bottom && r.bottom<innerHeight-40;
      },{p:await panel.elementHandle(),index:pageIndex},{timeout:15000});
      await touch('touchMove',await point(list(1)));
      await captureScreenshot(page, {path:path.join(output,`${scenario.name}-${theme}-drag-target.png`),scale:'css'});
      await release(await point(list(1)));
      assert.equal(await panel.evaluate(p=>p.__moveCommits),transfersBefore+1,'Long-distance release must commit exactly once');
      assert.deepEqual(await currentIds(0),['drag-b','drag-c','drag-d']);assert.deepEqual(await currentIds(1),['drag-a']);
      assert.equal(await panel.evaluate(p=>p.shadowRoot.activeElement?.matches('[data-card-handle]')),true,'Moved card focus lost');
      const moved=JSON.parse(await sourceText());
      assert.deepEqual(moved.pages[pageIndex].sections[0].cards,fixture.pages[pageIndex].sections[0].cards);
      assert.deepEqual(moved.pages[pageIndex].sections[1].entities[0],fixture.pages[pageIndex].sections[0].entities[0]);
      await panel.evaluate(async p=>{await p._switchTab('json');await p._switchTab('visual');});
      assert.deepEqual(JSON.parse(await sourceText()),moved);
      await begin(1,0);
      const upper=await panel.locator('.editor-header').boundingBox();
      await touch('touchMove',{x:await list(1).evaluate(l=>l.getBoundingClientRect().left+24),y:upper.y+upper.height+8});
      await page.waitForFunction(({p,index})=>{
        const r=p.shadowRoot.querySelector(`[data-room="${index}:0"][data-card-drag="2"]`).getBoundingClientRect();
        return r.top>p.shadowRoot.querySelector('.editor-header').getBoundingClientRect().bottom+64 && r.bottom<innerHeight-40;
      },{p:await panel.elementHandle(),index:pageIndex},{timeout:15000});
      await touch('touchMove',{x:200,y:await page.evaluate(()=>innerHeight/2+80)});await page.waitForTimeout(80);
      const last=await row(0,2).boundingBox();await release({x:last.x+last.width/2,y:last.y+last.height*.7});
      assert.deepEqual(await currentIds(0),['drag-b','drag-c','drag-d','drag-a']);assert.deepEqual(await currentIds(1),[]);
      await reset();
      // Wider fixed grids wrap across rows; geometry is derived from actual slots.
      const viewport=page.viewportSize();
      try {
        await page.setViewportSize({width:1100,height:900});await page.waitForTimeout(80);
        const grid=await list(0).locator(':scope > .entity-row').evaluateAll(rows=>rows.map(r=>r.getBoundingClientRect().toJSON()));
        assert.ok(Math.abs(grid[0].top-grid[1].top)<2 && grid[2].top>grid[0].top,'Expected a wrapped two-column grid');
        await begin(0,0,true);await reveal(row(0,3));const end=await row(0,3).boundingBox();
        await release({x:end.x+end.width-10,y:end.y+end.height/2},true);
        assert.deepEqual(await currentIds(0),['drag-b','drag-c','drag-d','drag-a']);
        await begin(0,3,true);await reveal(row(0,0));const first=await row(0,0).boundingBox();
        await release({x:first.x+10,y:first.y+first.height/2},true);
        assert.deepEqual(await currentIds(0),['drag-a','drag-b','drag-c','drag-d']);
      } finally {await page.setViewportSize(viewport);await reset();}
    }
    // Explicit section/position controls, cancellation and native keyboard activation.
    const move=row(0,0).locator('[data-action="card-move"]');await reveal(move);await move.tap();
    await panel.locator('ha-dialog [data-close]').waitFor({state:'visible'});
    await panel.locator('ha-dialog [data-close]').tap();await panel.locator('ha-dialog').waitFor({state:'detached'});await clean(before);
    await reveal(move);await move.focus();await page.keyboard.press('Enter');
    await panel.locator('ha-dialog ha-form').waitFor({state:'visible'});
    const choose = async (index, name) => {
      const field=panel.locator('ha-dialog ha-selector-select').nth(index);
      await field.locator('ha-picker-field button.list-item').click({position:{x:12,y:18}});
      const option=field.getByRole('menuitem',{name,exact:true});
      await option.waitFor({state:'visible'});await option.tap();
    };
    const sectionLabel=await panel.evaluate(p=>p._l('Section'));
    await choose(0,sectionLabel+' 3');
    const beforeLabel=await panel.evaluate(p=>p._l('Before'));
    await choose(1,beforeLabel+' 1: Studio television');
    await panel.locator('ha-dialog [data-save] button').focus();await page.keyboard.press('Enter');
    await panel.locator('ha-dialog').waitFor({state:'detached'});
    assert.deepEqual(await currentIds(2),['drag-a','studio-media']);
    await geometry(); await reveal(row(2,0));
    await captureScreenshot(page, {path:path.join(output,`${scenario.name}-${theme}-move-section.png`),scale:'css'});
    assert.deepEqual(await panel.evaluate(p=>p.__moveWrites),[],'Moves must stay local');
    assert.equal((await client.call({type:'marao_dashboard/config/get'})).config,stored);
    if (persist) {
      const backup=require('./native-backup').nativeBackup(config,randomUUID(),['dashboard/MaraoDashboard','configuration.yaml']);
      let written=backup({mode:'backup'});
      try {
        await panel.evaluate(p=>{p.__moveFail=true;});await panel.locator('#save').tap();
        await page.waitForFunction(p=>!p._busy,await panel.elementHandle());
        assert.equal(await panel.evaluate(p=>p._dirty),true);assert.match(await panel.locator('#status').textContent(),/Fixture save failure/);
        assert.deepEqual(await currentIds(2),['drag-a','studio-media']);
        await panel.evaluate(p=>{p.__moveFail=false;p.__moveWrites=[];});
        const expected=JSON.parse(await sourceText());
        await panel.locator('#save').tap();await page.waitForFunction(p=>!p._busy&&!p._dirty,await panel.elementHandle());
        written=backup({mode:'snapshot',paths:['dashboard/MaraoDashboard','configuration.yaml']}).files;
        assert.deepEqual(JSON.parse((await client.call({type:'marao_dashboard/config/get'})).config),expected);
        assert.deepEqual(await panel.evaluate(p=>p.__moveWrites),['marao_dashboard/config/generate']);
        await panel.locator('#save').tap();await page.waitForFunction(p=>!p._busy&&!p._dirty,await panel.elementHandle());
        written=backup({mode:'snapshot',paths:['dashboard/MaraoDashboard','configuration.yaml']}).files;
        assert.deepEqual(JSON.parse((await client.call({type:'marao_dashboard/config/get'})).config),expected);
        await page.reload();panel=page.locator('marao-dashboard-panel');await page.waitForFunction(p=>p._loaded,await panel.elementHandle());
        assert.deepEqual(JSON.parse(await sourceText()),expected);
        // Open the retained media detail sheet, with no service dispatch.
        const popupPage=await page.context().newPage();try {
          await popupPage.goto(config.url+'/marao-dashboard/studio#page-studio-studio-media-popup');
          await popupPage.locator('.marao-popup-sheet').waitFor({state:'visible'});
        } finally {await popupPage.close();}
      } finally {
        backup({mode:'restore',expected:written});backup({mode:'finish'});
        await client.call({type:'lovelace/config',url_path:'marao-dashboard',force:true});
      }
    }
    // Discard uses the existing saved-source replacement and confirmation.
    page.once('dialog',d=>d.accept());await panel.evaluate(p=>{p._dirty=true;p._discard();});
    await page.waitForFunction(p=>!p._busy&&!p._loading&&!p._dirty,await panel.elementHandle());
    assert.deepEqual(JSON.parse(await sourceText()),JSON.parse(stored));
  } catch(error) {
    await captureScreenshot(page, {path:path.join(output,`${scenario.name}-${theme}-drag-failure.png`),scale:'css'}).catch(()=>{});
    throw error;
  } finally {
    await session?.detach();
    if(await panel.count())await panel.evaluate(async(p,baseline)=>{
      p.__restoreMoveMonitor?.();await p._switchTab('json');p._monaco.setValue(baseline.source);await p._switchTab('visual');p._savedSource=baseline.source;p._dirty=baseline.dirty;p._updateHeader();
    },baseline);
    assert.equal((await client.call({type:'marao_dashboard/config/get'})).config,stored,'Saved source cleanup differs');
  }
}
module.exports={editorDragChecks};
