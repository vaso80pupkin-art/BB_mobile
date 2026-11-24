function spawnEnemy(type,x,z,floorY=0){
  if(!scene) return;
  const g = new THREE.Group();
  let hp=50,maxHp=50,speed=0.07,attackRange=2.4,cooldown=1.6;
  let detectionRange=10,echoes=15,radius=0.7,damage=15;
  let legs = null;

  if(type==='spider'){
    const mat = new THREE.MeshStandardMaterial({color:0x3a2e22, roughness:0.95});
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.75,14,14),mat);
    body.position.y = 0.75; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55,12,12),mat);
    head.position.set(0,0.8,0.65); head.castShadow = true; g.add(head);
    const eyeMat = new THREE.MeshBasicMaterial({color:0xdd2222});
    for(let i=-1;i<=1;i+=2){
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.14,10,10),eyeMat);
      e.position.set(i*0.22,0.9,0.95); g.add(e);
    }
    /* === СОЧЛЕНЁННЫЕ ЛАПЫ ПАУКА (8 лап) === */
    const legMat = new THREE.MeshStandardMaterial({color:0x221a10,roughness:0.95});
    legs = [];
    for(let i=0;i<8;i++){
      const side = i < 4 ? 1 : -1;
      const legIdx = i % 4;
      const zOffset = (legIdx - 1.5) * 0.32;

      const hip = new THREE.Group();
      hip.position.set(side * 0.55, 0.75, zOffset);

      const upperLegGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.85, 6);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = 0.425; 
      upperLeg.rotation.z = side * (Math.PI / 3.2);
      upperLeg.rotation.x = (legIdx - 1.5) * -0.15;
      upperLeg.castShadow = true;
      hip.add(upperLeg);

      const knee = new THREE.Group();
      knee.position.y = 0.85;
      const lowerLegGeo = new THREE.CylinderGeometry(0.035, 0.018, 1.0, 6);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -0.5; 
      lowerLeg.rotation.z = -side * (Math.PI / 2.6);
      lowerLeg.castShadow = true;
      knee.add(lowerLeg);

      upperLeg.add(knee);
      g.add(hip);
      legs.push({hip, knee, side});
    }
    hp = maxHp = 45; speed = 0.08; attackRange = 3.6; cooldown = 1.6;
    detectionRange = 14; echoes = 15; radius = 2.1; damage = 12;
  } else if(type==='beast'){
    const mat = new THREE.MeshStandardMaterial({color:0x4a3a2a,roughness:0.95});
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.5,16,16),mat);
    body.position.y = 1.8; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.1,14,14),mat);
    head.position.set(0,3.1,0.75); head.castShadow = true; g.add(head);
    const eyeMat = new THREE.MeshBasicMaterial({color:0xdd2222});
    for(let i=-1;i<=1;i+=2){
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.22,12,12),eyeMat);
      e.position.set(i*0.42,3.3,1.15); g.add(e);
    }
    /* === СОЧЛЕНЁННЫЕ ЛАПЫ ЗВЕРЯ (4 лапы) === */
    const legMat = new THREE.MeshStandardMaterial({color:0x2e1e10,roughness:0.95});
    legs = [];
    for(let i=0;i<4;i++){
      for(let s=-1;s<=1;s+=2){
        const hip = new THREE.Group();
        hip.position.set(s*0.95, 1.5, -0.65+i*0.55);

        const upperLegGeo = new THREE.CylinderGeometry(0.18,0.15,0.85,10);
        const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
        upperLeg.position.y = -0.425;
        upperLeg.rotation.z = s * 0.28;
        upperLeg.castShadow = true;
        hip.add(upperLeg);

        const knee = new THREE.Group();
        knee.position.y = -0.85;
        const lowerLegGeo = new THREE.CylinderGeometry(0.15,0.12,1.1,10);
        const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
        lowerLeg.position.y = -0.55;
        lowerLeg.castShadow = true;
        knee.add(lowerLeg);

        upperLeg.add(knee);
        g.add(hip);
        legs.push({hip, knee, side: s, isFront: i < 2});
      }
    }
    hp = maxHp = 90; speed = 0.07; attackRange = 3; cooldown = 2.2;
    detectionRange = 12; echoes = 35; radius = 1.4; damage = 22;
  } else if(type==='hunter'){
    const mat = new THREE.MeshStandardMaterial({color:0x3a3a4a,roughness:0.9});
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.5,1.4,14),mat);
    body.position.y = 1.3; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35,12,12),new THREE.MeshStandardMaterial({color:0x6a6a7a}));
    head.position.y = 2.3; head.castShadow = true; g.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.06,14),new THREE.MeshStandardMaterial({color:0x181820}));
    hat.position.y = 2.6; g.add(hat);

    /* === СОЧЛЕНЁННЫЕ РУКИ ОХОТНИКА === */
    legs = []; 
    const armMat = new THREE.MeshStandardMaterial({color:0x2a2a3a, roughness:0.9});
    const rShoulder = new THREE.Group();
    rShoulder.position.set(0.5, 1.95, 0.15);
    const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.11,0.55,10), armMat);
    rUpper.position.y = -0.275;
    rUpper.castShadow = true;
    rShoulder.add(rUpper);
    const rElbow = new THREE.Group();
    rElbow.position.y = -0.55;
    const rLower = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.09,0.55,10), armMat);
    rLower.position.y = -0.275;
    rLower.castShadow = true;
    rElbow.add(rLower);
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08),
      new THREE.MeshStandardMaterial({color:0x999aa8, metalness:0.9, roughness:0.25}));
    sword.position.y = -0.6;
    rLower.add(sword);
    rUpper.add(rElbow);
    g.add(rShoulder);
    legs.push({hip: rShoulder, knee: rElbow, side: 1, isArm: true, isFront: true});

    const lShoulder = new THREE.Group();
    lShoulder.position.set(-0.5, 1.95, 0.15);
    const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.11,0.55,10), armMat);
    lUpper.position.y = -0.275;
    lUpper.castShadow = true;
    lShoulder.add(lUpper);
    const lElbow = new THREE.Group();
    lElbow.position.y = -0.55;
    const lLower = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.09,0.55,10), armMat);
    lLower.position.y = -0.275;
    lLower.castShadow = true;
    lElbow.add(lLower);
    lUpper.add(lElbow);
    g.add(lShoulder);
    legs.push({hip: lShoulder, knee: lElbow, side: -1, isArm: true, isFront: false});

    hp = maxHp = 80; speed = 0.1; attackRange = 2.8; cooldown = 1.4;
    detectionRange = 13; echoes = 45; radius = 0.8; damage = 25;
  }

  const ngMult = 1 + player.ngPlus * 0.5;
  hp = maxHp = Math.floor(hp * ngMult);
  damage = Math.floor(damage * ngMult);
  echoes = Math.floor(echoes * (1 + player.ngPlus * 0.7));

  const hpBar = addHPBar(g,type==='beast'?2.4:(type==='spider'?2.25:1.5));
  g.position.set(x,floorY,z);
  scene.add(g);
  const enemy = {
    mesh:g,type,hp,maxHp,speed,attackRange,cooldown,lastAttack:0,detected:false,
    detectionRange,radius,echoes,hpBar,state:'idle',stateTime:0,stunned:0,damage,
    homeX:x,homeY:floorY,homeZ:z,floorY, attackWindup:0.4, lastAttackStartTime:0, canParry: true, burning:0,
    legs: legs,
    animPhase: Math.random() * Math.PI * 2
  };
  if(type==='beast') enemy.visualModelKey='paladin';
  if(type==='hunter') enemy.visualModelKey='skullHunter';
  enemies.push(enemy);
  if(type === 'spider') attachSpiderModel(enemy);
  else if(type === 'hunter') requestEnemyVisualModel('skullHunter');
  else if(type === 'beast') requestEnemyVisualModel('paladin');
}
function spawnBoss(name,x,z,floorY=0){
  if(!scene) return;
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:0x3a2e22,roughness:0.98,metalness:0.05});
  const body = new THREE.Mesh(new THREE.SphereGeometry(5,18,18),mat);
  body.position.y = 6.5; body.scale.set(1,1.15,2.2); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.7,16,16),mat);
  head.position.set(0,11,5.5); head.castShadow = true; g.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({color:0xdd2222});
  for(let i=-1;i<=1;i+=2){
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.5,12,12),eyeMat);
    e.position.set(i*1.2,11.8,7.4); g.add(e);
  }
  const hornMat = new THREE.MeshStandardMaterial({color:0x1e1810,roughness:0.8,metalness:0.2});
  for(let i=-1;i<=1;i+=2){
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.85,7,12),hornMat);
    h.position.set(i*1.5,14.5,5.5); h.rotation.z = i*0.65; h.castShadow = true; g.add(h);
  }
  /* === СОЧЛЕНЁННЫЕ ЛАПЫ БОССА (4 лапы) === */
  const legMat = new THREE.MeshStandardMaterial({color:0x2e2210,roughness:0.95});
  const legs = [];
  for(let i=0;i<4;i++){
    for(let s=-1;s<=1;s+=2){
      const hip = new THREE.Group();
      hip.position.set(s*3.2, 6.0, -1.8+i*2.2);

      const upperLegGeo = new THREE.CylinderGeometry(1.15,1.05,3.5,12);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = -1.75;
      upperLeg.rotation.z = s * 0.2;
      upperLeg.castShadow = true;
      hip.add(upperLeg);

      const knee = new THREE.Group();
      knee.position.y = -3.5;
      const lowerLegGeo = new THREE.CylinderGeometry(1.05,0.9,4.5,12);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -2.25;
      lowerLeg.castShadow = true;
      knee.add(lowerLeg);

      upperLeg.add(knee);
      g.add(hip);
      legs.push({hip, knee, side: s, isFront: i < 2});
    }
  }
  const hpBar = addHPBar(g,6.5);
  g.position.set(x,floorY,z);
  scene.add(g);
  const ngMult = 1 + player.ngPlus * 0.5;
  const bossEnemy={
    mesh:g,type:'boss',name,hp:Math.floor(500*ngMult),maxHp:Math.floor(500*ngMult),speed:0.05,
    attackRange:6,cooldown:2.8,lastAttack:0,detected:false,
    detectionRange:18,radius:4,echoes:Math.floor(800*(1+player.ngPlus*0.7)),hpBar,
    state:'idle',stateTime:0,stunned:0,damage:Math.floor(45*ngMult),
    phase2:false,material:mat,homeX:x,homeY:floorY,homeZ:z,floorY,
    attackWindup:0.55, lastAttackStartTime:0, canParry: false,
    phase: 1, phase2Unlocked: false, burning:0,
    legs: legs,
    animPhase: Math.random() * Math.PI * 2
  };
  bossEnemy.visualModelKey = name==='CLERIC BEAST' ? 'paladin'
    : name==='BLOOD-STARVED BEAST' ? 'paladin'
    : name==='SHADOW OF YHARNAM' ? 'skullHunter'
    : name==='MOON PRESENCE' ? 'moonPresence' : '';
  enemies.push(bossEnemy);
  if(bossEnemy.visualModelKey==='skullHunter') requestEnemyVisualModel('skullHunter');
  else if(bossEnemy.visualModelKey) requestEnemyVisualModel(bossEnemy.visualModelKey);
}
function spawnChest(x,z,floorY=0){
  if(!scene) return;
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:0x8a6828,metalness:0.85,roughness:0.4});
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.75,0.9),mat);
  base.position.y = 0.38; base.castShadow = true; g.add(base);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.35,0.22,0.95),mat);
  lid.position.y = 0.82; g.add(lid);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.22,0.08), new THREE.MeshStandardMaterial({color:0xddb800,metalness:1,roughness:0.2}));
  lock.position.set(0,0.63,0.46); g.add(lock);
  const glow = new THREE.PointLight(0xddb800,1.0,5,2);
  glow.position.set(0,0.95,0); g.add(glow);
  g.position.set(x,floorY,z);
  const loots = [
    {type:'vial',amount:3},
    {type:'bullet',amount:5},
    {type:'shards',amount:1 + Math.floor(Math.random()*2)},
    {type:'gem',gem:BLOOD_GEMS[Math.floor(Math.random()*BLOOD_GEMS.length)]},
    {type:'tool',tool:['molotov','knife','firepaper'][Math.floor(Math.random()*3)],amount: 1 + Math.floor(Math.random()*2)}
  ];
  g.userData = {opened:false, loot:loots[Math.floor(Math.random()*loots.length)]};
  scene.add(g);
  chests.push({mesh:g,...g.userData});
}
function spawnLantern(x,z,isRespawn=false,floorY=0){
  if(!scene) return null;
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:0x302921,metalness:0.72,roughness:0.46});
  const trimMat = new THREE.MeshStandardMaterial({color:0x76552c,metalness:0.76,roughness:0.34});
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.5,1.2,10),mat);
  base.position.y = 0.6; base.castShadow = true; g.add(base);
  const baseTrim = new THREE.Mesh(new THREE.TorusGeometry(0.38,0.055,7,16),trimMat);
  baseTrim.rotation.x = Math.PI/2; baseTrim.position.y = 1.08; g.add(baseTrim);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.14,5.5,10),mat);
  pole.position.y = 3.95; pole.castShadow = true; g.add(pole);
  const glassMat = new THREE.MeshStandardMaterial({color:0x603818,emissive:0xff8a24,emissiveIntensity:0.24,transparent:true,opacity:0.58,roughness:0.32,side:THREE.DoubleSide,depthWrite:false});
  const lowerBand = new THREE.Mesh(new THREE.BoxGeometry(0.72,0.12,0.72),trimMat);lowerBand.position.y=6.55;g.add(lowerBand);
  const upperBand = new THREE.Mesh(new THREE.BoxGeometry(0.72,0.12,0.72),trimMat);upperBand.position.y=7.54;g.add(upperBand);
  for(const [x,z] of [[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3],[0.3,0.3]]){
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.045,1.0,7),trimMat);post.position.set(x,7.05,z);post.castShadow=true;g.add(post);
  }
  const paneGeometry = new THREE.PlaneGeometry(0.56,0.78);
  for(const [x,z,yaw] of [[0,0.31,0],[0,-0.31,Math.PI],[0.31,0,Math.PI/2],[-0.31,0,-Math.PI/2]]){
    const pane = new THREE.Mesh(paneGeometry,glassMat);pane.position.set(x,7.05,z);pane.rotation.y=yaw;g.add(pane);
  }
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.67,0.055,0.67),trimMat);crossbar.position.y=7.05;g.add(crossbar);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.13,10,8),new THREE.MeshBasicMaterial({color:0xff972f}));flame.position.y=7.05;g.add(flame);
  const light = new THREE.PointLight(isRespawn?0xddc088:0xdd9933, isRespawn?4.0:2.8, isRespawn?22:18, 2);
  light.position.y = 7.05; light.castShadow = false; g.add(light);
  const glowSprite = new THREE.Sprite(getLanternGlowMaterial().clone());
  glowSprite.position.y = 7.05;
  glowSprite.scale.set(isRespawn?4.2:3.3,isRespawn?4.2:3.3,1);
  glowSprite.renderOrder = 2;
  g.add(glowSprite);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.5,0.52,4),mat);top.rotation.y=Math.PI/4;
  top.position.y = 7.7; top.castShadow = true; g.add(top);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),trimMat);finial.position.y=8.0;g.add(finial);
  g.position.set(x,floorY,z);
  scene.add(g);
  lanterns.push({mesh:g,light,glow:glowSprite,baseIntensity:isRespawn?4.0:2.8,isRespawn});
  return lanterns[lanterns.length-1];
}

function setupMenuScene(){
  if(!scene) return;
  clearWorld();
  gameMode = GameMode.MENU;
  currentFloorIndex=0;
  currentSkyColor = BASE_SKY_MENU;
  currentFogDensity = 0.02;
  scene.background = new THREE.Color(currentSkyColor).multiplyScalar(skyBrightness);
  scene.fog = new THREE.FogExp2(currentSkyColor, currentFogDensity);
  scene.fog.color.copy(scene.background);
  createCobblestoneFloor(30, -15, -15);

  const wallPositions = [
    [-8, -6], [8, -6], [-8, 6], [8, 6],
    [-12, 0], [12, 0], [0, -10], [0, 10]
  ];
  wallPositions.forEach(([x, z]) => {
    createGothicWall(x, 2.0, z, 3.0, 4, 3.0, true);
  });

  if(hunter){
    hunter.position.set(0, 0, 0);
    hunter.rotation.y = Math.PI;
    hunter.rotation.x = 0;
  }
  camera.position.set(0, 7.2, 12.6);
  camera.lookAt(0, 4.6, 0);

  const menuLight = new THREE.PointLight(0xdd7733, 2.2, 22, 2);
  menuLight.position.set(3, 4, 3);
  scene.add(menuLight);
  envObjects.push({mesh:menuLight});
  const menuLight2 = new THREE.PointLight(0x4455aa, 1.5, 22, 2);
  menuLight2.position.set(-3, 4, -3);
  scene.add(menuLight2);
  envObjects.push({mesh:menuLight2});

  spawnDustMotes(30);
  menuOrbitTime = 0;
  applyBrightness();
}

function loadLocation(idx){
  idx=Math.max(0,Math.min(LOCATIONS.length-1,idx|0));
  if(!canEnterLocation(idx)){notify('СЮЖЕТНЫЙ ПУТЬ ЕЩЁ ЗАКРЫТ');return false;}
  clearWorld();
  gameMode = GameMode.PLAYING;
  currentLocation = idx;
  currentFloorIndex=0; lastRoomNotice='';
  stageBounds={minX:-STAGE_WORLD_WIDTH/2,minZ:-STAGE_WORLD_DEPTH/2,maxX:STAGE_WORLD_WIDTH/2,maxZ:STAGE_WORLD_DEPTH/2};
  const mood = LOCATION_MOODS[idx] || LOCATION_MOODS[0];
  currentSkyColor = mood.sky;
  currentFogDensity = mood.fog*0.62;
  scene.background = new THREE.Color(currentSkyColor).multiplyScalar(skyBrightness);
  scene.fog = new THREE.FogExp2(currentSkyColor, currentFogDensity);
  scene.fog.color.copy(scene.background);

  $('locName').textContent = LOCATIONS[idx];
  $('locName').classList.remove('show'); void $('locName').offsetWidth;
  $('locName').classList.add('show');
  $('bossWrap').classList.remove('show');
  const ox=stageBounds.minX,oz=stageBounds.minZ;
  const mountainRoute=idx===2?getMountainRouteLayout(ox,oz):null;
  const floorRooms=[buildStageFloor(idx,0,ox,oz),buildStageFloor(idx,1,ox,oz)];
  const stairSpecs=[
    {col:2,row:0,run:28,width:4.8,style:'stone'},
    {col:0,row:1,run:25,width:4.6,style:'wood'},
    {col:4,row:0,run:28,width:3.4,style:'rope'}
  ];
  const stairHoles=stairSpecs.map(spec=>{
    const roomX=ox+spec.col*ROOM_WORLD_SIZE,roomZ=oz+spec.row*ROOM_WORLD_SIZE;
    spec.x=roomX+ROOM_WORLD_SIZE/2;spec.z=roomZ+12;
    return {x0:spec.x-spec.width/2-0.8,x1:spec.x+spec.width/2+0.8,z0:spec.z-1,z1:spec.z+spec.run+1};
  });
  const elevatorX=ox+3*ROOM_WORLD_SIZE+ROOM_WORLD_SIZE/2;
  const elevatorZ=oz+ROOM_WORLD_SIZE+ROOM_WORLD_SIZE/2;
  stairHoles.push({x0:elevatorX-3.25,x1:elevatorX+3.25,z0:elevatorZ-3.25,z1:elevatorZ+3.25});
  const lowerFloorOpenings=mountainRoute?[mountainRoute.wellOpening,mountainRoute.spiralOpening]:[];
  mountainFloorVoids=lowerFloorOpenings;
  const upperFloorHoles=stairHoles.concat(mountainRoute?mountainRoute.fallOpenings:[]);
  const floorMargin=10;
  const floorSegmentSpacing=idx===2?6:3;
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[0],lowerFloorOpenings,false,floorSegmentSpacing);
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[1],upperFloorHoles,false,floorSegmentSpacing);
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[1]-1.5,upperFloorHoles,true,floorSegmentSpacing);
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[0]+FLOOR_HEIGHT-1.5,stairHoles,true,floorSegmentSpacing);
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[1]+FLOOR_HEIGHT-1.5,[],true,floorSegmentSpacing);
  stairSpecs.forEach(spec=>addWalkableStaircase(spec.x,spec.z,FLOOR_LEVELS[0],FLOOR_LEVELS[1],spec.run,spec.width,spec.style));
  addStageElevator(elevatorX,elevatorZ,FLOOR_LEVELS[0],FLOOR_LEVELS[1]);
  const shortcutX=ox+2.5*ROOM_WORLD_SIZE,shortcutZ=oz+ROOM_WORLD_SIZE;
  for(let floor=0;floor<FLOOR_LEVELS.length;floor++) addShortcutGate(shortcutX,shortcutZ,FLOOR_LEVELS[floor],idx,floor);
  if(idx===0) buildOedonChapelFoyer(floorRooms[0][0],FLOOR_LEVELS[0]);
  scatterCryptAtmosphere(floorRooms,idx);
  buildLocationLandmarks(idx,ox,oz);
  buildCampaignTargets(idx,ox,oz);
  if(idx===2) buildMountainRoute(ox,oz);
  buildRegionalVisuals(idx,floorRooms,ox,oz);
  createDistantHorizon(idx);
  rebuildWallCollisionGrid();
  spawnDustMotes(60);
  const startRoom=floorRooms[0][0];
  const spawnX=idx===0?startRoom.roomX+cellSize*3.5:ox+cellSize*1.5;
  const spawnZ=idx===0?startRoom.roomZ+cellSize*3.5:oz+cellSize*1.5;
  spawnLantern(spawnX+2.4,spawnZ+1.0,true,FLOOR_LEVELS[0]);
  player.respawnPoint={x:spawnX,z:spawnZ,y:FLOOR_LEVELS[0],loc:idx,floor:0};
  if(hunter){
    hunter.position.set(spawnX,FLOOR_LEVELS[0],spawnZ);
    hunter.rotation.x = 0;
    hunter.rotation.y = Math.PI;
  }
  camera.position.set(spawnX,FLOOR_LEVELS[0]+cameraHeight,spawnZ+cameraDistance);
  cameraAngle = 0;
  const bossNames=['CLERIC BEAST','BLOOD-STARVED BEAST','SHADOW OF YHARNAM','MOON PRESENCE'];
  const enemyPalettes=[
    ['spider','spider','spider','beast'],
    ['spider','beast','beast','hunter'],
    ['beast','hunter','hunter','spider'],
    ['hunter','beast','spider','hunter']
  ];
  for(let floor=0;floor<FLOOR_LEVELS.length;floor++){
    for(const room of floorRooms[floor]){
      const index=room.roomIndex,isStart=floor===0&&index===0,isBoss=floor===1&&index===ROOMS_PER_FLOOR-1;
      if(isStart) continue;
      const point=roomSpawnPoint(room,(idx+1)*100003+(floor+1)*19997+(index+1)*7919);
      if(!isBoss){
        const palette=enemyPalettes[idx]||enemyPalettes[0];
        const type=palette[(index+floor*2)%palette.length];
        spawnEnemy(type,point.x,point.z,room.floorY);
      }
      if(index%2===1&&!isBoss){
        const chestPoint=roomSpawnPoint(room,(idx+1)*65537+(floor+1)*8123+index*1973);
        spawnChest(chestPoint.x,chestPoint.z,room.floorY);
      }
      if((floor===0&&index===4)||(floor===1&&index===4)){
        spawnLantern(point.x,point.z,false,room.floorY);
      }
    }
  }
  const centralStair=stairSpecs[0];
  spawnLantern(centralStair.x,centralStair.z+centralStair.run+2,false,FLOOR_LEVELS[1]);
  const bossRoom=floorRooms[1][ROOMS_PER_FLOOR-1];
  const bossCell=Math.floor(mazeSize/2)+0.5;
  const bx=bossRoom.roomX+bossCell*cellSize;
  const bz=bossRoom.roomZ+bossCell*cellSize;
  if(idx===3) buildCastleInterior(floorRooms,bossRoom);
  spawnBoss(idx===3?'ПАУЧЬЯ МАТРИАРХА':(bossNames[idx]||bossNames[0]),bx,bz,FLOOR_LEVELS[1]);
  if(idx<2)addCampaignExit(idx+1,bx-3,bz,FLOOR_LEVELS[1]);
  updateStageLocationLabel(true);

  if(bloodStain && bloodStain.loc === idx){
    createBloodStain(bloodStain.x,bloodStain.z,bloodStain.echoes,bloodStain.loc,bloodStain.floorY||0);
  }

  worldTutorialTimers=[2500,5500,8500].map((delay,i)=>setTimeout(()=>showTutorial(['Свайп по пустой части — поворот камеры','Двойной тап — захват цели','Заряжайте атаку для ×3 урона!'][i]),delay));
  applyBrightness();
}
