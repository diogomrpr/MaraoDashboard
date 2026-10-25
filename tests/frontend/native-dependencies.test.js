import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewDependencies,rewriteOwnedAssets} from '../../frontend_src/native-dependencies.js';
import {convertDocument} from '../../frontend_src/convert-document.js';
import {createStarter} from '../../frontend_src/native-metadata.js';

test('known owned assets resolve from the new graph while exact saved text stays untouched', () => {
  const source={config_version:2,name:'Safe',landing_page:'home',navigation:[],pages:[{name:'Home',path:'home',cards:[{type:'picture',image:'/marao_dashboard_static/brand/mark.svg?v=old'}]}]};
  const text=JSON.stringify(source,null,3)+'\n', base='https://ha.invalid/hacsfiles/example/marao/abc/';
  const converted=convertDocument(text,{assetBaseURL:base});
  assert.equal(converted.sourceText,text);
  assert.equal(converted.compiled.views[0].cards[0].image,base+'brand/mark.svg');
  assert.deepEqual(reviewDependencies(source),[]);
  for (const prefix of ['https://old.invalid','http://old.invalid:8123','//old.invalid']) {
    const value=prefix+'/marao_dashboard_static/brand/mark.svg?v=old';
    assert.deepEqual(reviewDependencies({image:value}),[]);
    assert.equal(rewriteOwnedAssets(value,'$.image',base),base+'brand/mark.svg');
  }
});
test('unresolved files and retired service consumers block with paths and no content values', () => {
  for (const value of ['/marao_dashboard_static/private.jpg','/api/marao_dashboard/private','marao_dashboard.generate_dashboard','https://other.invalid/marao_dashboard_static/private.jpg']) {
    assert.throws(()=>reviewDependencies({raw:value}),error=>error.path==='$.raw' && !error.message.includes(value));
  }
  assert.throws(()=>rewriteOwnedAssets('/marao_dashboard_static/../private','$.raw'));
  assert.deepEqual(reviewDependencies({description:'Previously used marao_dashboard.generate_dashboard in the old package.'}),[]);
  const source={config_version:2,name:'Safe',landing_page:'home',navigation:[],pages:[{name:'Home',path:'home',entities:[{template:'ha_card',yaml:'type: button\nentity: light.safe\ntap_action:\n  action: perform-action\n  perform_action: marao_dashboard.generate_dashboard'}]}]};
  assert.throws(()=>convertDocument(JSON.stringify(source)),error=>error.code==='legacy_service_dependency');
  assert.deepEqual(reviewDependencies({options:{alarm_code:'secret value',password:'other value'},raw:'safe'}),[{path:'$.options.alarm_code',reason:'private_setting'},{path:'$.options.password',reason:'private_setting'}]);
  assert.deepEqual(reviewDependencies({variables:{md_security_code:'1234'},url:'https://example.invalid/image?token=fake'}).map(item=>item.path),['$.variables.md_security_code','$.url']);
});
test('one-time starters retain entities with missing areas and give duplicate room names distinct routes', () => {
  const entity=(entity_id,area_id)=>({entity_id,area_id,domain:'light',has_state:true});
  const result=createStarter('Safe',{areas:[{area_id:'a',name:'Office'},{area_id:'b',name:'Office'}],entities:[entity('light.a','a'),entity('light.b','b'),entity('light.c','gone')]});
  assert.deepEqual(result.rooms.map(room=>[room.path,room.entities]),[['room-office',['light.a']],['room-office-2',['light.b']],['room-home',['light.c']]]);
});

test('explicit file answers replace only unresolved references and invalidate unsafe or missing answers', () => {
  const source={config_version:2,name:'Safe',landing_page:'home',navigation:[],pages:[{name:'Home',path:'home',cards:[{type:'picture',image:'/marao_dashboard_static/private.jpg',unknown:{keep:[]}}]}]};
  const text=JSON.stringify(source,null,3)+'\n';
  let missing;try{convertDocument(text);}catch(error){missing=error;}
  assert.equal(missing.code,'legacy_asset_unresolved');
  assert.equal(missing.path,'$.pages[0].cards[0].image');
  const fileReplacements={[missing.details.key]:'/local/my-image.jpg'};
  const converted=convertDocument(text,{fileReplacements});
  assert.equal(converted.source.pages[0].cards[0].image,'/local/my-image.jpg');
  assert.deepEqual(converted.source.pages[0].cards[0].unknown,{keep:[]});
  assert.equal(JSON.stringify(source,null,3)+'\n',text);
  assert.equal(converted.compiled.views[0].cards[0].image,'/local/my-image.jpg');
  for(const replacement of ['javascript:alert(1)','data:image/png,test','//elsewhere.invalid/file','/marao_dashboard_static/again.jpg','https://','/local/a b.jpg']) {
    assert.throws(()=>convertDocument(text,{fileReplacements:{[missing.details.key]:replacement}}),error=>error.code==='legacy_asset_replacement_invalid');
  }
  assert.throws(()=>convertDocument(text,{fileReplacements:{}}),error=>error.code==='legacy_asset_unresolved');
});
