import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherScene,weatherMarkup,forecastRows,MaraoWeatherForecast} from '../../custom_components/marao_dashboard/frontend/MaraoWeather.js';
test('weather scenes distinguish conditions and unavailable readings remain neutral',()=>{
  for(const [condition,scene] of [['sunny','clear'],['partlycloudy','clear cloudy'],['pouring','rain'],['lightning','storm'],['snowy','snow'],['fog','fog'],['unavailable','neutral']])assert.equal(weatherScene(condition),scene);
  assert.equal(weatherScene('sunny',true),'night');
  const state={state:'sunny',attributes:{temperature:0,temperature_unit:'°C',wind_speed:0,wind_speed_unit:'km/h',humidity:60}};
  const html=weatherMarkup({state,hass:{},name:'Home',condition:'Sunny'});
  assert.match(html,/weather-temperature">0/);assert.match(html,/weather-reading">0<\/span><small>km\/h<\/small>/);assert.match(html,/class="weather-tap-action" data-weather-forecast aria-label="Forecast: Home"/);assert.doesNotMatch(html,/forecast-button|<span>Forecast<\/span>/);assert.doesNotMatch(html,/<div class="weather-head">[^]*?<ha-icon[^]*?<\/div><div class="weather-temperature"/);assert.match(html,/<dt>Wind<\/dt><dd><span class="weather-reading">0<\/span><small>km\/h<\/small>/);
  const unavailable=weatherMarkup({state,hass:{},name:'Home',condition:'Unavailable',unavailable:true});
  assert.match(unavailable,/weather-surface neutral/);assert.match(unavailable,/data-weather-forecast[^>]* disabled/);assert.doesNotMatch(unavailable,/weather-reading">0<\/span><small>km\/h<\/small>/);
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

test('custom Weather actions retain one full-card control and preview availability disables forecast taps',()=>{
  const state={state:'sunny',attributes:{temperature:19}};
  const markup=weatherMarkup({state,hass:{},name:'Home',customAction:true});
  assert.match(markup,/data-weather-action/);assert.doesNotMatch(markup,/data-weather-forecast/);
  assert.equal((markup.match(/<button /g)||[]).length,1);
  assert.match(weatherMarkup({state,hass:{},name:'Home',actionDisabled:true}),/data-weather-forecast[^>]* disabled/);
});

test('weather metrics adapt to available values and round without changing reported state',()=>{
  const state={state:'sunny',attributes:{temperature:19.6,wind_speed:11.8,wind_speed_unit:'km/h',humidity:61.7,pressure:1013.6,pressure_unit:'hPa'}};
  const before=structuredClone(state);
  for(const count of [0,1,2,3]){
    const sample=structuredClone(state);
    if(count<3)sample.attributes.pressure=null;
    if(count<2)sample.attributes.humidity=undefined;
    if(count<1)sample.attributes.wind_speed='unavailable';
    const html=weatherMarkup({state:sample,hass:{language:'en'},name:'Home'});
    assert.equal((html.match(/class="weather-reading"/g)||[]).length,count);
    if(count)assert.match(html,new RegExp('data-count="'+count+'"'));
    else assert.doesNotMatch(html,/<dl/);
    assert.match(html,/weather-temperature">20/);
    assert.doesNotMatch(html,/>19\.6<|>11\.8<|>61\.7<|>1013\.6</);
  }
  const html=weatherMarkup({state,hass:{language:'en'},name:'Home'});
  for(const value of [12,62,1014])assert.match(html,new RegExp('weather-reading">'+value+'<'));
  assert.deepEqual(state,before);
  assert.match(weatherMarkup({state:{state:'snowy',attributes:{temperature:-2.6,wind_speed:0,humidity:0}},hass:{}}),/weather-temperature">-3/);
  const rows=forecastRows([{datetime:'2026-11-07T12:00:00Z',temperature:19.6,templow:-2.6,precipitation_probability:61.7}],'daily',{language:'en'},'°C');
  assert.match(rows,/-3 °C–20 °C/);assert.match(rows,/Precipitation 62%/);
});
