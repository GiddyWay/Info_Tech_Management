// Rebuild with the bundled @oai/artifact-tool runtime. All numbers come from PR4 JSON.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { constants as fsConstants } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const nm = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const py = process.env.CODEX_PRIMARY_RUNTIME_PYTHON;
const skill = process.env.PRESENTATIONS_SKILL_DIR;
if (!nm || !py || !skill) throw new Error('Set bundled runtime paths and PRESENTATIONS_SKILL_DIR.');
const req = createRequire(path.join(nm, '__pr5__.cjs'));
const { Presentation, PresentationFile } = await import(pathToFileURL(req.resolve('@oai/artifact-tool')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const d = JSON.parse(await fs.readFile(path.join(root,'pr4_model_results.json'),'utf8'));
const e=d.scenarios.expected, p=d.scenarios.pessimistic, v=d.validation, f=d.portfolio;
const m=n=>(n/1e6).toFixed(3).replace('.',',');
const pct=n=>n.toFixed(3).replace('.',',');
const build=await fs.mkdtemp(path.join(root,'.pr5_build-'));
await fs.mkdir(path.join(build,'previews'));
await fs.mkdir(path.join(build,'final'));
const deck=Presentation.create({slideSize:{width:1280,height:720}});
const colors={ink:'#15202B',muted:'#516171',blue:'#155A9C',red:'#A63435',line:'#D5DEE8',pale:'#EDF3F8'};

function tx(s,text,x,y,w,h,size=27,bold=false,color=colors.ink){
  const a=s.shapes.add({geometry:'textbox',name:text.slice(0,55),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  a.text=text;a.text.style={fontFamily:'Arial',fontSize:size,bold,color,verticalAlignment:'middle'};return a;
}
function box(s,x,y,w,h,fill){return s.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:h},fill,line:{fill:'none',width:0}});}
function newSlide(title,note){
  const s=deck.slides.add();s.background.fill='#FFFFFF';
  tx(s,title,72,48,1136,116,43,true);
  tx(s,String(deck.slides.items.length).padStart(2,'0'),1160,666,48,25,18,false,colors.muted);
  s.speakerNotes.text=note;return s;
}
function textRows(s,rows,y=200,size=29,gap=100){
  rows.forEach((r,i)=>{tx(s,r[0],72,y+i*gap,300,gap-10,size,true,colors.blue);tx(s,r[1],400,y+i*gap,808,gap-10,size);});
}
function table(s,values,widths,y=192,h=350,size=27){
  const t=s.tables.add({rows:values.length,columns:values[0].length,left:72,top:y,width:1136,height:h,columnWidths:widths,values});
  t.borders.assign({fill:colors.line,width:1,style:'solid'});
  for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++){
    const cell=t.getCell(r,c);cell.fill=r===0?colors.blue:(r%2?'#FFFFFF':colors.pale);
    cell.text.style={fontFamily:'Arial',fontSize:size,bold:r===0,color:r===0?'#FFFFFF':colors.ink};
  }
  return t;
}

{
 const s=newSlide('ATI.SU\nПять улучшений и решение о пилоте',
 '0:00–0:30. Харитонов Глеб Сергеевич. Компания ATI.SU, финансовый контур ООО ИА АВТОТРАНСИНФО. База R из паспорта и ПР1–ПР4, 2025 год. Прошу подготовку 0,56 млн, а не автоматический запуск всего пилота. Полные источники и оговорки в practice_05_ati_su.md.');
 tx(s,'1,476 млрд ₽',72,255,700,110,72,true,colors.blue);
 tx(s,'выручка 2025 года, база сравнения',72,372,1080,58,30);
 tx(s,'Предлагаемое решение: этап подготовки 0,56 млн ₽',72,480,1136,90,32,true);
 tx(s,'Харитонов Глеб Сергеевич\nПрактическая работа №5   19 ноября 2026',72,598,1060,63,23,false,colors.muted);
}
{
 const s=newSlide('Продуктовая зрелость не закрыла риск интеграции',
 '0:30–1:30. ПР1 относит продуктовую ИТ-функцию к Партнёру по ролям и связи с LTV/удержанием, но зона стала жёлтой. Контраргумент: провал миграции показывает недостаточную M&A capability. Это не доказательство превращения в службу заявок. №37 и №55 — предыстория, а не новые назначения. Источник: practice_01_ati_su.md, разделы 1.7, 2, 6.');
 textRows(s,[['Диагноз','«Партнёр», зона жёлтая'],['Признак','ИТ участвует в продуктовых решениях и удержании выручки'],['Разрыв','Слабая совместная ответственность за перенос, знания и данные']],200,30,125);
 tx(s,'Приоритет: восстановление клиентов и контролируемые изменения',72,605,1136,52,28,true,colors.blue);
}
{
 const s=newSlide('Назначенные №3 и №5 меняют решение о запуске',
 '1:30–2:15. Назначены №3 и №5. Кубики 2 и 6, дубля нет, белый №7 не назначен. №3 даёт 6 млн в месяц на два контура и отсутствие владельцев систем. №5 блокирует сам перенос и чтение агентом до обоснования. Все остальные карточки не считаются наступившими. Источник: episode_02_swans_03_05.md, дословное сообщение задания. Юридические решения требуют конкретного заключения, сроки модели не сроки регулятора.');
 tx(s,'№3',72,198,150,78,52,true,colors.blue);
 tx(s,'6 млн ₽ в месяц на два контура\n10 дополнительных недель стоят 13,846 млн ₽',250,198,950,130,32);
 tx(s,'№5',72,392,150,78,52,true,colors.red);
 tx(s,'Перенос и чтение агентом требуют допуска\nОтветственный за ответ регулятору ещё не назначен',250,392,950,150,32);
 tx(s,'Пока открыта подготовка. Production-доступ закрыт',72,596,1136,56,30,true,colors.red);
}
{
 const s=newSlide('Первые три улучшения обслуживают процессы ПР3',
 `2:15–3:45. H1=${m(e.annual_h1)} млн: 6*5000*.60=18000 платных эквивалентов, не 33333. Полный reference ПР2 даёт 12,3–17,2 млн, но охват пилота54%. H2:40млн*5%=2млн. H3:8333,33*.2*.4*14757,95=${m(e.annual_h3)}млн самостоятельно. Все оценки низкой уверенности. Источники: pr4_model.py, pr4_model_results.json, ПР3 §§8–9, ПР5 §2. Эффекты до новых расходов и пересечений.`);
 table(s,[['Улучшение','Эффект в год','База эффекта'],['H1 Принятые малые волны',`${m(e.annual_h1)} млн ₽`,'0,540% выручки'],['H2 Проверенный backup',`${m(e.annual_h2)} млн ₽`,'5% статьи 40 млн ₽'],['H3 Recovery-пакет',`${m(e.annual_h3)} млн ₽`,'0,667% выручки']], [515,285,336],198,350,28);
 tx(s,'Уверенность низкая. Эффект H1 ограничен 18 000 платных эквивалентов',72,590,1136,70,27,false,colors.muted);
}
{
 const s=newSlide('Вторая очередь запускается после стабилизации',
 '3:45–4:30. H4 уменьшена с 8–12 до4 покупателей из-за ограниченного периметра:4*1,2млн=4,8млн, 0,325% R ниже индивидуального коридора. Не используются данные купленной платформы без отдельного основания. H5=80млн*.065=5,2млн, но только для остаточных дублей, не тех же6млн в месяц из бюджета parallel. Нужны фактические bills и exit evidence. Источники: ПР2 H4/H5, ПР5 §§2–3, реестр F14/F15.');
 textRows(s,[['H4 Аналитика','4 платных договора по 1,2 млн ₽\n4,800 млн ₽ в год, отдельный legal gate'],['H5 Вывод дублей','5,200 млн ₽ в год, 6,5% статьи\nТолько подтверждённое уменьшение счетов']],205,31,180);
 tx(s,'Обе инициативы используют тех же Data, Legal и Security специалистов',72,602,1136,55,28,true,colors.red);
}
{
 const s=newSlide('После пересечений gross эффект равен 1,859% базы',
 `4:30–5:30. Сумма пяти ${m(f.raw_sum)}млн не итог. Вычитаем ${m(f.revenue_overlap)}млн H1/H3 и ${m(f.cost_overlap)}млн H2/H5. Получаем ${m(f.gross_combined)}млн, ${pct(f.gross_combined_over_revenue_pct)}%R. Раздельно20,640млн выручки и6,8млн cost saving. При margin80% и новых recurring1,968млн steady contribution=${m(f.steady_net_contribution)}млн, 1,446%R ниже1,5%. Источник: portfolio() в pr4_model.py и ПР5 §§4–5. Проценты R не называются ростом выручки, когда включена экономия.`);
 table(s,[['Счётная строка','млн ₽/год'],['Сумма пяти отдельных эффектов',m(f.raw_sum)],['Пересечение выручки H1/H3',`−${m(f.revenue_overlap)}`],['Пересечение затрат H2/H5',`−${m(f.cost_overlap)}`],['Совокупный gross эффект',m(f.gross_combined)]],[820,316],188,350,28);
 tx(s,'Коридор набора 1,5–5%: gross внутри, net contribution 1,446% ниже',72,581,1136,77,27,true,colors.blue);
}
{
 const s=newSlide('Контроль качества делает первый год убыточным',
 `5:30–6:30. 10 недель*6млн/(52/12)=13,846млн дополнительных расходов. ПР4 full cash ${m(e.full_pilot_cash)}, incremental ${m(e.incremental_upfront)}млн. Incremental payback19,96мес, возврат full cash27,32мес при сильном предположении остановки контура после пилота. Пессимистичный за24мес не окупается, не рекомендуем продолжение. Набор пяти в год1 ${m(f.first_year_incremental_net)}млн. Три крупные волны экономят8,308млн на6неделях, но риск повторного ущерба не оценён. Источники: ПР4 §7, ПР5 §§4.3,7, JSON.`);
 table(s,[['Показатель ПР4','Ожидаемый','Пессимистичный'],['Полный pilot cash, млн ₽',m(e.full_pilot_cash),m(p.full_pilot_cash)],['Дополнительные затраты, млн ₽',m(e.incremental_upfront),m(p.incremental_upfront)],['Incremental окупаемость','20,0 месяцев','нет за 24 месяца'],['Возврат полного cash','27,3 месяцев','нет за 24 месяца']],[590,273,273],185,325,25);
 tx(s,`Первый год набора пяти: −${m(-f.first_year_incremental_net)} млн ₽`,72,566,1136,65,36,true,colors.red);
 tx(s,'7 дней наблюдения и BF=1 gate остаются постоянными правилами',72,636,1090,35,23,false,colors.muted);
}
{
 const s=newSlide('Пилот проверяет удержание платящих компаний',
 '6:30–7:30. Основной H1 эксперимент1600 компаний на группу,3200 всего из двух волн. Плановая формула1354 завершённых/arm при10%→7%, alpha.05,power.8, резерв. Контроль безопасный ручной перенос, те же обязательные gates и восстановление. Это дополнительная ценность над безопасным минимумом, а не сравнение с аварийным big-bang. Если реальный baseline иной, до включения пересчитываем мощность. Один финальный анализ, безопасность непрерывно. Длительность4нед набора+30сут=около8нед и2дня закрытия. Источник: ПР5 §6, sample_size() модели. Метод: Kohavi et al2020, https://www.cambridge.org/core/books/abs/trustworthy-online-controlled-experiments/introduction-and-motivation/B4A0C46514460B5A040DC45B7C3869B9');
 tx(s,'1 600 + 1 600',72,195,1100,95,64,true,colors.blue);
 tx(s,'платных компаний, случайное назначение внутри сопоставимых страт',72,294,1120,65,29);
 textRows(s,[['Главная метрика','Churn D30: 10% до 7%\nСнижение ≥30%, 95% CI разницы ниже 0'],['Окно и stop','Около 8 недель наблюдения\nLegal, critical defect, fraud и бюджет останавливают волну']],397,28,115);
}
{
 const s=newSlide('Песочница проверяет расчёт, история ещё нужна',
 `7:30–8:15. Прямо говорим: это два synthetic периода. Train k=100/200=.5. Holdout216*.5=108 при fixture118, ошибка−10,−.833п.п., APE${v.absolute_percentage_error.toFixed(2)}%. НЕ историческая точность ATI.SU. Прогноз создан19.11.2026 до окна21.12.2026–20.01.2027:210непродлений из3000, conditional on legal gate and accepted wave. Без допуска0 production переносов, outcomes N/A. Источники: pr4_synthetic_periods.csv, pr4_forecast_2026-11-19.md, ПР4 §6. Дата локального файла сама по себе не внешнее удостоверение времени.`);
 table(s,[['Учебный период','Расчёт','Исход fixture'],['01–14 сентября','k = 100 / 200','100 уходов'],['15–28 сентября','216 × 0,5 = 108','118 уходов']],[500,340,296],195,240,27);
 tx(s,'Holdout: ошибка 8,47%. Оба периода синтетические',72,467,1136,65,33,true,colors.red);
 tx(s,'Прогноз записан 19.11.2026: 210 непродлений из 3 000\nПериод 21.12.2026–20.01.2027, только после допуска и запуска',72,562,1136,88,27);
}
{
 const s=newSlide('Решение о полном пилоте остаётся за комитетом',
 '8:15–9:00. Только этап0,56млн входит в текущую рекомендацию. CEO назначает ответственного за ПДн и ответ регулятору. CIO назначает system owners. Legal/Security закрывают gate, Analytics снимает реальную историю, CFO решает по full/incremental cash отдельно. При половине полного бюджета13,333млн сами контуры22,154млн не помещаются, прежний план не обещаем. Не предлагаем банковский бесплатный сервис: белый№7 не назначен. Источник: ПР4 §§1,5,7, ПР5 §7. Все должности — проект назначения, не фактические имена сотрудников компании.');
 textRows(s,[['Сейчас','0,56 млн ₽ на периметр, основания и baseline'],['До production','Владельцы систем, допуск, контрольная группа\nи пересчитанный бюджет'],['Право на отказ','Legal, Security, Domain Lead и CFO\nимеют конкретные stop-критерии']],200,30,130);
 tx(s,'При половине бюджета тот же объём и срок не обещаем',72,610,1136,48,30,true,colors.red);
}

const candidate=path.join(build,'candidate.pptx');
await (await PresentationFile.exportPptx(deck)).save(candidate);
for(let i=0;i<deck.slides.items.length;i++){
 const blob=await deck.export({slide:deck.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(build,'previews',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const final=path.join(build,'final','pr5_defense_ati_su.pptx');
// Windows sandbox can prohibit hard links while allowing regular writes.
// Preserve finalizer's exclusive-create behavior using COPYFILE_EXCL in that case.
const originalLink=fs.link;
fs.link=async(source,destination)=>{
 try{return await originalLink(source,destination);}catch(error){
  if(error.code!=='EPERM')throw error;
  return fs.copyFile(source,destination,fsConstants.COPYFILE_EXCL);
 }
};
let result;
try { result=await finalizePresentation({workspaceDir:build,candidatePath:candidate,finalPath:final,
 pythonExecutable:py,
 integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit',
   ...[4,6,7,9].flatMap(n=>['--require-native-table-slide',String(n)])],
 requiredNativeTableOwnerSlides:[4,6,7,9],
 tableArithmeticContracts:[{slide:6,table:1,label_column:0,total_row:4,value_columns:[1],component_rows:[1,2,3]}],
 fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,
 receiptPath:path.join(build,'validation.json')});
} finally {fs.link=originalLink;}
await fs.copyFile(final,path.join(root,'pr5_defense_ati_su.pptx'));
console.log(JSON.stringify({build,final:path.join(root,'pr5_defense_ati_su.pptx'),result},null,2));
