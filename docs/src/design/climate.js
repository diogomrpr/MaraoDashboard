import {scenarios} from './scenarios.js';
// Localized gallery labels. Card markup and behavior come from the real Marao runtime.
export const climateScenarios=scenarios('md_climate_card',{
  default:{pt:'Predefinido',descriptionPt:'Leitura medida e objetivo com modos disponíveis.'},
  'single-mode':{pt:'Aquecer e desligar',descriptionPt:'Um único modo de funcionamento e desligado.'},
  range:{pt:'Intervalo de temperatura',descriptionPt:'Objetivos inferior e superior no modo automático.'},
  off:{pt:'Desligado',descriptionPt:'A leitura medida mantém-se visível.'},
  graph:{pt:'Histórico de temperatura',descriptionPt:'Histórico de temperatura comunicado.'},
  'mode-popup':{pt:'Modos compactos',descriptionPt:'Os modos ficam no popup de detalhes.'},
  humidity:{pt:'Humidade',descriptionPt:'A leitura do sensor aparece no cartão e nos detalhes.'},
  'inline-modes':{pt:'Modos no cartão',descriptionPt:'Modos visíveis com os detalhes desativados.'},
  rejection:{pt:'Objetivo rejeitado',descriptionPt:'O objetivo comunicado mantém-se após uma rejeição.'},
  loading:{pt:'A carregar',descriptionPt:'A aguardar o estado comunicado.'},
  unknown:{pt:'Estado desconhecido',descriptionPt:'Estado desconhecido e apresentação neutra.'},
  unavailable:{pt:'Indisponível',descriptionPt:'Entidade indisponível e apresentação neutra.'},
  missing:{pt:'Entidade em falta',descriptionPt:'A entidade foi removida ou não existe.'},
  disconnected:{pt:'Sem ligação',descriptionPt:'A ligação está interrompida.'}
});
