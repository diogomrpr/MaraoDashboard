import test from 'node:test';
import assert from 'node:assert/strict';

test('migration identity changes clear private exports, rendered controls and blocked busy state', async () => {
  const previousElement=globalThis.HTMLElement,previousRegistry=globalThis.customElements;
  globalThis.HTMLElement=class { attachShadow(){this.shadowRoot={clears:0,replaceChildren(){this.clears++;}};} };
  globalThis.customElements={get(){return true;}};
  try {
    const {MaraoMigrationCard}=await import('../../frontend_src/ordinary-migration-ui.js');
    const card=new MaraoMigrationCard();card._mount=()=>{};
    const hass={user:{id:'administrator',is_admin:true},connection:{}};
    card.setConfig({dashboard_root:'marao-dashboard'});card.hass=hass;
    let invalidated=0;
    const stage=()=>{card._session={invalidate(){invalidated++;}};card._busy=card._loaded=card._converted=card._exported=card._proposedExported=true;card._originalText='private original';};
    const clean=()=>{assert.equal(card._busy,false);assert.equal(card._loaded,false);assert.equal(card._converted,false);assert.equal(card._exported,false);assert.equal(card._proposedExported,false);assert.equal(card._originalText,null);assert.equal(card._session,null);};
    stage();const originalEpoch=card._epoch;card.setConfig({dashboard_root:'another-dashboard'});clean();assert.ok(card._epoch>originalEpoch);
    stage();card.hass={...hass,user:{id:'another-user',is_admin:true}};clean();
    stage();card.hass={...hass,connection:{}};clean();
    stage();hass.user.is_admin=false;card.hass=hass;clean();
    assert.equal(invalidated,4);assert.ok(card.shadowRoot.clears>=4);
  } finally {
    if(previousElement===undefined)delete globalThis.HTMLElement;else globalThis.HTMLElement=previousElement;
    if(previousRegistry===undefined)delete globalThis.customElements;else globalThis.customElements=previousRegistry;
  }
});
