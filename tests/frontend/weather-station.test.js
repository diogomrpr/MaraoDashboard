import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherMarkup} from '../../custom_components/marao_dashboard/frontend/MaraoWeather.js';

test('hiding the wind angle keeps compass rotation tied to the direction sensor',()=>{
  const station={
    wind_speed:{state:'4.2',attributes:{unit_of_measurement:'m/s'}},
    wind_direction:{state:'295',attributes:{unit_of_measurement:'°'}},
  };
  const html=weatherMarkup({hass:{language:'en'},state:{state:'sunny',attributes:{}},station,showWindAngle:false});
  assert.match(html,/visibility:visible;--wind-angle:295deg/);
  assert.doesNotMatch(html,/WNW 295/);
  const defaultMarkup=weatherMarkup({hass:{language:'en'},state:{state:'sunny',attributes:{}},station});
  assert.doesNotMatch(defaultMarkup,/WNW 295/);
  const visibleMarkup=weatherMarkup({hass:{language:'en'},state:{state:'sunny',attributes:{}},station,showWindAngle:true});
  assert.match(visibleMarkup,/WNW 295/);
});
