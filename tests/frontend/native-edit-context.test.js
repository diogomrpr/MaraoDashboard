import test from 'node:test';
import assert from 'node:assert/strict';
import { bindNativeEditing, findNativeHost, nativeEditing } from '../../custom_components/marao_dashboard/frontend/MaraoNativeContext.js';
import { MaraoCard, MaraoPopupCard } from '../../custom_components/marao_dashboard/frontend/MaraoCards.js';

function fixture() {
  const controllers = new Set(), listeners = new Map();
  const host = { localName: 'hui-root', lovelace: { editMode: false },
    addController: controller => controllers.add(controller), removeController: controller => controllers.delete(controller) };
  const owner = { parentNode: { host }, inert: false, shadowRoot: {
    addEventListener: (type, listener) => listeners.set(type, listener), removeEventListener: type => listeners.delete(type),
  } };
  const update = editing => { host.lovelace.editMode = editing; for (const controller of controllers) controller.hostUpdated(); };
  return { host, owner, controllers, listeners, update };
}

test('ordinary native edit context crosses shadow roots and live mode changes are scoped and disposed', () => {
  const { host, owner, controllers, listeners, update } = fixture(), changes = [];
  const release = bindNativeEditing(owner, editing => changes.push(editing));
  assert.equal(findNativeHost(owner), host);
  assert.equal(controllers.size, 1);
  update(true);
  assert.equal(nativeEditing(owner), true); assert.equal(owner.inert, true);
  const event = { prevented: 0, stopped: 0, preventDefault() { this.prevented++; }, stopImmediatePropagation() { this.stopped++; } };
  listeners.get('click')(event);
  assert.deepEqual([event.prevented, event.stopped], [1, 1]);
  update(true); update(false);
  assert.deepEqual(changes, [true, false]); assert.equal(owner.inert, false);
  listeners.get('click')(event); assert.equal(event.prevented, 1);
  release(); assert.equal(controllers.size, 0); assert.equal(listeners.size, 0);
  assert.equal(nativeEditing({ parentNode: { localName: 'other-dashboard' } }), false);
});

test('ported popup children inherit their owner without a second host subscription', () => {
  const { owner, host, controllers } = fixture();
  const child = { nativeOwner: owner, shadowRoot: { addEventListener() {}, removeEventListener() {} } };
  const release = bindNativeEditing(child);
  host.lovelace.editMode = true;
  assert.equal(nativeEditing(child), true);
  assert.equal(controllers.size, 0);
  release();
});

test('retained raw cards block services, navigation and fullscreen as soon as native editing starts', async () => {
  const { owner, host } = fixture();
  let services = 0, fullscreen = 0;
  const card = Object.assign(Object.create(MaraoCard.prototype), {
    parentNode: owner.parentNode, _config: { template: 'md_camera_card' }, _hass: { callService() { services++; } },
    _camera: { fullscreen() { fullscreen++; } },
  });
  host.lovelace.editMode = true;
  await card._callService('light', 'toggle', { entity_id: 'light.test' });
  card._performAction({ action: 'navigate', navigation_path: '#authored' });
  card._performAction({ action: 'fullscreen' });
  assert.equal(services, 0); assert.equal(fullscreen, 0);
});

test('preview keeps authoritative entity state and connection while refreshing controls on mode changes',async()=>{
  const card=new MaraoCard(),renders=[];let services=0;
  const hass={connected:true,connection:{connected:true},states:{'switch.safe':{state:'on',attributes:{friendly_name:'Safe switch'}}},callService(){services++;}};
  card._config={template:'md_switch_card',entity:'switch.safe'};card._stateEntities=['switch.safe'];
  card._render=()=>renders.push({preview:card.preview,connected:card.hass.connected,state:card.hass.states['switch.safe'].state});
  card.hass=hass;card.preview=true;
  assert.equal(card.hass,hass);assert.equal(card.hass.connection,hass.connection);
  assert.deepEqual(renders.at(-1),{preview:true,connected:true,state:'on'});
  await card._callService('switch','turn_off',{entity_id:'switch.safe'});
  card._performAction({action:'toggle'},'switch.safe');assert.equal(services,0);
  const count=renders.length;card.preview=false;
  assert.equal(renders.length,count+1,'Leaving preview must update controls even when the entity did not change');
  assert.deepEqual(renders.at(-1),{preview:false,connected:true,state:'on'});
  card.preview=true;const offline={...hass,connected:false,connection:{connected:false}};card.hass=offline;
  assert.equal(card.hass,offline);assert.equal(renders.at(-1).connected,false,'Real disconnection stays authoritative in preview');
});

test('cards mounted before runtime translations refresh once on readiness and release the listener on removal',()=>{
  const previous=globalThis.window,host=new EventTarget(),card=new MaraoCard();let renders=0,label;
  globalThis.window=host;
  card.isConnected=true;card._ensurePress=()=>{};card._observeGraph=()=>{};card._subscribeClimate=()=>{};
  card._render=()=>{renders++;label=host.MaraoDashboard?.localize('camera.snapshot')||'camera.snapshot';};
  try{
    card.connectedCallback();assert.equal(label,'camera.snapshot');
    host.MaraoDashboard={localize:()=> 'Imagem estática'};
    host.dispatchEvent(new Event('marao-runtime-ready'));assert.equal(label,'Imagem estática');
    const count=renders;host.dispatchEvent(new Event('marao-runtime-ready'));assert.equal(renders,count);
    card.disconnectedCallback();delete host.MaraoDashboard;card.connectedCallback();
    card.isConnected=false;card.disconnectedCallback();
    const removedCount=renders;host.dispatchEvent(new Event('marao-runtime-ready'));assert.equal(renders,removedCount);
  }finally{globalThis.window=previous;}
});

test('retained raw sheets close before handling history/hash state in native edit mode', () => {
  const { owner, host } = fixture();
  const popup = new MaraoPopupCard(); popup.parentNode = owner.parentNode;
  let closed = 0;
  popup._close = () => { closed++; };
  popup._historyContext = { owner: {} };
  host.lovelace.editMode = true;
  popup._sync();
  popup._openSheet();
  assert.equal(closed, 1);
  assert.equal(popup._open, false);
});
