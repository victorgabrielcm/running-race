import type { WorkoutType } from '@/types';

/** Plain-language one-liner shown inline on WorkoutCard so users don't have to
 *  guess what Z2 means. Keep these short — they render as a small subtitle. */
export function zoneHintFor(type: WorkoutType): { zone: string; body: string } | null {
  switch (type) {
    case 'easy_run':
      return {
        zone: 'Z2 · aeróbico leve',
        body: 'Conversa fácil, respiração controlada. Base do volume.',
      };
    case 'long_run':
      return {
        zone: 'Z2 · aeróbico longo',
        body: 'Ritmo conversacional por 90min-2h30. Ensina o corpo a usar gordura.',
      };
    case 'tempo':
      return {
        zone: 'Z3-Z4 · limiar',
        body: 'Confortavelmente difícil — só frases curtas. Ritmo de prova 21k.',
      };
    case 'interval':
      return {
        zone: 'Z4-Z5 · potência',
        body: 'Tiros fortes com recuperação. Trabalho de VO2 máximo.',
      };
    case 'fartlek':
      return {
        zone: 'Z3-Z5 · variado',
        body: 'Brincadeira de ritmos: alterna rápido/lento sem cronômetro.',
      };
    case 'recovery':
      return {
        zone: 'Z1 · recuperação ativa',
        body: 'Ritmo beeem leve. Remove fadiga sem adicionar carga.',
      };
    case 'race_pace':
      return {
        zone: 'Pace de prova',
        body: 'Simula o ritmo que você quer sustentar na corrida-alvo.',
      };
    case 'strength':
      return {
        zone: 'Força específica',
        body: 'Agachamento, stiff, core. Previne lesões na corrida.',
      };
    case 'mobility':
      return {
        zone: 'Mobilidade',
        body: 'Alongamento ativo + ativação de quadril e tornozelo.',
      };
    case 'cross_training':
      return {
        zone: 'Cross-training',
        body: 'Bike, natação ou elíptico. Volume aeróbico sem impacto.',
      };
    case 'rest':
      return null;
    default:
      return null;
  }
}
