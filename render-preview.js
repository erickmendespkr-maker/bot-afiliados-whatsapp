import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { PAGINA_HTML } from './src/painel.js';

// Painel administrativo de pré-visualização. Nenhuma credencial é recebida
// ou gravada; a automação e o WhatsApp permanecem desligados neste serviço.
const port = Number(process.env.PORT || 10000);
const adminToken = process.env.PANEL_ADMIN_TOKEN || '';
const tokenConfigured = adminToken.length >= 32;
function authorized(req) {
  if (!tokenConfigured) return false;
  const value = req.headers.authorization || '';
  if (!value.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(value.slice(7));
  const expected = Buffer.from(adminToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
const sections = [
  ['dashboard','Visão geral','layout-dashboard'],
  ['whatsapp','WhatsApp','smartphone'],
  ['grupos','Grupos','users'],
  ['afiliados','Afiliados','link'],
  ['ofertas','Ofertas','package'],
  ['modelos','Modelos','file-text'],
  ['filtros','Filtros','filter'],
  ['automacao','Automação','clock'],
  ['seguranca','Segurança','shield']
];
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Central de Ofertas · Administração</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#0b1120;color:#f1f5f9}
*{box-sizing:border-box}body{margin:0}button,a{font:inherit}a{color:#93c5fd;text-decoration:none}
.layout{display:grid;grid-template-columns:244px minmax(0,1fr);min-height:100vh}
aside{background:#111c30;border-right:1px solid #28364c;padding:24px 14px}
.brand{font-weight:800;font-size:19px;letter-spacing:-.5px;padding:0 12px 22px}.brand small{display:block;font-size:11px;color:#94a3b8;font-weight:500;letter-spacing:1px;margin-top:4px}
nav{display:grid;gap:5px}.nav{border:0;text-align:left;background:transparent;color:#a8b6cb;border-radius:11px;padding:12px 14px;cursor:pointer}
.nav.active,.nav:hover{background:#24344f;color:#fff}.sidefoot{margin:28px 12px;color:#94a3b8;font-size:12px;line-height:1.7}
main{padding:30px clamp(16px,4vw,52px);max-width:1400px;width:100%;margin:auto}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:24px}
h1{font-size:clamp(25px,3vw,34px);margin:0 0 6px}h2{font-size:17px;margin:0 0 14px}p{color:#a9b8ca;line-height:1.55;margin:0 0 12px}.muted{color:#94a3b8;font-size:13px}
.pill{border:1px solid #715f34;background:#342b1d;color:#facc7b;border-radius:100px;padding:7px 12px;font-size:12px;font-weight:700}
.notice{border:1px solid #755d31;background:#2b2419;padding:15px 18px;border-radius:12px;color:#f4d38a;font-size:13px;margin-bottom:24px;line-height:1.6}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}
.card{background:#152239;border:1px solid #2b3c54;border-radius:15px;padding:20px;min-width:0}.card .number{font-size:29px;font-weight:800;margin:9px 0 3px}.card .label{font-size:13px;color:#a7b7cd}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.state{display:inline-block;border-radius:6px;background:#344155;color:#e2e8f0;padding:5px 8px;font-size:12px}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid #29394f;flex-wrap:wrap}.row:last-child{border-bottom:0}
.action{display:inline-block;border:1px solid #47617f;border-radius:9px;padding:10px 14px;color:#dbeafe;background:#203451;cursor:pointer}
.action:focus-visible,.nav:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}
.action[disabled]{opacity:.55;cursor:not-allowed}.section{display:none}.section.active{display:block}
.formline{display:grid;gap:7px;margin:14px 0}label{font-size:13px;color:#cbd5e1}
input,select{width:100%;background:#0c1729;color:#f1f5f9;border:1px solid #3b4d67;border-radius:9px;padding:11px;font:inherit}
input:disabled,select:disabled{opacity:.7}.hint{font-size:12px;color:#94a3b8}.preview{background:#0c1729;border:1px dashed #47617f;border-radius:10px;padding:14px;white-space:pre-wrap;line-height:1.6}.chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.chip{background:#263c59;color:#dbeafe;border:1px solid #3e5b80;border-radius:20px;padding:6px 10px;font-size:12px}.checkboxrow{display:flex;gap:10px;align-items:center;padding:9px 0}.checkboxrow input{width:auto}
@media(max-width:960px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.layout{display:block}aside{padding:14px 14px 10px;border-right:0;border-bottom:1px solid #28364c}.brand{padding:0 4px 12px}nav{display:flex;overflow-x:auto;gap:5px;padding-bottom:4px}.nav{white-space:nowrap;padding:10px 12px;font-size:13px}.sidefoot{display:none}main{padding:20px 14px}.grid{grid-template-columns:1fr}}
</style></head><body><div class="layout">
<aside><div class="brand">◈ Central de Ofertas<small>ADMINISTRAÇÃO DO BOT</small></div>
<nav aria-label="Navegação principal">
${sections.map(([id,label])=>`<button type="button" class="nav ${id==='dashboard'?'active':''}" data-page="${id}">${label}</button>`).join('')}
</nav><div class="sidefoot">Baseado no projeto original.<br>Versão inicial do painel web.</div></aside>
<main>
<div class="top"><div><h1 id="heading">Visão geral</h1><p id="subtitle">Acompanhe os módulos do bot em um só lugar.</p></div><span class="pill">● Ambiente de teste</span></div>
<div class="notice"><strong>Modo de pré-visualização:</strong> este painel ainda não conecta contas, não salva configurações no servidor e não envia ofertas. Os indicadores abaixo refletem o ambiente de teste, não atividade real do WhatsApp.</div>
<section class="section active" id="dashboard">
<div class="cards"><div class="card"><div class="label">WhatsApp</div><div class="number">—</div><span class="state">Desconectado</span></div>
<div class="card"><div class="label">Grupos monitorados</div><div class="number">0</div><span class="muted">Não configurados</span></div>
<div class="card"><div class="label">Ofertas enviadas</div><div class="number">0</div><span class="muted">Neste ambiente</span></div>
<div class="card"><div class="label">Automação</div><div class="number">OFF</div><span class="muted">Envios desativados</span></div></div>
<div class="card" style="margin-bottom:18px"><h2>Diagnóstico do ambiente</h2><div class="row"><span>Servidor web</span><span class="state" id="diag-servidor">Verificando…</span></div><div class="row"><span>WhatsApp</span><span class="state" id="diag-whatsapp">Desconectado</span></div><div class="row"><span>Envios reais</span><span class="state" id="diag-envios">Desativados</span></div><div class="row"><span>Armazenamento de configurações</span><span class="state">Somente neste navegador</span></div><button type="button" class="action" id="diag-atualizar">Atualizar diagnóstico</button><p class="hint" id="diag-detalhes" role="status" style="margin-top:10px">Os dados de conexão vêm do endpoint de saúde do servidor; nenhuma conexão WhatsApp é iniciada.</p></div><div class="grid"><div class="card"><h2>Primeiros passos</h2><div class="row"><span>1. Vincular WhatsApp</span><span class="state">Pendente</span></div><div class="row"><span>2. Selecionar grupos</span><span class="state">Pendente</span></div><div class="row"><span>3. Configurar afiliados</span><span class="state">Pendente</span></div><div class="row"><span>4. Ativar automação</span><span class="state">Pendente</span></div></div>
<div class="card"><h2>Motor original preservado</h2><p>O código existente de leitura de grupos, busca de ofertas e conversão de links continua no repositório. Esta etapa adiciona a interface de administração sem ativar essas rotinas.</p><a class="action" href="/original">Abrir painel original de ofertas</a></div></div></section>
<section class="section" id="whatsapp"><div class="grid"><div class="card"><h2>Conexão do WhatsApp</h2><div class="row"><span>Status da sessão</span><span class="state">Desconectado</span></div><p style="margin-top:14px">A vinculação por QR Code será integrada ao mecanismo Baileys existente. O QR Code não está disponível neste modo de teste.</p><button class="action" disabled>Conectar por QR Code (em desenvolvimento)</button></div><div class="card"><h2>Persistência de sessão</h2><p>O projeto original guarda credenciais em arquivos locais. No Render Free, será necessário definir um armazenamento persistente e seguro antes de habilitar a conexão.</p></div></div></section>
<section class="section" id="grupos"><div class="grid"><div class="card"><h2>Grupos de origem</h2><p>Os grupos dos quais o bot receberá mensagens e links de ofertas.</p><div class="row"><span>Grupos selecionados</span><span class="state">Nenhum</span></div><button class="action" disabled>Selecionar grupos (em desenvolvimento)</button></div><div class="card"><h2>Grupos de destino</h2><p>Os grupos para os quais as ofertas aprovadas serão publicadas.</p><div class="row"><span>Grupos selecionados</span><span class="state">Nenhum</span></div><button class="action" disabled>Selecionar destinos (em desenvolvimento)</button></div></div></section>
<section class="section" id="afiliados"><div class="grid">
<div class="card"><h2>Shopee</h2><div class="row"><span>API de afiliados</span><span class="state">Não configurada</span></div><p>App ID e App Secret serão armazenados apenas no servidor.</p><button class="action" disabled>Configurar Shopee (em desenvolvimento)</button></div>
<div class="card"><h2>Mercado Livre</h2><div class="row"><span>Geração de links</span><span class="state">Não configurada</span></div><p>Integração original por OAuth e navegador automatizado, sujeita a testes.</p><button class="action" disabled>Configurar Mercado Livre (em desenvolvimento)</button></div>
<div class="card"><h2>Amazon</h2><div class="row"><span>Creators API</span><span class="state">Não configurada</span></div><p>Credenciais de API e Associate Tag, conforme elegibilidade da conta.</p><button class="action" disabled>Configurar Amazon (em desenvolvimento)</button></div></div></section>
<section class="section" id="ofertas"><div class="card"><h2>Fila e histórico de ofertas</h2><p>Não há ofertas neste ambiente de teste. O painel original permanece acessível para referência durante a implementação.</p><a class="action" href="/original">Visualizar interface original</a></div></section>
<section class="section" id="modelos"><div class="grid"><div class="card"><h2>Modelos de mensagens</h2><p>Visualize como uma oferta será formatada antes de integrar o envio.</p><div class="formline"><label for="modelo">Modelo de apresentação</label><select id="modelo"><option value="completo">Completo: produto, preço e desconto</option><option value="compacto">Compacto: produto e link</option><option value="direto">Direto: apenas oferta</option></select></div><div class="formline"><label for="chamada">Chamada personalizada (prévia local)</label><input id="chamada" maxlength="80" value="🔥 OFERTA DO DIA"></div><div class="chips"><span class="chip">{produto}</span><span class="chip">{preco}</span><span class="chip">{desconto}</span><span class="chip">{link}</span></div><p class="hint">Exemplo fictício. Preferências visuais salvas apenas neste navegador, sem sincronização com o servidor.</p></div><div class="card"><h2>Prévia da mensagem</h2><div class="preview" id="mensagem-previa" aria-live="polite"></div><p class="hint" style="margin-top:12px">Esta ferramenta apenas demonstra o formato; não converte links nem envia mensagens.</p></div></div></section>
<section class="section" id="filtros"><div class="grid"><div class="card"><h2>Filtros de qualidade</h2><p>Simule as regras que serão conectadas ao motor original após a conclusão do painel.</p><div class="formline"><label for="desconto">Desconto mínimo: <output id="desconto-valor">20%</output></label><input id="desconto" type="range" min="0" max="90" step="5" value="20"></div><label class="checkboxrow"><input type="checkbox" checked disabled>Evitar ofertas duplicadas (planejado)</label><label class="checkboxrow"><input type="checkbox" checked disabled>Ignorar mensagens sem produto (planejado)</label><label class="checkboxrow"><input type="checkbox" checked disabled>Remover links de terceiros (planejado)</label></div><div class="card"><h2>Configurações por grupo</h2><p>Na etapa de integração, cada grupo de origem poderá ter filtros e horários específicos.</p><div class="row"><span>Grupos disponíveis</span><span class="state">WhatsApp desconectado</span></div><div class="row"><span>Regras salvas</span><span class="state">Nenhuma</span></div><p class="hint">O desconto é salvo apenas neste navegador. Não altera as regras do bot.</p></div></div></section>
<section class="section" id="automacao"><div class="grid"><div class="card"><h2>Horário planejado</h2><div class="formline"><label for="start">Início</label><input id="start" type="time" value="09:00"></div><div class="formline"><label for="end">Fim</label><input id="end" type="time" value="22:00"></div><div class="row"><span>Duração da janela</span><strong id="duracao">13h</strong></div><p class="hint" id="horario-aviso" role="status"></p><div class="row"><span>Fuso horário</span><span>America/Sao_Paulo</span></div><p class="hint">Horários de planejamento salvos apenas neste navegador; não ativam a automação.</p></div><div class="card"><h2>Regras de publicação</h2><div class="row"><span>Envio automático</span><span class="state">Desligado</span></div><div class="row"><span>Aprovação manual</span><span class="state">A configurar</span></div><div class="row"><span>Intervalo entre ofertas</span><span class="state">A configurar</span></div><button class="action" disabled>Salvar regras (em desenvolvimento)</button></div></div></section>
<section class="section" id="seguranca"><div class="card"><h2>Proteção do painel</h2><p>Antes de liberar configurações ou conexão do WhatsApp, serão adicionados autenticação administrativa, proteção das rotas de escrita e armazenamento seguro das credenciais.</p><div class="row"><span>Operações de escrita</span><span class="state">Bloqueadas</span></div><div class="row"><span>Segredos no navegador</span><span class="state">Não expostos</span></div><div class="row"><span>Autenticação de API</span><span class="state" id="auth-status">Verificando…</span></div><p class="hint">Uma futura API administrativa exigirá token configurado no servidor. Esta versão não aceita alterações, mesmo com token válido.</p></div></section>
</main></div><script>
const titles={dashboard:['Visão geral','Acompanhe os módulos do bot em um só lugar.'],whatsapp:['WhatsApp','Conexão e sessão da conta vinculada.'],grupos:['Grupos','Organize origens e destinos das promoções.'],afiliados:['Afiliados','Gerencie as integrações com as plataformas.'],ofertas:['Ofertas','Acompanhe a fila de publicação e o histórico.'],modelos:['Modelos','Pré-visualize mensagens antes de publicar.'],filtros:['Filtros','Prepare regras de qualidade para cada origem.'],automacao:['Automação','Defina horários e regras de postagem.'],seguranca:['Segurança','Controle o acesso e proteja as credenciais.']};
function show(id){if(!titles[id])id='dashboard';document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('.nav').forEach(x=>{const active=x.dataset.page===id;x.classList.toggle('active',active);x.setAttribute('aria-current',active?'page':'false')});document.getElementById('heading').textContent=titles[id][0];document.getElementById('subtitle').textContent=titles[id][1];history.replaceState(null,'','#'+id)}
document.querySelectorAll('.nav').forEach(x=>x.addEventListener('click',()=>show(x.dataset.page)));show(location.hash.slice(1));
async function atualizarDiagnostico(){const estado=document.getElementById('diag-servidor'),detalhes=document.getElementById('diag-detalhes');estado.textContent='Verificando…';try{const resposta=await fetch('/health',{cache:'no-store'});if(!resposta.ok)throw Error('HTTP '+resposta.status);const dados=await resposta.json();if(typeof dados.ok!=='boolean'||typeof dados.whatsapp!=='boolean'||typeof dados.writesEnabled!=='boolean')throw Error('Resposta inválida');estado.textContent=dados.ok?'Online':'Indisponível';document.getElementById('diag-whatsapp').textContent=dados.whatsapp?'Conectado':'Desconectado';document.getElementById('diag-envios').textContent=dados.writesEnabled?'Habilitados':'Desativados';document.getElementById('auth-status').textContent=dados.adminAuthConfigured?'Preparada':'Não configurada';detalhes.textContent='Informações de diagnóstico do servidor de teste. Não representam funcionamento do motor original.'}catch{estado.textContent='Sem resposta';detalhes.textContent='Não foi possível consultar o servidor. Tente novamente.'}}
document.getElementById('diag-atualizar').addEventListener('click',atualizarDiagnostico);atualizarDiagnostico();
const modelo=document.getElementById('modelo'),chamada=document.getElementById('chamada'),previa=document.getElementById('mensagem-previa');
function atualizarPrevia(){const titulo=chamada.value.trim()||'OFERTA';const produto='Produto de exemplo';const link='https://exemplo.invalid/link-afiliado';const tipo=modelo.value;previa.textContent=tipo==='compacto'?titulo+'\\n'+produto+'\\n'+link:tipo==='direto'?titulo+'\\n'+link:titulo+'\\n\\n'+produto+'\\nDe R$ 199,90 por R$ 129,90\\n35% OFF\\n\\n'+link}
modelo.addEventListener('change',atualizarPrevia);chamada.addEventListener('input',atualizarPrevia);atualizarPrevia();
const desconto=document.getElementById('desconto');
const inicio=document.getElementById('start'),fim=document.getElementById('end');
function minutos(h){if(!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(h))return NaN;const p=h.split(':').map(Number);return p[0]*60+p[1]}
function atualizarHorario(){const n=minutos(fim.value)-minutos(inicio.value),valido=Number.isFinite(n)&&n>0;document.getElementById('duracao').textContent=valido?Math.floor(n/60)+'h '+String(n%60).padStart(2,'0')+'min':'—';document.getElementById('horario-aviso').textContent=valido?'Simulação: envios continuam desativados.':'Horário final deve ser posterior ao inicial.';return valido}

const chave='central-ofertas-preferencias-v1';
function salvarPreferencias(){try{localStorage.setItem(chave,JSON.stringify({modelo:modelo.value,chamada:chamada.value,desconto:Number(desconto.value),inicio:inicio.value,fim:fim.value}))}catch{}}
try{const preferencias=JSON.parse(localStorage.getItem(chave)||'null');if(preferencias&&typeof preferencias==='object'){if(['completo','compacto','direto'].includes(preferencias.modelo))modelo.value=preferencias.modelo;if(typeof preferencias.chamada==='string')chamada.value=preferencias.chamada.slice(0,80);if(Number.isFinite(preferencias.desconto)&&preferencias.desconto>=0&&preferencias.desconto<=90)desconto.value=String(preferencias.desconto);if(typeof preferencias.inicio==='string'&&Number.isFinite(minutos(preferencias.inicio)))inicio.value=preferencias.inicio;if(typeof preferencias.fim==='string'&&Number.isFinite(minutos(preferencias.fim)))fim.value=preferencias.fim}}catch{}
document.getElementById('desconto-valor').textContent=desconto.value+'%';
atualizarPrevia();atualizarHorario();
for(const el of [inicio,fim])el.addEventListener('change',()=>{if(atualizarHorario())salvarPreferencias()});
modelo.addEventListener('change',salvarPreferencias);
chamada.addEventListener('input',salvarPreferencias);
desconto.addEventListener('input',()=>{document.getElementById('desconto-valor').textContent=desconto.value+'%';salvarPreferencias()});
</script></body></html>`;
const send = (res,status,type,body) => {res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});res.end(body)};
createServer((req,res)=>{
  const path=new URL(req.url||'/','http://localhost').pathname;
  if(req.method==='GET'&&path==='/health')return send(res,200,'application/json',JSON.stringify({ok:true,mode:'admin-preview',whatsapp:false,writesEnabled:false,adminAuthConfigured:tokenConfigured}));
  if(path==='/api/admin/session')return send(res,authorized(req)?200:401,'application/json',JSON.stringify({ok:authorized(req),mode:'read-only',writesEnabled:false}));
  if(req.method==='GET'&&(path==='/'||path==='/painel'||path==='/admin'))return send(res,200,'text/html; charset=utf-8',html);
  if(req.method==='GET'&&path==='/original')return send(res,200,'text/html; charset=utf-8',PAGINA_HTML);
  if(req.method==='GET'&&path==='/painel/lista')return send(res,200,'application/json',JSON.stringify({ok:true,promocoes:[],modoTeste:true}));
  if(path.startsWith('/painel/')||path.startsWith('/api/')||path==='/post')return send(res,503,'application/json',JSON.stringify({ok:false,error:'Ambiente de teste: operações desativadas.'}));
  return send(res,404,'text/plain; charset=utf-8','Não encontrado');
}).listen(port,'0.0.0.0',()=>console.log('Central administrativa em pré-visualização, porta '+port));
