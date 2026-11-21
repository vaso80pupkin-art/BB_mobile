function initScene(){
  if(sceneInitialized) return;
  sceneInitialized = true;
  const c = $('canvas-container');
  if(!c){ console.error('[BB] canvas-container not found'); return; }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(BASE_SKY_LANDSCAPE);
  scene.fog = new THREE.FogExp2(BASE_SKY_LANDSCAPE, 0.028);

  camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.1, 1000);
  camera.position.set(0, 4, 8);

  const mobileQuality = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth,innerHeight) < 600;
  renderer = new THREE.WebGLRenderer({antialias:!mobileQuality, powerPreference:'high-performance'});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobileQuality ? 1.25 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  if(THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  c.appendChild(renderer.domElement);

  lightingRefs.ambient = new THREE.AmbientLight(0x223344, 0.22);
  scene.add(lightingRefs.ambient);
  lightingRefs.hemi = new THREE.HemisphereLight(0x334455, 0x0a0510, 0.32);
  scene.add(lightingRefs.hemi);

  lightingRefs.moon = new THREE.DirectionalLight(0x7088bb, 0.55);
  lightingRefs.moon.position.set(-20, 40, -50);
  lightingRefs.moon.castShadow = true;
  lightingRefs.moon.shadow.mapSize.set(mobileQuality ? 1024 : 2048, mobileQuality ? 1024 : 2048);
  lightingRefs.moon.shadow.camera.left = -170; lightingRefs.moon.shadow.camera.right = 170;
  lightingRefs.moon.shadow.camera.top = 105; lightingRefs.moon.shadow.camera.bottom = -105;
  lightingRefs.moon.shadow.bias = -0.0005;
  scene.add(lightingRefs.moon);

  lightingRefs.rim = new THREE.DirectionalLight(0x9aa9c4, 0.28);
  lightingRefs.rim.position.set(10, 15, -20);
  scene.add(lightingRefs.rim);

  lightingRefs.fill = new THREE.DirectionalLight(0x445577, 0.18);
  lightingRefs.fill.position.set(5, 10, 25);
  scene.add(lightingRefs.fill);

  lightingRefs.moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(34, 64, 48),
    new THREE.MeshBasicMaterial({color:0xd9e4f1, map:createMoonTexture(), fog:false})
  );
  lightingRefs.moonMesh.position.set(-30, 80, -200);
  scene.add(lightingRefs.moonMesh);
  lightingRefs.glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map:createMoonGlowTexture(), color:0xc8d8ee, transparent:true, opacity:0.28,
    depthWrite:false, fog:false, blending:THREE.AdditiveBlending
  }));
  lightingRefs.glow.scale.set(126,126,1);
  lightingRefs.glow.position.copy(lightingRefs.moonMesh.position);
  scene.add(lightingRefs.glow);

  addEventListener('resize', () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  createRain();
  minimapCtx = $('minimapCanvas').getContext('2d');
  if(player.availableGems.length === 0) player.availableGems = [...BLOOD_GEMS];
  applyBrightness();
}

function createMoonTexture(){
  const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=512;
  const ctx=canvas.getContext('2d');
  const base=ctx.createLinearGradient(0,0,1024,512);
  base.addColorStop(0,'#aeb9c8'); base.addColorStop(0.48,'#e0e5e9'); base.addColorStop(1,'#929eaf');
  ctx.fillStyle=base; ctx.fillRect(0,0,1024,512);
  let seed=918273;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/4294967296;};
  for(let i=0;i<5200;i++){
    const x=rand()*1024,y=rand()*512,r=.35+rand()*2.2;
    ctx.fillStyle=rand()>.52?'rgba(49,60,76,0.075)':'rgba(255,255,255,0.11)';
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  for(let i=0;i<74;i++){
    const x=rand()*1024,y=34+rand()*444,r=4+Math.pow(rand(),1.7)*29,shade=80+Math.floor(rand()*42);
    const crater=ctx.createRadialGradient(x-r*.2,y-r*.22,r*.06,x,y,r);
    crater.addColorStop(0,`rgba(${shade-14},${shade-7},${shade+5},0.36)`);
    crater.addColorStop(.66,`rgba(${shade},${shade+7},${shade+17},0.25)`);
    crater.addColorStop(.82,'rgba(247,249,251,0.38)'); crater.addColorStop(1,'rgba(62,72,88,0.26)');
    ctx.fillStyle=crater; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(245,248,252,0.28)'; ctx.lineWidth=Math.max(1,r*.055);
    ctx.beginPath(); ctx.arc(x-r*.05,y-r*.05,r*.78,Math.PI*1.03,Math.PI*1.84); ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  if(THREE.sRGBEncoding!==undefined) texture.encoding=THREE.sRGBEncoding;
  return texture;
}

function createMoonGlowTexture(){
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  const glow=ctx.createRadialGradient(128,128,16,128,128,128);
  glow.addColorStop(0,'rgba(215,229,248,0.55)'); glow.addColorStop(.22,'rgba(190,210,240,0.28)');
  glow.addColorStop(.55,'rgba(150,180,220,0.09)'); glow.addColorStop(1,'rgba(120,155,205,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,256,256);
  const texture=new THREE.CanvasTexture(canvas);
  if(THREE.sRGBEncoding!==undefined) texture.encoding=THREE.sRGBEncoding;
  return texture;
}

function createRain(){
  if(!scene) return;
  const rainGeo = new THREE.BufferGeometry();
  const rainCount = matchMedia('(pointer: coarse)').matches ? 420 : 1000;
  const positions = new Float32Array(rainCount * 6);
  rainDrops = [];
  for(let i=0;i<rainCount;i++){
    const k = i*6;
    const x = (Math.random()-0.5) * 100;
    const y = Math.random() * 50;
    const z = (Math.random()-0.5) * 100;
    const length = 0.35 + Math.random()*0.65;
    positions[k] = x; positions[k+1] = y; positions[k+2] = z;
    positions[k+3] = x+0.08; positions[k+4] = y-length; positions[k+5] = z+0.03;
    rainDrops.push({velocity:-1.4-Math.random()*0.8,length});
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rainMat = new THREE.LineBasicMaterial({color:0x91a1b2,transparent:true,opacity:0.24,depthWrite:false});
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  scene.add(rain);
  window._rainMesh = rain;
}
function spawnDustMotes(count=80){
  if(!scene) return;
  const moteCount = matchMedia('(pointer: coarse)').matches ? Math.min(count,32) : count;
  for(let i=0;i<moteCount;i++){
    const geo = new THREE.SphereGeometry(0.02+Math.random()*0.035, 4, 4);
    const mat = new THREE.MeshBasicMaterial({color:0xaeb3bd, transparent:true, opacity:0.20});
    const m = new THREE.Mesh(geo, mat);
    const floorY=FLOOR_LEVELS[Math.floor(Math.random()*FLOOR_LEVELS.length)];
    m.position.set(stageBounds.minX+Math.random()*STAGE_WORLD_WIDTH,floorY+0.5+Math.random()*9,stageBounds.minZ+Math.random()*STAGE_WORLD_DEPTH);
    scene.add(m);
    dustMotes.push({mesh:m, vy:0.05+Math.random()*0.1, vx:(Math.random()-0.5)*0.08, vz:(Math.random()-0.5)*0.08, phase:Math.random()*Math.PI*2});
  }
}

function createHunter(){
  if(hunter || !scene) return;
  hunter = new THREE.Group();
  hunterMotionPivot = new THREE.Group();
  hunterMotionPivot.position.y = 1.4;
  hunter.add(hunterMotionPivot);
  hunterVisualRoot = new THREE.Group();
  hunterVisualRoot.position.y = -1.4;
  hunterMotionPivot.add(hunterVisualRoot);
  const coatMat = new THREE.MeshStandardMaterial({color:0x3a2818, roughness:0.8, metalness:0.15});
  const leatherMat = new THREE.MeshStandardMaterial({color:0x4a3e30, roughness:0.85, metalness:0.1});
  const metalMat = new THREE.MeshStandardMaterial({color:0xc8c8d0, metalness:0.9, roughness:0.2});
  const clothMat = new THREE.MeshStandardMaterial({color:0x1e1408, roughness:0.95});

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,1.3,16),coatMat);
  torso.position.y = 1.25; torso.castShadow = true; hunterVisualRoot.add(torso);
  hunterParts.torso = torso;
  const coatBack = new THREE.Mesh(new THREE.BoxGeometry(0.95,1.7,0.2),coatMat);
  coatBack.position.set(0,0.65,-0.6); coatBack.rotation.x = 0.3; coatBack.castShadow = true;
  hunterVisualRoot.add(coatBack); hunterParts.coatBack = coatBack;
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.12,1.1,0.05),clothMat);
  strap.position.set(0.12,1.45,0.45); strap.rotation.z = 0.5; hunterVisualRoot.add(strap);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.15,0.08),metalMat);
  buckle.position.set(0.12,1.45,0.49); buckle.rotation.z = 0.5; hunterVisualRoot.add(buckle);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.52,0.15,16),leatherMat);
  belt.position.y = 0.72; hunterVisualRoot.add(belt);
  const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.08),metalMat);
  beltBuckle.position.set(0,0.72,0.5); hunterVisualRoot.add(beltBuckle);
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.35,0.2),leatherMat);
  pouch.position.set(-0.45,0.58,0.22); pouch.rotation.y = -0.3; hunterVisualRoot.add(pouch);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.45,16), new THREE.MeshStandardMaterial({color:0x8a7868, roughness:0.85}));
  head.position.y = 2.15; head.castShadow = true; hunterVisualRoot.add(head);
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.08,20),leatherMat);
  hatBrim.scale.set(1,1,0.9); hatBrim.position.y = 2.42; hatBrim.castShadow = true; hunterVisualRoot.add(hatBrim);
  const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.45,0.55,16),leatherMat);
  hatTop.position.y = 2.72; hatTop.castShadow = true; hunterVisualRoot.add(hatTop);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.12,0.62,14),coatMat);
  rightArm.position.set(0.48,1.75,0.25); rightArm.rotation.x = -0.35; rightArm.castShadow = true;
  hunterVisualRoot.add(rightArm); hunterParts.rightArm = rightArm;

  const weapon = new THREE.Group();
  weapon.position.set(0.52,1.38,0.48); weapon.rotation.x = -Math.PI/3;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.065,0.75,14),leatherMat);
  handle.rotation.x = Math.PI/2; weapon.add(handle);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.07,0.12),metalMat);
  guard.position.set(0,0.38,0); weapon.add(guard);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22,1.2,0.07),metalMat);
  blade.position.set(0,0.95,0); blade.rotation.x = Math.PI/2; blade.castShadow = true; weapon.add(blade);
  for(let i=0;i<10;i++){
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.055,0.18,8),metalMat);
    t.position.set(-0.035,0.58+i*0.12,0.09); t.rotation.z = Math.PI/2.5; t.castShadow = true; weapon.add(t);
  }
  hunterParts.weaponBlade = blade;
  hunterVisualRoot.add(weapon); hunterParts.weapon = weapon;
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.12,0.62,14),coatMat);
  leftArm.position.set(-0.48,1.75,0.25); leftArm.rotation.x = -0.35; leftArm.castShadow = true;
  hunterVisualRoot.add(leftArm); hunterParts.leftArm = leftArm;
  const gun = new THREE.Group();
  gun.position.set(-0.52,1.38,0.48); gun.rotation.x = -Math.PI/2;
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.16,0.42),metalMat);
  gunBody.castShadow = true; gun.add(gunBody);
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.55,14),metalMat);
  gunBarrel.rotation.x = Math.PI/2; gunBarrel.position.z = 0.48; gunBarrel.castShadow = true; gun.add(gunBarrel);
  hunterVisualRoot.add(gun); hunterParts.gun = gun;
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.14,1.15,14),leatherMat);
  leftLeg.position.set(-0.22,0.52,0); leftLeg.castShadow = true; hunterVisualRoot.add(leftLeg);
  hunterParts.leftLeg = leftLeg;
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.14,1.15,14),leatherMat);
  rightLeg.position.set(0.22,0.52,0); rightLeg.castShadow = true; hunterVisualRoot.add(rightLeg);
  hunterParts.rightLeg = rightLeg;
  scene.add(hunter);
  if(player.weaponMode === 1){
    blade.geometry.dispose();
    blade.geometry = new THREE.BoxGeometry(0.1,1.6,0.06);
    blade.position.y = 1.15;
    $('btnTransform').classList.add('active');
  }
}
