import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { createNet } from './multiplayer.js';

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2b4f8c); scene.fog = new THREE.Fog(0x2b4f8c, 55, 140);
const camera = new THREE.PerspectiveCamera(72, innerWidth/innerHeight, .1, 180); camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.getElementById('game').appendChild(renderer.domElement);
const worldHemi=new THREE.HemisphereLight(0xf0f5ff, 0x526ca3, 3.8), worldAmbient=new THREE.AmbientLight(0x9bbcff, 1.1); scene.add(worldHemi, worldAmbient);
const sun = new THREE.DirectionalLight(0xffffff, 5.2); sun.position.set(-18, 32, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); scene.add(sun);
const cyan = 0x36d9ff, pink = 0xff4e86, purple = 0x725cff;
const mat = (color, emissive=0, rough=.6) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: emissive ? 2 : 0, roughness: rough, metalness: .15 });
const battlegroundParts=[];
const box = (x,y,z, px,py,pz, material, glow=false) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x,y,z), material); m.position.set(px,py,pz); m.castShadow = true; m.receiveShadow = true; scene.add(m); battlegroundParts.push(m); if(glow) { const l=new THREE.PointLight(material.color,2.6,10); l.position.set(px,py+1,pz); scene.add(l); battlegroundParts.push(l); } return m; };
const cylinder = (r,h,x,y,z, material) => { const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),material); m.position.set(x,y,z); m.castShadow=true; scene.add(m); battlegroundParts.push(m); return m; };
box(74,1,74,0,-.5,0,mat(0x38599a)); box(74, .25, .35,0,.3,-37,mat(cyan,cyan)); box(74,.25,.35,0,.3,37,mat(pink,pink)); box(.35,.25,74,-37,.3,0,mat(0x6f8ed6)); box(.35,.25,74,37,.3,0,mat(0x6f8ed6));
for(let i=-3;i<=3;i++){ box(2.5,.08,74,i*10,.12,0,mat(0x202b54)); }
// Outer arena architecture
for(const z of [-30,30]) { for(let x=-30;x<=30;x+=10) { box(7,7,2,x,3.5,z,mat(z<0?0x172a59:0x3a183a)); } }
for(const x of [-30,30]) for(let z=-20;z<=20;z+=10) box(2,7,7,x,3.5,z,mat(0x172044));
// Cover lanes, center platform and towers
box(14,1,10,0,.5,0,mat(0x253569)); box(12,.3,8,0,1.05,0,mat(purple,purple),true);
box(12,4,2,-17,2,-10,mat(0x203260)); box(12,4,2,17,2,10,mat(0x42233d)); box(3,5,10,-8,2.5,-19,mat(0x263c70)); box(3,5,10,8,2.5,19,mat(0x5a2949));
box(9,3,3,18,1.5,-13,mat(0x28396f)); box(9,3,3,-18,1.5,13,mat(0x4b294d));
for(const [x,z,c] of [[-25,-22,cyan],[25,22,pink],[-25,22,cyan],[25,-22,pink]]) { cylinder(2.1,.45,x,.3,z,mat(c,c)); cylinder(.25,3,x,2,z,mat(c,c)); }
const solidAreas=[{x:-17,z:-10,w:12,d:2,h:4},{x:17,z:10,w:12,d:2,h:4},{x:-8,z:-19,w:3,d:10,h:5},{x:8,z:19,w:3,d:10,h:5},{x:18,z:-13,w:9,d:3,h:3},{x:-18,z:13,w:9,d:3,h:3}];
// Rotation-aware footprint test shared by walking collision and landing checks.
const inArea=(a,x,z,pad)=>{const dx=x-a.x,dz=z-a.z;if(a.rot){const c=Math.cos(a.rot),s=Math.sin(a.rot);return Math.abs(dx*c-dz*s)<a.w/2+pad&&Math.abs(dx*s+dz*c)<a.d/2+pad;}return Math.abs(dx)<a.w/2+pad&&Math.abs(dz)<a.d/2+pad;};
let activeSolidAreas=solidAreas;
function blocked(pos){if(pos.x<-28.4||pos.x>28.4||pos.z<-28.4||pos.z>28.4)return true;return activeSolidAreas.some(a=>inArea(a,pos.x,pos.z,.65)&&pos.y<a.h+1.2);}
function landOnObstacle(previousY){for(const a of activeSolidAreas){const inside=inArea(a,player.pos.x,player.pos.z,.5);const top=a.h+1.2;if(inside&&player.pos.y<=top&&previousY>=top&&player.vertical<=0){player.pos.y=top;player.vertical=0;player.grounded=true;return true;}}return false;}
// Center beacon
cylinder(1.8,.35,0,1.5,0,mat(0x182858)); cylinder(.4,3,0,3,0,mat(cyan,cyan)); const beacon=new THREE.PointLight(cyan,5,18); beacon.position.set(0,4,0); scene.add(beacon);
// Grid stars / ceiling light bars
for(let i=0;i<28;i++){ const x=(Math.random()-.5)*70, z=(Math.random()-.5)*70; box(.12,.12,.12,x,8+Math.random()*12,z,mat(i%2?cyan:pink,i%2?cyan:pink)); }
const blueScoreEl=document.getElementById('blueScore'), redScoreEl=document.getElementById('redScore'), healthBarEl=document.getElementById('healthBar'), hpTextEl=document.getElementById('hpText');
const crosshair=document.getElementById('crosshair'), settings=document.getElementById('settings'), weaponName=document.getElementById('weaponName'), slotLabel=document.getElementById('slotLabel'), ammoText=document.getElementById('ammoText'), hitmark=document.getElementById('hitmark'), damageNumber=document.getElementById('damage');
const weapons=[{name:'ASSAULT RIFLE',slot:'PRIMARY',ammo:'AMMO 24 / ∞',rate:130,damage:34},{name:'HANDGUN',slot:'SECONDARY',ammo:'AMMO 12 / ∞',rate:260,damage:48},{name:'FISTS',slot:'MELEE',ammo:'CLOSE RANGE',rate:420,damage:70},{name:'GRENADE',slot:'UTILITY',ammo:'AMMO 3',rate:800,damage:100},{name:'SCYTHE',slot:'MELEE',ammo:'DASH READY',rate:650,damage:110},{name:'SNIPER',slot:'PRIMARY',ammo:'AMMO 4',rate:900,damage:34}];
const player={pos:new THREE.Vector3(0,2.2,27), yaw:0, cameraYaw:0, avatarYaw:0, pitch:0, hp:100, blue:0, red:0, slot:0, meleeChoice:2, primaryChoice:0, aimHold:false, aimKey:false, reloading:false, reloadTime:0, reloadTotal:0, reloadSlot:0, walkPhase:0, walkBlend:0, sensitivity:1, scopeSensitivity:.5, ammo:{0:{mag:24,max:24,reserve:72},1:{mag:12,max:12,reserve:48},2:{mag:4,max:4,reserve:24}}, vertical:0, grounded:true, crouching:false, sliding:false, slideTime:0, slideCooldown:0, aiming:false, scytheCooldown:0, grenades:3, doubleJumpUsed:false, prevSlot:null, quickMeleeTimer:0, fly:false, flySpeed:14}; const weaponAnim={recoil:0,swing:0,throw:0,inspect:0}; camera.position.copy(player.pos);
const ammoPickups=[]; let gameMode='lobby'; const rangeTargets=[];
function updateAmmoHud(){if(player.slot<2||player.slot===5){const a=player.slot===5?player.ammo[2]:player.ammo[player.slot];ammoText.textContent='AMMO '+a.mag+' / '+a.reserve;}else if(player.slot===3)ammoText.textContent='AMMO '+player.grenades;else if(player.slot===4)ammoText.textContent='DASH READY';else ammoText.textContent='CLOSE RANGE';}
updateAmmoHud();
// First-person weapon viewmodel: simple readable silhouettes that swap with the loadout.
const weaponView=new THREE.Group(); weaponView.position.set(.42,-.38,-.72); camera.add(weaponView); scene.add(camera);
const weaponMat=mat(0x242a3c), accentMat=mat(cyan,cyan), skinMat=mat(0xc28a72), rifleBlack=mat(0x111521), rifleSteel=mat(0x30394c), rifleOrange=mat(0xa95d31), rifleWood=mat(0x854522);
function part(geometry, material, position, rotation=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.rotation.set(...rotation);m.castShadow=true;weaponView.add(m);return m;}
function addWeaponHands(){
  if(player.slot===2)return;
  const handTone=mat(0xc58d78), cuffTone=mat(0x293247);
  // Forearms come up from the bottom of the screen and meet the weapon grip.
  part(new THREE.BoxGeometry(.18,.58,.2),handTone,[.34,-.42,-.03],[.22,0,-.2]);
  part(new THREE.BoxGeometry(.18,.58,.2),handTone,[-.34,-.4,-.18],[.2,0,.2]);
  part(new THREE.BoxGeometry(.25,.2,.28),handTone,[.22,-.16,-.43],[.12,0,-.12]);
  part(new THREE.BoxGeometry(.25,.2,.28),handTone,[-.2,-.12,-.62],[.1,0,.12]);
  part(new THREE.BoxGeometry(.2,.08,.22),cuffTone,[.34,-.7,.02],[.22,0,-.2]);
  part(new THREE.BoxGeometry(.2,.08,.22),cuffTone,[-.34,-.68,-.13],[.2,0,.2]);
}
function rebuildWeapon(){while(weaponView.children.length)weaponView.remove(weaponView.children[0]); weaponView.scale.setScalar(player.slot===0?.72:1); if(player.slot===0){
  // Stylized AK-like silhouette based on the reference: orange receiver/stock, dark barrel and curved magazine.
  part(new THREE.BoxGeometry(.34,.36,.62),rifleOrange,[0,.02,-.28]);
  part(new THREE.BoxGeometry(.25,.27,.3),rifleSteel,[0,.02,-.68]);
  part(new THREE.CylinderGeometry(.075,.075,1.35,10),rifleBlack,[0,.12,-1.34],[Math.PI/2,0,0]);
  part(new THREE.CylinderGeometry(.15,.13,.2,10),rifleBlack,[0,.12,-2.02],[Math.PI/2,0,0]);
  part(new THREE.BoxGeometry(.16,.14,.52),rifleBlack,[0,.2,-.85]);
  part(new THREE.CylinderGeometry(.055,.055,.3,8),rifleBlack,[0,.28,-.55],[Math.PI/2,0,0]);
  part(new THREE.BoxGeometry(.18,.11,.28),rifleBlack,[0,.34,-.43]);
  part(new THREE.BoxGeometry(.2,.52,.2),rifleBlack,[0,-.32,-.16],[.22,0,0]);
  part(new THREE.BoxGeometry(.24,.16,.66),rifleBlack,[0,-.27,-.05],[.12,0,0]);
  part(new THREE.BoxGeometry(.26,.3,.5),rifleWood,[0,-.01,.38]);
  part(new THREE.BoxGeometry(.3,.34,.24),rifleWood,[0,-.02,.66]);
  part(new THREE.BoxGeometry(.14,.12,.16),rifleBlack,[0,.12,.02]);
  part(new THREE.BoxGeometry(.2,.06,.12),accentMat,[0,.25,-.48]);
}else if(player.slot===1){part(new THREE.BoxGeometry(.22,.2,.6),weaponMat,[0,0,-.28]);part(new THREE.BoxGeometry(.13,.3,.16),weaponMat,[0,-.22,-.08],[.2,0,0]);part(new THREE.BoxGeometry(.08,.08,.2),accentMat,[0,.05,-.62]);part(new THREE.BoxGeometry(.07,.07,.28),weaponMat,[0,.06,-.72]);part(new THREE.BoxGeometry(.2,.05,.1),accentMat,[0,.15,-.25]);}else if(player.slot===2){part(new THREE.SphereGeometry(.18,12,8),skinMat,[-.18,-.12,-.38]);part(new THREE.SphereGeometry(.18,12,8),skinMat,[.18,-.12,-.38]);}else if(player.slot===4){part(new THREE.BoxGeometry(.12,.75,.12),rifleBlack,[0,-.04,-.42],[0,0,.22]);part(new THREE.BoxGeometry(.7,.12,.1),rifleSteel,[0,.18,-.62],[0,.25,0]);part(new THREE.CylinderGeometry(.13,.04,.18,8),rifleBlack,[0,.18,-.95],[Math.PI/2,0,0]);part(new THREE.BoxGeometry(.13,.23,.18),rifleWood,[0,-.3,-.18]);}else if(player.slot===5){part(new THREE.BoxGeometry(.24,.25,.7),rifleSteel,[0,0,-.28]);part(new THREE.CylinderGeometry(.065,.065,1.7,10),rifleBlack,[0,.08,-1.15],[Math.PI/2,0,0]);part(new THREE.CylinderGeometry(.12,.1,.18,10),rifleBlack,[0,.08,-2.02],[Math.PI/2,0,0]);part(new THREE.CylinderGeometry(.1,.1,.42,10),rifleBlack,[0,.28,-.38],[Math.PI/2,0,0]);part(new THREE.BoxGeometry(.18,.14,.35),accentMat,[0,.22,-.62]);part(new THREE.BoxGeometry(.2,.5,.25),rifleBlack,[0,-.27,.05],[.15,0,0]);}else{part(new THREE.SphereGeometry(.17,12,8),mat(0x45516a),[0,0,-.25]);part(new THREE.BoxGeometry(.1,.3,.1),accentMat,[0,-.17,-.25]);part(new THREE.BoxGeometry(.08,.08,.22),mat(0x202536),[0,.06,-.44]);}if(player.slot!==2)addWeaponHands();}
rebuildWeapon();
const keys={}; let locked=false, shooting=false, lastShot=0; const bots=[];
function updateAim(){ player.aiming=(player.aimHold||player.aimKey)&&player.slot!==4; document.querySelector('.hud').classList.toggle('aiming',player.aiming); }
function setWeapon(slot){ if(slot===2)slot=player.meleeChoice; if(slot===0)slot=player.primaryChoice; player.slot=(slot+6)%6; player.aimHold=false; player.aimKey=false; player.reloading=false; updateAim(); const w=weapons[player.slot]; weaponName.innerHTML=w.name+(player.slot===0?' <span style="color:#6cd9ff">▰▰▰</span>':''); slotLabel.textContent=w.slot+' · '+(player.slot+1); updateAmmoHud(); rebuildWeapon(); showMessage(w.name); }
function reloadWeapon(){if(gameMode==='lobby'||player.reloading)return;if(player.slot!==0&&player.slot!==1&&player.slot!==5){showMessage('NO MAGAZINE');return;}const ammoSlot=player.slot===5?2:player.slot;const a=player.ammo[ammoSlot];if(a.mag>=a.max||a.reserve<=0){showMessage(a.reserve<=0?'NO RESERVE AMMO':'MAG FULL');return;}player.reloading=true;player.reloadSlot=ammoSlot;player.reloadTotal=player.slot===1?.9:1.2;player.reloadTime=player.reloadTotal;showMessage('RELOADING');}
function finishReload(){player.reloading=false;const a=player.ammo[player.reloadSlot];const needed=a.max-a.mag;const loaded=Math.min(needed,a.reserve);a.mag+=loaded;a.reserve-=loaded;updateAmmoHud();showMessage('RELOADED');}
function updateCrosshair(){ crosshair.className='crosshair '+document.getElementById('crosshairStyle').value; crosshair.style.color=document.getElementById('crosshairColor').value; }
function showHit(damage){ hitmark.classList.remove('show');damageNumber.classList.remove('show');void hitmark.offsetWidth;damageNumber.textContent='-'+damage;hitmark.classList.add('show');damageNumber.classList.add('show'); }
function makeBot(x,z,color,team){ const root=new THREE.Group(); root.position.set(x,0,z); scene.add(root); const legMat=mat(0x20283c);const leftLeg=new THREE.Mesh(new THREE.BoxGeometry(.3,.85,.38),legMat);leftLeg.position.set(-.27,.43,0);leftLeg.castShadow=true;root.add(leftLeg);const rightLeg=new THREE.Mesh(new THREE.BoxGeometry(.3,.85,.38),legMat);rightLeg.position.set(.27,.43,0);rightLeg.castShadow=true;root.add(rightLeg); const body=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.35,.75),mat(color)); body.position.y=1.4; body.castShadow=true; body.userData.hitZone='body'; root.add(body); const armMat=mat(color);const leftArm=new THREE.Mesh(new THREE.BoxGeometry(.28,.95,.36),armMat);leftArm.position.set(-.72,1.42,0);leftArm.castShadow=true;root.add(leftArm);const rightArm=new THREE.Mesh(new THREE.BoxGeometry(.28,.95,.36),armMat);rightArm.position.set(.72,1.42,0);rightArm.castShadow=true;root.add(rightArm); const head=new THREE.Mesh(new THREE.BoxGeometry(.78,.78,.78),mat(0xf0c2ae)); head.position.y=2.45; head.castShadow=true; head.userData.hitZone='head'; root.add(head); const visor=new THREE.Mesh(new THREE.BoxGeometry(.62,.16,.08),mat(color,color)); visor.position.set(0,2.45,.4); visor.userData.hitZone='head'; root.add(visor); // Bots face the player along +Z, so the gun must point +Z too or it stays hidden behind the body.
 const gun=new THREE.Group(); gun.name='gun';
 const gunBody=new THREE.Mesh(new THREE.BoxGeometry(.17,.17,.85),mat(0x2a3140)); gunBody.position.z=.3; gunBody.castShadow=true; gun.add(gunBody);
 const gunBarrel=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.62,10),mat(0x14181f)); gunBarrel.rotation.x=Math.PI/2; gunBarrel.position.z=.92; gun.add(gunBarrel);
 const gunMag=new THREE.Mesh(new THREE.BoxGeometry(.12,.26,.22),mat(0x1d2431)); gunMag.position.set(0,-.2,.24); gun.add(gunMag);
 const gunStock=new THREE.Mesh(new THREE.BoxGeometry(.15,.15,.34),mat(0x353d4f)); gunStock.position.z=-.24; gun.add(gunStock);
 gun.position.set(.62,1.25,.5); gun.rotation.y=-.06; root.add(gun); return {root,team,hp:100,alive:true,respawn:0,home:new THREE.Vector3(x,0,z),shoot:Math.random()*2}; }
[[-20,-25,'blue'],[20,-25,'blue'],[-22,-18,'blue'],[22,18,'red'],[-20,22,'red'],[20,25,'red']].forEach(([x,z,t],i)=>{const b=makeBot(x,z,t==='blue'?cyan:pink,t);b.phase=i*1.7;b.strafe=1+(i%2)*.7;bots.push(b);});
const arenaObjects=scene.children.filter(object=>object!==camera);arenaObjects.forEach(object=>object.visible=false);
const arenaMapGroup=new THREE.Group();scene.add(arenaMapGroup);
// ARENA is a darker grey blockout: all structure is grey, only the enemies keep their colors.
const arenaMapMat=mat(0xa3a9b0), arenaMapDark=mat(0x868e97), arenaMapEdge=mat(0x939aa3), arenaMapAccent=mat(0x6b737b);
const arenaSolidAreas=[];
function arenaMapBox(x,y,z,px,py,pz,material,rotation=0){const m=new THREE.Mesh(new THREE.BoxGeometry(x,y,z),material);m.position.set(px,py,pz);m.rotation.y=rotation;m.castShadow=true;m.receiveShadow=true;arenaMapGroup.add(m);if(y>=.8&&py+y/2>.1)arenaSolidAreas.push({x:px,z:pz,w:x,d:z,h:py+y/2,rot:rotation});return m;}
arenaMapBox(60,1,60,0,-.5,0,arenaMapMat);
arenaMapBox(60,7,1,0,3.5,-30,arenaMapEdge);arenaMapBox(60,7,1,0,3.5,30,arenaMapEdge);arenaMapBox(1,7,60,-30,3.5,0,arenaMapEdge);arenaMapBox(1,7,60,30,3.5,0,arenaMapEdge);
arenaMapBox(12,4,10,0,2,0,arenaMapDark);
arenaMapBox(10,3,2,0,1.5,-9,arenaMapDark);arenaMapBox(10,3,2,0,1.5,9,arenaMapDark);
arenaMapBox(3,3,12,-17,1.5,0,arenaMapDark);arenaMapBox(3,3,12,17,1.5,3,arenaMapDark);
arenaMapBox(8,3,3,-16,1.5,-13,arenaMapDark);arenaMapBox(7,4,3,15,2,-13,arenaMapDark);
arenaMapBox(8,3,3,-15,1.5,12,arenaMapDark);arenaMapBox(8,3,3,15,1.5,12,arenaMapDark);
arenaMapBox(3,2,7,-6,1,-17,arenaMapEdge);arenaMapBox(10,2,3,8,1,-1,arenaMapEdge);arenaMapBox(3,2,8,-10,1,-3,arenaMapEdge);
arenaMapBox(3,2,7,6,1,17,arenaMapEdge);arenaMapBox(8,2,3,-8,1,7,arenaMapEdge);arenaMapBox(3,2,7,18,1,3,arenaMapEdge);
arenaMapBox(7,2,2,-8,1,-14,arenaMapEdge,-.45);arenaMapBox(7,2,2,9,1,14,arenaMapEdge,.45);
arenaMapBox(5,2,2,-22,1,-7,arenaMapEdge,.35);arenaMapBox(5,2,2,22,1,9,arenaMapEdge,-.35);
arenaMapBox(4,2,4,-22,1,16,arenaMapDark);arenaMapBox(4,2,4,22,1,-17,arenaMapDark);
arenaMapBox(10,.25,.35,0,5,-29.4,arenaMapAccent);arenaMapBox(10,.25,.35,0,5,29.4,arenaMapAccent);
arenaMapGroup.add(new THREE.HemisphereLight(0xdfe3e8,0x6f757c,1.9));
const arenaMapSun=new THREE.DirectionalLight(0xe6e9ed,2.2);arenaMapSun.position.set(-18,30,14);arenaMapSun.castShadow=true;arenaMapGroup.add(arenaMapSun);
arenaMapGroup.add(new THREE.AmbientLight(0xffffff,.7));
arenaMapGroup.visible=false;
const lobbyGroup=new THREE.Group();scene.add(lobbyGroup);const lobbyFloor=new THREE.Mesh(new THREE.CylinderGeometry(26,26,.6,48),mat(0x4166a8));lobbyFloor.position.y=-.3;lobbyFloor.receiveShadow=true;lobbyGroup.add(lobbyFloor);const lobbyRing=new THREE.Mesh(new THREE.TorusGeometry(17,.18,8,64),mat(cyan,cyan));lobbyRing.rotation.x=Math.PI/2;lobbyRing.position.y=.05;lobbyGroup.add(lobbyRing);const lobbyCenter=new THREE.Mesh(new THREE.CylinderGeometry(7.2,7.2,.5,48),mat(0x253c78,purple));lobbyCenter.position.y=.25;lobbyCenter.receiveShadow=true;lobbyGroup.add(lobbyCenter);const lobbyCore=new THREE.Mesh(new THREE.CylinderGeometry(5.7,5.7,.18,48),mat(0x4e73b8,cyan));lobbyCore.position.y=.55;lobbyGroup.add(lobbyCore);const coreGlow=new THREE.PointLight(cyan,8,22);coreGlow.position.set(0,2,0);lobbyGroup.add(coreGlow);const innerRing=new THREE.Mesh(new THREE.TorusGeometry(6.6,.22,8,48),mat(cyan,cyan));innerRing.rotation.x=Math.PI/2;innerRing.position.y=.65;lobbyGroup.add(innerRing);
function lobbyBox(x,y,z,px,py,pz,color,emissive=0){const m=new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat(color,emissive));m.position.set(px,py,pz);m.castShadow=true;m.receiveShadow=true;lobbyGroup.add(m);return m;}
lobbyBox(5,5,1,-15,2.5,-6,0x253d75);lobbyBox(5,5,1,15,2.5,-6,0x253d75);lobbyBox(1,5,5,-15,2.5,5,0x253d75);lobbyBox(1,5,5,15,2.5,5,0x253d75);lobbyBox(8,.5,2,0,4,-10,0x58dfff,cyan);lobbyBox(8,.5,2,0,4,10,0xff6f91,pink);lobbyBox(2,4,.5,0,2.2,9.5,0x263f76);lobbyBox(2,4,.5,0,2.2,-9.5,0x263f76);
for(const x of [-12,12]){lobbyBox(2,9,2,x,4.5,-16,0x253d75);lobbyBox(2,9,2,x,4.5,16,0x253d75);lobbyBox(7,1.2,2,x/2,8.2,-16,0x2d4d8d,cyan);}
for(let i=0;i<12;i++){const a=i*Math.PI/6;const rail=new THREE.Mesh(new THREE.BoxGeometry(5.2,.16,.16),mat(i%2?pink:cyan,i%2?pink:cyan));rail.position.set(Math.cos(a)*11,.9,Math.sin(a)*11);rail.rotation.y=-a; lobbyGroup.add(rail);}
lobbyBox(12,6,.5,0,3,-21,0x1d315f);lobbyBox(10,.35,.3,0,6.4,-20.7,0x58dfff,cyan);lobbyBox(6,3,.4,0,2.2,-20.6,0x263f76);lobbyBox(12,6,.5,0,3,21,0x1d315f);lobbyBox(10,.35,.3,0,6.4,20.7,0xff6f91,pink);
const lobbyAvatar=new THREE.Group();const avatarLegMat=mat(0x20283c);const avatarLeftLeg=new THREE.Mesh(new THREE.BoxGeometry(.27,.85,.34),avatarLegMat);avatarLeftLeg.position.set(-.23,.43,0);const avatarRightLeg=new THREE.Mesh(new THREE.BoxGeometry(.27,.85,.34),avatarLegMat);avatarRightLeg.position.set(.23,.43,0);const avatarBody=new THREE.Mesh(new THREE.BoxGeometry(1,1.35,.65),mat(0x41a9d8));avatarBody.position.y=1.4;const avatarArmMat=mat(0x41a9d8);const avatarLeftArm=new THREE.Mesh(new THREE.BoxGeometry(.25,.95,.32),avatarArmMat);avatarLeftArm.position.set(-.63,1.4,0);const avatarRightArm=new THREE.Mesh(new THREE.BoxGeometry(.25,.95,.32),avatarArmMat);avatarRightArm.position.set(.63,1.4,0);const avatarHead=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.7),mat(0xf0c2ae));avatarHead.position.y=2.05;const avatarFace=new THREE.Mesh(new THREE.BoxGeometry(.42,.16,.035),mat(0x18284c,cyan));avatarFace.position.set(0,2.08,-.365);lobbyAvatar.add(avatarLeftLeg,avatarRightLeg,avatarBody,avatarLeftArm,avatarRightArm,avatarHead,avatarFace);lobbyGroup.add(lobbyAvatar);const lobbyLight=new THREE.HemisphereLight(0xeaf2ff,0x4564a1,3.2);lobbyGroup.add(lobbyLight);const lobbySun=new THREE.DirectionalLight(0xffffff,4);lobbySun.position.set(-10,22,8);lobbySun.castShadow=true;lobbyGroup.add(lobbySun);player.pos.set(0,2.2,6);
function createRangeTargets(){[[-18,-16],[-9,-20],[0,-23],[9,-20],[18,-16]].forEach(([x,z],i)=>{const target=makeBot(x,z,0xffbd55,'target');target.root.children.forEach(part=>{part.material=mat(i%2?0xffbd55:0x7dffb5);});target.phase=i;target.strafe=0;rangeTargets.push(target);bots.push(target);});}
function startGame(mode){
  gameMode=mode;
  const arenaLike=mode==='arena'||mode==='duel';
  document.querySelector('.hud').classList.remove('lobby');
  player.meleeChoice=Number(document.getElementById('loadoutMelee').value);
  player.primaryChoice=Number(document.getElementById('loadoutPrimary').value);
  setWeapon(player.primaryChoice);
  activeSolidAreas=arenaLike?arenaSolidAreas:solidAreas;
  player.pos.set(0,2.2,mode==='arena'?25:mode==='duel'?duelSpawnZ():27);
  if(mode==='duel'){player.yaw=player.cameraYaw=player.pos.z>0?0:Math.PI;}
  const sky=arenaLike?0xb7bcc2:0x7c8fb5;
  scene.background.setHex(sky);scene.fog.color.setHex(sky);
  worldHemi.visible=worldAmbient.visible=sun.visible=!arenaLike;
  if(!arenaLike){worldHemi.intensity=4.6;worldAmbient.intensity=1.4;sun.intensity=6.2;scene.fog.near=40;scene.fog.far=190;}
  else{scene.fog.near=55;scene.fog.far=140;}
  battlegroundParts.forEach(object=>object.visible=!arenaLike);
  arenaMapGroup.visible=arenaLike;
  lobbyGroup.visible=false;
  bots.forEach(b=>{b.root.visible=mode!=='duel';});
  if(mode==='range'){bots.forEach(b=>{if(b.team!=='target')b.root.visible=false;});createRangeTargets();showMessage('SHOOTING RANGE');}
  else if(mode==='duel'){showMessage('1V1 DUEL');}
  else showMessage(mode==='arena'?'ARENA':'BATTLEGROUND');
  document.getElementById('start').style.display='none';
  renderer.domElement.requestPointerLock();
  netSendHello();netSendState();
}
function resetBot(b){ b.root.position.copy(b.home); b.hp=100; b.alive=true; b.root.visible=true; }
function spawnAmmoDrop(position){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.55,.28,.35),mat(0x2b8fbb,cyan));mesh.castShadow=true;mesh.position.set(position.x,.35,position.z);scene.add(mesh);ammoPickups.push({mesh,amount:24});}
function damageBot(b,damage){ b.hp-=damage; if(b.hp<=0){if(b.team==='target'){b.alive=false;b.root.visible=false;b.respawn=1.2;showMessage('TARGET DOWN');return;}const dropPos=b.root.position.clone();b.alive=false;b.root.visible=false;b.respawn=3; if(b.team==='red'){player.blue++;blueScoreEl.textContent=player.blue;spawnAmmoDrop(dropPos);} else {player.red++;redScoreEl.textContent=player.red;} showMessage('ELIMINATED');} }
function hitBot(){ const w=weapons[player.slot], ray=new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0,0),camera); const hits=ray.intersectObjects(scene.children,true); for(const h of hits){ let b=bots.find(v=>v.root===h.object.parent||v.root===h.object.parent?.parent); if(b&&b.alive&&gameMode!=='duel'){const distance=b.root.position.distanceTo(player.pos);if((player.slot===2||player.slot===4)&&distance>3.8){showMessage('TOO FAR');return;} const headshot=h.object.userData.hitZone==='head';const damage=player.slot===2?(headshot?100:70):player.slot===4?110:player.slot===5?(headshot?100:33):(headshot?w.damage*2:w.damage); h.object.material.emissive.setHex(0xffffff); setTimeout(()=>h.object.material.emissive.setHex(b.team==='blue'?cyan:pink),80); damageBot(b,damage); showHit(damage); showMessage(headshot?'HEADSHOT':'BODY SHOT'); return; } const remote=findRemoteByObject(h.object); if(remote&&remote.group.visible){   const headshot=h.object.userData.hitZone==='head';   if((player.slot===2||player.slot===4)&&player.pos.distanceTo(remote.group.position)>4.2){showMessage('TOO FAR');return;}   const damage=player.slot===2?(headshot?100:70):player.slot===4?110:player.slot===5?(headshot?100:33):(headshot?w.damage*2:w.damage);   net.send({t:'hit',to:remote.id,damage,name:netName});   if(h.object.material&&h.object.material.emissive){h.object.material.emissive.setHex(0xffffff);setTimeout(()=>{if(h.object.material&&h.object.material.emissive)h.object.material.emissive.setHex(0x000000);},90);}   showHit(damage); showMessage((headshot?'HEADSHOT ':'HIT ')+remote.name);   return; } } }
function throwGrenade(){ if(player.grenades<=0){showMessage('NO GRENADES');return;} player.grenades--;updateAmmoHud(); const grenade=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8),mat(0x4a556e)); grenade.position.copy(camera.position); scene.add(grenade); const dir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation); const start=grenade.position.clone(); let t=0; const fly=()=>{t+=.035; grenade.position.copy(start).addScaledVector(dir,Math.min(t,1)*13);grenade.position.y-=Math.max(0,t-0.3)*2;if(t<1){requestAnimationFrame(fly);}else{for(const b of bots){if(b.alive&&b.root.position.distanceTo(grenade.position)<7){damageBot(b,100);showHit(100);}}scene.remove(grenade);showMessage('GRENADE!');}};fly(); }
function spawnTracer(){ const dir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation); const tracer=new THREE.Mesh(new THREE.SphereGeometry(.055,6,6),mat(0xfff2a8,0xffd24d)); tracer.position.copy(camera.position).addScaledVector(dir,.55); scene.add(tracer); const start=tracer.position.clone(); let t=0; const fly=()=>{t+=.06;tracer.position.copy(start).addScaledVector(dir,t*34);if(t<.32)requestAnimationFrame(fly);else scene.remove(tracer);};fly(); const flash=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),mat(0xffe78a,0xffa31a)); flash.position.set(0,.02,-.94); weaponView.add(flash);setTimeout(()=>weaponView.remove(flash),55); }
function scytheDash(){if(player.scytheCooldown>0){showMessage('SCYTHE COOLING');return;}const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,0),camera);const hits=ray.intersectObjects(scene.children,true);let target=null;for(const h of hits){target=bots.find(v=>v.root===h.object.parent||v.root===h.object.parent?.parent);if(target&&target.alive)break;}const aimDir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation).normalize();if(player.grounded&&aimDir.y<0)aimDir.y=0;aimDir.normalize();const destination=target?target.root.position.clone().addScaledVector(aimDir,-2.1):player.pos.clone().addScaledVector(aimDir,7);if(target)destination.y=2.2;else destination.y=Math.max(2.2,destination.y);const old=player.pos.clone();player.pos.copy(destination);if(blocked(player.pos))player.pos.copy(old);player.scytheCooldown=1.1;weaponView.rotation.z=-.7;setTimeout(()=>weaponView.rotation.z=0,180);if(target&&target.alive&&player.pos.distanceTo(target.root.position)<3.8){damageBot(target,110);showHit(110);showMessage('SCYTHE HIT');}else showMessage(aimDir.y>.15?'UPWARD DASH':aimDir.y<-.15?'DOWNWARD DASH':'DASH');}
function useWeapon(){ if(player.reloading)return; if(player.slot===3){weaponAnim.throw=1;throwGrenade();return;} if(player.slot===4){weaponAnim.swing=1.2;hitBot();return;} if(player.slot!==2){const ammoSlot=player.slot===5?2:player.slot;const a=player.ammo[ammoSlot];if(a.mag<=0){showMessage('PRESS R TO RELOAD');return;}a.mag--;updateAmmoHud();weaponAnim.recoil=1;spawnTracer();}else weaponAnim.swing=1; hitBot(); }
function doQuickMelee(){ if(gameMode==="lobby"||player.quickMeleeTimer>0)return; const current=player.slot; const target=player.meleeChoice===4?4:2; if(current===target){weaponAnim.swing=1.2;hitBot();return;} player.prevSlot=current; player.slot=target; player.aimHold=false; player.aimKey=false; player.reloading=false; updateAim(); const w=weapons[player.slot]; weaponName.innerHTML=w.name+(player.slot===0?" <span style=\"color:#6cd9ff\">▰▰▰</span>":""); slotLabel.textContent=w.slot+" · "+(player.slot+1); updateAmmoHud(); rebuildWeapon(); showMessage(w.name); weaponAnim.swing=1.2; hitBot(); player.quickMeleeTimer=0.5; }
function showMessage(t){ const el=document.getElementById('message');el.textContent=t;el.style.opacity=1;clearTimeout(showMessage.t);showMessage.t=setTimeout(()=>el.style.opacity=0,650); }
const move=new THREE.Vector3(), clock=new THREE.Clock();
document.getElementById('playMenu').onclick=()=>{document.getElementById('start').classList.add('choosing');document.getElementById('playMenu').style.display='none';document.getElementById('modePicker').style.display='block';document.getElementById('lobbyText').textContent='Choose where you want to play.';}; document.getElementById('arenaMode').onclick=()=>startGame('arena'); document.getElementById('battlegroundMode').onclick=()=>startGame('battleground'); document.getElementById('rangeMode').onclick=()=>startGame('range'); document.getElementById('loadoutMelee').onchange=e=>player.meleeChoice=Number(e.target.value);
function toggleSettings(force){
  const open=force===undefined?!settings.classList.contains('open'):force;
  settings.classList.toggle('open',open);
  keys.KeyP=false;
  if(open){
    // Settings need the pointer, so release it and show the cursor/arrows.
    if(document.pointerLockElement)document.exitPointerLock();
    document.body.classList.add('settings-open');
  }else{
    document.body.classList.remove('settings-open');
    dbgLockMouse();
  }
}
document.getElementById('settingsButton').onclick=()=>toggleSettings(); document.getElementById('closeSettings').onclick=()=>toggleSettings(false);
document.getElementById('sensitivity').oninput=e=>{player.sensitivity=Number(e.target.value);document.getElementById('sensitivityValue').textContent=player.sensitivity.toFixed(1);}; document.getElementById('scopeSensitivity').oninput=e=>{player.scopeSensitivity=Number(e.target.value);document.getElementById('scopeSensitivityValue').textContent=player.scopeSensitivity.toFixed(1);}; document.getElementById('crosshairColor').onchange=updateCrosshair; document.getElementById('crosshairStyle').onchange=updateCrosshair; updateCrosshair();
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;if(gameMode==='lobby'&&!locked)document.getElementById('start').style.display='grid';});
document.addEventListener('mousemove',e=>{if(!locked)return;const lookSensitivity=player.aiming?player.scopeSensitivity:player.sensitivity;player.yaw-=e.movementX*.0022*lookSensitivity;player.pitch-=e.movementY*.0022*lookSensitivity;player.pitch=Math.max(-1.35,Math.min(1.35,player.pitch));});
addEventListener('keydown',e=>{if(e.target&&(e.target.id==='dbgInput'||e.target.id==='nameInput'))return;if(e.code.startsWith('Arrow'))e.preventDefault();keys[e.code]=true;if(e.code==='KeyR'&&!e.repeat)reloadWeapon();if(e.code==='KeyF'&&!e.repeat)doQuickMelee();if(e.code==='KeyP'&&!e.repeat)toggleSettings();if(e.code==='Escape'&&settings.classList.contains('open'))toggleSettings(false);if(e.code==='Escape'&&duel.pending){const declined=duel.pending;hideDuelPrompt();net.send({t:'duel-decline',to:declined,name:netName});}if(e.code==='KeyE'&&!e.repeat&&player.slot!==4){player.aimKey=true;updateAim();}if(e.code==='Digit1')setWeapon(0);if(e.code==='Digit2')setWeapon(1);if(e.code==='Digit3')setWeapon(2);if(e.code==='Digit4')setWeapon(3);if(e.code==='KeyG')setWeapon(3);if(e.code==='Space'&&!player.fly){if(player.grounded){player.vertical=8.5;player.grounded=false;player.doubleJumpUsed=false;}else if(player.slot===2&&!player.doubleJumpUsed){player.vertical=8.5;player.doubleJumpUsed=true;}}if((e.code==='KeyC'||e.code==='ControlLeft')&&!player.sliding&&!player.fly){const moving=keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD;const sprinting=keys.ShiftLeft||keys.ShiftRight;if(moving&&sprinting&&player.slideCooldown<=0){player.sliding=true;player.slideTime=.65;player.slideCooldown=1.05;}}}); addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyE'){player.aimKey=false;updateAim();}}); addEventListener('blur',()=>{for(const k in keys)keys[k]=false;player.aimHold=false;player.aimKey=false;shooting=false;updateAim();}); addEventListener('mousedown',e=>{if(!locked)return;if(e.button===2){if(player.slot===4)scytheDash();else{player.aimHold=true;updateAim();}}else if(e.button===0)shooting=true;}); addEventListener('mouseup',e=>{if(e.button===2&&player.slot!==4){player.aimHold=false;updateAim();}else if(e.button===0)shooting=false;}); addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{if(e.target&&e.target.id==='dbgInput')return;if(e.code==='KeyV'&&!e.repeat&&gameMode!=='lobby'){weaponAnim.inspect=1.35;showMessage('INSPECT');}});
function applySlidePose(dt,pose){const k=Math.min(1,dt*14);const slide=pose>0;const walk=slide?0:player.walkBlend;const swing=Math.sin(player.walkPhase)*walk;const bob=Math.abs(Math.sin(player.walkPhase))*.05*walk;const approach=(object,property,target)=>{object[property]+=(target-object[property])*k;};approach(avatarBody.position,'y',slide?.78:1.4+bob);approach(avatarBody.rotation,'x',slide?1.12:0);approach(avatarBody.rotation,'z',slide?0:swing*.06);approach(avatarHead.position,'y',slide?1.1:2.05+bob);approach(avatarHead.position,'z',slide?-.58:0);approach(avatarFace.position,'y',slide?1.13:2.08+bob);approach(avatarFace.position,'z',slide?-.94:-.365);approach(avatarLeftArm.position,'x',slide?-.58:-.63);approach(avatarLeftArm.position,'y',slide?.58:1.4);approach(avatarLeftArm.position,'z',slide?-.42:0);approach(avatarLeftArm.rotation,'x',slide?1.28:-swing*.6);approach(avatarRightArm.position,'x',slide?.5:.63);approach(avatarRightArm.position,'y',slide?.7:1.4);approach(avatarRightArm.position,'z',slide?-.72:0);approach(avatarRightArm.rotation,'x',slide?1.42:swing*.6);approach(avatarLeftLeg.position,'y',slide?.38:.43);approach(avatarLeftLeg.position,'z',slide?.48:0);approach(avatarLeftLeg.rotation,'x',slide?1.38:swing*.7);approach(avatarLeftLeg.rotation,'z',slide?.16:0);approach(avatarRightLeg.position,'y',slide?.3:.43);approach(avatarRightLeg.position,'z',slide?.62:0);approach(avatarRightLeg.rotation,'x',slide?1.48:-swing*.7);approach(avatarRightLeg.rotation,'z',slide?-.18:0);}
function updateLobby(dt){document.querySelector('.hud').classList.add('lobby');const moving=keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||keys.ArrowUp||keys.ArrowDown;const sprinting=keys.ShiftLeft||keys.ShiftRight;player.cameraYaw+=((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0))*dt*2.4;player.slideCooldown=Math.max(0,player.slideCooldown-dt);if((keys.KeyC||keys.KeyControl)&&moving&&sprinting&&!player.sliding&&player.slideCooldown<=0){player.sliding=true;player.slideTime=.65;player.slideCooldown=1.05;}let speed=sprinting?11:7;if(player.sliding){speed=15;player.slideTime-=dt;if(player.slideTime<=0||!moving||!sprinting)player.sliding=false;}player.crouching=player.sliding||((keys.KeyC||keys.ControlLeft)&&!moving);if(player.crouching&&!player.sliding)speed=4;const moveLobby=new THREE.Vector3((keys.KeyD?1:0)-(keys.KeyA?1:0),0,((keys.KeyS||keys.ArrowDown)?1:0)-((keys.KeyW||keys.ArrowUp)?1:0));if(moveLobby.lengthSq()){moveLobby.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),player.cameraYaw);player.pos.addScaledVector(moveLobby,dt*speed);const want=Math.atan2(-moveLobby.x,-moveLobby.z);let diff=((want-player.avatarYaw+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;player.avatarYaw+=diff*Math.min(1,dt*10);}player.vertical-=22*dt;player.pos.y+=player.vertical*dt;if(player.pos.y<=2.2){player.pos.y=2.2;player.vertical=0;player.grounded=true;}player.pos.x=Math.max(-22,Math.min(22,player.pos.x));player.pos.z=Math.max(-22,Math.min(22,player.pos.z));if(moveLobby.lengthSq()&&!player.sliding)player.walkPhase+=dt*speed*1.6;player.walkBlend+=(((moving&&!player.sliding)?1:0)-player.walkBlend)*Math.min(1,dt*10);const pose=player.sliding?1:0;applySlidePose(dt,pose);lobbyAvatar.position.set(player.pos.x,player.pos.y-2.2,player.pos.z);lobbyAvatar.rotation.y=player.avatarYaw;weaponView.visible=false;const behind=new THREE.Vector3(0,3.4+(player.crouching?-.4:0),6.5).applyAxisAngle(new THREE.Vector3(0,1,0),player.cameraYaw);camera.position.copy(player.pos).add(behind);camera.lookAt(player.pos.x,player.pos.y-.7,player.pos.z);}
function update(dt){
  if(weaponAnim.inspect>0){
    weaponAnim.inspect=Math.max(0,weaponAnim.inspect-dt);
    const progress=1-weaponAnim.inspect/1.35;
    const inspectLift=Math.sin(Math.min(1,progress)*Math.PI);
    weaponView.position.x+=(.48+inspectLift*.18-weaponView.position.x)*Math.min(1,dt*8);
    weaponView.position.y+=(-.42+inspectLift*.2-weaponView.position.y)*Math.min(1,dt*8);
    weaponView.position.z+=(-.82-inspectLift*.1-weaponView.position.z)*Math.min(1,dt*8);
    weaponView.rotation.y+=(inspectLift*.55-weaponView.rotation.y)*Math.min(1,dt*8);
    weaponView.rotation.z+=(-inspectLift*.5-weaponView.rotation.z)*Math.min(1,dt*8);
  }else{
    weaponView.rotation.y*=Math.max(0,1-dt*10);
    weaponView.rotation.z*=Math.max(0,1-dt*10);
  }
  netAcc+=dt;if(netAcc>=.1){netAcc=0;netSendState();}
  updateRemotePlayers(dt);
  onlineAcc+=dt;
  if(onlineAcc>=.5){onlineAcc=0;updateOnlineUi();}
  if(gameMode==='lobby'){lobbyListAcc+=dt;if(lobbyListAcc>=.4){lobbyListAcc=0;renderLobbyList();}}
  if(duel.active&&duel.opponent&&!duel.over){
    const opponent=remotePlayers.get(duel.opponent);
    if(!opponent||performance.now()-opponent.lastSeen>15000){
      duel.over=true;
      showMessage('OPPONENT DISCONNECTED');
      setTimeout(finishDuel,1500);
    }
  }
  if(gameMode==='lobby'){updateLobby(dt);return;} weaponView.visible=true; if(player.reloading){player.reloadTime-=dt;if(player.reloadTime<=0)finishReload();}
  // Ability cooldowns must tick down or an ability can only ever fire once.
  player.scytheCooldown=Math.max(0,player.scytheCooldown-dt);
  if(player.quickMeleeTimer>0){player.quickMeleeTimer-=dt;if(player.quickMeleeTimer<=0&&player.prevSlot!==null){player.slot=player.prevSlot;player.prevSlot=null;player.aimHold=false;player.aimKey=false;player.reloading=false;updateAim();const w=weapons[player.slot];weaponName.innerHTML=w.name+(player.slot===0?" <span style=\"color:#6cd9ff\">▰▰▰</span>":"");slotLabel.textContent=w.slot+" · "+(player.slot+1);updateAmmoHud();rebuildWeapon();showMessage(w.name);}}
  // ---- MOVEMENT ----
  const fwd=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
  const strafe=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  const sprinting=keys.ShiftLeft||keys.ShiftRight;
  const crouchKey=keys.KeyC||keys.ControlLeft;
  player.slideCooldown=Math.max(0,player.slideCooldown-dt);
  if(crouchKey&&(fwd||strafe)&&sprinting&&!player.sliding&&player.slideCooldown<=0){player.sliding=true;player.slideTime=.65;player.slideCooldown=1.05;}
  if(player.sliding){player.slideTime-=dt;if(player.slideTime<=0||!sprinting)player.sliding=false;}
  player.crouching=player.sliding||(crouchKey&&!player.sliding&&!sprinting);
  // Weapon weight: sniper slowest, fists fastest, AR/handgun slightly slow, grenade normal.
  const weaponWeight={0:.92,1:.94,2:1.14,3:1,4:1,5:.78};
  let speed=player.fly?player.flySpeed:8*(weaponWeight[player.slot]??1);
  if(!player.fly){
    if(sprinting)speed*=1.5;
    if(player.sliding)speed*=1.45;
    if(player.crouching&&!player.sliding)speed*=.55;
  }
  const dir=new THREE.Vector3(strafe,0,-fwd);
  if(dir.lengthSq()>0){
    dir.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),player.yaw);
    const step=speed*dt;
    const nx=player.pos.x+dir.x*step, nz=player.pos.z+dir.z*step;
    const probe=player.pos.clone(); probe.y=Math.max(player.pos.y,2.2);
    probe.x=nx; probe.z=nz;
    if(!blocked(probe)){player.pos.x=nx;player.pos.z=nz;}
    else{
      // Slide along walls: block only the axis that actually collides.
      probe.x=nx; probe.z=player.pos.z;
      if(!blocked(probe))player.pos.x=nx;
      probe.x=player.pos.x; probe.z=nz;
      if(!blocked(probe))player.pos.z=nz;
    }
    player.walkPhase+=dt*speed*1.6;
  }
  player.walkBlend+=(((dir.lengthSq()>0)&&!player.sliding?1:0)-player.walkBlend)*Math.min(1,dt*10);
  if(player.fly){
    // Fly mode: Space rises, Ctrl/C sinks, gravity is off. Turning it off restores normal falling.
    const rise=(keys.Space?1:0)-((keys.ShiftLeft||keys.ControlLeft||keys.KeyC)?1:0);
    player.vertical=0;
    player.grounded=false;
    player.crouching=false;
    player.pos.y+=rise*player.flySpeed*.8*dt;
    player.pos.y=Math.max(2.2,Math.min(60,player.pos.y));
  }else{
    player.vertical-=22*dt;
    const previousY=player.pos.y;
    player.pos.y+=player.vertical*dt;
    if(player.pos.y<=2.2){player.pos.y=2.2;player.vertical=0;player.grounded=true;player.doubleJumpUsed=false;}
    else{player.grounded=false;landOnObstacle(previousY);}
  }
  player.pos.x=Math.max(-28.4,Math.min(28.4,player.pos.x));
  player.pos.z=Math.max(-28.4,Math.min(28.4,player.pos.z));
  const eye=player.pos.clone();eye.y-=player.crouching?.65:0; camera.position.lerp(eye,.35); camera.fov+=((player.aiming?48:72)-camera.fov)*Math.min(1,dt*12); camera.updateProjectionMatrix(); camera.rotation.set(player.pitch,player.yaw,0); weaponView.position.lerp(new THREE.Vector3(player.aiming?.30:.48,player.aiming?-.34:-.42,player.aiming?-.64:-.82),.2); weaponAnim.recoil=Math.max(0,weaponAnim.recoil-dt*8);weaponAnim.swing=Math.max(0,weaponAnim.swing-dt*5);weaponAnim.throw=Math.max(0,weaponAnim.throw-dt*3);weaponView.position.z-=weaponAnim.recoil*.13;weaponView.position.y-=player.sliding?.16:0;const reloadPose=player.reloading?Math.sin(Math.min(1,1-player.reloadTime/player.reloadTotal)*Math.PI):0;weaponView.position.y-=reloadPose*.22;weaponView.position.z+=reloadPose*.08;weaponView.rotation.x=weaponAnim.recoil*.2+weaponAnim.throw*.35-reloadPose*.85;weaponView.rotation.z=weaponAnim.swing*.7+reloadPose*.5;
  if(weaponAnim.inspect>0){const p=1-weaponAnim.inspect/1.35;const lift=Math.sin(Math.min(1,p)*Math.PI);weaponView.position.x+=((player.aiming?.30:.48)+lift*.2-weaponView.position.x)*Math.min(1,dt*10);weaponView.position.y+=((player.aiming?-.34:-.42)+lift*.22-weaponView.position.y)*Math.min(1,dt*10);weaponView.position.z+=((player.aiming?-.64:-.82)-lift*.12-weaponView.position.z)*Math.min(1,dt*10);weaponView.rotation.y+=(lift*.6-weaponView.rotation.y)*Math.min(1,dt*10);weaponView.rotation.z+=(-lift*.5-weaponView.rotation.z)*Math.min(1,dt*10);}else{weaponView.rotation.y*=Math.max(0,1-dt*12);weaponView.rotation.z*=Math.max(0,1-dt*12);}
  const fireRate=weapons[player.slot].rate;if(shooting&&performance.now()-lastShot>fireRate){lastShot=performance.now();useWeapon();}
  const worldTime=performance.now()*.001; for(const p of [...ammoPickups]){if(Math.hypot(player.pos.x-p.mesh.position.x,player.pos.z-p.mesh.position.z)<3){const target=player.slot===5?2:player.slot<2?player.slot:0;player.ammo[target].reserve+=p.amount;scene.remove(p.mesh);ammoPickups.splice(ammoPickups.indexOf(p),1);updateAmmoHud();showMessage('AMMO +'+p.amount);}}
  if(gameMode!=='duel')for(const b of bots){if(!b.alive){b.respawn-=dt;if(b.respawn<=0)resetBot(b);continue;} if(gameMode==='range'){if(b.team!=='target'){b.root.visible=false;continue;} b.root.lookAt(player.pos.x,1.4,player.pos.z);continue;} const to=player.pos.clone().sub(b.root.position); to.y=0; if(to.length()<22){const forward=to.clone().normalize();const side=new THREE.Vector3(-forward.z,0,forward.x);b.root.position.addScaledVector(forward,dt*.55);b.root.position.addScaledVector(side,Math.sin(worldTime*1.8+b.phase)*dt*.8); b.shoot-=dt; if(b.shoot<=0){b.shoot=1.7+Math.random()*2;if(Math.random()<.28){player.hp=Math.max(0,player.hp-8);healthBarEl.style.width=player.hp+'%';hpTextEl.textContent=player.hp;if(!player.hp){player.hp=100;player.pos.set(0,2.2,27);healthBarEl.style.width='100%';hpTextEl.textContent=100;showMessage('RESPAWNED');}}}}else{b.root.position.x=b.home.x+Math.sin(worldTime*.7+b.phase)*3.2*b.strafe;b.root.position.z=b.home.z+Math.cos(worldTime*.55+b.phase)*2.2;} b.root.position.x=Math.max(-33,Math.min(33,b.root.position.x));b.root.position.z=Math.max(-33,Math.min(33,b.root.position.z));b.root.lookAt(player.pos.x,1.4,player.pos.z);}
  beacon.intensity=4.5+Math.sin(performance.now()*.004)*1.5;
}
/* ---------------- MULTIPLAYER (two tabs of the same browser) ---------------- */
const MP_SKINS=[0x4be3a2,0xffa63d,0xb06bff,0xffd45c,0x4bc9ff,0xff8054];
const MP_NAMES=['PLAYER','RIVAL','GHOST','NOVA','ECHO','BLAZE','VOLT','ONYX'];
const remotePlayers=new Map();
let netSkin=0, netName='', netAcc=0, lobbyListAcc=0, onlineAcc=0;

function readSession(key){try{return sessionStorage.getItem(key);}catch(error){return null;}}
function writeSession(key,value){try{sessionStorage.setItem(key,value);}catch(error){}}
(function initIdentity(){
  const savedSkin=Number(readSession('beathim-skin'));
  netSkin=MP_SKINS.includes(savedSkin)?savedSkin:MP_SKINS[Math.floor(Math.random()*MP_SKINS.length)];
  netName=readSession('beathim-name')||(MP_NAMES[Math.floor(Math.random()*MP_NAMES.length)]+' '+(10+Math.floor(Math.random()*89)));
  writeSession('beathim-skin',String(netSkin));
  writeSession('beathim-name',netName);
})();
function usedSkins(){const list=[];for(const remote of remotePlayers.values())list.push(remote.skin);return list;}
function pickFreeSkin(){
  const used=usedSkins();
  const free=MP_SKINS.filter(color=>!used.includes(color)&&color!==netSkin);
  const pool=free.length?free:MP_SKINS.filter(color=>!used.includes(color));
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:netSkin;
}
function skinCss(color){return '#'+color.toString(16).padStart(6,'0');}
function paintNameTag(canvas,text,color){
  const context=canvas.getContext('2d');
  context.clearRect(0,0,canvas.width,canvas.height);
  context.fillStyle='rgba(4,8,16,.55)';
  context.fillRect(0,0,256,64);
  context.font='bold '+(text.length>12?23:32)+'px Inter, system-ui, sans-serif';
  context.textAlign='center';context.textBaseline='middle';
  context.fillStyle=skinCss(color);
  context.fillText(text,128,34);
}
function makeNameTag(text,color){
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=64;
  paintNameTag(canvas,text,color);
  const texture=new THREE.CanvasTexture(canvas);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.scale.set(2.4,.6,1);
  sprite.position.y=3.2;
  sprite.userData.canvas=canvas;
  return sprite;
}
function renameNameTag(sprite,text,color){
  if(!sprite||!sprite.userData.canvas)return;
  paintNameTag(sprite.userData.canvas,text,color);
  if(sprite.material.map)sprite.material.map.needsUpdate=true;
}
function makeRemoteAvatar(color,name){
  const group=new THREE.Group();
  const legMat=mat(0x20283c);
  const leftLeg=new THREE.Mesh(new THREE.BoxGeometry(.3,.85,.38),legMat);leftLeg.position.set(-.27,.43,0);leftLeg.castShadow=true;group.add(leftLeg);
  const rightLeg=new THREE.Mesh(new THREE.BoxGeometry(.3,.85,.38),legMat);rightLeg.position.set(.27,.43,0);rightLeg.castShadow=true;group.add(rightLeg);
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.35,.75),mat(color));body.position.y=1.4;body.castShadow=true;body.userData.hitZone='body';group.add(body);
  const armMat=mat(color);
  const leftArm=new THREE.Mesh(new THREE.BoxGeometry(.28,.95,.36),armMat);leftArm.position.set(-.72,1.42,0);leftArm.castShadow=true;group.add(leftArm);
  const rightArm=new THREE.Mesh(new THREE.BoxGeometry(.28,.95,.36),armMat);rightArm.position.set(.72,1.42,0);rightArm.castShadow=true;group.add(rightArm);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.78,.78,.78),mat(0xf0c2ae));head.position.y=2.45;head.castShadow=true;head.userData.hitZone='head';group.add(head);
  const visor=new THREE.Mesh(new THREE.BoxGeometry(.62,.16,.08),mat(color,color));visor.position.set(0,2.45,.4);visor.userData.hitZone='head';group.add(visor);
  const gun=new THREE.Group();
  const gunBody=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.8),mat(0x2a3140));gunBody.position.z=.28;gun.add(gunBody);
  const gunBarrel=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.55,10),mat(0x14181f));gunBarrel.rotation.x=Math.PI/2;gunBarrel.position.z=.85;gun.add(gunBarrel);
  gun.position.set(.55,1.25,.45);
  group.add(gun);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.05,8,24),mat(color,color));
  ring.rotation.x=Math.PI/2;ring.position.y=.06;group.add(ring);
  const tag=makeNameTag(name,color);
  group.userData.nameTag=tag;
  group.add(tag);
  group.visible=false;
  return group;
}
const net=createNet(handleNetMessage,{onReady:()=>{netSendHello();netSendState();}});
function netSendHello(){net.send({t:'hello',skin:netSkin,name:netName});}
function netSendState(){
  net.send({t:'state',skin:netSkin,name:netName,p:[player.pos.x,player.pos.y,player.pos.z],yaw:player.yaw,hp:player.hp,mode:gameMode,score:duel.myScore,deaths:duel.deaths,dueling:duel.active?1:0});
}
function removeRemote(id){
  const remote=remotePlayers.get(id);
  if(!remote)return;
  scene.remove(remote.group);
  remotePlayers.delete(id);
  if(remote.mode===gameMode)showMessage(remote.name+' LEFT');
}
function upsertRemote(message){
  if(!Array.isArray(message.p))return;
  let remote=remotePlayers.get(message.from);
  const fresh=!remote||remote.skin!==message.skin;
  if(fresh){
    if(remote)scene.remove(remote.group);
    remote={id:message.from,skin:message.skin,name:message.name||'PLAYER',group:makeRemoteAvatar(message.skin,message.name||'PLAYER'),target:new THREE.Vector3(),yaw:0,hp:100,mode:message.mode||'',lastSeen:performance.now()};
    scene.add(remote.group);
    remotePlayers.set(message.from,remote);
    if(message.mode===gameMode)showMessage(remote.name+' JOINED');
  }
  remote.target.set(message.p[0],message.p[1],message.p[2]);
  if(fresh)remote.group.position.set(message.p[0],message.p[1]-2.2,message.p[2]);
  remote.yaw=message.yaw||0;
  remote.hp=message.hp;
  remote.mode=message.mode||'';
  if(!fresh&&message.name&&message.name!==remote.name){
    remote.name=message.name;
    renameNameTag(remote.group.userData.nameTag,remote.name,remote.skin);
    renderLobbyList();
  }
  remote.score=message.score||0;
  remote.deaths=message.deaths||0;
  remote.dueling=!!message.dueling;
  remote.lastSeen=performance.now();
  if(duel.active&&duel.opponent===message.from&&remote.dueling){
    duel.myScore=remote.deaths;
    duel.theirScore=duel.deaths;
    updateDuelHud();
    if(duel.myScore>=DUEL_TARGET&&!duel.over)winDuel();
    else if(duel.theirScore>=DUEL_TARGET&&!duel.over)loseDuel();
  }
}
function applyRemoteHit(message){
  const damage=Math.max(0,Math.min(150,Math.round(message.damage||0)));
  if(!damage)return;
  player.hp=Math.max(0,player.hp-damage);
  healthBarEl.style.width=player.hp+'%';
  hpTextEl.textContent=player.hp;
  if(player.hp<=0){
    player.hp=100;
    player.pos.set(0,2.2,duel.active?duelSpawnZ():27);
    player.vertical=0;
    healthBarEl.style.width='100%';
    hpTextEl.textContent=100;
    showMessage('KILLED BY '+(message.name||'PLAYER'));
    if(duel.active){
      duel.deaths++;
      netSendState();
      if(duel.deaths>=DUEL_TARGET)loseDuel();
      return;
    }
  }
  netSendState();
}
function handleNetMessage(message){
  if(message.t==='hello'){
    netSendState();
    if(message.skin===netSkin&&String(message.from)>String(net.id)){
      netSkin=pickFreeSkin();
      writeSession('beathim-skin',String(netSkin));
      applyLocalSkin();
      netSendHello();
    }
  }else if(message.t==='state'){
    upsertRemote(message);
    if(message.skin===netSkin&&String(message.from)>String(net.id)){
      netSkin=pickFreeSkin();
      writeSession('beathim-skin',String(netSkin));
      applyLocalSkin();
      netSendHello();
    }
  }else if(message.t==='hit'){
    if(message.to===net.id)applyRemoteHit(message);
  }else if(message.t==='duel-invite'){
    if(message.to!==net.id)return;
    if(duel.pending===message.from)return;
    if(duel.active||duel.pending){net.send({t:'duel-decline',to:message.from,name:netName});return;}
    showDuelPrompt(message.from,message.name);
    lobbyStatus((message.name||'PLAYER')+' CHALLENGES YOU');
  }else if(message.t==='duel-accept'){
    if(message.to!==net.id)return;
    if(duel.active){if(duel.opponent!==message.from)net.send({t:'duel-end',to:message.from,reason:'busy'});return;}
    startDuel(message.from,message.name);
  }else if(message.t==='duel-decline'){
    if(message.to!==net.id)return;
    lobbyStatus((message.name||'PLAYER')+' DECLINED');
  }else if(message.t==='duel-end'){
    if(message.to!==net.id||!duel.active)return;
    if(!duel.over){
      duel.over=true;
      showMessage(message.reason==='win'?'YOU LOST THE 1V1':'OPPONENT LEFT THE 1V1');
    }
    setTimeout(finishDuel,1600);
  }else if(message.t==='bye'){
    removeRemote(message.from);
    if(duel.active&&message.from===duel.opponent){
      if(!duel.over){duel.over=true;showMessage('OPPONENT LEFT THE 1V1');}
      setTimeout(finishDuel,1200);
    }
  }
}
function findRemoteByObject(object){
  for(const remote of remotePlayers.values()){
    if(object===remote.group||object.parent===remote.group||(object.parent&&object.parent.parent===remote.group))return remote;
  }
  return null;
}
function updateRemotePlayers(dt){
  const now=performance.now();
  for(const remote of remotePlayers.values()){
    const visible=remote.mode===gameMode&&now-remote.lastSeen<20000;
    remote.group.visible=visible;
    if(!visible)continue;
    const k=Math.min(1,dt*12);
    remote.group.position.x+=(remote.target.x-remote.group.position.x)*k;
    remote.group.position.y+=((remote.target.y-2.2)-remote.group.position.y)*k;
    remote.group.position.z+=(remote.target.z-remote.group.position.z)*k;
    remote.group.rotation.y=remote.yaw+Math.PI;
  }
}

/* ---------------- 1V1 DUELS + LOBBY PLAYER LIST ---------------- */
const DUEL_TARGET=5;
const duel={active:false,over:false,opponent:null,opponentName:'',myScore:0,theirScore:0,deaths:0,pending:null,pendingName:''};
function duelSpawnZ(){return String(net.id)<String(duel.opponent)?18:-18;}
function escapeHtml(text){
  return String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function lobbyStatus(text){
  const element=document.getElementById('lobbyStatus');
  if(!element)return;
  element.textContent=text;
  clearTimeout(lobbyStatus.timer);
  lobbyStatus.timer=setTimeout(()=>{element.textContent='';},5000);
}
function onlineTotal(){
  const now=performance.now();
  let total=1;
  for(const remote of remotePlayers.values()){
    if(now-remote.lastSeen<20000)total++;
  }
  return total;
}
function updateOnlineUi(){
  const total=onlineTotal();
  const hud=document.getElementById('onlineCount');
  if(hud)hud.textContent=total+' ONLINE';
  const badge=document.getElementById('onlineTotal');
  if(badge)badge.textContent=String(total);
  document.body.classList.toggle('relay-offline',net.status!=='online');
}
function renderLobbyList(){
  updateOnlineUi();
  const list=document.getElementById('lobbyPlayerList');
  if(!list)return;
  const rows=['<div class="mp-row me"><span class="mp-dot" style="background:'+skinCss(netSkin)+';color:'+skinCss(netSkin)+'"></span><b>'+escapeHtml(netName)+'</b><em>YOU</em></div>'];
  let others=0;
  for(const remote of remotePlayers.values()){
    if(remote.mode!=='lobby')continue;
    if(performance.now()-remote.lastSeen>20000)continue;
    others++;
    rows.push('<div class="mp-row"><span class="mp-dot" style="background:'+skinCss(remote.skin)+';color:'+skinCss(remote.skin)+'"></span><b>'+escapeHtml(remote.name)+'</b><button class="mp-duel" data-id="'+escapeHtml(remote.id)+'">1V1</button></div>');
  }
  list.innerHTML=rows.join('');
  const count=document.getElementById('lobbyCount');
  if(count)count.textContent=String(others+1);
  const badge=document.getElementById('netStatus');
  if(badge){
    const online=net.status==='online';
    badge.textContent=online?'ONLINE · '+net.room.toUpperCase():net.status==='connecting'?'CONNECTING…':'LOCAL ONLY';
    badge.style.color=online?'#4bf0a8':'#8a91ad';
    badge.title=online?'Connected through the internet relay — other computers can join':'Only tabs in this browser can see you';
  }
}
function inviteDuel(id){
  const remote=remotePlayers.get(id);
  if(!remote||id===net.id)return;
  net.send({t:'duel-invite',to:id,name:netName,skin:netSkin});
  lobbyStatus('1V1 INVITE SENT TO '+remote.name);
}
function showDuelPrompt(fromId,name){
  if(duel.pending)return;
  duel.pending=fromId;duel.pendingName=name||'PLAYER';
  document.getElementById('duelPromptText').textContent=(name||'PLAYER')+' wants a 1V1. First to '+DUEL_TARGET+' wins.';
  document.getElementById('duelPrompt').classList.add('open');
}
function hideDuelPrompt(){
  duel.pending=null;
  const prompt=document.getElementById('duelPrompt');
  if(prompt)prompt.classList.remove('open');
}
function updateDuelHud(){
  blueScoreEl.textContent=duel.myScore;
  redScoreEl.textContent=duel.theirScore;
}
function startDuel(opponentId,opponentName){
  duel.active=true;duel.over=false;
  duel.opponent=opponentId;duel.opponentName=opponentName||'OPPONENT';
  duel.myScore=0;duel.theirScore=0;duel.deaths=0;
  const opponent=remotePlayers.get(opponentId);
  if(opponent)opponent.deaths=0;
  hideDuelPrompt();
  document.body.classList.add('duel');
  startGame('duel');
  const info=document.getElementById('roundInfo');
  if(info)info.innerHTML='1V1 DUEL<br><span style="color:#ffd45c">FIRST TO '+DUEL_TARGET+'</span>';
  updateDuelHud();
  showMessage('1V1 VS '+duel.opponentName);
  netSendState();
  setTimeout(()=>{if(!document.pointerLockElement&&gameMode==='duel')dbgLockMouse();},150);
}
function winDuel(){
  if(duel.over)return;
  duel.over=true;
  showMessage('YOU WIN THE 1V1');
  net.send({t:'duel-end',to:duel.opponent,reason:'win'});
  setTimeout(finishDuel,2600);
}
function loseDuel(){
  if(duel.over)return;
  duel.over=true;
  showMessage('YOU LOST THE 1V1');
  setTimeout(finishDuel,2600);
}
function finishDuel(){
  if(!duel.active)return;
  duel.active=false;duel.over=false;duel.opponent=null;
  duel.myScore=0;duel.theirScore=0;duel.deaths=0;
  document.body.classList.remove('duel');
  enterLobby();
}
function enterLobby(){
  gameMode='lobby';
  document.querySelector('.hud').classList.add('lobby');
  const startScreen=document.getElementById('start');
  startScreen.style.display='block';
  startScreen.classList.remove('choosing');
  document.getElementById('playMenu').style.display='';
  document.getElementById('modePicker').style.display='';
  lobbyGroup.visible=true;
  arenaMapGroup.visible=false;
  battlegroundParts.forEach(object=>object.visible=false);
  scene.background.setHex(0x2b4f8c);scene.fog.color.setHex(0x2b4f8c);
  scene.fog.near=55;scene.fog.far=140;
  worldHemi.visible=worldAmbient.visible=sun.visible=false;
  bots.forEach(b=>b.root.visible=false);
  player.pos.set(0,2.2,6);player.vertical=0;player.hp=100;
  player.yaw=0;player.cameraYaw=0;player.pitch=0;player.avatarYaw=0;
  healthBarEl.style.width='100%';hpTextEl.textContent=100;
  weaponView.visible=false;
  if(document.pointerLockElement)document.exitPointerLock();
  renderLobbyList();
  netSendState();
}
document.getElementById('duelAccept').onclick=()=>{
  const target=duel.pending, name=duel.pendingName;
  if(!target)return;
  const remote=remotePlayers.get(target);
  if(!remote||performance.now()-remote.lastSeen>8000){
    hideDuelPrompt();
    lobbyStatus('THAT PLAYER IS GONE');
    return;
  }
  hideDuelPrompt();
  net.send({t:'duel-accept',to:target,name:netName});
  startDuel(target,name);
};
document.getElementById('duelDecline').onclick=()=>{
  const target=duel.pending;
  hideDuelPrompt();
  if(target)net.send({t:'duel-decline',to:target,name:netName});
};
document.getElementById('leaveDuel').onclick=()=>{
  if(!duel.active)return;
  net.send({t:'duel-end',to:duel.opponent,reason:'left'});
  showMessage('LEFT THE 1V1');
  finishDuel();
};
document.getElementById('lobbyPlayerList').addEventListener('click',event=>{
  const button=event.target.closest('.mp-duel');
  if(!button)return;
  event.stopPropagation();
  inviteDuel(button.getAttribute('data-id'));
});
// Clicking a player's floating name tag in the lobby challenges them directly.
renderer.domElement.addEventListener('click',event=>{
  if(gameMode!=='lobby')return;
  const rect=renderer.domElement.getBoundingClientRect();
  const pointer=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
  const ray=new THREE.Raycaster();
  ray.setFromCamera(pointer,camera);
  const targets=[];
  for(const remote of remotePlayers.values())if(remote.group.visible)targets.push(remote.group);
  if(!targets.length)return;
  const hits=ray.intersectObjects(targets,true);
  if(!hits.length)return;
  let object=hits[0].object, owner=null;
  while(object&&!owner){
    for(const remote of remotePlayers.values())if(object===remote.group)owner=remote;
    object=object.parent;
  }
  if(owner)inviteDuel(owner.id);
});
// Keep advertising our position while this tab is in the background so the
// other tab does not see us disappear when we stop touching the controls.
setInterval(()=>{if(document.hidden)netSendState();},800);
renderLobbyList();

let localTag=null;
function applyLocalSkin(){
  for(const mesh of [avatarBody,avatarLeftArm,avatarRightArm]){
    mesh.material.color.setHex(netSkin);
    if(mesh.material.emissive){
      mesh.material.emissive.setHex(netSkin);
      mesh.material.emissiveIntensity=.18;
    }
  }
  avatarFace.material.emissive.setHex(netSkin);
  if(localTag){
    lobbyAvatar.remove(localTag);
    if(localTag.material.map)localTag.material.map.dispose();
    localTag.material.dispose();
  }
  localTag=makeNameTag(netName,netSkin);
  localTag.position.y=2.85;
  lobbyAvatar.add(localTag);
}
applyLocalSkin();
/* ---------------- DISPLAY NAME ---------------- */
const nameGate=document.getElementById('nameGate');
const nameInput=document.getElementById('nameInput');
function openNameGate(){
  nameInput.value=netName;
  nameGate.classList.add('open');
  setTimeout(()=>{nameInput.focus();nameInput.select();},120);
}
function submitDisplayName(){
  const cleaned=String(nameInput.value||'')
    .replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,16);
  if(cleaned&&cleaned!==netName){
    netName=cleaned;
    writeSession('beathim-name',netName);
    applyLocalSkin();
    renderLobbyList();
    netSendHello();
    netSendState();
  }
  nameGate.classList.remove('open');
}
document.getElementById('nameConfirm').onclick=submitDisplayName;
nameInput.addEventListener('keydown',event=>{
  if(event.key==='Enter'){event.preventDefault();submitDisplayName();}
  else if(event.key==='Escape'){event.preventDefault();nameGate.classList.remove('open');}
  event.stopPropagation();
});
openNameGate();

addEventListener('pagehide',()=>net.send({t:'bye'}));
setTimeout(netSendHello,200);

/* ---------------- DEBUG CONSOLE (Right Shift) ---------------- */
const dbg={open:false,fps:0,frames:0,acc:0,log:[],history:[],hIndex:0,prev:player.pos.clone(),prevT:performance.now(),speed:0};
const DEBUG_PASSWORD='rivalsgood123';
let dbgAuthed=false;
try{dbgAuthed=sessionStorage.getItem('beathim-debug-auth')==='1';}catch(error){dbgAuthed=false;}
const dbgAuth=document.createElement('div');
dbgAuth.id='debugAuth';
dbgAuth.innerHTML='<div class="dbg-head"><b>DEBUG ACCESS</b><span class="dbg-hint">RIGHT SHIFT close</span></div>'
  +'<div class="dbg-row"><span class="dbg-caret">#</span><input id="dbgPass" type="password" autocomplete="off" spellcheck="false" placeholder="password" /></div>'
  +'<div class="dbg-authrow"><button class="dbg-btn" data-dbg="unlock">UNLOCK</button><span class="dbg-msg" id="dbgAuthMsg"></span></div>';
document.body.appendChild(dbgAuth);
const dbgPass=dbgAuth.querySelector('#dbgPass');
const dbgAuthMsg=dbgAuth.querySelector('#dbgAuthMsg');
const dbgPanel=document.createElement('div');
dbgPanel.id='debugPanel';
dbgPanel.innerHTML='<div class="dbg-head"><b>BEATHIM DEBUG</b><span class="dbg-hint">RIGHT SHIFT toggle</span><button class="dbg-btn" data-dbg="clear">CLEAR</button><button class="dbg-btn" data-dbg="copy">COPY STATE</button></div>'
  +'<div class="dbg-stats" id="dbgStats"></div>'
  +'<div class="dbg-fly"><span class="dbg-flylabel">FLY</span>'
  +'<button class="dbg-btn dbg-flybtn" data-dbg="flyon">ON</button>'
  +'<button class="dbg-btn dbg-flybtn" data-dbg="flyoff">OFF</button>'
  +'<label class="dbg-flylabel">SPEED <input id="dbgFlySpeed" type="number" min="1" max="80" step="1" value="14" /></label>'
  +'<span class="dbg-tip">Space up / Shift down</span></div>'
  +'<div class="dbg-log" id="dbgLog"></div>'
  +'<div class="dbg-row"><span class="dbg-caret">&gt;</span><input id="dbgInput" autocomplete="off" spellcheck="false" placeholder="JS: player.pos.set(0,2.2,0)" /></div>'
  +'<div class="dbg-foot">scope: player | bots | scene | camera | weapons | keys | THREE</div>';
document.body.appendChild(dbgPanel);
const dbgStatsEl=dbgPanel.querySelector('#dbgStats');
const dbgLogEl=dbgPanel.querySelector('#dbgLog');
const dbgInput=dbgPanel.querySelector('#dbgInput');
const dbgFlyOn=dbgPanel.querySelector('[data-dbg="flyon"]');
const dbgFlyOff=dbgPanel.querySelector('[data-dbg="flyoff"]');
const dbgFlySpeed=dbgPanel.querySelector('#dbgFlySpeed');

function dbgSyncFly(){
  dbgFlyOn.classList.toggle('on',player.fly);
  dbgFlyOff.classList.toggle('on',!player.fly);
  if(document.activeElement!==dbgFlySpeed)dbgFlySpeed.value=player.flySpeed;
}
function dbgSetFly(on){
  player.fly=on;
  player.vertical=0;
  player.sliding=false;
  player.grounded=false;
  dbgSyncFly();
  dbgAppend('info','fly '+(on?'ON · speed '+player.flySpeed:'OFF · normal gravity'));
}

function dbgFormat(value){
  if(typeof value==='string')return value;
  if(value===undefined)return 'undefined';
  if(value===null)return 'null';
  if(value instanceof THREE.Vector3)return '('+value.x.toFixed(2)+', '+value.y.toFixed(2)+', '+value.z.toFixed(2)+')';
  if(typeof value==='number'||typeof value==='boolean')return String(value);
  if(typeof value==='function')return 'function '+(value.name||'anonymous');
  if(value&&value.name&&typeof value.message==='string')return value.name+': '+value.message;
  try{return JSON.stringify(value);}catch(error){return String(value);}
}
function dbgAppend(kind,text){
  dbg.log.push({kind,text});
  if(dbg.log.length>250)dbg.log.shift();
  if(!dbg.open)return;
  const line=document.createElement('div');
  line.className='dbg-line dbg-'+kind;
  line.textContent=text;
  dbgLogEl.appendChild(line);
  while(dbgLogEl.childElementCount>250)dbgLogEl.removeChild(dbgLogEl.firstChild);
  dbgLogEl.scrollTop=dbgLogEl.scrollHeight;
}
function dbgRenderLog(){
  dbgLogEl.textContent='';
  for(const entry of dbg.log){
    const line=document.createElement('div');
    line.className='dbg-line dbg-'+entry.kind;
    line.textContent=entry.text;
    dbgLogEl.appendChild(line);
  }
  dbgLogEl.scrollTop=dbgLogEl.scrollHeight;
}
// Capture anything the game logs or throws so it shows up in the console.
for(const level of ['log','info','warn','error']){
  const original=console[level].bind(console);
  console[level]=(...args)=>{original(...args);dbgAppend(level,args.map(dbgFormat).join(' '));};
}
addEventListener('error',e=>dbgAppend('err',(e.message||'error')+' @ '+(e.filename||'')+':'+(e.lineno||0)));
addEventListener('unhandledrejection',e=>dbgAppend('err','unhandled rejection: '+dbgFormat(e.reason)));

function dbgRefresh(){
  const now=performance.now();
  const delta=(now-dbg.prevT)/1000;
  if(delta>0.0001)dbg.speed=player.pos.distanceTo(dbg.prev)/delta;
  dbg.prev.copy(player.pos);
  dbg.prevT=now;
  const ammoSlot=player.slot===5?2:player.slot;
  const ammo=player.ammo[ammoSlot];
  const hasMag=player.slot===0||player.slot===1||player.slot===5;
  const states=[player.sliding?'SLIDE':'',player.crouching&&!player.sliding?'CROUCH':'',player.grounded?'GROUND':'AIR',player.aiming?'AIM':'',player.reloading?'RELOAD':''].filter(Boolean).join(' ')||'IDLE';
  const rows=[
    ['fps',dbg.fps.toFixed(0)+(dbg.fps?' ('+(1000/dbg.fps).toFixed(1)+'ms)':'')],
    ['mode',gameMode],
    ['pos',player.pos.x.toFixed(2)+', '+player.pos.y.toFixed(2)+', '+player.pos.z.toFixed(2)],
    ['speed',dbg.speed.toFixed(2)+' u/s'],
    ['look',(player.yaw*57.2958).toFixed(0)+'deg / '+(player.pitch*57.2958).toFixed(0)+'deg'],
    ['weapon',weapons[player.slot].name+' #'+player.slot],
    ['ammo',hasMag?(ammo.mag+' / '+ammo.reserve):(player.slot===3?player.grenades+' grenades':'-')],
    ['hp',player.hp],
    ['state',states],
    ['fly',player.fly?('ON · '+player.flySpeed+' u/s'):'off'],
    ['bots',bots.filter(b=>b.alive).length+' alive / '+bots.length],
    ['players',onlineTotal()+' online · '+remotePlayers.size+' peers'],
    ['net',net.status+' · '+(net.online?'relay':'browser only')+' · '+net.room],
    ['lock',locked?'captured':'free'],
    ['keys',Object.keys(keys).filter(k=>keys[k]).join(' ')||'-']
  ];
  dbgStatsEl.innerHTML=rows.map(row=>'<div class="dbg-k">'+row[0]+'</div><div class="dbg-v">'+String(row[1])+'</div>').join('');
}
function dbgLockMouse(){
  if(document.pointerLockElement||gameMode==='lobby')return;
  const request=renderer.domElement.requestPointerLock();
  if(request&&request.catch)request.catch(()=>{});
}
function dbgAuthVisible(){return dbgAuth.classList.contains('open');}
function dbgShowAuth(show){
  dbgAuth.classList.toggle('open',show);
  if(show){
    dbgAuthMsg.textContent='';
    dbgPass.value='';
    dbgPass.focus();
  }else dbgPass.blur();
}
function dbgUnlock(){
  if(dbgPass.value!==DEBUG_PASSWORD){
    dbgAuthMsg.textContent='WRONG PASSWORD';
    dbgPass.value='';
    dbgPass.focus();
    return;
  }
  dbgAuthed=true;
  try{sessionStorage.setItem('beathim-debug-auth','1');}catch(error){}
  dbgShowAuth(false);
  dbgToggle(true);
}
function dbgToggle(force){
  const visible=dbg.open||dbgAuthVisible();
  const wantOpen=force===undefined?!visible:force;
  keys.ShiftRight=false;
  if(!wantOpen){
    dbg.open=false;
    dbgPanel.classList.remove('open');
    dbgShowAuth(false);
    document.body.classList.remove('dbg-open');
    dbgInput.blur();
    dbgLockMouse();
    return;
  }
  // The console needs the cursor, so always release pointer lock while it is up.
  if(document.pointerLockElement)document.exitPointerLock();
  document.body.classList.add('dbg-open');
  if(!dbgAuthed){dbgShowAuth(true);return;}
  dbg.open=true;
  dbgPanel.classList.add('open');
  dbgRenderLog();dbgSyncFly();dbgRefresh();
}
function dbgEval(code){return eval(code);}
function dbgRun(code){
  if(!code.trim())return;
  dbg.history.push(code);
  dbg.hIndex=dbg.history.length;
  dbgAppend('cmd','> '+code);
  try{
    const result=dbgEval(code);
    if(result&&typeof result.then==='function'){result.then(value=>dbgAppend('ok','<- '+dbgFormat(value)),error=>dbgAppend('err',String(error)));return;}
    dbgAppend('ok','<- '+dbgFormat(result));
  }catch(error){dbgAppend('err',String(error));}
}
dbgInput.addEventListener('focus',()=>{if(document.pointerLockElement)document.exitPointerLock();});
dbgInput.addEventListener('keydown',e=>{
  e.stopPropagation();
  if(e.key==='Enter'){const code=dbgInput.value;dbgInput.value='';dbgRun(code);}
  else if(e.key==='ArrowUp'){e.preventDefault();if(dbg.history.length){dbg.hIndex=Math.max(0,dbg.hIndex-1);dbgInput.value=dbg.history[dbg.hIndex]||'';}}
  else if(e.key==='ArrowDown'){e.preventDefault();if(dbg.history.length){dbg.hIndex=Math.min(dbg.history.length,dbg.hIndex+1);dbgInput.value=dbg.history[dbg.hIndex]||'';}}
});
dbgFlySpeed.addEventListener('input',()=>{
  const value=Number(dbgFlySpeed.value);
  if(Number.isFinite(value))player.flySpeed=Math.max(1,Math.min(80,value));
});
dbgFlySpeed.addEventListener('change',()=>{
  dbgFlySpeed.value=player.flySpeed;
  dbgAppend('info','fly speed set to '+player.flySpeed);
});
dbgPanel.addEventListener('click',e=>{
  const action=e.target.dataset?e.target.dataset.dbg:null;
  if(action==='flyon')dbgSetFly(true);
  if(action==='flyoff')dbgSetFly(false);
  if(action==='clear'){dbg.log.length=0;dbgLogEl.textContent='';}
  if(action==='copy'){
    const state={mode:gameMode,pos:[player.pos.x,player.pos.y,player.pos.z],yaw:player.yaw,pitch:player.pitch,hp:player.hp,slot:player.slot,ammo:player.ammo,bots:bots.length,fps:Math.round(dbg.fps)};
    const text=JSON.stringify(state,null,2);
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>dbgAppend('info','state copied'),()=>dbgAppend('warn',text));
    else dbgAppend('info',text);
  }
});
dbgAuth.addEventListener('click',e=>{
  const action=e.target.dataset?e.target.dataset.dbg:null;
  if(action==='unlock')dbgUnlock();
});
dbgPass.addEventListener('keydown',e=>{
  e.stopPropagation();
  if(e.key==='Enter'){e.preventDefault();dbgUnlock();}
  else if(e.key==='Escape'){e.preventDefault();dbgToggle(false);}
});
dbgPass.addEventListener('focus',()=>{if(document.pointerLockElement)document.exitPointerLock();});
addEventListener('keydown',e=>{if(e.code==='ShiftRight'&&!e.repeat){e.preventDefault();dbgToggle();}},true);
// If the mouse is ever loose outside the console, clicking the game grabs it again.
renderer.domElement.addEventListener('mousedown',()=>{if(!locked&&!dbg.open)dbgLockMouse();});
window.BEATHIM={player,bots,scene,camera,keys,weapons,THREE,startGame,setWeapon,damageBot,hitBot,blocked,scytheDash,dbg,dbgToggle,dbgSetFly,update,setFly:dbgSetFly,remotePlayers,net,duel,mode:()=>gameMode,netSkin:()=>netSkin,netName:()=>netName,inviteDuel,startDuel,enterLobby,renderLobbyList};

function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);update(dt);renderer.render(scene,camera);dbg.frames++;dbg.acc+=dt;if(dbg.acc>=.5){dbg.fps=dbg.frames/dbg.acc;dbg.frames=0;dbg.acc=0;}if(dbg.open)dbgRefresh();} loop();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
