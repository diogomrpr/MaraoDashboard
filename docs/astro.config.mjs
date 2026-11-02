import {defineConfig} from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site:'https://diogomrpr.github.io',
  base:'/MaraoDashboard',
  trailingSlash:'always',
  integrations:[starlight({
    title:'Marao',
    disable404Route:true,
    description:'Build your Home Assistant dashboard. Explore every Marao card, try its behavior, and copy your configuration.',
    logo:{light:'../custom_components/marao_dashboard/frontend/brand/logo.svg',dark:'../custom_components/marao_dashboard/frontend/brand/logo-dark.svg',replacesTitle:true},
    favicon:'/brand/mark.svg',
    social:[{icon:'github',label:'GitHub',href:'https://github.com/diogomrpr/MaraoDashboard'}],
    customCss:['./src/styles/site.css'],
    components:{PageTitle:'./src/components/PageTitle.astro'},
    sidebar:[
      {label:'Get started',items:[{label:'Install Marao',slug:'start/install'},{label:'Your first card',slug:'start/first-card'},{label:'Set up your dashboard',slug:'start/dashboard'}]},
      {label:'Cards',items:[{autogenerate:{directory:'cards'}}]},
      {label:'Dashboard features',items:[{autogenerate:{directory:'features'}}]},
      {label:'Help',items:[{autogenerate:{directory:'help'}}]},
      {label:'Development',items:[{autogenerate:{directory:'development'}}]}
    ]
  })]
});
