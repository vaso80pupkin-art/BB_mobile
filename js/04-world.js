function createCobblestoneFloor(width,ox,oz,depth=width,levelY=0,holes=[],ceiling=false){
  if(!scene) return;
  const surfaces=createSurfaceTextures();
  surfaces.floor.repeat.set(Math.max(1,width/4.5),Math.max(1,depth/4.5));
  surfaces.floorBump.repeat.set(Math.max(1,width/4.5),Math.max(1,depth/4.5));
  let regions=[{x0:ox,x1:ox+width,z0:oz,z1:oz+depth}];
  holes.forEach(hole=>{
    const next=[];
    regions.forEach(region=>{
      const x0=Math.max(region.x0,hole.x0),x1=Math.min(region.x1,hole.x1),z0=Math.max(region.z0,hole.z0),z1=Math.min(region.z1,hole.z1);
      if(x0>=x1||z0>=z1){next.push(region);return;}
      if(z0>region.z0) next.push({x0:region.x0,x1:region.x1,z0:region.z0,z1:z0});
      if(z1<region.z1) next.push({x0:region.x0,x1:region.x1,z0:z1,z1:region.z1});
      if(x0>region.x0) next.push({x0:region.x0,x1:x0,z0:z0,z1:z1});
      if(x1<region.x1) next.push({x0:x1,x1:region.x1,z0:z0,z1:z1});
    });
    regions=next;
  });
  regions.forEach(r=>addCobblePatch(r.x1-r.x0,r.z1-r.z0,(r.x0+r.x1)/2,(r.z0+r.z1)/2,levelY,ceiling));
}

function addRoomWallBatch(boxes,roomBounds,floorY){
  if(!boxes.length) return;
  const positions=[],normals=[],uvs=[],indices=[];
  boxes.forEach(box=>{
    const geo=new THREE.BoxGeometry(box.maxX-box.minX,box.maxY-box.minY,box.maxZ-box.minZ);
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(box.cx,box.cy,box.cz));
    const p=geo.attributes.position.array,n=geo.attributes.normal.array,u=geo.attributes.uv.array,base=positions.length/3;
    for(let i=0;i<p.length;i++) positions.push(p[i]);
    for(let i=0;i<n.length;i++) normals.push(n[i]);
    for(let i=0;i<u.length;i+=2){
      const normalX=n[(i/2)*3];
      const faceWidth=Math.abs(normalX)>0.5?box.maxZ-box.minZ:(box.maxX-box.minX);
      uvs.push(u[i]*Math.max(0.5,faceWidth/4.5),u[i+1]*Math.max(0.5,box.h/4.5));
    }
    const idx=geo.index.array;
    for(let i=0;i<idx.length;i++) indices.push(base+idx[i]);
    geo.dispose();
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices); geometry.computeBoundingSphere();
  const tex=createSurfaceTextures();
  const material=new THREE.MeshStandardMaterial({color:0xffffff,map:tex.wall,bumpMap:tex.wallBump,bumpScale:0.18,roughness:0.84,metalness:0.02,transparent:true,opacity:1});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.castShadow=true; mesh.receiveShadow=true;
  mesh.userData={isRoomBatch:true,colliders:boxes,targetOpacity:1,cx:(roomBounds.minX+roomBounds.maxX)/2,cy:floorY+5.25,cz:(roomBounds.minZ+roomBounds.maxZ)/2,minX:roomBounds.minX,maxX:roomBounds.maxX,minZ:roomBounds.minZ,maxZ:roomBounds.maxZ,w:roomBounds.maxX-roomBounds.minX,h:10.5,d:roomBounds.maxZ-roomBounds.minZ,floorY};
  scene.add(mesh); wallMeshes.push(mesh); wallColliders.push(...boxes);
}

function addWalkableStaircase(x,z,lowerY,upperY,run=28,width=4.8,style='stone'){
  const rise=upperY-lowerY, count=Math.ceil(run/1.05), tread=run/count, stepRise=rise/count;
  const group=new THREE.Group();
  const isStone=style==='stone',isRope=style==='rope';
  const treadMaterial=new THREE.MeshStandardMaterial({color:isStone?0x27252a:(isRope?0x513a24:0x4d3020),roughness:isStone?0.9:0.82,bumpMap:createSurfaceTextures().wallBump,bumpScale:0.11});
  const edge=new THREE.MeshStandardMaterial({color:isStone?0x4a454b:(isRope?0x39281c:0x31231c),roughness:0.86,metalness:isStone?0.14:0.02});
  if(isRope){
    const rungCount=Math.floor(run/1.15);
    for(let i=0;i<=rungCount;i++){
      const t=i/rungCount, rung=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,width,8),treadMaterial);
      rung.rotation.z=Math.PI/2; rung.position.set(0,lowerY+t*rise,zOffset(t,run)); rung.castShadow=true; group.add(rung);
    }
    const ropeLength=Math.sqrt(run*run+rise*rise),ropeAngle=Math.atan2(run,rise);
    for(const side of [-1,1]){
      const rope=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,ropeLength,8),edge);
      rope.position.set(side*(width/2+0.1),(lowerY+upperY)/2,run/2);rope.rotation.x=ropeAngle;group.add(rope);
      const anchor=new THREE.Mesh(new THREE.SphereGeometry(0.18,10,8),edge);
      anchor.position.set(side*(width/2+0.1),upperY,run);group.add(anchor);
    }
  } else {
    for(let i=0;i<count;i++){
      const treadSlab=new THREE.Mesh(new THREE.BoxGeometry(width,0.2,Math.max(0.45,tread-0.08)),treadMaterial);
      treadSlab.position.set(0,lowerY+(i+1)*stepRise-0.1,(i+0.5)*tread);treadSlab.castShadow=true;treadSlab.receiveShadow=true;group.add(treadSlab);
      const riser=new THREE.Mesh(new THREE.BoxGeometry(width,Math.max(0.2,stepRise-0.16),0.15),edge);
      riser.position.set(0,lowerY+(i+0.5)*stepRise,i*tread);riser.castShadow=true;group.add(riser);
    }
    const railLength=Math.sqrt(run*run+rise*rise),railAngle=Math.atan2(run,rise);
    for(const side of [-1,1]){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(isStone?0.22:0.16,railLength,isStone?0.34:0.22),edge);
      rail.position.set(side*(width/2+0.12),(lowerY+upperY)/2+(isStone?0.92:0.86),run/2);rail.rotation.x=railAngle;rail.castShadow=true;group.add(rail);
      const postCount=Math.floor(run/4);
      for(let i=0;i<=postCount;i++){
        const t=i/postCount,post=new THREE.Mesh(new THREE.BoxGeometry(0.2,1.0,0.2),edge);
        post.position.set(side*(width/2+0.12),lowerY+t*rise+0.45,t*run);post.castShadow=true;group.add(post);
      }
    }
  }
  group.position.set(x,0,z);scene.add(group);envObjects.push({mesh:group});
  stairs.push({x,z,lowerY,upperY,run,width,style});
  return {x0:x-width/2-0.65,x1:x+width/2+0.65,z0:z-0.8,z1:z+run+0.8};
}

function zOffset(t,run){return t*run;}

function seededRandom(seed){
  let state=(seed>>>0)||1;
  return ()=>{state=(state*1664525+1013904223)>>>0; return state/4294967296;};
}

function carveMazeRoute(grid,edge){
  const last=grid.length-1,mid=Math.floor(last/2),open=(x,y)=>{grid[y][x]=0;};
  if(edge==='west'||edge==='east'){
    const x=edge==='west'?0:last;
    for(let xx=Math.min(x,mid);xx<=Math.max(x,mid);xx++) open(xx,mid);
  } else {
    const y=edge==='north'?0:last;
    for(let yy=Math.min(y,mid);yy<=Math.max(y,mid);yy++) open(mid,yy);
  }
}

function makeLancetShape(width,height){
  const half=width/2,shape=new THREE.Shape();
  shape.moveTo(-half,0);shape.lineTo(half,0);shape.lineTo(half,height*0.62);
  shape.quadraticCurveTo(half,height*0.82,0,height);
  shape.quadraticCurveTo(-half,height*0.82,-half,height*0.62);shape.closePath();
  return shape;
}

function buildOedonChapelFoyer(room,floorY){
  if(!room||!scene) return;
  const group=new THREE.Group(),cx=room.roomX+cellSize*3.5,cz=room.roomZ+cellSize*3.5;
  const stone=new THREE.MeshStandardMaterial({color:0x77716c,roughness:0.92,bumpMap:createSurfaceTextures().wallBump,bumpScale:0.08});
  const darkStone=new THREE.MeshStandardMaterial({color:0x312d32,roughness:0.88,metalness:0.04});
  const brass=new THREE.MeshStandardMaterial({color:0x756044,roughness:0.54,metalness:0.68});
  const stained=[0x54657b,0x78434b,0x879071].map(color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.24,roughness:0.4,transparent:true,opacity:0.92,side:THREE.DoubleSide,depthWrite:false}));
  const makeBox=(w,h,d,material,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
  const makeBeam=(a,b,width,depth,material)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,direction.length(),depth),material);
    mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  };

  const mosaic=new THREE.Mesh(new THREE.CircleGeometry(5.3,48),new THREE.MeshStandardMaterial({color:0x46434a,roughness:0.8,metalness:0.12}));
  mosaic.rotation.x=-Math.PI/2;mosaic.position.set(cx,floorY+0.045,cz);group.add(mosaic);
  for(const [inner,outer,color] of [[4.1,4.28,0x85704d],[2.4,2.52,0x6c5050],[0.52,0.72,0x95835e]]){
    const ring=new THREE.Mesh(new THREE.RingGeometry(inner,outer,48),new THREE.MeshStandardMaterial({color,roughness:0.72,metalness:0.3,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.position.set(cx,floorY+0.065,cz);group.add(ring);
  }
  for(let i=0;i<8;i++){
    const spoke=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.035,3.55),brass);
    spoke.position.set(cx,floorY+0.075,cz);spoke.rotation.y=i*Math.PI/4;group.add(spoke);
  }

  const columnXs=[cx-11,cx+11],columnZs=[cz-11,cz+11];
  columnZs.forEach(z=>{
    const left=[cx-11,floorY+9.7,z],right=[cx+11,floorY+9.7,z],peak=[cx,floorY+11.5,z];
    makeBeam(left,peak,0.52,0.62,stone);makeBeam(peak,right,0.52,0.62,stone);
  });
  columnXs.forEach(x=>columnZs.forEach(z=>{
    for(const [radius,height,y,material] of [[0.92,0.48,0.24,darkStone],[0.68,8.55,4.75,stone],[0.9,0.55,9.3,darkStone],[1.08,0.38,9.76,stone]]){
      const piece=new THREE.Mesh(new THREE.CylinderGeometry(radius*0.94,radius,height,14),material);
      piece.position.set(x,floorY+y,z);piece.castShadow=true;piece.receiveShadow=true;group.add(piece);
    }
    wallColliders.push({minX:x-0.68,maxX:x+0.68,minZ:z-0.68,maxZ:z+0.68,minY:floorY,maxY:floorY+9.5,cx:x,cy:floorY+4.75,cz:z,w:1.36,h:9.5,d:1.36,floorY});
  }));

  const windowZ=room.roomZ+cellSize+0.43;
  [room.roomX+cellSize*2,room.roomX+cellSize*3.5,room.roomX+cellSize*5].forEach((x,index)=>{
    const window=new THREE.Group();
    const frame=new THREE.Mesh(new THREE.ExtrudeGeometry(makeLancetShape(3.6,7.6),{depth:0.2,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:0.08,bevelThickness:0.06}),darkStone);
    frame.position.z=-0.11;window.add(frame);
    const glass=new THREE.Mesh(new THREE.ShapeGeometry(makeLancetShape(3.05,7.05)),stained[index%stained.length]);
    glass.position.set(0,0,0.12);window.add(glass);
    const leadMat=new THREE.MeshStandardMaterial({color:0x25252c,roughness:0.68,metalness:0.22});
    const mullion=new THREE.Mesh(new THREE.BoxGeometry(0.12,6.6,0.08),leadMat);mullion.position.set(0,3.2,0.17);window.add(mullion);
    for(const y of [2.2,4.35]){const bar=new THREE.Mesh(new THREE.BoxGeometry(2.65,0.1,0.08),leadMat);bar.position.set(0,y,0.17);window.add(bar);}
    window.position.set(x,floorY+1.65,windowZ);group.add(window);
  });

  const altarZ=cz-8.5;
  makeBox(5.0,0.46,2.8,darkStone,cx,floorY+0.23,altarZ);
  makeBox(4.2,0.72,2.0,stone,cx,floorY+0.82,altarZ);
  makeBox(2.7,0.22,1.5,brass,cx,floorY+1.29,altarZ);
  const drape=new THREE.Mesh(new THREE.ConeGeometry(1.1,2.2,5),new THREE.MeshStandardMaterial({color:0x40272c,roughness:0.95,side:THREE.DoubleSide}));
  drape.position.set(cx,floorY+2.45,altarZ-0.1);drape.rotation.y=Math.PI/5;drape.castShadow=true;group.add(drape);

  const urnPoints=[new THREE.Vector2(0,0),new THREE.Vector2(0.36,0),new THREE.Vector2(0.52,0.24),new THREE.Vector2(0.45,0.48),new THREE.Vector2(0.68,0.82),new THREE.Vector2(0.62,1.15),new THREE.Vector2(0.38,1.38),new THREE.Vector2(0.4,1.52),new THREE.Vector2(0.5,1.58),new THREE.Vector2(0,1.58)];
  const urnGeo=new THREE.LatheGeometry(urnPoints,16);
  for(const side of [-1,1]) for(const dz of [-3,3,9]){
    const x=cx+side*13.5,z=cz+dz;
    const pedestal=new THREE.Mesh(new THREE.BoxGeometry(1.65,0.55,1.65),darkStone);pedestal.position.set(x,floorY+0.28,z);pedestal.castShadow=true;group.add(pedestal);
    const urn=new THREE.Mesh(urnGeo,stone);urn.position.set(x,floorY+0.56,z);urn.castShadow=true;urn.receiveShadow=true;group.add(urn);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.47,0.07,8,18),brass);rim.rotation.x=Math.PI/2;rim.position.set(x,floorY+2.0,z);group.add(rim);
  }

  const candleMat=new THREE.MeshStandardMaterial({color:0xb7a17e,roughness:0.76});
  const flameMat=new THREE.MeshBasicMaterial({color:0xffbf66});
  [[cx-2.3,altarZ],[cx+2.3,altarZ],[cx,altarZ-1.1]].forEach(([x,z])=>{
    for(let i=-1;i<=1;i++){
      const candle=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,0.75+Math.abs(i)*0.13,8),candleMat);
      candle.position.set(x+i*0.38,floorY+1.55,z);candle.castShadow=true;group.add(candle);
      const flame=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,8),flameMat);flame.position.set(x+i*0.38,floorY+1.98+Math.abs(i)*0.13,z);group.add(flame);
    }
  });
  for(const [x,z] of [[cx-2,altarZ-1],[cx+2,altarZ-1],[cx,altarZ-2]]){
    const light=new THREE.PointLight(0xffbd78,2.4,13,2);light.position.set(x,floorY+2.2,z);group.add(light);
  }
  const chain=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,2.0,6),brass);chain.position.set(cx,floorY+14,cz);group.add(chain);
  const censer=new THREE.Mesh(new THREE.IcosahedronGeometry(0.55,1),darkStone);censer.position.set(cx,floorY+12.7,cz);censer.castShadow=true;group.add(censer);
  const censerRings=new THREE.Mesh(new THREE.TorusGeometry(0.67,0.07,8,18),brass);censerRings.position.copy(censer.position);censerRings.rotation.x=Math.PI/2;group.add(censerRings);

  scene.add(group);envObjects.push({mesh:group});
}

function stageEdgeKey(a,b){ return a<b ? `${a}-${b}` : `${b}-${a}`; }
function getStageRoomEdges(locationIndex,floorIndex){
  const edges=[[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[7,8],[8,9],[0,5],[2,7],[4,9]];
  const variants=[
    [],
    [[1,6]],
    [[0,6]],
    [[2,8]]
  ];
  const variant=variants[(locationIndex+floorIndex)%variants.length];
  const open=new Set(edges.map(([a,b])=>stageEdgeKey(a,b)));
  variant.forEach(([a,b])=>open.add(stageEdgeKey(a,b)));
  return open;
}

function buildStageFloor(locationIndex,floorIndex,ox,oz){
  const floorY=FLOOR_LEVELS[floorIndex],rooms=[],openEdges=getStageRoomEdges(locationIndex,floorIndex);
  for(let row=0;row<ROOM_ROWS;row++) for(let col=0;col<ROOM_COLS;col++){
    const roomIndex=row*ROOM_COLS+col;
    const seed=(locationIndex+1)*7919+(floorIndex+1)*104729+(roomIndex+1)*31337;
    const grid=generateMaze(mazeSize,seed);
    if(col>0&&openEdges.has(stageEdgeKey(roomIndex,roomIndex-1))) carveMazeRoute(grid,'west');
    if(col<ROOM_COLS-1&&openEdges.has(stageEdgeKey(roomIndex,roomIndex+1))) carveMazeRoute(grid,'east');
    if(row>0&&openEdges.has(stageEdgeKey(roomIndex,roomIndex-ROOM_COLS))) carveMazeRoute(grid,'north');
    if(row<ROOM_ROWS-1&&openEdges.has(stageEdgeKey(roomIndex,roomIndex+ROOM_COLS))) carveMazeRoute(grid,'south');
    const stairwell=(row===0&&(col===2||col===4))||(row===1&&col===0);
    if(stairwell){
      const stairCol=Math.floor(mazeSize/2);
      for(let y=1;y<mazeSize-1;y++) grid[y][stairCol]=0;
      for(let y=1;y<mazeSize-1;y++) if(stairCol>1&&stairCol<mazeSize-2) grid[y][stairCol-1]=0;
    }
    if(row===1&&col===3){
      const mid=Math.floor(mazeSize/2);
      for(let i=1;i<mazeSize-1;i++){ grid[mid][i]=0; grid[i][mid]=0; }
      for(let y=mid-1;y<=mid+1;y++) for(let x=mid-1;x<=mid+1;x++) grid[y][x]=0;
    }
    if(locationIndex===0 && floorIndex===0 && roomIndex===0){
      for(let y=1;y<=5;y++) for(let x=1;x<=5;x++) grid[y][x]=0;
    }
    if(floorIndex===1 && roomIndex===ROOMS_PER_FLOOR-1){
      const mid=Math.floor(mazeSize/2);
      for(let y=mid-2;y<=mid+2;y++) for(let x=mid-2;x<=mid+2;x++) grid[y][x]=0;
      for(let y=mid-1;y<=mid+1;y++) for(let x=0;x<=mid;x++) grid[y][x]=0;
    }
    const roomX=ox+col*ROOM_WORLD_SIZE,roomZ=oz+row*ROOM_WORLD_SIZE;
    const bounds={minX:roomX,minZ:roomZ,maxX:roomX+ROOM_WORLD_SIZE,maxZ:roomZ+ROOM_WORLD_SIZE};
    const boxes=[],wallHeight=10.5,wallThickness=0.72;
    const blocked=(x,y)=>x>=0&&y>=0&&x<mazeSize&&y<mazeSize&&grid[y][x]===1;
    const addSegment=(minX,maxX,minZ,maxZ)=>boxes.push({minX,maxX,minZ,maxZ,minY:floorY,maxY:floorY+wallHeight,cx:(minX+maxX)/2,cy:floorY+wallHeight/2,cz:(minZ+maxZ)/2,w:maxX-minX,h:wallHeight,d:maxZ-minZ,floorY});
    for(let y=0;y<mazeSize;y++) for(let x=0;x<mazeSize;x++) if(grid[y][x]===0){
      const wx=roomX+x*cellSize+cellSize/2,wz=roomZ+y*cellSize+cellSize/2;
      if(blocked(x-1,y)){const edgeX=wx-cellSize/2;addSegment(edgeX-wallThickness/2,edgeX+wallThickness/2,wz-cellSize/2,wz+cellSize/2);}
      if(blocked(x+1,y)){const edgeX=wx+cellSize/2;addSegment(edgeX-wallThickness/2,edgeX+wallThickness/2,wz-cellSize/2,wz+cellSize/2);}
      if(blocked(x,y-1)){const edgeZ=wz-cellSize/2;addSegment(wx-cellSize/2,wx+cellSize/2,edgeZ-wallThickness/2,edgeZ+wallThickness/2);}
      if(blocked(x,y+1)){const edgeZ=wz+cellSize/2;addSegment(wx-cellSize/2,wx+cellSize/2,edgeZ-wallThickness/2,edgeZ+wallThickness/2);}
    }
    addRoomWallBatch(boxes,bounds,floorY);
    rooms.push({floorIndex,roomIndex,row,col,grid,roomX,roomZ,floorY,bounds});
  }
  return rooms;
}

function getCryptAtmosphereAssets(){
  if(cryptAtmosphereAssets) return cryptAtmosphereAssets;
  const puddleShape=new THREE.Shape();
  const puddlePoints=[];
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2, r=0.78+0.12*Math.sin(i*2.31)+0.07*Math.cos(i*4.7);
    puddlePoints.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));
  }
  puddleShape.moveTo(puddlePoints[0].x,puddlePoints[0].y);
  for(let i=1;i<puddlePoints.length;i++) puddleShape.lineTo(puddlePoints[i].x,puddlePoints[i].y);
  puddleShape.closePath();
  const wingShape=new THREE.Shape();
  wingShape.moveTo(0,0);wingShape.lineTo(0.22,0.17);wingShape.lineTo(0.76,0.34);
  wingShape.lineTo(0.57,0.10);wingShape.lineTo(0.94,-0.02);wingShape.lineTo(0.66,-0.22);
  wingShape.lineTo(0.39,-0.29);wingShape.lineTo(0.13,-0.12);wingShape.closePath();
  cryptAtmosphereAssets={
    puddleGeometry:new THREE.ShapeGeometry(puddleShape,1),
    batWingGeometry:new THREE.ShapeGeometry(wingShape,1),
    skullGeometry:new THREE.SphereGeometry(0.36,12,10),
    jawGeometry:new THREE.SphereGeometry(0.23,10,8),
    socketGeometry:new THREE.SphereGeometry(0.115,8,6),
    noseGeometry:new THREE.SphereGeometry(0.055,6,5),
    batBodyGeometry:new THREE.SphereGeometry(0.18,9,7),
    batHeadGeometry:new THREE.SphereGeometry(0.105,8,6),
    batEarGeometry:new THREE.ConeGeometry(0.055,0.16,5),
    batEyeGeometry:new THREE.SphereGeometry(0.025,6,4),
    flyBodyGeometry:new THREE.SphereGeometry(0.045,6,4),
    flyWingGeometry:new THREE.PlaneGeometry(0.085,0.05),
    skullMaterial:new THREE.MeshStandardMaterial({color:0xaaa08a,roughness:0.96}),
    socketMaterial:new THREE.MeshStandardMaterial({color:0x100e12,roughness:1}),
    slimeMaterial:new THREE.MeshStandardMaterial({color:0x271317,roughness:0.2,metalness:0.18,transparent:true,opacity:0.88,side:THREE.DoubleSide,depthWrite:false}),
    stainMaterial:new THREE.MeshStandardMaterial({color:0x3b1c1b,roughness:0.72,transparent:true,opacity:0.75,side:THREE.DoubleSide,depthWrite:false}),
    batMaterial:new THREE.MeshStandardMaterial({color:0x111116,roughness:0.88,side:THREE.DoubleSide}),
    batEyeMaterial:new THREE.MeshBasicMaterial({color:0x8e1d27}),
    flyMaterial:new THREE.MeshStandardMaterial({color:0x09090b,roughness:0.5}),
    flyWingMaterial:new THREE.MeshBasicMaterial({color:0x66615c,transparent:true,opacity:0.64,side:THREE.DoubleSide,depthWrite:false})
  };
  return cryptAtmosphereAssets;
}

function makeCryptSkull(x,z,floorY,random,group){
  const a=getCryptAtmosphereAssets(),skull=new THREE.Group();
  const cranium=new THREE.Mesh(a.skullGeometry,a.skullMaterial);
  cranium.scale.set(0.94,0.83,1.06);cranium.castShadow=true;skull.add(cranium);
  const jaw=new THREE.Mesh(a.jawGeometry,a.skullMaterial);jaw.position.set(0,-0.2,0.13);jaw.scale.set(1,0.7,0.9);skull.add(jaw);
  for(const side of [-1,1]){
    const socket=new THREE.Mesh(a.socketGeometry,a.socketMaterial);socket.position.set(side*0.135,0.035,0.3);socket.scale.set(1,1,0.45);skull.add(socket);
  }
  skull.position.set(x,floorY+0.34,z);skull.rotation.set((random()-0.5)*0.55,random()*Math.PI*2,(random()-0.5)*0.7);
  const scale=0.72+random()*0.46;skull.scale.setScalar(scale);group.add(skull);
}

function makeCryptPuddle(x,z,floorY,random,group){
  const a=getCryptAtmosphereAssets(),puddle=new THREE.Mesh(a.puddleGeometry,random()<0.32?a.stainMaterial:a.slimeMaterial);
  puddle.rotation.x=-Math.PI/2;puddle.rotation.z=random()*Math.PI*2;
  const size=0.62+random()*0.58;puddle.scale.set(size,1,size*(0.55+random()*0.45));
  puddle.position.set(x,floorY+0.055,z);group.add(puddle);
  if(random()<0.58){
    const stain=new THREE.Mesh(a.puddleGeometry,a.stainMaterial);
    stain.rotation.x=-Math.PI/2;stain.rotation.z=random()*Math.PI*2;
    stain.scale.set(size*(0.42+random()*0.2),1,size*(0.3+random()*0.22));
    stain.position.set(x+(random()-0.5)*0.7,floorY+0.061,z+(random()-0.5)*0.7);group.add(stain);
  }
  return {x,z};
}

function makeBatVisual(){
  const a=getCryptAtmosphereAssets(),bat=new THREE.Group();
  const body=new THREE.Mesh(a.batBodyGeometry,a.batMaterial);body.scale.set(0.8,0.8,1.25);body.castShadow=true;bat.add(body);
  const head=new THREE.Mesh(a.batHeadGeometry,a.batMaterial);head.position.z=0.19;bat.add(head);
  for(const side of [-1,1]){
    const ear=new THREE.Mesh(a.batEarGeometry,a.batMaterial);ear.position.set(side*0.065,0.12,0.16);ear.rotation.z=side*-0.22;bat.add(ear);
    const eye=new THREE.Mesh(a.batEyeGeometry,a.batEyeMaterial);eye.position.set(side*0.045,0.015,0.282);bat.add(eye);
  }
  const left=new THREE.Group(),right=new THREE.Group();left.position.x=-0.1;right.position.x=0.1;left.scale.x=-1;
  const leftMembrane=new THREE.Mesh(a.batWingGeometry,a.batMaterial),rightMembrane=new THREE.Mesh(a.batWingGeometry,a.batMaterial);
  leftMembrane.castShadow=rightMembrane.castShadow=true;left.add(leftMembrane);right.add(rightMembrane);bat.add(left,right);
  return {mesh:bat,leftWing:left,rightWing:right};
}

function addBatSwarm(room,x,z,random){
  for(let i=0;i<4;i++){
    const bat=makeBatVisual();bat.mesh.scale.setScalar(0.78+random()*0.22);scene.add(bat.mesh);
    ambientCreatures.push({type:'bat',mesh:bat.mesh,leftWing:bat.leftWing,rightWing:bat.rightWing,
      centerX:x,centerZ:z,floorY:room.floorY,phase:random()*Math.PI*2,speed:0.48+random()*0.24,
      radius:0.65+random()*0.75,altitude:5.6+random()*1.5,offset:i*Math.PI*0.5});
  }
}

function addFlySwarm(x,z,floorY,random){
  const a=getCryptAtmosphereAssets();
  for(let i=0;i<3;i++){
    const fly=new THREE.Group(),body=new THREE.Mesh(a.flyBodyGeometry,a.flyMaterial);body.scale.set(1,0.8,1.1);fly.add(body);
    const wings=[];
    for(const side of [-1,1]){
      const wing=new THREE.Mesh(a.flyWingGeometry,a.flyWingMaterial);wing.position.set(side*0.035,0.035,0);wing.rotation.z=side*0.32;fly.add(wing);wings.push(wing);
    }
    scene.add(fly);ambientCreatures.push({type:'fly',mesh:fly,wings,centerX:x,centerZ:z,floorY,phase:random()*Math.PI*2,radius:0.28+random()*0.5,speed:1.5+random()*1.4});
  }
}

function scatterCryptAtmosphere(floorRooms,locationIndex){
  floorRooms.flat().forEach(room=>{
    if(room.floorIndex===0&&room.roomIndex===0) return;
    const random=seededRandom((locationIndex+11)*65537+(room.floorIndex+1)*7919+(room.roomIndex+1)*31337);
    const openCells=[];
    for(let row=1;row<mazeSize-1;row++) for(let col=1;col<mazeSize-1;col++) if(room.grid[row][col]===0) openCells.push({row,col});
    if(!openCells.length) return;
    const group=new THREE.Group();
    const pick=()=>openCells[Math.floor(random()*openCells.length)];
    const positionFor=cell=>({x:room.roomX+(cell.col+0.5)*cellSize,z:room.roomZ+(cell.row+0.5)*cellSize});
    let flyAt=null;
    if(random()<0.72){
      const pos=positionFor(pick());flyAt=makeCryptPuddle(pos.x,pos.z,room.floorY,random,group);
      if(random()<0.56){const skullPos=positionFor(pick());makeCryptSkull(skullPos.x,skullPos.z,room.floorY,random,group);}
    } else if(random()<0.64){
      const pos=positionFor(pick());makeCryptSkull(pos.x,pos.z,room.floorY,random,group);
    }
    if(flyAt&&random()<0.5) addFlySwarm(flyAt.x,flyAt.z,room.floorY,random);
    const hasBats=(room.floorIndex===0&&(room.roomIndex===2||room.roomIndex===7))||
      (room.floorIndex===1&&(room.roomIndex===3||room.roomIndex===8));
    if(hasBats){const pos=positionFor(pick());addBatSwarm(room,pos.x,pos.z,random);}
    if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
  });
}

function updateAmbientCreatures(time){
  ambientCreatures.forEach(creature=>{
    if(creature.type==='bat'){
      const orbit=time*creature.speed+creature.phase+creature.offset;
      creature.mesh.position.set(creature.centerX+Math.cos(orbit)*creature.radius,
        creature.floorY+creature.altitude+Math.sin(time*1.7+creature.phase)*0.42,
        creature.centerZ+Math.sin(orbit)*creature.radius);
      creature.mesh.rotation.y=Math.atan2(-Math.sin(orbit),Math.cos(orbit));
      const flap=Math.sin(time*18+creature.phase)*0.72;
      creature.leftWing.rotation.z=-flap;creature.rightWing.rotation.z=flap;
      creature.mesh.rotation.z=Math.sin(time*2.3+creature.phase)*0.08;
    } else {
      const orbit=time*creature.speed+creature.phase;
      creature.mesh.position.set(creature.centerX+Math.cos(orbit)*creature.radius,
        creature.floorY+0.4+Math.sin(time*5+creature.phase)*0.18,
        creature.centerZ+Math.sin(orbit)*creature.radius);
      creature.mesh.rotation.y=-orbit;
      const flap=Math.sin(time*31+creature.phase)*0.62;
      creature.wings[0].rotation.z=0.32+flap;creature.wings[1].rotation.z=-0.32-flap;
    }
  });
}

function roomSpawnPoint(room,seed){
  const random=seededRandom(seed),grid=room.grid,cells=[];
  for(let y=1;y<mazeSize-1;y++) for(let x=1;x<mazeSize-1;x++) if(grid[y][x]===0){
    const wx=room.roomX+(x+0.5)*cellSize,wz=room.roomZ+(y+0.5)*cellSize;
    const sx=room.roomX+ROOM_WORLD_SIZE/2,sz=room.roomZ+ROOM_WORLD_SIZE/2;
    if(Math.hypot(wx-sx,wz-sz)>10) cells.push({x:wx,z:wz});
  }
  if(!cells.length) return {x:room.roomX+ROOM_WORLD_SIZE/2,z:room.roomZ+ROOM_WORLD_SIZE/2};
  return cells[Math.floor(random()*cells.length)];
}

function roomAtWorldPosition(x,z){
  const col=Math.max(0,Math.min(ROOM_COLS-1,Math.floor((x-stageBounds.minX)/ROOM_WORLD_SIZE)));
  const row=Math.max(0,Math.min(ROOM_ROWS-1,Math.floor((z-stageBounds.minZ)/ROOM_WORLD_SIZE)));
  return row*ROOM_COLS+col;
}

function createGateLever(parent,gate,x,z,floorY,side){
  const group=new THREE.Group();
  const metal=new THREE.MeshStandardMaterial({color:0x534631,metalness:0.78,roughness:0.36});
  const brass=new THREE.MeshStandardMaterial({color:0x9b783f,metalness:0.82,roughness:0.3,emissive:0x241605});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.34,0.25,10),metal);
  base.position.y=0.13;group.add(base);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,0.92,8),metal);
  post.position.y=0.68;group.add(post);
  const handle=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.72,0.18),brass);
  handle.position.set(0.22,0.88,0);handle.rotation.z=-0.48;group.add(handle);
  group.position.set(x,floorY,z);parent.add(group);
  const interactable={type:'gateLever',gate,group,handle,x,z,y:floorY,side};
  gate.levers.push(interactable);worldInteractables.push(interactable);
}

function addShortcutGate(x,z,floorY,locationIndex,floorIndex){
  const group=new THREE.Group();
  const frameMat=new THREE.MeshStandardMaterial({color:0x302b2e,metalness:0.48,roughness:0.7});
  const panelMat=new THREE.MeshStandardMaterial({color:0x4a292a,metalness:0.38,roughness:0.68});
  const width=5.45,height=10.6,thickness=0.46;
  const postGeo=new THREE.BoxGeometry(0.42,height+0.5,0.62);
  for(const side of [-1,1]){
    const post=new THREE.Mesh(postGeo,frameMat);post.position.set(x+side*(width/2+0.26),floorY+(height+0.5)/2,z);post.castShadow=true;group.add(post);
  }
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(width+0.95,0.55,0.72),frameMat);
  lintel.position.set(x,floorY+height+0.16,z);lintel.castShadow=true;group.add(lintel);
  const panel=new THREE.Mesh(new THREE.BoxGeometry(width,height,thickness),panelMat);
  panel.position.set(x,floorY+height/2,z);panel.castShadow=true;panel.receiveShadow=true;group.add(panel);
  const collider={minX:x-width/2,maxX:x+width/2,minY:floorY,maxY:floorY+height,minZ:z-thickness/2,maxZ:z+thickness/2,cx:x,cy:floorY+height/2,cz:z,w:width,h:height,d:thickness,floorY};
  scene.add(group);envObjects.push({mesh:group});wallColliders.push(collider);
  const gate={group,panel,collider,levers:[],opened:false,locationIndex,floorIndex};
  shortcutGates.push(gate);
  createGateLever(group,gate,x,z-3.45,floorY,'south');
  createGateLever(group,gate,x,z+3.45,floorY,'north');
  return gate;
}

function addStageElevator(x,z,lowerY,upperY){
  const group=new THREE.Group();
  const steel=new THREE.MeshStandardMaterial({color:0x34383c,metalness:0.82,roughness:0.42});
  const brass=new THREE.MeshStandardMaterial({color:0x8b6e3e,metalness:0.78,roughness:0.34});
  const shaftHeight=upperY-lowerY+5;
  for(const sx of [-2.85,2.85]) for(const sz of [-2.85,2.85]){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(0.28,shaftHeight,0.28),steel);
    beam.position.set(x+sx,lowerY+shaftHeight/2-0.3,z+sz);beam.castShadow=true;group.add(beam);
  }
  for(const y of [lowerY+0.25,upperY+0.25]){
    for(const side of [-1,1]){
      const across=new THREE.Mesh(new THREE.BoxGeometry(5.9,0.22,0.22),brass);
      across.position.set(x,y,z+side*2.95);group.add(across);
      const along=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.22,5.9),brass);
      along.position.set(x+side*2.95,y,z);group.add(along);
    }
  }
  const cabin=new THREE.Group();
  const platform=new THREE.Mesh(new THREE.BoxGeometry(5.25,0.45,5.25),steel);
  platform.position.y=0.22;platform.castShadow=true;platform.receiveShadow=true;cabin.add(platform);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(4.85,0.08,4.85),new THREE.MeshStandardMaterial({color:0x5a5143,metalness:0.58,roughness:0.52}));
  deck.position.y=0.48;deck.receiveShadow=true;cabin.add(deck);
  for(const side of [-1,1]) for(const axis of [0,1]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(axis===0?4.7:0.14,0.85,axis===0?0.14:4.7),brass);
    rail.position.set(axis===0?0:side*2.35,0.9,axis===0?side*2.35:0);cabin.add(rail);
  }
  cabin.position.set(x,lowerY,z);group.add(cabin);
  scene.add(group);envObjects.push({mesh:group});
  const elevator={x,z,lowerY,upperY,currentY:lowerY,targetY:lowerY,moving:false,rider:false,group,cabin,speed:8.5};
  stageElevators.push(elevator);
  const rideButton=new THREE.Group();
  const button=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.12,10),brass);button.position.y=0.64;rideButton.add(button);cabin.add(rideButton);
  const rideInteractable={type:'elevatorRide',elevator,group:rideButton,x,z,y:lowerY+0.64};
  worldInteractables.push(rideInteractable);elevator.rideInteractable=rideInteractable;
  for(let floorIndex=0;floorIndex<2;floorIndex++){
    const floorY=FLOOR_LEVELS[floorIndex],panelGroup=new THREE.Group();
    const base=new THREE.Mesh(new THREE.BoxGeometry(0.68,1.25,0.4),steel);base.position.y=0.63;panelGroup.add(base);
    const callButton=new THREE.Mesh(new THREE.SphereGeometry(0.14,10,8),brass);callButton.position.set(0,0.82,0.24);panelGroup.add(callButton);
    panelGroup.position.set(x+4.1,floorY,z);group.add(panelGroup);
    worldInteractables.push({type:'elevatorCall',elevator,group:panelGroup,x:x+4.1,z,y:floorY,floorIndex});
  }
  return elevator;
}

function updateStageMechanics(dt){
  stageElevators.forEach(elevator=>{
    if(!elevator.moving) return;
    const direction=Math.sign(elevator.targetY-elevator.currentY);
    elevator.currentY+=direction*elevator.speed*dt;
    if((direction>0&&elevator.currentY>=elevator.targetY)||(direction<0&&elevator.currentY<=elevator.targetY)){
      elevator.currentY=elevator.targetY;elevator.moving=false;
      if(elevator.rider){
        hunter.position.y=elevator.currentY+0.4;
        currentFloorIndex=elevator.currentY>=(elevator.lowerY+elevator.upperY)/2?1:0;
        updateStageLocationLabel(true);
      }
      elevator.rider=false;
      sfx('liftStop');
      notify('ЛИФТ ПРИБЫЛ');
    }
    elevator.cabin.position.y=elevator.currentY;
    if(elevator.rider) hunter.position.y=elevator.currentY+0.4;
    elevator.rideInteractable.y=elevator.currentY+0.64;
  });
}

function checkWorldInteractableProximity(){
  nearbyWorldInteractable=null;
  if(!hunter||gameMode!==GameMode.PLAYING) return;
  const prompt=$('worldInteractPrompt');
  const menuOpen=['lanternMenu','weaponMenu','gemMenu','teleportMenu','pauseMenu','settingsMenu'].some(id=>$(id)?.classList.contains('active'));
  let nearest=4.0;
  if(!menuOpen&&!player.isAttacking&&!player.isDodging){
    worldInteractables.forEach(item=>{
      const d=Math.hypot(hunter.position.x-item.x,hunter.position.z-item.z);
      if(d<nearest&&Math.abs(hunter.position.y-item.y)<2.8){nearest=d;nearbyWorldInteractable=item;}
    });
  }
  if(nearbyWorldInteractable){
    prompt.textContent=nearbyWorldInteractable.type==='gateLever'?'РЫЧАГ — ОТКРЫТЬ КОРОТКИЙ ПУТЬ':
      nearbyWorldInteractable.type==='elevatorCall'?'ВЫЗВАТЬ ЛИФТ':
      nearbyWorldInteractable.elevator.moving?'ЛИФТ ДВИЖЕТСЯ':'ЛИФТ — ПОДЪЁМ / СПУСК';
    prompt.classList.add('show');
  } else prompt.classList.remove('show');
}

function activateNearbyWorldObject(){
  const item=nearbyWorldInteractable;
  if(!item||gameMode!==GameMode.PLAYING) return;
  if(item.type==='gateLever'){
    const gate=item.gate;
    if(gate.opened){notify('КОРОТКИЙ ПУТЬ УЖЕ ОТКРЫТ');return;}
    gate.opened=true;gate.group.remove(gate.panel);wallColliders=wallColliders.filter(box=>box!==gate.collider);
    gate.levers.forEach(lever=>lever.handle.material.color.setHex(0x44bb66));
    worldInteractables=worldInteractables.filter(entry=>entry.gate!==gate);
    sfx('lever');notify('КОРОТКИЙ ПУТЬ ОТКРЫТ');SaveSystem.save();
    return;
  }
  const elevator=item.elevator;
  if(elevator.moving){notify('ЛИФТ УЖЕ ДВИЖЕТСЯ');return;}
  const onPlatform=Math.hypot(hunter.position.x-elevator.x,hunter.position.z-elevator.z)<2.1&&Math.abs(hunter.position.y-(elevator.currentY+0.4))<1.4;
  if(item.type==='elevatorCall'){
    const requestedY=FLOOR_LEVELS[item.floorIndex];
    if(Math.abs(elevator.currentY-requestedY)<0.8){
      if(onPlatform){
        elevator.targetY=item.floorIndex===0?elevator.upperY:elevator.lowerY;
        elevator.rider=true;
      } else {notify('ЛИФТ УЖЕ НА ЭТАЖЕ — ВСТАНЬТЕ НА ПЛАТФОРМУ');return;}
    } else {elevator.targetY=requestedY;elevator.rider=false;}
  } else {
    if(!onPlatform){notify('ВСТАНЬТЕ НА ПЛАТФОРМУ');return;}
    elevator.targetY=elevator.currentY<(elevator.lowerY+elevator.upperY)/2?elevator.upperY:elevator.lowerY;
    elevator.rider=true;
  }
  elevator.moving=true;sfx('liftStart');
}

function getFloorHeightAt(x,z,currentY=0){
  for(const elevator of stageElevators){
    if(Math.abs(x-elevator.x)<=2.35&&Math.abs(z-elevator.z)<=2.35&&Math.abs(currentY-(elevator.currentY+0.4))<2.8) return elevator.currentY+0.4;
  }
  for(const stair of stairs){
    const side=Math.abs(x-stair.x),along=z-stair.z;
    if(side<=stair.width/2+0.8&&along>=-0.25&&along<=stair.run+0.25){
      const t=Math.max(0,Math.min(1,along/stair.run));
      return stair.lowerY+(stair.upperY-stair.lowerY)*t;
    }
  }
  return FLOOR_LEVELS.reduce((closest,y)=>Math.abs(y-currentY)<Math.abs(closest-currentY)?y:closest,FLOOR_LEVELS[0]);
}

function updateHunterFloor(){
  if(!hunter) return;
  hunter.position.y=getFloorHeightAt(hunter.position.x,hunter.position.z,hunter.position.y);
  const nextFloor=Math.abs(hunter.position.y-FLOOR_LEVELS[1])<FLOOR_HEIGHT/2?1:0;
  if(nextFloor!==currentFloorIndex){ currentFloorIndex=nextFloor; updateStageLocationLabel(true); }
}

function updateStageLocationLabel(show=false){
  if(!scene || gameMode!==GameMode.PLAYING || !hunter) return;
  const room=roomAtWorldPosition(hunter.position.x,hunter.position.z),label=currentLocation+'-'+currentFloorIndex+'-'+room;
  if(label===lastRoomNotice) return;
  lastRoomNotice=label;
  $('locName').textContent=LOCATIONS[currentLocation]+' · ЭТАЖ '+(currentFloorIndex+1)+' · КОМНАТА '+String(room+1).padStart(2,'0');
  if(show){ $('locName').classList.remove('show'); void $('locName').offsetWidth; $('locName').classList.add('show'); }
}
function createGothicWall(worldX,worldY,worldZ,w,h,d,isBoundary){
  if(!scene) return null;
  const surfaces = createSurfaceTextures();
  const mat = new THREE.MeshStandardMaterial({color:0xffffff,map:surfaces.wall,bumpMap:surfaces.wallBump,bumpScale:0.18,roughness:0.84,metalness:0.02,transparent:true,opacity:1});
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  wall.position.set(worldX,worldY,worldZ);
  wall.castShadow = true; wall.receiveShadow = true;
  wall.userData = { minX: worldX - w/2, maxX: worldX + w/2, minY:worldY-h/2, maxY:worldY+h/2, minZ: worldZ - d/2, maxZ: worldZ + d/2, targetOpacity: 1, isBoundary, cx: worldX, cy: worldY, cz: worldZ, w, h, d };
  scene.add(wall);
  wallMeshes.push(wall);
  wallColliders.push(wall.userData);

  if(h < 4.5 && !isBoundary){
    const archMat = new THREE.MeshStandardMaterial({color:0x1e1a28, roughness:0.9});
    const arch = new THREE.Mesh(new THREE.BoxGeometry(w*0.7, 0.5, d*0.7), archMat);
    arch.position.set(worldX, worldY+h/2+0.15, worldZ);
    arch.castShadow = true;
    scene.add(arch);
    const deco = {mesh:arch,userData:{cx:worldX, cy:h+0.15, cz:worldZ, minX:1, maxX:-1, minZ:1, maxZ:-1}, material:archMat, visible:true, isDeco:true, isMesh:true, remove(){ scene.remove(arch); }};
    wallMeshes.push(deco);
  }
  return wall;
}
function createDistantHorizon(locationIndex){
  if(!scene) return;
  if(!horizonAssets){
    horizonAssets = {
      house:new THREE.MeshStandardMaterial({color:0x19171b,roughness:1,metalness:0}),
      forest:new THREE.MeshStandardMaterial({color:0x18201b,roughness:1,metalness:0}),
      block:new THREE.BoxGeometry(1,1,1),
      roof:new THREE.ConeGeometry(0.55,1,4),
      finial:new THREE.ConeGeometry(0.12,1,6),
      trunk:new THREE.CylinderGeometry(0.16,0.24,1,5),
      pine:new THREE.ConeGeometry(0.5,1,5)
    };
  }
  const extent = Math.max(STAGE_WORLD_WIDTH,STAGE_WORLD_DEPTH)/2 + 24;
  for(let side=0;side<4;side++){
    for(let i=0;i<6;i++){
      const along = -extent+4+i*((extent-4)*2/5);
      const x = side<2 ? along : (side===2 ? -extent : extent);
      const z = side<2 ? (side===0 ? -extent : extent) : along;
      const group = new THREE.Group();
      const forest = locationIndex === 2;
      const width = 5+Math.random()*4;
      const depth = 5+Math.random()*4;
      const height = forest ? 13+Math.random()*15 : (locationIndex===1 ? 14+Math.random()*14 : 9+Math.random()*13);
      const material = forest ? horizonAssets.forest : horizonAssets.house;
      const addPart = (geometry,mat,px,py,pz,sx,sy,sz) => {
        const mesh = new THREE.Mesh(geometry,mat);
        mesh.position.set(px,py,pz);
        mesh.scale.set(sx,sy,sz);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        group.add(mesh);
      };
      if(forest){
        addPart(horizonAssets.trunk,horizonAssets.house,0,height*0.31,0,width*0.15,height*0.62,width*0.15);
        for(let tier=0;tier<3;tier++){
          const crownH = height*0.48;
          const crownY = height*(0.43+tier*0.19);
          const crownW = width*(1-tier*0.18);
          addPart(horizonAssets.pine,material,0,crownY,0,crownW,crownH,crownW);
        }
      } else {
        addPart(horizonAssets.block,material,0,height/2,0,width,height,depth);
        const roofH = locationIndex===1 ? height*0.46 : height*0.34;
        addPart(horizonAssets.roof,material,0,height+roofH/2,0,width*0.88,roofH,width*0.88);
        if(locationIndex===1 || i%2===0){
          const spireH = locationIndex===1 ? 6+Math.random()*6 : 3+Math.random()*4;
          addPart(horizonAssets.finial,material,0,height+roofH+spireH/2,0,width*0.2,spireH,width*0.2);
        }
      }
      group.position.set(x,0,z);
      scene.add(group);
      envObjects.push({mesh:group});
    }
  }
}

function generateMaze(size,seed){
  const random=seed===undefined?Math.random:seededRandom(seed);
  const grid = [];
  for(let y=0;y<size;y++){grid[y]=[];for(let x=0;x<size;x++)grid[y][x]=1;}
  function carve(x,y){
    grid[y][x] = 0;
    const dirs = [[0,-2],[0,2],[-2,0],[2,0]];
    for(let i=dirs.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[dirs[i],dirs[j]]=[dirs[j],dirs[i]];}
    for(const [dx,dy] of dirs){
      const nx = x+dx, ny = y+dy;
      if(nx>0&&nx<size-1&&ny>0&&ny<size-1&&grid[ny][nx]===1){
        grid[y+dy/2][x+dx/2]=0; carve(nx,ny);
      }
    }
  }
  carve(1,1);
  for(let i=0;i<size*6;i++){
    const x = 1+Math.floor(random()*(size-2));
    const y = 1+Math.floor(random()*(size-2));
    if(grid[y][x]===1){
      const n = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([nx,ny])=>nx>0&&nx<size-1&&ny>0&&ny<size-1&&grid[ny][nx]===0);
      if(n.length>=2) grid[y][x]=0;
    }
  }
  return grid;
}
function buildMazeWalls(grid,ox,oz){
  const size = grid.length * cellSize;
  const floorPadding = 24;
  createCobblestoneFloor(size+floorPadding*2,ox-floorPadding,oz-floorPadding);
  for(let y=0;y<grid.length;y++){
    for(let x=0;x<grid[y].length;x++){
      if(grid[y][x]===1){
        const h = 3.5 + Math.random()*1.2;
        createGothicWall(ox + x*cellSize + cellSize/2, h/2, oz + y*cellSize + cellSize/2, cellSize, h, cellSize, false);
      }
    }
  }
}
let _wallCheckFrame = 0;
function updateWallTransparency(){
  _wallCheckFrame++;
  if(_wallCheckFrame % 2 !== 0) return;
  if(!hunter || !camera) return;
  const cPos = camera.position.clone();
  const hBase = hunter.position.clone();
  const hCenter = new THREE.Vector3(hBase.x, hBase.y + Math.max(1.5,hunterVisualHeight*0.55), hBase.z);
  const hunterDist = cPos.distanceTo(hCenter);
  const mainDir = hCenter.clone().sub(cPos).normalize();
  wallMeshes.forEach(wall => {
    if(wall.isDeco) return;
    let target = 1.0;
    const candidates=wall.userData.colliders||[wall.userData];
    for(const box of candidates){
      if(hunter.position.y+2.2<box.minY || hunter.position.y+2.2>box.maxY+2) continue;
      const wallCenter=new THREE.Vector3(box.cx,box.cy,box.cz);
      const distToCam=wallCenter.distanceTo(cPos);
      if(distToCam<2.8){ target=wall.userData.isRoomBatch?0.82:0.58; break; }
      const toWall=wallCenter.clone().sub(cPos),proj=toWall.dot(mainDir);
      if(proj>0&&proj<hunterDist+1){
        const closest=cPos.clone().addScaledVector(mainDir,proj);
        if(closest.distanceTo(wallCenter)<2.2){ target=wall.userData.isRoomBatch?0.74:0.42; break; }
      }
    }
    wall.userData.targetOpacity = target;
    const speed = target < wall.material.opacity ? 0.18 : 0.10;
    wall.material.opacity = lerp(wall.material.opacity, target, speed);
    wall.material.depthWrite=wall.material.opacity>0.68;
    wall.visible = true;
  });
}

function collectSharedWorldResources(){
  const shared={geometries:new Set(),materials:new Set()};
  const addRoot=root=>{
    if(!root||typeof root.traverse!=='function') return;
    root.traverse(node=>{
      if(node.geometry) shared.geometries.add(node.geometry);
      if(node.material){
        const materials=Array.isArray(node.material)?node.material:[node.material];
        materials.forEach(material=>{if(material) shared.materials.add(material);});
      }
    });
  };
  const addCache=cache=>Object.values(cache||{}).forEach(resource=>{
    if(resource&&resource.isBufferGeometry) shared.geometries.add(resource);
    if(resource&&resource.isMaterial) shared.materials.add(resource);
  });
  addRoot(hunterModelSource);
  addRoot(spiderModelBundle&&spiderModelBundle.scene);
  addRoot(spiderFallbackBundle&&spiderFallbackBundle.scene);
  Object.values(extraModelBundles||{}).forEach(bundle=>addRoot(bundle&&bundle.scene));
  addCache(cryptAtmosphereAssets);
  addCache(horizonAssets);
  return shared;
}

function disposeWorldObjectResources(root,shared,disposed){
  if(!root||typeof root.traverse!=='function') return;
  root.traverse(node=>{
    const geometry=node.geometry;
    if(geometry&&!shared.geometries.has(geometry)&&!disposed.geometries.has(geometry)){
      disposed.geometries.add(geometry);
      geometry.dispose();
    }
    if(node.material){
      const materials=Array.isArray(node.material)?node.material:[node.material];
      materials.forEach(material=>{
        if(material&&!shared.materials.has(material)&&!disposed.materials.has(material)){
          disposed.materials.add(material);
          material.dispose();
        }
      });
    }
  });
}

function clearWorld(){
  if(!scene) return;
  clearEnemyModelAttachQueue();
  const shared=collectSharedWorldResources(),disposed={geometries:new Set(),materials:new Set()};
  const removeObject=object=>{
    if(!object) return;
    scene.remove(object);
    disposeWorldObjectResources(object,shared,disposed);
  };
  [...enemies,...chests,...lanterns,...envObjects].forEach(object=>removeObject(object&&object.mesh));
  floorMeshes.forEach(removeObject);
  wallMeshes.forEach(wall=>removeObject(wall&&(wall.mesh||(!wall.isDeco?wall:null))));
  dustMotes.forEach(mote=>removeObject(mote&&mote.mesh));
  ambientCreatures.forEach(creature=>removeObject(creature&&creature.mesh));
  attackTrails.forEach(trail=>{removeObject(trail&&trail.mesh);if(trail&&trail.light) scene.remove(trail.light);});
  parryIndicators.forEach(indicator=>removeObject(indicator&&indicator.mesh));
  toolProjectiles.forEach(projectile=>removeObject(projectile&&projectile.mesh));
  bloodParticles.forEach(particle=>removeObject(particle&&particle.mesh));
  removeObject(doll);
  removeObject(workshop);
  removeObject(waystone);
  removeObject(bloodStainMesh);
  bloodStainMesh = null;
  enemies = []; wallMeshes = []; wallColliders=[]; floorMeshes=[]; stairs=[]; chests = []; lanterns = []; envObjects = [];
  bloodParticles=[];dustMotes = []; ambientCreatures=[]; attackTrails = []; parryIndicators = []; toolProjectiles = [];
  doll = null; workshop = null; waystone = null;
  nearbyLantern = null; nearbyDoll = false; nearbyWorldInteractable=null;
  shortcutGates=[]; stageElevators=[]; worldInteractables=[];
}

function addHPBar(g,size){
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(size,size*0.13), new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.75,depthTest:false}));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(size,size*0.13), new THREE.MeshBasicMaterial({color:0xaa0000,depthTest:false}));
  bg.position.set(0,size*1.3,0); fill.position.set(0,size*1.3,0.001);
  bg.renderOrder = 999; fill.renderOrder = 1000;
  g.add(bg); g.add(fill);
  return {bg,fill,baseSize:size};
}

/* ====================================================================
   СОЗДАНИЕ ВРАГОВ С АНИМИРОВАННЫМИ СОЧЛЕНЁННЫМИ КОНЕЧНОСТЯМИ
   ==================================================================== */
