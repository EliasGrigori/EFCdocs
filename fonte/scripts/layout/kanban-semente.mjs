/* Monta, pela tela do app, um Kanban inventado com tarefas (responsável, prazo, GUT e cores) no primeiro quadro da lista.
   Usado pelos prints e pelos testes do Kanban novo (v0.6.20, parte 4). Só nomes inventados. */
import { espera } from './semente.mjs';
export const CARTOES = [
  [0, 'Conferir extintores do galpão', { resp: 'Ana Lima', prazo: '2020-01-15', gut: [5, 4, 4], cor: 'Rosa' }],
  [0, 'Trocar luvas da equipe de colheita', { resp: 'Bruno Sá', prazo: '2030-03-20', gut: [3, 3, 2], cor: 'Amarelo' }],
  [0, 'Sinalizar a área de compostagem', { cor: 'Verde' }],
  [1, 'Treinamento de EPI com os novos', { resp: 'Carla Reis', prazo: '2030-02-10', gut: [4, 4, 3], cor: 'Azul' }],
  [1, 'Revisar a ficha de primeiros socorros', { resp: 'Ana Lima', cor: 'Laranja' }],
  [2, 'Placas da área de defensivos', { resp: 'Bruno Sá', prazo: '2020-02-01', gut: [2, 2, 1], cor: 'Lilás' }],
];
export async function montarKanban(p, base) {
  const painel0 = (l) => p.evaluate((l) => { const x = JSON.parse(localStorage.getItem('efcdocs:prefs') || '{}'); x.painel = l; localStorage.setItem('efcdocs:prefs', JSON.stringify(x)); }, l);
  await painel0(true); await p.reload();
  await p.goto(base + '#/postits'); await p.waitForSelector('.tb-arq tr.arq .abre'); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.qd-vistas'); await espera(900);
  await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col');
  for (const [col, txt] of CARTOES) { await p.locator('.kb-col').nth(col).locator('.kb-novo').click(); const ta = p.locator('textarea.kb-edita'); await ta.fill(txt); await ta.press('Control+Enter'); await espera(150); }
  for (const [, txt, t] of CARTOES) {
    await p.locator('.kb-card', { hasText: txt }).first().click(); await espera(120);
    const painel = p.locator('.qd-tarefa-p'); await painel.waitFor({ timeout: 4000 });
    if (t.resp) await painel.locator('input[type=text], input:not([type])').first().fill(t.resp);
    if (t.prazo) { await painel.locator('input[type=date]').fill(t.prazo); await painel.locator('input[type=date]').blur(); }
    if (t.gut) for (let i = 0; i < 3; i++) await painel.locator('select').nth(i).selectOption(String(t.gut[i]));
    if (t.cor) { const c = p.locator(`.side [data-cor="${t.cor.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}"], .side button[aria-label="Cor ${t.cor}"]`); if (await c.count()) await c.first().click(); }
    await espera(150);
  }
  await painel0(false); await p.reload(); await p.waitForSelector('.kb-col'); await espera(700);
}
