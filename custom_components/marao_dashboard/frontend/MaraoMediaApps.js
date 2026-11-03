export const mediaApps = [
  { id: 'netflix', label: 'Netflix', file: 'netflix.svg', sources: ['Netflix', 'com.netflix.Netflix'], color: '#000', text: '#fff' },
  { id: 'spotify', label: 'Spotify', file: 'spotify.svg', symbol: true, sources: ['Spotify', 'com.spotify.client', 'com.spotify.Spotify'], color: '#121212', text: '#fff' },
  { id: 'youtube', label: 'YouTube', sources: ['YouTube', 'com.google.ios.youtube'], color: '#d90000', text: '#fff' },
  { id: 'disney-plus', label: 'Disney+', sources: ['Disney+', 'Disney Plus', 'com.disney.disneyplus'], color: '#006d74', text: '#fff' },
  { id: 'prime-video', label: 'Prime Video', sources: ['Prime Video', 'Amazon Prime Video', 'com.amazon.aiv.AIVApp'], color: '#0064b5', text: '#fff' },
  { id: 'apple-tv', label: 'Apple TV', sources: ['TV', 'Apple TV', 'Apple TV+', 'com.apple.tv', 'com.apple.TVWatchList'], color: '#151515', text: '#fff' },
  { id: 'plex', label: 'Plex', file: 'plex.svg', sources: ['Plex', 'com.plexapp.plex'], color: '#111111', text: '#fff' },
  { id: 'meo', label: 'MEO', file: 'meo.svg', sources: ['MEO', 'MEO Go', 'pt.sapo.mobile.iphone.tmn.meomobile'], color: '#2e26ff', text: '#fff' },
];
export const mediaAppLogoError = (value,hass) => value !== undefined && value !== '' && !mediaApps.some(app => app.id === value) ? (String(hass?.language||'').startsWith('pt')?'Escolha um logótipo de aplicação suportado.':'Choose a supported app logo.') : undefined;
export const mediaAppLogoChoices = (localize = value => value) => [{value:'',label:localize('Automatic')},...mediaApps.map(app=>({value:app.id,label:app.label}))];
export function mediaAppBrand(config) {
  const selected=config.variables?.app_logo,error=mediaAppLogoError(selected);if(error)throw new Error(error);
  if(selected)return mediaApps.find(app=>app.id===selected);
  const normalize=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const source=normalize(config.variables?.app_source||config.name);
  return mediaApps.find(app=>app.sources.some(alias=>normalize(alias)===source));
}
