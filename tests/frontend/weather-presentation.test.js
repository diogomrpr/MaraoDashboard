import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherScene,weatherMarkup,forecastRows,MaraoWeatherForecast} from '../../custom_components/marao_dashboard/frontend/MaraoWeather.js';
test('weather scenes distinguish conditions and unavailable readings remain neutral',()=>{
  for(const [condition,scene] of [['sunny','clear'],['partlycloudy','clear cloudy'],['pouring','rain'],['lightning','storm'],['snowy','snow'],['fog','fog'],['unavailable','neutral']])assert.equal(weatherScene(condition),scene);
  assert.equal(weatherScene('sunny',true),'night');
  const state={state:'sunny',attributes:{temperature:0,temperature_unit:'°C',wind_speed:0,wind_speed_unit:'km/h',humidity:60}};
  const html=weatherMarkup({state,hass:{},name:'Home',condition:'Sunny'});
  assert.match(html,/weather-temperature">0/);assert.match(html,/0 <small>km\/h<\/small>/);assert.match(html,/data-weather-forecast/);assert.doesNotMatch(html,/<div class="weather-head">[^]*?<ha-icon[^]*?<\/div><div class="weather-temperature"/);assert.match(html,/<dt>Wind<\/dt><dd>0 <small>km\/h<\/small>/);
  const unavailable=weatherMarkup({state,hass:{},name:'Home',condition:'Unavailable',unavailable:true});
  assert.match(unavailable,/weather-surface neutral/);assert.match(unavailable,/data-weather-forecast disabled/);assert.doesNotMatch(unavailable,/0 <small>km\/h<\/small>/);
  assert.doesNotMatch(weatherMarkup({state,hass:{},showForecast:false}),/data-weather-forecast/);
});
test('forecast values are escaped, invalid dates omitted and daily horizon bounded',()=>{
  const rows=Array.from({length:10},(_,i)=>({datetime:`2026-11-${String(i+10).padStart(2,'0')}T12:00:00Z`,condition:'<rain>',temperature:20,templow:0,precipitation_probability:0}));
  const html=forecastRows([{datetime:'bad'},...rows],'daily',{language:'en'},'°C');
  assert.equal((html.match(/<li>/g)||[]).length,7);assert.match(html,/0 °C–20 °C/);assert.match(html,/&lt;rain&gt;/);assert.match(html,/Precipitation 0%/);
});
test('late forecast subscription is cancelled after popup closes',async()=>{
  const view=new MaraoWeatherForecast();let resolve,cancelled=0;
  view._config={entity:'weather.home',features:3};view._render=()=>{};view.isConnected=true;
  view._hass={connection:{subscribeMessage:(_,message)=>{assert.equal(message.forecast_type,'hourly');return new Promise(r=>resolve=r);}}};
  const loading=view._load();view.isConnected=false;view.disconnectedCallback();resolve(()=>cancelled++);await loading;assert.equal(cancelled,1);
});
