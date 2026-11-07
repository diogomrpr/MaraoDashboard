import {scenarios} from './scenarios.js';
// Localized gallery labels. Runtime config and fictional states come from the documented scenarios.
export const lightScenarios=scenarios('md_light_card',{
  default:{pt:'Predefinido',descriptionPt:'Luz fictícia com brilho ajustável.'},
  off:{pt:'Luz desligada',descriptionPt:'A luz mantém o seu nome e controlo de brilho.'},
  color:{pt:'Cor comunicada',descriptionPt:'O fundo acompanha a cor comunicada pela luz.'},
  'white-temperature':{pt:'Temperatura de branco',descriptionPt:'Branco a 4200 K com fundo suave.'},
  'no-slider':{pt:'Sem deslizador',descriptionPt:'O brilho fica oculto por configuração.'},
  'on-off-only':{pt:'Apenas ligar/desligar',descriptionPt:'Não é inventado um controlo de brilho.'},
  'action-failure':{pt:'Ação rejeitada',descriptionPt:'A falha é visível sem inventar uma confirmação.'},
  loading:{pt:'A carregar',descriptionPt:'O estado ainda não está disponível.'},
  unknown:{pt:'Estado desconhecido',descriptionPt:'Apresentação neutra para um estado desconhecido.'},
  unavailable:{pt:'Indisponível',descriptionPt:'A entidade está indisponível.'},
  missing:{pt:'Entidade em falta',descriptionPt:'A entidade foi removida ou não existe.'},
  disconnected:{pt:'Sem ligação',descriptionPt:'A ligação está interrompida.'}
});
