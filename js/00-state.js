/* =========================================================================
   BLOODBORNE: HUNTER'S NIGHTMARE — COMPLETE EDITION
   ========================================================================= */

const GameMode = { MENU:0, DREAM:1, PLAYING:2, DEAD:3, PAUSED:4 };
let gameMode = GameMode.MENU;
let sfxVolume = 0.7;
let musicVolume = 0.35;
let camSensitivity = 1.0;
let invertY = false;
let skyBrightness = 1.0;
let gameBrightness = 1.0;

/* === ИЗМЕНЕНИЕ: Аудио объект для фоновой музыки === */
let musicAudio = new Audio();
let currentMusicTrack = 0;
let musicActive = false;

const player = {
  hp:100, maxHp:100, stamina:100, maxStamina:100,
  level:10, echoes:0, vials:10, bullets:20, maxBullets:20,
  insight: 0, bloodShards: 0, weaponLevel: 0,
  weaponDurability: 100, maxWeaponDurability: 100,
  stats:{vig:10,end:10,str:10,skl:10,blt:10},
  weaponMode:0, isAttacking:false, isDodging:false, isDead:false, isCharging:false,
  attackTime:0, dodgeTime:0, dodgeAngle:0, walkTime:0, invincible:false,
  attackFacing:0, attackHand:1, gunRecoil:0,
  attackBuffer:false, transformBuffer:false, dodgeBuffer:false, currentAttack:null,
  hitStop:0, screenShake:0, timeScale:1, lockedTarget:null,
  dodgeType:'roll', lastAction:null, lastActionTime:0, sprintTime:0,
  comboCount:0, comboTimer:0, rallyHp:0, rallyMaxHp:0, rallyTimer:0,
  transformAttackBuffer:0, respawnPoint:null, seenBosses: {},
  beastMode: false, beastTimer: 0, beastCharge: 0,
  bloodGems: [null, null, null], availableGems: [],
  frenzy: 0, frenzyActive: false, frenzyPulseTimer: 0,
  ngPlus: 0, firePaperTimer: 0,
  deaths: 0, kills: 0, bossesKilled: 0,
  tools: { molotov: 3, knife: 5, firepaper: 2 },
  unlockedLocations: 1, bestKills: 0, maxCombo: 0
};

let bloodStain = null;
const WEAPON_SHARD_COSTS = [1,1,2,2,3,3,4,5,6,8];
const WEAPON_MAX_LEVEL = 10;
const BLOOD_GEMS = [
  {id:'damage', name:'Руна Силы', icon:'⚔', desc:'+20% урона', color:'#dd3838'},
  {id:'speed',  name:'Руна Скорости', icon:'⚡', desc:'+30% скорости', color:'#3888dd'},
  {id:'crit',   name:'Руна Крови', icon:'💀', desc:'+50% крит. урона', color:'#dd38dd'}
];
const ACHIEVEMENTS = [
  {id:'first_kill', name:'Первая кровь', desc:'Убейте первого врага', icon:'🗡'},
  {id:'first_boss', name:'Охотник на чудовищ', desc:'Победите первого босса', icon:'⚔'},
  {id:'beast_mode', name:'Зверь внутри', desc:'Активируйте Beast Mode', icon:'🐺'},
  {id:'parry_king', name:'Мастер парирования', desc:'10 парирований', icon:'🛡'},
  {id:'collector', name:'Коллекционер', desc:'Соберите все 3 самоцвета', icon:'💎'},
  {id:'max_weapon', name:'Мастер оружейник', desc:'Улучшите оружие до +10', icon:'⚒'},
  {id:'insight_5', name:'Прозрение', desc:'Достигните 5 Insight', icon:'👁'},
  {id:'frenzy', name:'Безумие', desc:'Испытайте Frenzy', icon:'🌀'},
  {id:'ng_plus', name:'Новая охота', desc:'Начните NG+', icon:'🌑'},
  {id:'slayer', name:'Кровавый путь', desc:'Убейте 50 врагов', icon:'💀'},
  {id:'combo_10', name:'Серия ударов', desc:'Комбо 10 ударов', icon:'🔥'},
  {id:'perfect_dodge', name:'Тень смерти', desc:'10 идеальных уклонений', icon:'✨'}
];
const BESTIARY = [
  {id:'spider', name:'Паук Ярнама', desc:'Мерзкое существо из подземелий. Быстрое и ядовитое.', icon:'🕷'},
  {id:'beast', name:'Зверь-оборотень', desc:'Бывший человек, обращённый в чудовище. Очень сильный.', icon:'🐺'},
  {id:'hunter', name:'Павший охотник', desc:'Охотник, потерявший рассудок. Опасный противник.', icon:'🗡', art:'CherepKinjalMob.png'},
  {id:'CLERIC BEAST', name:'Зверь-Клерик', desc:'Бывший служитель церкви, превращённый в ужасного зверя.', icon:'⛪'},
  {id:'BLOOD-STARVED BEAST', name:'Зверь, жаждущий крови', desc:'Неистовое чудовище из глубин собора.', icon:'🩸'},
  {id:'SHADOW OF YHARNAM', name:'Тень Ярнама', desc:'Мистические существа, охраняющие запретные места.', icon:'👥'},
  {id:'MOON PRESENCE', name:'Лунное Присутствие', desc:'Внешний бог, управляющий охотой.', icon:'🌕'}
];
let unlockedAchievements = {};
let discoveredBestiary = {};
let perfectDodgeCount = 0;

let scene = null, camera = null, renderer = null, hunter = null, hunterParts = {};
let hunterMotionPivot = null, hunterVisualRoot = null, hunterModelRig = null;
let modelLoader = null, hunterModelSource = null, spiderModelBundle = null;
let spiderFallbackBundle = null, hunterEnemyBundle = null;
let spiderFallbackLoadStarted = false, hunterEnemyLoadStarted = false;
let extraModelBundles = Object.create(null), extraModelLoads = Object.create(null), extraModelFallbacks = Object.create(null);
let hunterVisual = null, hunterVisualBaseY = 0, hunterVisualHeight = 2.8, visualAssetsStarted = false;
let hunterYawGroup = null, hunterMixer = null, hunterModelClips = [], hunterClipMap = null, hunterCurrentAction = null;
let hunterAnimMode = 'none';            // 'none' | 'clips' | 'parts' | 'body'
let hunterPoseState = '', hunterLastAttackT = 0, hunterAttackCombo = 0;
let hunterSwingAxis = null, hunterFwdAxis = null;
let modelFlip = new URLSearchParams(window.location.search).get('flip') === '1';
let hunterModelYaw = null;              // поворот GLB-модели, чтобы «перёд» смотрел по ходу движения
try{ const v = localStorage.getItem('bb_hunter_yaw'); if(v !== null && !isNaN(parseFloat(v))) hunterModelYaw = parseFloat(v); }catch(e){}
if(!modelFlip && hunterModelYaw !== null){
  const normalizedYaw=((hunterModelYaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  modelFlip=Math.abs(normalizedYaw-Math.PI)<0.001;
}
if(modelFlip) hunterModelYaw = Math.PI;
let sceneInitialized = false;
let enemies = [], wallMeshes = [], wallColliders = [], floorMeshes = [], stairs = [], chests = [], lanterns = [], envObjects = [];
let bloodParticles = [], dustMotes = [], rainDrops = [];
let attackTrails = [], parryIndicators = [], toolProjectiles = [];
let ambientCreatures = [], cryptAtmosphereAssets = null;
let shortcutGates = [], stageElevators = [], worldInteractables = [], nearbyWorldInteractable = null;
let bloodStainMesh = null;
let doll = null, workshop = null, waystone = null;
const cellSize = 6;
const mazeSize = 9;
const ROOM_COLS = 5, ROOM_ROWS = 2, ROOMS_PER_FLOOR = ROOM_COLS * ROOM_ROWS;
const FLOOR_HEIGHT = 17, FLOOR_LEVELS = [0, FLOOR_HEIGHT], ROOM_WORLD_SIZE = mazeSize * cellSize;
const STAGE_WORLD_WIDTH = ROOM_COLS * ROOM_WORLD_SIZE, STAGE_WORLD_DEPTH = ROOM_ROWS * ROOM_WORLD_SIZE;
let stageBounds = {minX:-STAGE_WORLD_WIDTH/2,minZ:-STAGE_WORLD_DEPTH/2,maxX:STAGE_WORLD_WIDTH/2,maxZ:STAGE_WORLD_DEPTH/2};
let currentFloorIndex = 0, lastRoomNotice = '';
let currentLocation = 0;
const LOCATIONS = ['ЦЕНТРАЛЬНЫЙ ЯРНАМ','КАФЕДРАЛЬНЫЙ КВАРТАЛ','ЗАПРЕТНЫЙ ЛЕС','КОШМАР МЕНЗИСА'];
let cameraAngle = 0, cameraDistance = 10, cameraHeight = 6;
let gameTime = 0, parryCount = 0;
let minimapCtx = null;
let menuOrbitTime = 0;
let nearbyLantern = null;
let nearbyDoll = false;
let stageChoiceOpen = false;
let moveData = {x:0,y:0,active:false,origin:{x:0,y:0}};

const lightingRefs = {};
const $ = id => document.getElementById(id);
const lerp = (a,b,t) => a + (b-a)*t;

const BASE_SKY_LANDSCAPE = 0x0a0812;
const BASE_SKY_MENU      = 0x0a0812;
const BASE_SKY_DREAM     = 0x18142a;
const BASE_WALL_COLOR    = 0x282534;
const BASE_FLOOR_COLOR   = 0x161420;
const LOCATION_MOODS = [
  {sky:0x0a0d15, fog:0.029},
  {sky:0x12100f, fog:0.027},
  {sky:0x09110f, fog:0.034},
  {sky:0x100c1b, fog:0.030}
];
let currentSkyColor = BASE_SKY_LANDSCAPE;
let currentFogDensity = 0.029;
let surfaceTextures = null;
let lanternGlowMaterial = null;
let horizonAssets = null;

let audioCtx = null, ambientNodes = null, lastFootstepTime = 0, sfxLoadPromise=null, sfxReverb=null, sfxLoadDone=false;
const sfxBuffers=Object.create(null);
const SFX_FILES={
  step1:'step_stone_01.wav',step2:'step_stone_02.wav',step3:'step_stone_03.wav',step4:'step_stone_04.wav',
  swingLight:'swing_light.wav',swingHeavy:'swing_heavy.wav',impact:'impact_flesh.wav',impactHeavy:'impact_heavy.wav',
  parry:'parry_clang.wav',pistol:'pistol.wav',dodge:'dodge.wav',growl:'beast_growl.wav',menu:'menu_click.wav',
  pickup:'item_pickup.wav',lantern:'lantern_clink.wav',wood:'wood_creak.wav',transform:'weapon_transform.wav',ambient:'hall_wind.wav'
};
const SFX_TYPES={
  slash:['swingLight',0.64,0.10],heavy:['swingHeavy',0.72,0.22],gun:['pistol',0.82,0.2],hit:['impact',0.76,0.10],
  crit:['impactHeavy',0.85,0.22],visceral:['impactHeavy',0.95,0.26],alert:['lantern',0.34,0.16],vial:['pickup',0.50,0.18],
  chest:['wood',0.65,0.18],levelup:['pickup',0.67,0.3],roar:['growl',0.85,0.34],break:['impactHeavy',0.65,0.18],
  menu:['menu',0.35,0.06],dream:['pickup',0.40,0.32],transform:['transform',0.7,0.20],rally:['impact',0.32,0.12],
  perfect:['parry',0.68,0.36],lantern:['lantern',0.58,0.28],weaponup:['transform',0.65,0.34],shard:['pickup',0.42,0.24],
  insight:['pickup',0.54,0.35],waystone:['pickup',0.48,0.38],doll:['pickup',0.35,0.28],parry:['parry',0.8,0.42],
  beast:['growl',0.64,0.24],gem:['pickup',0.50,0.28],frenzy:['growl',0.65,0.16],molotov:['swingHeavy',0.42,0.12],
  throw:['swingLight',0.38,0.08],firepaper:['transform',0.40,0.12],ach:['pickup',0.72,0.4],bloop:['menu',0.26,0.03],lock:['menu',0.32,0.04]
};
let _lastRainTime = 0;

function initAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') audioCtx.resume();
  if(!sfxLoadPromise) preloadSoundEffects();
  if(!sfxReverb){
    const length=Math.floor(audioCtx.sampleRate*1.65),impulse=audioCtx.createBuffer(2,length,audioCtx.sampleRate);
    for(let ch=0;ch<2;ch++){
      const data=impulse.getChannelData(ch);
      for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/length,2.8)*0.32;
    }
    sfxReverb=audioCtx.createConvolver(); sfxReverb.buffer=impulse;
    const wet=audioCtx.createGain(); wet.gain.value=0.22;
    sfxReverb.connect(wet); wet.connect(audioCtx.destination);
  }
}
function preloadSoundEffects(){
  sfxLoadPromise=Promise.all(Object.entries(SFX_FILES).map(([key,file])=>
    fetch('./SFX/'+file).then(response=>{if(!response.ok) throw new Error('HTTP '+response.status);return response.arrayBuffer();})
      .then(data=>audioCtx.decodeAudioData(data)).then(buffer=>{sfxBuffers[key]=buffer;})
      .catch(error=>console.warn('[BB] Sound effect unavailable: '+file,error))
  )).then(()=>{
    sfxLoadDone=true;
    if(ambientNodes && ambientNodes.pending){ambientNodes=null;startAmbient();}
  });
  return sfxLoadPromise;
}
function playSfxSample(key,volume=0.6,reverb=0.12,rate=1){
  if(!audioCtx || !sfxBuffers[key]) return false;
  try{
    const source=audioCtx.createBufferSource(),gain=audioCtx.createGain();
    source.buffer=sfxBuffers[key]; source.playbackRate.value=rate;
    gain.gain.setValueAtTime(Math.max(0.0001,volume*sfxVolume),audioCtx.currentTime);
    source.connect(gain); gain.connect(audioCtx.destination);
    if(sfxReverb && reverb>0){const send=audioCtx.createGain();send.gain.value=reverb*volume*sfxVolume;source.connect(send);send.connect(sfxReverb);}
    source.start(); return true;
  }catch(e){return false;}
}
function sfx(type){
  const cfg=SFX_TYPES[type];
  if(!audioCtx || !cfg) return;
  const rate=0.96+Math.random()*0.08;
  playSfxSample(cfg[0],cfg[1],cfg[2],rate);
}
function footstep(running){
  if(!audioCtx) return;
  const now = performance.now();
  if(now - lastFootstepTime < (running ? 200 : 320)) return;
  lastFootstepTime = now;
  const stair=stairs.find(step=>Math.abs(hunter.position.x-step.x)<=step.width/2+0.8&&hunter.position.z>=step.z&&hunter.position.z<=step.z+step.run);
  if(stair && stair.style!=='stone'){
    playSfxSample('wood',running?0.27:0.22,0.16,0.84+Math.random()*0.18);
    return;
  }
  const key='step'+(1+Math.floor(Math.random()*4));
  playSfxSample(key,running?0.52:0.39,0.12,running?1.06:0.94+Math.random()*0.08);
}
function rollSound(){
  playSfxSample('dodge',0.55,0.18,0.95+Math.random()*0.1);
}
function startAmbient(){
  if(!audioCtx || ambientNodes) return;
  if(!sfxBuffers.ambient){
    if(!sfxLoadDone) ambientNodes={pending:true};
    return;
  }
  try{
    const src=audioCtx.createBufferSource(),gain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
    src.buffer=sfxBuffers.ambient;src.loop=true;filter.type='lowpass';filter.frequency.value=320;filter.Q.value=.65;
    gain.gain.value=.13*sfxVolume;src.connect(filter);filter.connect(gain);gain.connect(audioCtx.destination);src.start();
    ambientNodes={src,gain,filter};
  }catch(e){}
}

/* === ИЗМЕНЕНИЕ: Список треков теперь ссылается на MP3 файлы === */
const MUSIC_TRACKS = [
  { name:'Hunter', file: 'hunter.mp3' },
  { name:'BloodMoon', file: 'BloodMoon.mp3' },
  { name:'2Pac', file: '2Pac.mp3' }
];

function playMusicFile(trackIdx) {
    if(!audioCtx) return;
    stopMusic();
    if (trackIdx < 0 || trackIdx >= MUSIC_TRACKS.length) return;
    if (!musicAudio) musicAudio = new Audio();
    
    const track = MUSIC_TRACKS[trackIdx];
    musicAudio.src = track.file;
    musicAudio.loop = true;
    musicAudio.volume = musicVolume;
    
    musicAudio.play().then(() => {
        musicActive = true;
        currentMusicTrack = trackIdx;
    }).catch(e => console.warn('Music playback failed:', e));
}

function stopMusic() {
    if (musicAudio) {
        musicAudio.pause();
        musicAudio.currentTime = 0;
    }
    musicActive = false;
}

function setMusicTrack(idx) {
    if (idx < 0 || idx >= MUSIC_TRACKS.length) return;
    currentMusicTrack = idx;
    if (musicActive) {
        playMusicFile(idx);
    } else {
        if (!musicAudio) musicAudio = new Audio();
        musicAudio.src = MUSIC_TRACKS[idx].file;
    }
}

const SaveSystem = {
  KEY: 'bloodborne_complete_v1',
  hasSave(){ try{ return !!localStorage.getItem(this.KEY); }catch(e){ return false; } },
  save(){
    try {
      const data = {
        player: {
          hp: player.hp, maxHp: player.maxHp, stamina: player.stamina, maxStamina: player.maxStamina,
          level: player.level, echoes: player.echoes, vials: player.vials, bullets: player.bullets,
          maxBullets: player.maxBullets, insight: player.insight, bloodShards: player.bloodShards,
          weaponLevel: player.weaponLevel, weaponDurability: player.weaponDurability,
          stats: {...player.stats}, weaponMode: player.weaponMode,
          bloodGems: player.bloodGems, availableGems: player.availableGems,
          ngPlus: player.ngPlus, deaths: player.deaths, kills: player.kills, bossesKilled: player.bossesKilled,
          tools: {...player.tools}, unlockedLocations: player.unlockedLocations,
          seenBosses: {...player.seenBosses}, bestKills: player.bestKills, maxCombo: player.maxCombo
        },
        settings: { sfxVolume, musicVolume, camSensitivity, invertY, skyBrightness, gameBrightness, currentMusicTrack },
        currentLocation, achievements: unlockedAchievements, bestiary: discoveredBestiary,
        parryCount, perfectDodgeCount, timestamp: Date.now()
      };
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch(e) { console.warn('Save failed', e); }
  },
  load(){
    try {
      const raw = localStorage.getItem(this.KEY);
      if(!raw) return false;
      const d = JSON.parse(raw);
      Object.assign(player, d.player);
      player.stats = {...d.player.stats};
      player.bloodGems = d.player.bloodGems || [null,null,null];
      player.availableGems = d.player.availableGems || [];
      player.tools = d.player.tools || {molotov:3, knife:5, firepaper:2};
      player.seenBosses = d.player.seenBosses || {};
      if(d.settings){
        sfxVolume = d.settings.sfxVolume ?? sfxVolume;
        musicVolume = d.settings.musicVolume ?? musicVolume;
        camSensitivity = d.settings.camSensitivity ?? camSensitivity;
        invertY = d.settings.invertY ?? invertY;
        skyBrightness = d.settings.skyBrightness ?? skyBrightness;
        gameBrightness = d.settings.gameBrightness ?? gameBrightness;
        currentMusicTrack = d.settings.currentMusicTrack ?? 0;
      }
      currentLocation = d.currentLocation || 0;
      unlockedAchievements = d.achievements || {};
      discoveredBestiary = d.bestiary || {};
      parryCount = d.parryCount || 0;
      perfectDodgeCount = d.perfectDodgeCount || 0;
      return true;
    } catch(e) { console.warn('Load failed', e); return false; }
  },
  clear(){ try{ localStorage.removeItem(this.KEY); }catch(e){} }
};
