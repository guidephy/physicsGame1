(() => {
'use strict';
// Each entry: question, choices, correct choice index, explanation.
const QUESTIONS = {
newton: [
['同樣大小的合力作用於兩物體，質量較大的物體加速度如何？',['較小','較大','一定相同'],0,'由 F = ma，合力固定時 a = F / m，質量越大，加速度越小。'],
['兩物體距離變成原來 2 倍，質量不變，引力變成多少？',['1/2','1/4','2 倍'],1,'萬有引力與距離的平方成反比，所以距離加倍，引力變為 1/4。蘋果特效只是概念演出。'],
['牛頓的萬有引力連結了哪兩種現象？',['只有磁鐵吸鐵','只有聲音傳播','蘋果下落與行星運動'],2,'牛頓用同一套力學與引力規律描述地面物體及天體，這是物理史的重要統一。']],
faraday: [
['什麼變化能在線圈中產生感應電動勢？',['磁通量改變','只要有靜止磁鐵就必定有','線圈顏色改變'],0,'法拉第定律指出，穿過線圈的磁通量隨時間改變時，會產生感應電動勢。'],
['磁鐵與線圈皆靜止，磁場也不變，是否持續產生感應電動勢？',['一定會','不會，磁通量沒有改變','取決於磁鐵顏色'],1,'有磁場不等於有電磁感應；關鍵是穿過線圈的磁通量是否隨時間改變。'],
['法拉第的重要貢獻與哪種裝置的原理密切相關？',['日晷','水銀溫度計','發電機'],2,'發電機藉由相對運動等方式改變線圈磁通量，把機械能轉換為電能。']],
kepler: [
['克卜勒第一定律指出行星繞日軌道是什麼形狀？',['橢圓，太陽在一個焦點','正方形','太陽一定在圓心的正圓'],0,'行星軌道是橢圓，太陽位於其中一個焦點；不是橢圓的中心。'],
['依等面積定律，行星靠近太陽時通常移動得如何？',['較慢','較快','完全停止'],1,'行星與太陽連線在相同時間掃過相同面積，因此靠近太陽時速度較快。'],
['克卜勒提出行星定律，重要的觀測資料來自誰？',['波耳','法拉第','第谷'],2,'克卜勒分析第谷精密的天文觀測資料，歸納出行星運動定律。']],
young: [
['楊氏雙狹縫實驗出現明暗條紋，主要支持光的哪種性質？',['波動性','一定沒有能量','只有直線軌跡'],0,'兩道光波疊加可形成增強與減弱，產生干涉條紋，支持光的波動性。'],
['兩道相干光波同相疊加，通常形成什麼？',['暗紋','亮紋','磁鐵'],1,'同相疊加是建設性干涉，振幅增強；在合適條件下形成亮紋。'],
['兩道等振幅相干波相差半個週期疊加時，會如何？',['振幅必定加倍','速度變無限大','可互相抵消'],2,'相差半個週期即反相，等振幅時可完全抵消，形成破壞性干涉。']],
bohr: [
['波耳模型中，原子的能階具有什麼特徵？',['只允許特定能量','任何能量都能任意取值','全部能階能量相同'],0,'波耳引入量子化能階。這個歷史模型有助解釋氫光譜，但不是完整的現代原子理論。'],
['電子由較高能階降到較低能階時，原子會如何？',['只吸收光子','可放出光子','質量必定加倍'],1,'能階差可由光子帶走，光子能量滿足 ΔE = hν。'],
['能階差越大，躍遷放出的光子頻率如何？',['越低','一定相同','越高'],2,'由 ΔE = hν，普朗克常數 h 固定，能階差越大，光子頻率越高。']],
einstein: [
['固定頻率的光，其單一光子能量由什麼決定？',['頻率，E = hν','只有光束面積','只有照射時間'],0,'光子能量與頻率成正比。提高光強通常增加光子數，而非提高每顆光子的能量。'],
['狹義相對論中，真空光速對所有慣性觀察者如何？',['隨觀察者任意改變','相同','必定是零'],1,'真空光速不變是狹義相對論的基本原理之一。此敘述限定慣性參考系。'],
['廣義相對論如何描述重力？',['只是物體顏色','只是空氣阻力','與時空幾何的彎曲相關'],2,'物質與能量影響時空幾何，物體沿時空中的路徑運動。遊戲網格是視覺比喻。']]
};
const cursors = {};
function nextQuestion(id) {
 const bank=QUESTIONS[id]; if(!bank) throw new Error('缺少此角色的學習題目');
 const index=cursors[id]||0;cursors[id]=(index+1)%bank.length;
 const [question,choices,answer,explanation]=bank[index];
 // Rotate option positions without changing the explanation or correct answer.
 const offset=(index+id.length)%choices.length;
 return {id:id+'-'+index,question,choices:choices.map((_,i)=>choices[(i+offset)%choices.length]),answer:(answer-offset+choices.length)%choices.length,explanation};
}
function randomQuestion(random=Math.random) {
 const ids=Object.keys(QUESTIONS),id=ids[Math.floor(random()*ids.length)];
 const index=Math.floor(random()*QUESTIONS[id].length),[question,choices,answer,explanation]=QUESTIONS[id][index];
 const offset=Math.floor(random()*3);
 return {id:id+'-'+index,question,choices:choices.map((_,i)=>choices[(i+offset)%3]),answer:(answer-offset+3)%3,explanation};
}
class LearningRace {
 constructor(question,{mode='local',random=Math.random,duration=10}={}) {
  this.question=question;this.mode=mode;this.remaining=duration;this.elapsed=0;this.winner=null;this.done=false;
  this.answers=[null,null];this.events=[];
  this.cpuTime=2.5+random()*3;
  this.cpuChoice=random()<.7?question.answer:(question.answer+1+Math.floor(random()*2))%3;
 }
 answer(player,choice) {
  if(this.done || ![0,1].includes(player) || ![0,1,2].includes(choice) || this.answers[player]!==null || (this.mode==='practice' && player===1)) return false;
  const correct=choice===this.question.answer;
  this.answers[player]={choice,correct};this.events.push({player,correct,choice});
  if(correct){this.winner=player;this.done=true;}
  else if(this.answers[0] && (this.answers[1] || this.mode==='practice'))this.done=true;
  return true;
 }
 step(dt) {
  if(this.done || !Number.isFinite(dt) || dt<=0)return;
  const end=this.elapsed+dt;
  // A scheduled CPU response precedes timeout if its deadline is reached first.
  if(this.mode==='cpu' && !this.answers[1] && this.cpuTime<=end && this.cpuTime<=this.elapsed+this.remaining) this.answer(1,this.cpuChoice);
  this.elapsed=end;this.remaining=Math.max(0,this.remaining-dt);
  if(this.remaining===0)this.done=true;
 }
}
Object.assign(globalThis.PhysicsArena,{QUESTIONS,nextQuestion,randomQuestion,LearningRace});
})();
