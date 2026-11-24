const LOCATION_VISUAL_PALETTES = [
  { wall:0xffffff, floor:0xffffff, ceiling:0x77727b },
  { wall:0xa69a89, floor:0xa99e8e, ceiling:0x77716b },
  { wall:0x8a9ea2, floor:0x89999d, ceiling:0x71828a },
  { wall:0x92839a, floor:0x8d8192, ceiling:0x6c6076 }
];

function getLocationVisualPalette(locationIndex=currentLocation){
  const index=Number.isInteger(locationIndex)?Math.max(0,Math.min(LOCATION_VISUAL_PALETTES.length-1,locationIndex)):0;
  return LOCATION_VISUAL_PALETTES[index];
}

function collectRegionalWallFaces(rooms,seed,skipStartingChapel=false){
  const faces=[],seen=new Set();
  const add=(room,x,y,side)=>{
    const wx=room.roomX+(x+0.5)*cellSize,wz=room.roomZ+(y+0.5)*cellSize;
    let face;
    if(side==='north') face={x:wx,z:room.roomZ+y*cellSize+0.38,yaw:0,nx:0,nz:1};
    else if(side==='south') face={x:wx,z:room.roomZ+(y+1)*cellSize-0.38,yaw:0,nx:0,nz:-1};
    else if(side==='west') face={x:room.roomX+x*cellSize+0.38,z:wz,yaw:Math.PI/2,nx:1,nz:0};
    else face={x:room.roomX+(x+1)*cellSize-0.38,z:wz,yaw:Math.PI/2,nx:-1,nz:0};
    face.floorY=room.floorY;face.roomIndex=room.roomIndex;face.floorIndex=room.floorIndex;
    const key=[face.floorY,face.x,face.z,face.yaw].map(value=>Math.round(value*10)).join(':');
    if(!seen.has(key)){seen.add(key);faces.push(face);}
  };
  rooms.forEach(room=>{
    if(skipStartingChapel&&room.floorIndex===0&&room.roomIndex===0)return;
    const blocked=(x,y)=>x>=0&&y>=0&&x<mazeSize&&y<mazeSize&&room.grid[y][x]===1;
    for(let y=1;y<mazeSize-1;y++)for(let x=1;x<mazeSize-1;x++)if(room.grid[y][x]===0){
      if(blocked(x,y-1))add(room,x,y,'north');
      if(blocked(x,y+1))add(room,x,y,'south');
      if(blocked(x-1,y))add(room,x,y,'west');
      if(blocked(x+1,y))add(room,x,y,'east');
    }
  });
  const random=seededRandom(seed>>>0);
  for(let i=faces.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[faces[i],faces[j]]=[faces[j],faces[i]];}
  return faces;
}

function addArchedWallDetails(group,rooms,options){
  const faces=collectRegionalWallFaces(rooms,options.seed,options.skipStartingChapel).slice(0,options.maxPanels);
  if(!faces.length)return faces;
  const width=options.width,height=options.height,baseY=options.baseY;
  const panelGeometry=new THREE.ShapeGeometry(makeLancetShape(width,height));
  const panelMaterial=new THREE.MeshStandardMaterial({
    color:options.panelColor,emissive:options.emissive||0x000000,emissiveIntensity:options.emissiveIntensity||0,
    roughness:0.94,side:THREE.DoubleSide
  });
  const panels=new THREE.InstancedMesh(panelGeometry,panelMaterial,faces.length),dummy=new THREE.Object3D();
  faces.forEach((face,index)=>{
    dummy.position.set(face.x,face.floorY+baseY,face.z);
    dummy.rotation.set(0,face.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();panels.setMatrixAt(index,dummy.matrix);
  });
  panels.instanceMatrix.needsUpdate=true;panels.castShadow=false;panels.receiveShadow=false;group.add(panels);

  const positions=[],half=width/2;
  const outline=[[-half,0],[half,0],[half,height*0.62],[width*0.43,height*0.79],[width*0.28,height*0.93],[0,height],[-width*0.28,height],[-width*0.43,height*0.79],[-half,height*0.62],[-half,0]];
  const addSegment=(face,a,b)=>{
    const toWorld=(point)=>{
      const lx=point[0],ly=point[1],lz=0.085;
      return [face.x+lx*Math.cos(face.yaw)+lz*Math.sin(face.yaw),face.floorY+baseY+ly,face.z-lx*Math.sin(face.yaw)+lz*Math.cos(face.yaw)];
    };
    positions.push(...toWorld(a),...toWorld(b));
  };
  faces.forEach(face=>{
    for(let i=0;i<outline.length-1;i++)addSegment(face,outline[i],outline[i+1]);
    (options.crossbars||[]).forEach(y=>addSegment(face,[-width*0.38,y],[width*0.38,y]));
    if(options.pilasters){
      addSegment(face,[-width*0.56,0],[-width*0.56,height*0.64]);
      addSegment(face,[width*0.56,0],[width*0.56,height*0.64]);
    }
  });
  const frameGeometry=new THREE.BufferGeometry();
  frameGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  frameGeometry.computeBoundingSphere();
  const frameMaterial=new THREE.LineBasicMaterial({color:options.frameColor,transparent:true,opacity:0.92});
  group.add(new THREE.LineSegments(frameGeometry,frameMaterial));

  if(options.boarded){
    const boardGeometry=new THREE.BoxGeometry(width*0.88,0.17,0.10);
    const boardMaterial=new THREE.MeshStandardMaterial({color:0x60452f,roughness:0.93});
    const boards=new THREE.InstancedMesh(boardGeometry,boardMaterial,faces.length*3),roll=new THREE.Quaternion();
    let index=0;
    faces.forEach(face=>[0.72,1.58,2.42].forEach((heightOffset,slat)=>{
      dummy.position.set(face.x,face.floorY+baseY+heightOffset,face.z);
      dummy.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),face.yaw);
      roll.setFromAxisAngle(new THREE.Vector3(0,0,1),(slat%2?1:-1)*0.055);
      dummy.quaternion.multiply(roll);dummy.scale.set(slat===1?0.9:1,1,1);dummy.updateMatrix();boards.setMatrixAt(index++,dummy.matrix);
    }));
    boards.instanceMatrix.needsUpdate=true;boards.castShadow=false;boards.receiveShadow=false;group.add(boards);
    const nailGeometry=new THREE.BoxGeometry(0.065,0.065,0.035);
    const nailMaterial=new THREE.MeshStandardMaterial({color:0x9a7951,metalness:0.62,roughness:0.4});
    const nails=new THREE.InstancedMesh(nailGeometry,nailMaterial,faces.length*6);
    let nailIndex=0;
    faces.forEach(face=>[0.72,1.58,2.42].forEach(heightOffset=>[-width*0.31,width*0.31].forEach(lx=>{
      dummy.position.set(face.x+lx*Math.cos(face.yaw)+face.nx*0.06,face.floorY+baseY+heightOffset,face.z-lx*Math.sin(face.yaw)+face.nz*0.06);
      dummy.rotation.set(0,face.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();nails.setMatrixAt(nailIndex++,dummy.matrix);
    })));
    nails.instanceMatrix.needsUpdate=true;nails.castShadow=false;nails.receiveShadow=false;group.add(nails);
  }
  return faces;
}

function addStreetPuddles(group,rooms,seed){
  const random=seededRandom(seed>>>0),spots=[];
  rooms.forEach(room=>{
    if(room.floorIndex===0&&room.roomIndex===0)return;
    const open=[];
    for(let y=1;y<mazeSize-1;y++)for(let x=1;x<mazeSize-1;x++)if(room.grid[y][x]===0)open.push({x,y});
    if(open.length&&random()<0.34){
      const cell=open[Math.floor(random()*open.length)];
      spots.push({x:room.roomX+(cell.x+0.5)*cellSize,z:room.roomZ+(cell.y+0.5)*cellSize,y:room.floorY+0.035,sx:1.05+random()*0.7,sz:0.42+random()*0.32,angle:random()*Math.PI});
    }
  });
  if(!spots.length)return;
  const geometry=new THREE.CircleGeometry(1,18);
  const material=new THREE.MeshStandardMaterial({color:0x435760,emissive:0x10191d,emissiveIntensity:0.12,metalness:0.28,roughness:0.2,transparent:true,opacity:0.58,side:THREE.DoubleSide,depthWrite:false});
  const mesh=new THREE.InstancedMesh(geometry,material,spots.length),dummy=new THREE.Object3D();
  spots.forEach((spot,index)=>{
    dummy.position.set(spot.x,spot.y,spot.z);dummy.rotation.set(-Math.PI/2,spot.angle,0);dummy.scale.set(spot.sx,spot.sz,1);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);
}

function addStreetCrates(group,faces,seed){
  const selected=faces.filter((_,index)=>index%3===0).slice(0,7);
  if(!selected.length)return;
  const random=seededRandom(seed>>>0),geometry=new THREE.BoxGeometry(1.0,0.9,0.86);
  const material=new THREE.MeshStandardMaterial({color:0x51402f,roughness:0.92});
  const crates=new THREE.InstancedMesh(geometry,material,selected.length),dummy=new THREE.Object3D();
  selected.forEach((face,index)=>{
    dummy.position.set(face.x+face.nx*0.9,face.floorY+0.48,face.z+face.nz*0.9);
    dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.set(0.82+random()*0.3,0.82+random()*0.35,0.82+random()*0.3);
    dummy.updateMatrix();crates.setMatrixAt(index,dummy.matrix);
  });
  crates.instanceMatrix.needsUpdate=true;crates.castShadow=false;crates.receiveShadow=true;group.add(crates);
}

function buildYharnamStreetVisuals(floorRooms){
  const group=new THREE.Group(),rooms=floorRooms.flat();
  const faces=addArchedWallDetails(group,rooms,{seed:0x57ee71,maxPanels:14,width:1.9,height:3.45,baseY:2.45,panelColor:0x100e12,emissive:0x120805,emissiveIntensity:0.24,frameColor:0xa28c72,boarded:true,crossbars:[1.35,2.45],skipStartingChapel:true});
  addStreetPuddles(group,rooms,0x5177a9);addStreetCrates(group,faces,0x3912ab);
  if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
}

function buildCathedralInteriorVisuals(floorRooms){
  const group=new THREE.Group(),rooms=floorRooms.flat();
  addArchedWallDetails(group,rooms,{seed:0xca7ed2,maxPanels:10,width:1.55,height:2.9,baseY:3.0,panelColor:0x060403,emissive:0x040201,emissiveIntensity:0.04,frameColor:0x766856,pilasters:true,skipStartingChapel:true});
  const faces=collectRegionalWallFaces(rooms,0x6ab1e5,true).slice(0,7);
  if(faces.length){
    const wood=new THREE.MeshStandardMaterial({color:0x5a4635,roughness:0.94});
    const seatGeo=new THREE.BoxGeometry(1.75,0.16,0.52),legGeo=new THREE.BoxGeometry(0.14,0.46,0.15),backGeo=new THREE.BoxGeometry(1.75,0.46,0.12);
    const seats=new THREE.InstancedMesh(seatGeo,wood,faces.length),legs=new THREE.InstancedMesh(legGeo,wood,faces.length*4),backs=new THREE.InstancedMesh(backGeo,wood,faces.length),dummy=new THREE.Object3D();
    let legIndex=0;
    const worldPosition=(face,lx,lz)=>({x:face.x+face.nx*0.75+lx*Math.cos(face.yaw)+lz*Math.sin(face.yaw),z:face.z+face.nz*0.75-lx*Math.sin(face.yaw)+lz*Math.cos(face.yaw)});
    faces.forEach((face,index)=>{
      const seat=worldPosition(face,0,0);dummy.position.set(seat.x,face.floorY+0.52,seat.z);dummy.rotation.set(0,face.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();seats.setMatrixAt(index,dummy.matrix);
      const back=worldPosition(face,0,-0.16);dummy.position.set(back.x,face.floorY+0.83,back.z);dummy.rotation.set(0,face.yaw,0);dummy.updateMatrix();backs.setMatrixAt(index,dummy.matrix);
      for(const lx of [-0.68,0.68])for(const lz of [-0.16,0.16]){
        const p=worldPosition(face,lx,lz);dummy.position.set(p.x,face.floorY+0.24,p.z);dummy.rotation.set(0,face.yaw,0);dummy.updateMatrix();legs.setMatrixAt(legIndex++,dummy.matrix);
      }
    });
    [seats,legs,backs].forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);});
  }
  if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
}

function buildMountainVisualAccents(ox,oz){
  const group=new THREE.Group(),route=getMountainRouteLayout(ox,oz),random=seededRandom(0x6f2057);
  const capGeometry=new THREE.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI/2);
  const capMaterial=new THREE.MeshStandardMaterial({color:0x8b9b9d,roughness:0.92});
  const boulderCaps=new THREE.InstancedMesh(capGeometry,capMaterial,8),dummy=new THREE.Object3D();
  for(let i=0;i<8;i++){
    const x=route.valleyX-11+(i%4)*7,z=route.valleyZ-5+Math.floor(i/4)*9;
    dummy.position.set(x,1.07,z);dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.set(1.45+0.2*(i%3),0.24,1.12);dummy.updateMatrix();boulderCaps.setMatrixAt(i,dummy.matrix);
  }
  boulderCaps.instanceMatrix.needsUpdate=true;boulderCaps.castShadow=false;boulderCaps.receiveShadow=true;group.add(boulderCaps);

  const patches=[
    {x:route.valleyX-6,z:route.valleyZ-8,y:0.025},{x:route.valleyX+5,z:route.valleyZ+8,y:0.025},
    {x:route.valleyX+15,z:route.valleyZ-4,y:0.025},{x:route.valleyX-15,z:route.valleyZ+5,y:0.025},
    {x:-38,z:27,y:-7.94},{x:-25,z:34,y:-7.94},
    {x:route.spiralX-4,z:route.spiralZ-6,y:0.025},{x:route.spiralX+5,z:route.spiralZ+4,y:0.025},
    {x:route.gateX-5,z:route.gateZ-3,y:0.025},{x:route.gateX+4,z:route.gateZ+5,y:0.025},
    {x:route.bridgeX-8,z:route.bridgeZ+4,y:FLOOR_HEIGHT+0.025},{x:route.bridgeX+7,z:route.bridgeZ-5,y:FLOOR_HEIGHT+0.025}
  ];
  const frostGeometry=new THREE.CircleGeometry(1,10),frostMaterial=new THREE.MeshStandardMaterial({color:0x829da4,roughness:0.46,metalness:0.04,transparent:true,opacity:0.28,side:THREE.DoubleSide,depthWrite:false});
  const frost=new THREE.InstancedMesh(frostGeometry,frostMaterial,patches.length);
  patches.forEach((patch,index)=>{
    dummy.position.set(patch.x,patch.y,patch.z);dummy.rotation.set(-Math.PI/2,random()*Math.PI*2,0);dummy.scale.set(0.8+random()*0.85,0.34+random()*0.28,1);dummy.updateMatrix();frost.setMatrixAt(index,dummy.matrix);
  });
  frost.instanceMatrix.needsUpdate=true;frost.castShadow=false;frost.receiveShadow=false;group.add(frost);
  if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
}

function appendCastleWeb(positions,face,width,height){
  const world=(lx,ly)=>[face.x+lx*Math.cos(face.yaw)+0.10*Math.sin(face.yaw),face.floorY+0.35+ly,face.z-lx*Math.sin(face.yaw)+0.10*Math.cos(face.yaw)];
  const rays=7,rings=4,maxRadius=Math.min(width,height);
  for(let ray=0;ray<=rays;ray++){
    const angle=(Math.PI/2)*ray/rays;
    const end=world(Math.cos(angle)*maxRadius,Math.sin(angle)*maxRadius),start=world(0,0);
    positions.push(...start,...end);
  }
  for(let ring=1;ring<=rings;ring++){
    const radius=maxRadius*ring/rings;
    for(let ray=0;ray<rays;ray++){
      const a0=(Math.PI/2)*ray/rays,a1=(Math.PI/2)*(ray+1)/rays;
      positions.push(...world(Math.cos(a0)*radius,Math.sin(a0)*radius),...world(Math.cos(a1)*radius,Math.sin(a1)*radius));
    }
  }
}

function buildNightmareCastleVisuals(floorRooms){
  const group=new THREE.Group(),rooms=floorRooms.flat();
  const faces=collectRegionalWallFaces(rooms,0x4d3e51).slice(0,12),webPositions=[];
  faces.forEach(face=>appendCastleWeb(webPositions,face,2.25,2.25));
  if(webPositions.length){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(webPositions,3));geometry.computeBoundingSphere();
    group.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xb7b0c6,transparent:true,opacity:0.56,depthWrite:false})));
  }

  const random=seededRandom(0x4e454d53),open=[],spawnX=stageBounds.minX+cellSize*1.5,spawnZ=stageBounds.minZ+cellSize*1.5;
  rooms.forEach(room=>{
    if(room.floorIndex===0&&room.roomIndex===0)return;
    const cells=[];
    for(let y=1;y<mazeSize-1;y++)for(let x=1;x<mazeSize-1;x++)if(room.grid[y][x]===0){
      const worldX=room.roomX+(x+0.5)*cellSize,worldZ=room.roomZ+(y+0.5)*cellSize;
      const wallDirs=[{dx:0,dy:-1,x:0,z:-1},{dx:0,dy:1,x:0,z:1},{dx:-1,dy:0,x:-1,z:0},{dx:1,dy:0,x:1,z:0}].filter(dir=>room.grid[y+dir.dy][x+dir.dx]===1);
      if(Math.hypot(worldX-spawnX,worldZ-spawnZ)>8)cells.push({x,y,wallDir:wallDirs.length?wallDirs[Math.floor(random()*wallDirs.length)]:null});
    }
    if(cells.length)open.push({room,cell:cells[Math.floor(random()*cells.length)]});
  });
  const cocoonSpots=open.filter((_,index)=>index%3===0).slice(0,8);
  if(cocoonSpots.length){
    const geometry=new THREE.LatheGeometry([
      new THREE.Vector2(0,-1.3),new THREE.Vector2(0.22,-1.22),new THREE.Vector2(0.43,-0.92),
      new THREE.Vector2(0.58,-0.48),new THREE.Vector2(0.62,0),new THREE.Vector2(0.54,0.48),
      new THREE.Vector2(0.36,0.88),new THREE.Vector2(0.16,1.16),new THREE.Vector2(0,1.3)
    ],10);
    const material=new THREE.MeshBasicMaterial({color:0x251b2d,toneMapped:false});
    const mesh=new THREE.InstancedMesh(geometry,material,cocoonSpots.length),dummy=new THREE.Object3D();
    const ringGeometry=new THREE.TorusGeometry(0.62,0.022,4,12),ringMaterial=new THREE.MeshBasicMaterial({color:0x9c83ad,toneMapped:false});
    const rings=new THREE.InstancedMesh(ringGeometry,ringMaterial,cocoonSpots.length*3);
    const threadGeometry=new THREE.CylinderGeometry(0.008,0.018,1,5),threadMaterial=new THREE.MeshBasicMaterial({color:0x231b2c,toneMapped:false});
    const threads=new THREE.InstancedMesh(threadGeometry,threadMaterial,cocoonSpots.length);
    let ringIndex=0;
    cocoonSpots.forEach((entry,index)=>{
      const wallOffset=0.95,wallDir=entry.cell.wallDir;
      const x=entry.room.roomX+(entry.cell.x+0.5)*cellSize+(wallDir?wallDir.x*wallOffset:0),z=entry.room.roomZ+(entry.cell.y+0.5)*cellSize+(wallDir?wallDir.z*wallOffset:0);
      dummy.position.set(x,entry.room.floorY+7.7,z);dummy.rotation.set(0,random()*Math.PI,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
      [-0.24,0,0.24].forEach(heightOffset=>{
        const ringScale=heightOffset===0?1:0.97;
        dummy.position.set(x,entry.room.floorY+7.7+heightOffset,z);dummy.rotation.set(Math.PI/2,random()*Math.PI*2,0);dummy.scale.set(ringScale,ringScale,ringScale);dummy.updateMatrix();rings.setMatrixAt(ringIndex++,dummy.matrix);
      });
      dummy.position.set(x,entry.room.floorY+9.65,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1.25,1);dummy.updateMatrix();threads.setMatrixAt(index,dummy.matrix);
    });
    [mesh,rings,threads].forEach(item=>{item.instanceMatrix.needsUpdate=true;item.castShadow=false;item.receiveShadow=false;group.add(item);});
  }
  const boneFaces=collectRegionalWallFaces(rooms,0x6b0e51).slice(0,10);
  if(boneFaces.length){
    const geometry=new THREE.CylinderGeometry(0.075,0.12,1.2,6),material=new THREE.MeshStandardMaterial({color:0x9c9387,roughness:0.96});
    const bones=new THREE.InstancedMesh(geometry,material,boneFaces.length),dummy=new THREE.Object3D();
    boneFaces.forEach((face,index)=>{
      dummy.position.set(face.x+face.nx*0.72,face.floorY+0.16,face.z+face.nz*0.72);
      dummy.rotation.set(index%2?Math.PI/2:0,face.yaw,Math.PI/2+(random()-0.5)*0.45);dummy.scale.set(1,1,1);dummy.updateMatrix();bones.setMatrixAt(index,dummy.matrix);
    });
    bones.instanceMatrix.needsUpdate=true;bones.castShadow=false;bones.receiveShadow=true;group.add(bones);
  }
  if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
}

function buildRegionalVisuals(locationIndex,floorRooms,ox,oz){
  if(!scene||!floorRooms)return;
  if(locationIndex===0)buildYharnamStreetVisuals(floorRooms);
  else if(locationIndex===1)buildCathedralInteriorVisuals(floorRooms);
  else if(locationIndex===2)buildMountainVisualAccents(ox,oz);
  else if(locationIndex===3)buildNightmareCastleVisuals(floorRooms);
}
