import * as THREE from './engine.js';
import { createNet } from './multiplayer.js?v=2';

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
let worldBounds=28.4;
function blocked(pos){if(pos.x<-worldBounds||pos.x>worldBounds||pos.z<-worldBounds||pos.z>worldBounds)return true;return activeSolidAreas.some(a=>inArea(a,pos.x,pos.z,.65)&&pos.y<a.h+1.2);}
function landOnObstacle(previousY){for(const a of activeSolidAreas){const inside=inArea(a,player.pos.x,player.pos.z,.5);const top=a.h+1.2;if(inside&&player.pos.y<=top&&previousY>=top&&player.vertical<=0){player.pos.y=top;player.vertical=0;player.grounded=true;return true;}}return false;}
// Center beacon
cylinder(1.8,.35,0,1.5,0,mat(0x182858)); cylinder(.4,3,0,3,0,mat(cyan,cyan)); const beacon=new THREE.PointLight(cyan,5,18); beacon.position.set(0,4,0); scene.add(beacon);
// Grid stars / ceiling light bars
for(let i=0;i<28;i++){ const x=(Math.random()-.5)*70, z=(Math.random()-.5)*70; box(.12,.12,.12,x,8+Math.random()*12,z,mat(i%2?cyan:pink,i%2?cyan:pink)); }
const blueScoreEl=document.getElementById('blueScore'), redScoreEl=document.getElementById('redScore'), healthBarEl=document.getElementById('healthBar'), hpTextEl=document.getElementById('hpText');
const crosshair=document.getElementById('crosshair'), settings=document.getElementById('settings'), weaponName=document.getElementById('weaponName'), slotLabel=document.getElementById('slotLabel'), ammoText=document.getElementById('ammoText'), hitmark=document.getElementById('hitmark'), damageNumber=document.getElementById('damage');
/* ---------------- WEAPON CATALOG ----------------
 * Every gun and melee lives in one catalog. `base` chooses the existing
 * shooting/reload/viewmodel archetype (rifle, pistol, fists, grenade, scythe,
 * sniper) while the id itself is what the loadout, duels and remote players
 * carry. Unlockable weapons reuse a base but have their own stats and wrap. */
const WEAPON_CATALOG=[
  {id:0,name:'ASSAULT RIFLE',short:'AR',category:'primary',slot:'PRIMARY',base:0,rate:130,mag:24,reserve:72,damage:{body:9,head:12},price:0,icon:'rifle',desc:'BALANCED AUTO'},
  {id:1,name:'HANDGUN',short:'PISTOL',category:'secondary',slot:'SECONDARY',base:1,rate:260,mag:12,reserve:48,damage:{body:6,head:9},price:0,icon:'pistol',desc:'RELIABLE SIDEARM'},
  {id:2,name:'FISTS',short:'FISTS',category:'melee',slot:'MELEE',base:2,rate:420,damage:{body:20,head:20},price:0,icon:'fist',desc:'FAST MELEE'},
  {id:3,name:'GRENADE',short:'GRENADE',category:'utility',slot:'UTILITY',base:3,rate:800,damage:{body:50,head:50},price:0,icon:'grenade',desc:'AREA DAMAGE'},
  {id:4,name:'SCYTHE',short:'SCYTHE',category:'melee',slot:'MELEE',base:4,rate:650,damage:{body:25,head:25},price:0,icon:'scythe',desc:'DASH MELEE'},
  {id:5,name:'SNIPER',short:'SNIPER',category:'primary',slot:'PRIMARY',base:5,rate:900,mag:4,reserve:16,damage:{body:34,head:100},price:0,icon:'sniper',desc:'ONE-SHOT HEADS'},
  {id:6,name:'VIPER SMG',short:'VIPER',category:'primary',slot:'PRIMARY',base:0,rate:80,mag:32,reserve:128,damage:{body:6,head:9},price:3,icon:'smg',desc:'SPRAY & PRAY'},
  {id:7,name:'TRIDENT BURST',short:'TRIDENT',category:'primary',slot:'PRIMARY',base:0,rate:260,mag:30,reserve:90,damage:{body:13,head:18},price:5,icon:'burst',desc:'HARD-HITTING AUTO'},
  {id:8,name:'BREACHER',short:'BREACHER',category:'primary',slot:'PRIMARY',base:0,rate:750,mag:6,reserve:30,damage:{body:36,head:48},price:6,icon:'shotgun',desc:'CLOSE-RANGE CANNON'},
  {id:9,name:'LONGSHOT DMR',short:'LONGSHOT',category:'primary',slot:'PRIMARY',base:5,rate:420,mag:8,reserve:40,damage:{body:26,head:60},price:8,icon:'dmr',desc:'SEMI-AUTO SCOUT'},
  {id:10,name:'WASP',short:'WASP',category:'secondary',slot:'SECONDARY',base:1,rate:110,mag:18,reserve:72,damage:{body:5,head:8},price:3,icon:'machinepistol',desc:'AUTO PISTOL'},
  {id:11,name:'KATANA',short:'KATANA',category:'melee',slot:'MELEE',base:4,rate:480,damage:{body:34,head:34},price:4,icon:'katana',desc:'QUICK DASH BLADE'},
  {id:12,name:'TITAN HAMMER',short:'HAMMER',category:'melee',slot:'MELEE',base:2,rate:820,damage:{body:46,head:52},price:5,icon:'hammer',desc:'SLOW DEVASTATION'},
  {id:13,name:'GREATSWORD',short:'GREATSWORD',category:'melee',slot:'MELEE',base:4,rate:900,damage:{body:55,head:55},price:7,icon:'greatsword',desc:'HEAVY DASH CLEAVE'}
];
const weapons=WEAPON_CATALOG;
const WEAPON_BY_ID=new Map(weapons.map(weapon=>[weapon.id,weapon]));
const WEAPON_CATEGORIES=[['primary','PRIMARY'],['secondary','SECONDARY'],['melee','MELEE'],['utility','UTILITY']];
const WEAPON_ICONS={
  rifle:'<path d="M3 15h9l3-4h13l2 2h9l3 3v4h-6l-3 3h-5l-2-3h-3l-3 4H9l2-7H3z"/><path d="M32 11h5v4h-5z"/>',
  smg:'<path d="M8 14h10l3-3h14l2 2h8l3 4v3h-5l-2 3h-6l-2-3h-5l-2 4h-4l1-6H8z"/><path d="M20 18h4v7h-4z"/>',
  burst:'<path d="M4 16h8l2-4h15l2 2h10l3 3v4h-6l-2 3h-7l-2-3h-4l-3 4H9l2-6H4z"/><path d="M27 12h4v5h-4z"/><path d="M38 9h8v3h-8z"/>',
  shotgun:'<path d="M3 16h10l2-3h10l3 2h20l4 3v3H36l-2 3h-6l-2-3H17l-3 4H8l2-6H3z"/><path d="M24 15h8v3h-8z"/>',
  sniper:'<path d="M2 16h12l2-2h8l1-4h8v4h5l2-2h9l8 2v2h-9l-3 3h-8l-2 3h-5l-2-3H13l-3 4H5l2-5H2z"/><path d="M30 9h12v3H30z"/>',
  dmr:'<path d="M4 16h10l2-3h9l2-3h7v3h4l3-2h9l7 2v3h-8l-2 3h-9l-2 3h-6l-2-3H15l-3 4H7l2-6H4z"/><path d="M32 8h10v3H32z"/>',
  pistol:'<path d="M14 10h22l3 3v5l-8 2-2 9h-7l-2-9h-3l-2 5H9l2-9h3z"/>',
  machinepistol:'<path d="M11 11h19l3 3v5l-7 2-2 8h-6l-2-8h-2l-2 4H7l2-8h2z"/><path d="M28 14h9v4h-9z"/>',
  fist:'<path d="M16 13c0-2 3-2 3 0v-3c0-2 3-2 3 0v-1c0-2 3-2 3 0v1c0-2 3-2 3 0v9c0 7-4 10-9 10s-9-4-9-10v-5c0-2 3-2 3 0v3h3z"/>',
  scythe:'<path d="M8 28L26 8l2 2L11 31z"/><path d="M26 7c8-5 19-2 25 4-9-3-17-2-23 2z"/>',
  katana:'<path d="M6 27l4 3L44 7l3-5-1 7L11 31z"/><path d="M8 24l4 4-4 3-4-2z"/>',
  hammer:'<path d="M9 28L26 9l3 3L13 31z"/><path d="M27 4h17l5 5-4 7H31l-5-4z"/>',
  grenade:'<path d="M25 9h14v4l3 3v10c0 4-4 6-10 6s-10-2-10-6V16l3-3z"/><path d="M31 4h6v5h-6z"/><path d="M37 6l7 4-2 3-7-4z"/>',
  greatsword:'<path d="M10 27l5 4L47 5l4-3-1 6L14 31z"/><path d="M9 22l8 8-3 2-8-7z"/>'
};
function weaponIconSvg(name){return '<svg viewBox="0 0 64 32" aria-hidden="true">'+(WEAPON_ICONS[name]||WEAPON_ICONS.rifle)+'</svg>';}
function weaponDef(id){return WEAPON_BY_ID.get(Number(id))||weapons[0];}
function damageFor(id,headshot){const def=weaponDef(id);return headshot?def.damage.head:def.damage.body;}
function resetAmmo(){player.ammo={};for(const def of weapons){if(def.mag)player.ammo[def.id]={mag:def.mag,max:def.mag,reserve:def.reserve};}}
const player={pos:new THREE.Vector3(0,2.2,27), yaw:0, cameraYaw:0, avatarYaw:0, pitch:0, hp:100, blue:0, red:0, slot:0, meleeChoice:2, primaryChoice:0, secondaryChoice:1, utilityChoice:3, aimHold:false, aimKey:false, aimMode:'hold', invertY:false, reloading:false, reloadTime:0, reloadTotal:0, reloadSlot:0, walkPhase:0, walkBlend:0, sensitivity:1, scopeSensitivity:.5, ammo:{}, vertical:0, grounded:true, crouching:false, sliding:false, slideTime:0, slideCooldown:0, aiming:false, scytheCooldown:0, grenades:3, doubleJumpUsed:false, prevSlot:null, quickMeleeTimer:0, coyote:0, jumpBuffer:0, vx:0, vz:0, fly:false, flySpeed:14}; const weaponAnim={recoil:0,swing:0,throw:0,inspect:0,bolt:0}; resetAmmo(); camera.position.copy(player.pos);
let gameMode='lobby';
const single={active:false,difficulty:'easy',round:0,wins:0,losses:0,botIndex:0,roundOver:false,countdown:0,countdownShown:0,goFlash:0};
function updateAmmoHud(){const def=weaponDef(player.slot);if(def.mag){const a=player.ammo[player.slot]||{mag:0,reserve:0};ammoText.textContent='CLIP '+a.mag+' / '+a.reserve;}else if(def.base===3)ammoText.textContent='AMMO '+player.grenades;else if(def.base===4)ammoText.textContent='DASH READY';else ammoText.textContent='CLOSE RANGE';}
updateAmmoHud();
// First-person weapon viewmodel: simple readable silhouettes that swap with the loadout.
const weaponView=new THREE.Group(); weaponView.position.set(.42,-.38,-.72); camera.add(weaponView); scene.add(camera);
// Where the barrel tip sits in viewmodel space. Bullet tracers leave from here
// instead of the middle of the screen.
const muzzleLocal=new THREE.Vector3(0,.12,-2.12);
const weaponMat=mat(0x242a3c), accentMat=mat(cyan,cyan), skinMat=mat(0xc28a72), rifleBlack=mat(0x111521), rifleSteel=mat(0x30394c), rifleOrange=mat(0xa95d31), rifleWood=mat(0x854522);
function part(geometry, material, position, rotation=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.rotation.set(...rotation);m.castShadow=true;weaponView.add(m);return m;}
function addWeaponHands(){
  if(weaponDef(player.slot).base===2)return;
  const handTone=mat(0xc58d78), cuffTone=mat(0x293247);
  // Straight forearms rise from the bottom of the screen into the weapon grip.
  part(new THREE.BoxGeometry(.18,.62,.2),handTone,[.3,-.44,-.04]);
  part(new THREE.BoxGeometry(.18,.62,.2),handTone,[-.3,-.42,-.2]);
  part(new THREE.BoxGeometry(.25,.2,.3),handTone,[.22,-.14,-.42]);
  part(new THREE.BoxGeometry(.25,.2,.3),handTone,[-.2,-.12,-.62]);
  part(new THREE.BoxGeometry(.2,.08,.22),cuffTone,[.3,-.73,.02]);
  part(new THREE.BoxGeometry(.2,.08,.22),cuffTone,[-.3,-.71,-.14]);
}
let weaponClip=null, weaponBolt=null, equippedWrap=null;
function applyWrapTrim(base){
  if(!equippedWrap)return;
  const wrapColor=equippedWrap.color, trim=mat(wrapColor,wrapColor);
  if(base===0||base===1||base===5){
    part(new THREE.BoxGeometry(.36,.035,.42),trim,[0,.21,-.3]);
    part(new THREE.BoxGeometry(.03,.36,.08),trim,[.18,-.12,-.1]);
    part(new THREE.BoxGeometry(.03,.36,.08),trim,[-.18,-.12,-.1]);
  }else if(base===4){
    part(new THREE.BoxGeometry(.15,.12,.16),trim,[0,-.26,-.2]);
    part(new THREE.BoxGeometry(.14,.05,.6),trim,[0,.28,-.45],[0,.25,0]);
  }else if(base===2){
    part(new THREE.BoxGeometry(.34,.06,.16),trim,[.5,-.36,-.4]);
  }
}
function rebuildWeapon(){
  weaponClip=null;weaponBolt=null;
  while(weaponView.children.length)weaponView.remove(weaponView.children[0]);
  const def=weaponDef(player.slot),base=def.base;
  weaponView.scale.setScalar(base===0?.72:base===5?.92:1);
  if(base===0){
    // Stylized AK-like silhouette based on the reference: orange receiver/stock, dark barrel and curved magazine.
    part(new THREE.BoxGeometry(.34,.36,.62),rifleOrange,[0,.02,-.28]);
    part(new THREE.BoxGeometry(.25,.27,.3),rifleSteel,[0,.02,-.68]);
    part(new THREE.CylinderGeometry(.075,.075,1.35,10),rifleBlack,[0,.12,-1.34],[Math.PI/2,0,0]);
    part(new THREE.CylinderGeometry(.15,.13,.2,10),rifleBlack,[0,.12,-2.02],[Math.PI/2,0,0]);
    part(new THREE.BoxGeometry(.16,.14,.52),rifleBlack,[0,.2,-.85]);
    part(new THREE.CylinderGeometry(.055,.055,.3,8),rifleBlack,[0,.28,-.55],[Math.PI/2,0,0]);
    part(new THREE.BoxGeometry(.18,.11,.28),rifleBlack,[0,.34,-.43]);
    weaponClip=part(new THREE.BoxGeometry(.2,.52,.2),rifleBlack,[0,-.32,-.16],[.22,0,0]);
    part(new THREE.BoxGeometry(.24,.16,.66),rifleBlack,[0,-.27,-.05],[.12,0,0]);
    part(new THREE.BoxGeometry(.26,.3,.5),rifleWood,[0,-.01,.38]);
    part(new THREE.BoxGeometry(.3,.34,.24),rifleWood,[0,-.02,.66]);
    part(new THREE.BoxGeometry(.14,.12,.16),rifleBlack,[0,.12,.02]);
    part(new THREE.BoxGeometry(.2,.06,.12),accentMat,[0,.25,-.48]);
    weaponBolt=part(new THREE.BoxGeometry(.1,.07,.13),rifleSteel,[.2,.08,-.05]);
  }else if(base===1){
    part(new THREE.BoxGeometry(.22,.2,.6),weaponMat,[0,0,-.28]);
    part(new THREE.BoxGeometry(.13,.3,.16),weaponMat,[0,-.22,-.08],[.2,0,0]);
    weaponClip=part(new THREE.BoxGeometry(.12,.26,.13),rifleSteel,[0,-.45,-.05],[.13,0,0]);
    part(new THREE.BoxGeometry(.15,.05,.16),accentMat,[0,-.57,-.02],[.13,0,0]);
    part(new THREE.BoxGeometry(.08,.08,.2),accentMat,[0,.05,-.62]);
    part(new THREE.BoxGeometry(.07,.07,.28),weaponMat,[0,.06,-.72]);
    part(new THREE.BoxGeometry(.2,.05,.1),accentMat,[0,.15,-.25]);
    weaponBolt=part(new THREE.BoxGeometry(.12,.05,.08),rifleSteel,[0,.12,-.12]);
  }else if(base===2){
    part(new THREE.BoxGeometry(.3,.26,.44),skinMat,[.5,-.26,-.46]);
    weaponView.position.x=0;
  }else if(base===4){
    part(new THREE.BoxGeometry(.12,.75,.12),rifleBlack,[0,-.04,-.42],[0,0,.22]);
    part(new THREE.BoxGeometry(.7,.12,.1),rifleSteel,[0,.18,-.62],[0,.25,0]);
    part(new THREE.CylinderGeometry(.13,.04,.18,8),rifleBlack,[0,.18,-.95],[Math.PI/2,0,0]);
    part(new THREE.BoxGeometry(.13,.23,.18),rifleWood,[0,-.3,-.18]);
  }else if(base===5){
    part(new THREE.BoxGeometry(.24,.25,.7),rifleSteel,[0,0,-.28]);
    part(new THREE.CylinderGeometry(.065,.065,1.7,10),rifleBlack,[0,.08,-1.15],[Math.PI/2,0,0]);
    part(new THREE.CylinderGeometry(.12,.1,.18,10),rifleBlack,[0,.08,-2.02],[Math.PI/2,0,0]);
    part(new THREE.CylinderGeometry(.1,.1,.42,10),rifleBlack,[0,.28,-.38],[Math.PI/2,0,0]);
    part(new THREE.BoxGeometry(.18,.14,.35),accentMat,[0,.22,-.62]);
    part(new THREE.BoxGeometry(.2,.5,.25),rifleBlack,[0,-.27,.05],[.15,0,0]);
    weaponClip=part(new THREE.BoxGeometry(.12,.3,.18),rifleBlack,[0,-.2,-.3],[.2,0,0]);
    weaponBolt=part(new THREE.BoxGeometry(.08,.08,.3),rifleSteel,[.16,.04,-.15]);
  }else{
    part(new THREE.SphereGeometry(.17,12,8),mat(0x45516a),[0,0,-.25]);
    part(new THREE.BoxGeometry(.1,.3,.1),accentMat,[0,-.17,-.25]);
    part(new THREE.BoxGeometry(.08,.08,.22),mat(0x202536),[0,.06,-.44]);
  }
  if(base===0||base===1||base===5)addWeaponHands();
  if(weaponClip){weaponClip.userData.home=weaponClip.position.clone();weaponClip.userData.homeRot=weaponClip.rotation.clone();}
  if(weaponBolt){weaponBolt.userData.home=weaponBolt.position.clone();}
  if(base===0)muzzleLocal.set(0,.12,-2.12);
  else if(base===1)muzzleLocal.set(0,.06,-.9);
  else if(base===5)muzzleLocal.set(0,.08,-2.12);
  else if(base===2)muzzleLocal.set(.5,-.26,-.7);
  else if(base===4)muzzleLocal.set(0,.18,-1.05);
  else muzzleLocal.set(0,.1,-.6);
  applyWrapTrim(base);
}
rebuildWeapon();
const keys={}; let locked=false, shooting=false, lastShot=0; const bots=[];
const aimbot={enabled:false,target:'enemies',speed:8};
function updateAim(){ const base=weaponDef(player.slot).base; player.aiming=(player.aimHold||player.aimKey)&&base!==2&&base!==3&&base!==4; document.querySelector('.hud').classList.toggle('aiming',player.aiming); }
function forceWeapon(id){
  const def=weaponDef(id);
  player.slot=def.id;player.aimHold=false;player.aimKey=false;player.reloading=false;updateAim();
  weaponName.innerHTML=def.name+(def.base===0?' <span style="color:#6cd9ff">▰▰▰</span>':'');
  slotLabel.textContent=def.slot+' · '+def.short;
  updateAmmoHud();rebuildWeapon();
}
function setWeapon(id){forceWeapon(id);showMessage(weaponDef(id).name);}
function loadoutChoice(category){
  if(category==='primary')return player.primaryChoice;
  if(category==='secondary')return player.secondaryChoice;
  if(category==='melee')return player.meleeChoice;
  return player.utilityChoice;
}
function sanitizeLoadout(){
  const pick=(category,selectId,current)=>{
    let id=current;
    const def=weaponDef(id);
    if(!def||def.category!==category||!ownedWeapon(id)){
      const fallback=weapons.find(entry=>entry.category===category&&ownedWeapon(entry.id));
      id=fallback?fallback.id:def.id;
    }
    const select=document.getElementById(selectId);
    if(select)select.value=String(id);
    return id;
  };
  player.primaryChoice=pick('primary','loadoutPrimary',Number(document.getElementById('loadoutPrimary').value));
  player.secondaryChoice=pick('secondary','loadoutSecondary',Number(document.getElementById('loadoutSecondary').value));
  player.meleeChoice=pick('melee','loadoutMelee',Number(document.getElementById('loadoutMelee').value));
  player.utilityChoice=pick('utility','loadoutUtility',Number(document.getElementById('loadoutUtility').value));
}
function selectCategory(category){
  let id=loadoutChoice(category);
  if(!ownedWeapon(id)){
    const fallback=weapons.find(def=>def.category===category&&ownedWeapon(def.id));
    if(!fallback){showMessage('WEAPON LOCKED');return;}
    id=fallback.id;
    if(category==='primary')player.primaryChoice=id;
    else if(category==='secondary')player.secondaryChoice=id;
    else if(category==='melee')player.meleeChoice=id;
    else player.utilityChoice=id;
  }
  forceWeapon(id);showMessage(weaponDef(id).name);
}
function reloadWeapon(){
  if(gameMode==='lobby'||player.reloading)return;
  const def=weaponDef(player.slot);
  if(!def.mag){showMessage('NO MAGAZINE');return;}
  const a=player.ammo[def.id];if(!a)return;
  if(a.mag>=a.max||a.reserve<=0){showMessage(a.reserve<=0?'NO RESERVE AMMO':'MAG FULL');return;}
  player.reloading=true;player.reloadSlot=def.id;
  player.reloadTotal=def.base===1?.9:def.base===5?1.55:1.2;player.reloadTime=player.reloadTotal;
  playSound('reload');showMessage('RELOADING');
}
function animateWeaponClip(){
  if(weaponBolt&&weaponBolt.userData.home){
    weaponBolt.position.copy(weaponBolt.userData.home);
    weaponBolt.position.z+=weaponAnim.bolt*.09;
    weaponBolt.position.y-=weaponAnim.bolt*.012;
  }
  if(!weaponClip||!weaponClip.userData.home)return;
  const clip=weaponClip,home=clip.userData.home,homeRot=clip.userData.homeRot;
  if(!player.reloading){clip.visible=true;clip.position.copy(home);clip.rotation.copy(homeRot);return;}
  const t=1-player.reloadTime/player.reloadTotal;
  // First half: the empty clip falls out. Second half: a fresh one slides in.
  if(t<.45){
    const k=Math.min(1,t/.45);
    clip.visible=k<.9;
    clip.position.set(home.x,home.y-.32*k,home.z+.14*k);
    clip.rotation.set(homeRot.x+.8*k,homeRot.y,homeRot.z+.25*k);
  }else{
    const k=Math.min(1,(t-.45)/.55);
    clip.visible=true;
    clip.position.set(home.x,home.y-.32*(1-k),home.z+.14*(1-k));
    clip.rotation.set(homeRot.x+.8*(1-k),homeRot.y,homeRot.z+.25*(1-k));
  }
}
function finishReload(){
  player.reloading=false;
  const def=weaponDef(player.slot),a=player.ammo[player.reloadSlot];
  if(!a)return;
  const needed=(a.max||def.mag||0)-a.mag;
  const loaded=Math.min(needed,a.reserve);
  a.mag+=loaded;a.reserve-=loaded;updateAmmoHud();playSound('reloaded');showMessage('RELOADED');
}
function updateCrosshair(){ crosshair.className='crosshair '+document.getElementById('crosshairStyle').value; crosshair.style.color=document.getElementById('crosshairColor').value; }
function showHit(damage,kind='body'){
  hitmark.className=kind==='headshot'?'headshot':kind==='kill'?'kill':'';
  hitmark.classList.remove('show');damageNumber.classList.remove('show');
  void hitmark.offsetWidth;
  damageNumber.textContent='-'+damage;
  hitmark.classList.add('show');damageNumber.classList.add('show');
  playSound(kind==='kill'?'kill':kind==='headshot'?'headshot':'hit');
}
function showKillMarker(){
  const el=document.getElementById('killmark');
  if(!el)return;
  el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
}
/* ---------------- WORLD GUN MODELS ----------------
 * Shared silhouettes for bots and remote players. Guns point along +Z so the
 * avatar's yaw is the only rotation needed. */
const tpGunDark=mat(0x14181f),tpGunSteel=mat(0x39445c),tpGunWood=mat(0x7d4a28),tpGunAccent=mat(0x36d9ff,0x36d9ff);
function gunPart(group,geometry,material,x,y,z,rotation=[0,0,0]){
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.rotation.set(...rotation);
  mesh.castShadow=true;
  group.add(mesh);
  return mesh;
}
function buildGunModel(slot){
  const gun=new THREE.Group();
  if(slot===5){
    gunPart(gun,new THREE.BoxGeometry(.17,.19,.7),tpGunSteel,0,.02,.1);
    gunPart(gun,new THREE.CylinderGeometry(.045,.045,1.15,8),tpGunDark,0,.05,.95,[Math.PI/2,0,0]);
    gunPart(gun,new THREE.CylinderGeometry(.075,.06,.16,8),tpGunDark,0,.05,1.55,[Math.PI/2,0,0]);
    gunPart(gun,new THREE.CylinderGeometry(.055,.055,.4,8),tpGunDark,0,.19,.08,[Math.PI/2,0,0]);
    gunPart(gun,new THREE.CylinderGeometry(.075,.075,.12,8),tpGunDark,0,.19,-.14,[Math.PI/2,0,0]);
    gunPart(gun,new THREE.BoxGeometry(.15,.15,.5),tpGunWood,0,-.02,-.52);
    gunPart(gun,new THREE.BoxGeometry(.11,.26,.16),tpGunDark,0,-.18,-.12,[.2,0,0]);
    gunPart(gun,new THREE.BoxGeometry(.18,.04,.1),tpGunAccent,0,.11,-.2);
  }else if(slot===1){
    gunPart(gun,new THREE.BoxGeometry(.15,.16,.42),tpGunSteel,0,.02,.12);
    gunPart(gun,new THREE.BoxGeometry(.11,.11,.24),tpGunDark,0,.02,.44);
    gunPart(gun,new THREE.BoxGeometry(.12,.24,.14),tpGunDark,0,-.16,-.02,[.18,0,0]);
    gunPart(gun,new THREE.BoxGeometry(.1,.22,.12),tpGunSteel,0,-.3,-.03,[.14,0,0]);
    gunPart(gun,new THREE.BoxGeometry(.13,.05,.08),tpGunAccent,0,.11,.2);
  }else if(slot===4){
    gunPart(gun,new THREE.CylinderGeometry(.035,.035,1.25,8),tpGunWood,0,.05,-.1,[Math.PI/2,0,0]);
    gunPart(gun,new THREE.BoxGeometry(.11,.5,.06),tpGunSteel,0,.23,.72,[0,0,.35]);
    gunPart(gun,new THREE.ConeGeometry(.16,.5,3),tpGunSteel,0,.45,.98,[0,0,.45]);
    gunPart(gun,new THREE.BoxGeometry(.1,.12,.2),tpGunAccent,0,-.02,-.3);
  }else{
    // Assault rifle: the default silhouette for bots and rifle loadouts.
    gunPart(gun,new THREE.BoxGeometry(.17,.19,.72),tpGunSteel,0,.02,.08);
    gunPart(gun,new THREE.CylinderGeometry(.045,.045,.72,8),tpGunDark,0,.06,.78,[Math.PI/2,0,0]);
    gunPart(gun,new THREE.CylinderGeometry(.06,.05,.12,8),tpGunDark,0,.06,1.2,[Math.PI/2,0,0]);
    gunPart(gun,new THREE.BoxGeometry(.13,.3,.2),tpGunDark,0,-.22,.14,[.18,0,0]);
    gunPart(gun,new THREE.BoxGeometry(.15,.16,.36),tpGunWood,0,-.01,-.46);
    gunPart(gun,new THREE.BoxGeometry(.15,.1,.14),tpGunWood,0,-.02,-.72);
    gunPart(gun,new THREE.BoxGeometry(.12,.12,.1),tpGunDark,0,.13,-.02);
    gunPart(gun,new THREE.BoxGeometry(.18,.04,.08),tpGunAccent,0,.13,.42);
  }
  return gun;
}
function buildFighter(color,accent=color){
  const group=new THREE.Group();
  const suit=mat(color),trim=mat(accent,accent),dark=mat(0x1a2236),boot=mat(0x0d1322),skin=mat(0xefc3a7),steel=mat(0x39445c);
  const parts={};
  const add=(key,geometry,material,x,y,z,rotation=[0,0,0],hitZone)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.set(...rotation);mesh.castShadow=true;
    if(hitZone)mesh.userData.hitZone=hitZone;group.add(mesh);parts[key]=mesh;return mesh;
  };
  add('leftLeg',new THREE.BoxGeometry(.3,.85,.38),dark,-.27,.43,0);
  add('rightLeg',new THREE.BoxGeometry(.3,.85,.38),dark,.27,.43,0);
  add('leftBoot',new THREE.BoxGeometry(.34,.2,.5),boot,-.27,.1,.05);
  add('rightBoot',new THREE.BoxGeometry(.34,.2,.5),boot,.27,.1,.05);
  add('leftKnee',new THREE.BoxGeometry(.32,.2,.4),steel,-.27,.24,.02);
  add('rightKnee',new THREE.BoxGeometry(.32,.2,.4),steel,.27,.24,.02);
  add('torso',new THREE.BoxGeometry(1.08,1.02,.66),suit,0,1.55,0,[0,0,0],'body');
  add('abdomen',new THREE.BoxGeometry(.82,.34,.58),dark,0,1.02,0,[0,0,0],'body');
  add('chest',new THREE.BoxGeometry(.78,.38,.1),steel,0,1.72,.34,[0,0,0],'body');
  add('belt',new THREE.BoxGeometry(.94,.13,.68),dark,0,.94,0,[0,0,0],'body');
  add('leftShoulder',new THREE.BoxGeometry(.36,.26,.48),trim,-.64,1.97,0,[0,0,0],'body');
  add('rightShoulder',new THREE.BoxGeometry(.36,.26,.48),trim,.64,1.97,0,[0,0,0],'body');
  add('leftArm',new THREE.BoxGeometry(.28,.9,.36),suit,-.73,1.42,0,[0,0,0],'body');
  add('rightArm',new THREE.BoxGeometry(.28,.9,.36),suit,.73,1.42,0,[0,0,0],'body');
  add('leftGlove',new THREE.BoxGeometry(.3,.22,.32),boot,-.73,1.02,.02);
  add('rightGlove',new THREE.BoxGeometry(.3,.22,.32),boot,.73,1.02,.02);
  add('neck',new THREE.CylinderGeometry(.14,.16,.2,10),dark,0,2.11,0);
  add('head',new THREE.BoxGeometry(.72,.7,.68),skin,0,2.42,0,[0,0,0],'head');
  add('helmet',new THREE.BoxGeometry(.8,.2,.76),dark,0,2.76,0,[0,0,0],'head');
  add('visor',new THREE.BoxGeometry(.54,.13,.06),trim,0,2.44,.36,[0,0,0],'head');
  add('mask',new THREE.BoxGeometry(.34,.16,.05),steel,0,2.28,.35,[0,0,0],'head');
  add('backpack',new THREE.BoxGeometry(.56,.58,.2),dark,0,1.58,-.41);
  add('trimL',new THREE.BoxGeometry(.05,.55,.05),trim,-.5,1.55,.35);
  add('trimR',new THREE.BoxGeometry(.05,.55,.05),trim,.5,1.55,.35);
  group.userData.parts=parts;
  group.userData.skinMeshes=[parts.torso,parts.leftArm,parts.rightArm,parts.leftShoulder,parts.rightShoulder];
  return {group,parts};
}
function animateFighter(root,dt,speed=0,reload=0){
  const parts=root.userData.parts;if(!parts)return;
  const phase=(root.userData.walkPhase||0)+dt*Math.max(1,speed*1.9);
  root.userData.walkPhase=phase;
  const blend=Math.min(1,speed/6),swing=Math.sin(phase)*blend;
  const aim=reload?-.75:0;
  if(parts.leftLeg)parts.leftLeg.rotation.x=-swing*.7;
  if(parts.rightLeg)parts.rightLeg.rotation.x=swing*.7;
  if(parts.leftBoot)parts.leftBoot.rotation.x=-swing*.55;
  if(parts.rightBoot)parts.rightBoot.rotation.x=swing*.55;
  if(parts.leftKnee)parts.leftKnee.rotation.x=-swing*.55;
  if(parts.rightKnee)parts.rightKnee.rotation.x=swing*.55;
  if(parts.leftArm)parts.leftArm.rotation.x=swing*.55;
  if(parts.rightArm)parts.rightArm.rotation.x=-swing*.45+aim;
  if(parts.leftGlove)parts.leftGlove.rotation.x=swing*.55;
  if(parts.rightGlove)parts.rightGlove.rotation.x=-swing*.45+aim;
  if(parts.torso)parts.torso.rotation.z=swing*.035;
  if(parts.head)parts.head.rotation.y=Math.sin(phase*.4)*.06;
}
function makeBot(x,z,color,team){
  const fighter=buildFighter(color,color),root=fighter.group;
  root.position.set(x,0,z);scene.add(root);
  const gun=buildGunModel(0);gun.name='gun';
  gun.position.set(.62,1.3,.5);gun.rotation.y=-.06;root.add(gun);
  root.userData.gun=gun;root.userData.parts=fighter.parts;
  return {root,team,hp:100,alive:true,respawn:0,home:new THREE.Vector3(x,0,z),shoot:Math.random()*2,parts:fighter.parts,lastPos:root.position.clone()};
}
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
/* ---------------- SHOOTING RANGE (lobby weapon testing) ---------------- */
const rangeGroup=new THREE.Group();scene.add(rangeGroup);rangeGroup.visible=false;
const rangeSolid=[];
function rangeBox(x,y,z,px,py,pz,material){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(x,y,z),material);
  mesh.position.set(px,py,pz);mesh.castShadow=true;mesh.receiveShadow=true;rangeGroup.add(mesh);
  if(y>=.8)rangeSolid.push({x:px,z:pz,w:x,d:z,h:py+y/2});
  return mesh;
}
rangeBox(54,1,74,0,-.5,-5,mat(0x253451));
rangeBox(54,9,1,0,4.5,-42,mat(0x1a2745));
rangeBox(1,9,74,-27,4.5,-5,mat(0x1a2745));
rangeBox(1,9,74,27,4.5,-5,mat(0x1a2745));
rangeBox(54,9,1,0,4.5,32,mat(0x1a2745));
rangeBox(54,.3,.4,0,5,-41.4,mat(cyan,cyan));
rangeBox(14,1,8,0,.5,16,mat(0x2e4370));
rangeBox(14,.25,8,0,1.1,16,mat(purple,purple));
for(const x of [-18,-9,0,9,18])rangeBox(.6,2.2,26,x,1.1,-24,mat(0x2a3b60));
for(const x of [-13.5,13.5])rangeBox(.4,3.4,24,x,1.7,-10,mat(0x1e2e50));
for(const z of [-8,-18,-28])rangeBox(40,.15,.6,0,.15,z,mat(0x3d5b96));
const rangeLamp=new THREE.PointLight(0x8fd8ff,6,42);rangeLamp.position.set(0,8,-12);rangeGroup.add(rangeLamp);
const rangeHemi=new THREE.HemisphereLight(0xdfeaff,0x3d4f78,2.6);rangeGroup.add(rangeHemi);
const rangeSun=new THREE.DirectionalLight(0xffffff,3.2);rangeSun.position.set(-12,26,16);rangeSun.castShadow=true;rangeGroup.add(rangeSun);
const rangeTargets=[];
function makeRangeTarget(x,z){
  const group=new THREE.Group();group.position.set(x,0,z);rangeGroup.add(group);
  const stand=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,.95,8),mat(0x2c3958));stand.position.y=.48;stand.castShadow=true;group.add(stand);
  const torso=new THREE.Mesh(new THREE.BoxGeometry(1.12,1.35,.34),mat(0xb83951));torso.position.y=1.6;torso.castShadow=true;torso.userData.hitZone='body';group.add(torso);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.62,.58,.32),mat(0xe8eefc));head.position.y=2.57;head.castShadow=true;head.userData.hitZone='head';group.add(head);
  const trim=new THREE.Mesh(new THREE.BoxGeometry(1.2,.1,.38),mat(0xffd45c,0xffd45c));trim.position.y=2.24;group.add(trim);
  const bull=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.06,16),mat(0xffd45c,0xffd45c));bull.rotation.x=Math.PI/2;bull.position.set(0,1.6,.21);bull.userData.hitZone='body';group.add(bull);
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.08,14),mat(0x18243d));inner.rotation.x=Math.PI/2;inner.position.set(0,1.6,.23);inner.userData.hitZone='body';group.add(inner);
  const target={group,hp:80,maxHp:80,alive:true,respawn:0};
  rangeTargets.push(target);
  return target;
}
[[-9,-11],[0,-11],[9,-11],[-6,-21],[6,-21],[0,-31]].forEach(([x,z])=>makeRangeTarget(x,z));
const rangeStats={destroyed:0,hits:0};
function findRangeTargetByObject(object){
  let node=object;
  while(node){
    const target=rangeTargets.find(entry=>entry.group===node);
    if(target)return target;
    node=node.parent;
  }
  return null;
}
function damageRangeTarget(target,damage){
  if(!target||!target.alive)return false;
  target.hp-=damage;rangeStats.hits++;
  if(target.hp>0){
    target.group.rotation.z=(Math.random()-.5)*.09;
    return false;
  }
  target.alive=false;target.group.visible=false;target.respawn=2.4;target.group.rotation.z=0;
  rangeStats.destroyed++;recordStat('range');
  blueScoreEl.textContent=String(rangeStats.destroyed);
  return true;
}
function updateRangeTargets(dt){
  for(const target of rangeTargets){
    if(target.alive)continue;
    target.respawn-=dt;
    if(target.respawn<=0){
      target.alive=true;target.hp=target.maxHp;target.group.visible=true;target.group.rotation.z=0;
    }
  }
}
function enterRange(){
  duel.active=false;duel.over=false;single.active=false;
  cpu.active=false;cpu.mode='';
  gameMode='range';
  hideCountdown();
  document.querySelector('.hud').classList.remove('lobby');
  document.getElementById('start').style.display='none';
  lobbyGroup.visible=false;arenaMapGroup.visible=false;rangeGroup.visible=true;
  battlegroundParts.forEach(object=>object.visible=false);
  bots.forEach(bot=>{bot.root.visible=false;});
  scene.background.setHex(0x121e38);scene.fog.color.setHex(0x121e38);scene.fog.near=30;scene.fog.far=110;
  worldHemi.visible=worldAmbient.visible=sun.visible=false;
  activeSolidAreas=rangeSolid;worldBounds=25;
  player.pos.set(0,2.2,20);player.yaw=player.cameraYaw=0;player.pitch=0;
  player.vertical=0;player.vx=player.vz=0;player.grounded=true;player.hp=100;
  player.sliding=false;player.crouching=false;
  resetAmmo();player.grenades=3;
  rangeStats.destroyed=0;rangeStats.hits=0;
  clearDecals();
  rangeTargets.forEach(target=>{target.alive=true;target.hp=target.maxHp;target.respawn=0;target.group.visible=true;});
  forceWeapon(player.primaryChoice);
  healthBarEl.style.width='100%';hpTextEl.textContent=100;
  blueScoreEl.textContent='0';redScoreEl.textContent='0';
  const info=document.getElementById('roundInfo');
  if(info)info.innerHTML='SHOOTING RANGE<br><span style="color:#6cd9ff">TEST YOUR LOADOUT · 1-4 SWITCH</span>';
  document.body.classList.add('match-open');
  renderer.domElement.requestPointerLock();
  showMessage('SHOOTING RANGE');
  netSendState();
}
function exitRange(){
  if(gameMode!=='range')return;
  enterLobby();
}

/* ---------------- IMPACT DECALS + SPARKS ---------------- */
const decalMaterial=new THREE.MeshBasicMaterial({color:0x05080f});
const decals=[];
function spawnBulletDecal(hit){
  if(!hit||!hit.point||document.hidden)return;
  const normal=(hit.normal||(hit.face&&hit.face.normal)||new THREE.Vector3(0,0,1)).clone().normalize();
  const decal=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.014,8),decalMaterial);
  decal.userData.decal=true;
  decal.position.copy(hit.point).addScaledVector(normal,.008);
  decal.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
  scene.add(decal);decals.push(decal);
  while(decals.length>52){const old=decals.shift();scene.remove(old);}
}
function clearDecals(){
  while(decals.length){
    const decal=decals.shift();
    if(decal.parent)decal.parent.remove(decal);
  }
}
function spawnImpactSparks(hit,color=0xffd45c){
  if(!hit||!hit.point||document.hidden)return;
  const origin=hit.point.clone();
  const normal=(hit.normal||(hit.face&&hit.face.normal)||new THREE.Vector3(0,1,0)).clone().normalize();
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false});
  const particles=[];
  for(let i=0;i<4;i++){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.035,4,4),material);
    mesh.userData.effect=true;
    mesh.position.copy(origin);scene.add(mesh);
    particles.push({mesh,direction:normal.clone().multiplyScalar(.7).add(new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(1.6))});
  }
  const started=performance.now();
  const step=()=>{
    const elapsed=(performance.now()-started)/1000;
    const fade=Math.max(0,1-elapsed/.28);
    material.opacity=fade;
    for(const particle of particles){
      particle.mesh.position.addScaledVector(particle.direction,.045);
      particle.direction.y-=.09;
    }
    if(fade<=0){
      for(const particle of particles)scene.remove(particle.mesh);
      material.dispose();
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- CPU MODES state ---------------- */
const cpu={
  active:false,
  mode:'',
  score:{blue:0,red:0},
  kills:0,
  deaths:0,
  wave:0,
  waveTimer:0,
  gunLevel:0,
  over:false,
  reportTimer:0
};
function isCpuMode(){return cpu.active||gameMode==='tdm'||gameMode==='survival'||gameMode==='gungame';}
function matchFrozen(){
  if(single.active&&single.countdown>0)return true;
  if(isCpuMode()){
    if(cpu.over||cpu.playerDown)return true;
    if(cpu.mode==='survival'&&cpu.waveTimer>0)return true;
  }
  return false;
}

function startGame(mode){
  if(mode==='tdm'||mode==='survival'||mode==='gungame'){startCpuMode(mode);return;}
  if(mode==='range'){enterRange();return;}
  // Arena and Battleground are now PVP duel maps only; there is no free-for-all
  // mode with several enemies. Anything else falls back to the lobby.
  if((mode==='arena'||mode==='battleground')&&!duel.active){enterLobby();return;}
  gameMode=mode;
  cpu.active=false;cpu.over=false;cpu.mode='';cpu.playerDown=false;
  if(mode==='single'){single.round=1;single.wins=0;single.losses=0;single.botIndex=0;}
  else{single.countdown=0;single.goFlash=0;hideCountdown();}
  const arenaLike=mode==='arena'||mode==='single';
  document.querySelector('.hud').classList.remove('lobby');
  sanitizeLoadout();
  resetAmmo();player.grenades=3;
  forceWeapon(player.primaryChoice);
  activeSolidAreas=arenaLike?arenaSolidAreas:solidAreas;
  worldBounds=arenaLike?40.4:35.4;
  player.pos.set(0,2.2,mode==='arena'||mode==='single'?25:27);
  player.vx=player.vz=0;player.vertical=0;player.grounded=true;player.hp=100;
  if(duel.active){
    player.pos.set(0,2.2,duelSpawnZ());
    player.yaw=player.cameraYaw=player.pos.z>0?0:Math.PI;
  }
  const sky=arenaLike?0xb7bcc2:0x7c8fb5;
  scene.background.setHex(sky);scene.fog.color.setHex(sky);
  worldHemi.visible=worldAmbient.visible=sun.visible=!arenaLike;
  if(!arenaLike){worldHemi.intensity=4.6;worldAmbient.intensity=1.4;sun.intensity=6.2;scene.fog.near=40;scene.fog.far=190;}
  else{scene.fog.near=55;scene.fog.far=140;}
  battlegroundParts.forEach(object=>object.visible=!arenaLike);
  arenaMapGroup.visible=arenaLike;
  lobbyGroup.visible=false;
  rangeGroup.visible=false;
  bots.forEach(b=>{b.root.visible=false;});
  if(mode==='single'){startSingleRound();showMessage('SINGLE PLAYER · ROUND 1');}
  else if(duel.active){forceWeapon(duel.weapons[0]);showMessage('PVP · '+(mode==='battleground'?'BATTLEGROUND':'ARENA'));}
  document.getElementById('start').style.display='none';
  if(mode==='single')document.body.classList.add('match-open');
  renderer.domElement.requestPointerLock();
  netSendHello();netSendState();
}
function countdownElement(){
  let element=document.getElementById('countdown');
  if(!element){
    // Older cached HTML may not contain the overlay yet, so create it here too.
    element=document.createElement('div');
    element.id='countdown';
    element.setAttribute('aria-hidden','true');
    document.body.appendChild(element);
  }
  element.style.position='fixed';
  element.style.inset='0';
  element.style.display='none';
  element.style.alignItems='center';
  element.style.justifyContent='center';
  element.style.pointerEvents='none';
  element.style.zIndex='70';
  element.style.background='radial-gradient(circle at 50% 50%, rgba(4,8,20,.52), rgba(4,8,20,.16) 46%, rgba(4,8,20,0) 70%)';
  return element;
}
function showCountdown(text,go=false){
  const element=countdownElement();
  element.style.display='flex';
  element.innerHTML='<div class="count-inner"><small>ROUND '+(single.round||1)+' / 5</small><span'+(go?' class="go"':'')+'>'+text+'</span></div>';
  const span=element.querySelector('span');
  if(span){
    span.style.fontSize=go?'clamp(64px,12vw,132px)':'clamp(96px,18vw,200px)';
    span.style.fontWeight='900';
    span.style.lineHeight='1';
    span.style.display='block';
    span.style.color=go?'#7dffb5':'#fff';
    span.style.webkitTextStroke='2px rgba(4,9,20,.92)';
    span.style.textShadow='0 0 18px rgba(6,16,31,.95),0 0 38px rgba(54,217,255,.95),0 10px 46px rgba(0,0,0,.8)';
  }
  const small=element.querySelector('small');
  if(small){
    small.style.display='block';
    small.style.marginBottom='8px';
    small.style.fontSize='13px';
    small.style.fontWeight='800';
    small.style.letterSpacing='.3em';
    small.style.color='#cdeaff';
    small.style.textShadow='0 2px 10px rgba(0,0,0,.9)';
  }
}
function hideCountdown(){
  const element=document.getElementById('countdown');
  if(element){element.classList.remove('show');element.style.display='none';element.innerHTML='';}
}
function startSingleRound(){
  single.active=true;single.roundOver=false;
  bots.forEach((bot,index)=>{
    bot.root.visible=index===single.botIndex;
    bot.alive=index===single.botIndex;
    bot.hp=100;
    bot.root.position.copy(bot.home);
    bot.root.scale.set(1,1,1);
    bot.aiPath=[];bot.aiGoal=null;bot.aiGoalTimer=0;bot.aiShotCooldown=0;
    bot.aiLosTimer=0;bot.aiLos=false;bot.aiReload=0;bot.aiSeekTimer=0;
    bot.aiSprint=0;bot.aiCrouchTimer=0;bot.aiSlideTime=0;bot.aiSlideCooldown=0;bot.aiSlideDir=null;bot.root.rotation.x=0;
    bot.aiAmmo=single.difficulty==='hard'?8:6;
  });
  const bot=bots[single.botIndex];
  if(bot){
    bot.root.position.set(0,0,-18);
    bot.home.set(0,0,-18);
    bot.root.rotation.set(0,0,0);
    bot.root.visible=true;bot.alive=true;bot.hp=100;
    faceBotTowardPlayer(bot);
  }
  // Both sides restart from the same round-one spawn points with a full kit.
  player.hp=100;
  player.pos.set(0,2.2,18);
  player.yaw=player.cameraYaw=0;
  player.pitch=0;
  player.vertical=0;player.grounded=true;player.doubleJumpUsed=false;
  player.sliding=false;player.crouching=false;player.slideTime=0;
  player.reloading=false;player.aimHold=false;player.aimKey=false;
  player.quickMeleeTimer=0;player.prevSlot=null;player.scytheCooldown=0;
  resetAmmo();
  player.grenades=3;
  forceWeapon(player.primaryChoice);
  updateAmmoHud();
  blueScoreEl.textContent=single.wins;
  redScoreEl.textContent=single.losses;
  healthBarEl.style.width='100%';hpTextEl.textContent=100;
  // 3-2-1 before each round; both fighters stay frozen until GO.
  single.countdown=3.05;single.countdownShown=0;single.goFlash=0;
  showCountdown('3');
  const info=document.getElementById('roundInfo');
  if(info)info.innerHTML='SINGLE PLAYER<br> <span style="color:#ffd45c">ROUND '+single.round+' / 5 · '+single.wins+' WON · '+single.difficulty.toUpperCase()+'</span>';
}
function showSingleReport(){
  single.active=false;single.countdown=0;single.goFlash=0;gameMode='lobby';
  hideCountdown();
  bots.forEach(bot=>{bot.root.visible=false;});
  const report=document.getElementById('singleReport');
  if(report){report.querySelector('h2').textContent=single.wins>=3?'MISSION COMPLETE':'MISSION FAILED';report.querySelector('p').textContent='Rounds won: '+single.wins+' / 5 · Difficulty: '+single.difficulty.toUpperCase();report.classList.add('open');}
}
function endSingleRound(won){
  if(!single.active||single.roundOver)return;
  single.roundOver=true;
  if(won){single.wins++;recordStat('rounds');}else{single.losses++;recordStat('deaths');}
  // Top scoreboard: blue = rounds you won, red = rounds the opponent won.
  blueScoreEl.textContent=single.wins;
  redScoreEl.textContent=single.losses;
  showMessage(won?'ROUND WON':'ROUND LOST');
  setTimeout(()=>advanceSingleRound(),1300);
}
function advanceSingleRound(){
  if(!single.active)return;
  single.round++;
  if(single.round>5){showSingleReport();return;}
  single.botIndex=(single.botIndex+1)%bots.length;
  startSingleRound();
  showMessage('ROUND '+single.round);
}

/* ================================================================== */
/* CPU MODES: Team Deathmatch, Survival and Gun Game                   */
/* ================================================================== */
const CPU_TDM_TARGET=20;
const CPU_GUN_TARGET=8;
const GUN_GAME_GUNS=[0,10,8,5,9,13];
const CPU_BLUE_SPAWNS=[[-11,0,19],[0,0,24],[11,0,19]];
const CPU_RED_SPAWNS=[[-11,0,-19],[0,0,-24],[11,0,-19]];
const CPU_SURVIVAL_SPAWNS=[[-15,0,-20],[15,0,-20],[-8,0,-28],[8,0,-28],[0,0,-33],[-22,0,-10]];
const CPU_RED_BOTS=[3,4,5];
function resetCpuBot(bot){
  bot.root.visible=false;bot.alive=false;bot.hp=100;bot.respawn=0;
  bot.root.scale.set(1,1,1);bot.root.position.copy(bot.home);bot.root.rotation.set(0,0,0);
  bot.aiPath=[];bot.aiGoal=null;bot.aiGoalTimer=0;bot.aiShotCooldown=0;bot.aiLosTimer=0;bot.aiLos=false;
  bot.aiReload=0;bot.aiSeekTimer=0;bot.aiSprint=0;bot.aiCrouchTimer=0;bot.aiSlideTime=0;bot.aiSlideCooldown=0;bot.aiSlideDir=null;bot.aiAmmo=8;bot.cpuPath=[];bot.cpuPathTimer=0;
}
function spawnCpuBot(bot,position,team,hp=100){
  bot.team=team;
  bot.home.set(position[0],0,position[2]);
  bot.root.position.copy(bot.home);
  bot.root.rotation.set(0,0,0);
  bot.root.scale.set(1,1,1);
  bot.root.visible=true;bot.alive=true;bot.hp=hp;bot.maxHp=hp;bot.respawn=0;
  bot.aiPath=[];bot.aiGoal=null;bot.aiGoalTimer=0;bot.aiShotCooldown=.4+Math.random()*1.1;bot.aiLosTimer=0;bot.aiLos=false;
  bot.aiReload=0;bot.aiSeekTimer=0;bot.aiAmmo=8;bot.aiCrouchTimer=0;bot.aiSlideTime=0;bot.aiSlideCooldown=0;bot.cpuPath=[];bot.cpuPathTimer=0;
}
function cpuHud(){
  blueScoreEl.textContent=cpu.score.blue;
  redScoreEl.textContent=cpu.score.red;
  const info=document.getElementById('roundInfo');
  if(!info)return;
  if(cpu.mode==='tdm')info.innerHTML='TEAM DEATHMATCH<br><span style="color:#6cd9ff">FIRST TO '+CPU_TDM_TARGET+' · YOU + 2 ALLIES</span>';
  else if(cpu.mode==='survival')info.innerHTML='SURVIVAL<br><span style="color:#ffd45c">WAVE '+Math.max(1,cpu.wave)+' · '+cpu.kills+' ELIMS</span>';
  else if(cpu.mode==='gungame')info.innerHTML='GUN GAME<br><span style="color:#4bf0a8">GUN '+(cpu.gunLevel+1)+' / '+GUN_GAME_GUNS.length+' · '+cpu.kills+' KILLS</span>';
}
function startCpuMode(mode){
  duel.active=false;duel.over=false;duel.opponent=null;
  single.active=false;single.countdown=0;single.goFlash=0;
  hideCountdown();
  gameMode=mode;
  cpu.active=true;cpu.mode=mode;cpu.over=false;cpu.playerDown=false;cpu.respawn=0;cpu.invuln=0;
  cpu.score.blue=0;cpu.score.red=0;cpu.kills=0;cpu.deaths=0;cpu.wave=0;cpu.waveTimer=0;cpu.gunLevel=0;cpu.reportTimer=0;cpu.result=false;
  document.body.classList.add('match-open');
  document.querySelector('.hud').classList.remove('lobby');
  document.getElementById('start').style.display='none';
  sanitizeLoadout();
  resetAmmo();player.grenades=3;
  activeSolidAreas=arenaSolidAreas;worldBounds=40.4;
  arenaMapGroup.visible=true;lobbyGroup.visible=false;rangeGroup.visible=false;
  battlegroundParts.forEach(object=>object.visible=false);
  const sky=0xb7bcc2;
  scene.background.setHex(sky);scene.fog.color.setHex(sky);scene.fog.near=55;scene.fog.far=140;
  worldHemi.visible=worldAmbient.visible=sun.visible=false;
  player.pos.set(0,2.2,24);player.yaw=player.cameraYaw=0;player.pitch=0;
  player.vertical=0;player.vx=player.vz=0;player.grounded=true;player.hp=100;
  player.sliding=false;player.crouching=false;player.reloading=false;player.aimHold=false;player.aimKey=false;
  healthBarEl.style.width='100%';hpTextEl.textContent=100;
  bots.forEach(resetCpuBot);
  if(mode==='tdm'){
    [0,1,2].forEach((index,slot)=>spawnCpuBot(bots[index],CPU_BLUE_SPAWNS[slot],'blue'));
    CPU_RED_BOTS.forEach((index,slot)=>spawnCpuBot(bots[index],CPU_RED_SPAWNS[slot],'red'));
    forceWeapon(player.primaryChoice);
    showMessage('TEAM DEATHMATCH · FIRST TO '+CPU_TDM_TARGET);
  }else if(mode==='survival'){
    forceWeapon(player.primaryChoice);
    cpu.waveTimer=3;
    showMessage('SURVIVAL · GET READY');
  }else{
    cpu.gunLevel=0;cpu.score.blue=0;
    CPU_RED_BOTS.forEach((index,slot)=>spawnCpuBot(bots[index],CPU_RED_SPAWNS[slot],'red'));
    forceWeapon(GUN_GAME_GUNS[0]);
    showMessage('GUN GAME · '+GUN_GAME_GUNS.length+' KILLS TO WIN');
  }
  cpuHud();
  renderer.domElement.requestPointerLock();
  netSendState();
}
function startSurvivalWave(){
  cpu.wave++;
  const count=Math.min(CPU_RED_BOTS.length,cpu.wave);
  CPU_RED_BOTS.forEach((index,slot)=>{
    if(slot<count)spawnCpuBot(bots[index],CPU_SURVIVAL_SPAWNS[slot],'red',80+cpu.wave*20);
    else resetCpuBot(bots[index]);
  });
  cpu.waveTimer=0;
  cpuHud();
  showMessage('WAVE '+cpu.wave);
  playSound('unlock');
}
function respawnCpuPlayer(){
  cpu.playerDown=false;cpu.respawn=0;cpu.invuln=1.4;
  player.hp=100;player.pos.set(0,2.2,24);
  player.yaw=player.cameraYaw=0;player.pitch=0;
  player.vertical=0;player.vx=player.vz=0;player.grounded=true;
  player.sliding=false;player.crouching=false;player.reloading=false;
  resetAmmo();player.grenades=3;
  forceWeapon(cpu.mode==='gungame'?GUN_GAME_GUNS[Math.min(cpu.gunLevel,GUN_GAME_GUNS.length-1)]:player.primaryChoice);
  healthBarEl.style.width='100%';hpTextEl.textContent=100;
  showMessage('RESPAWNED');
  playSound('jump');
}
function cpuHurtPlayer(damage){
  if(cpu.invuln>0||cpu.playerDown||cpu.over)return;
  player.hp=Math.max(0,player.hp-damage);
  healthBarEl.style.width=player.hp+'%';
  hpTextEl.textContent=player.hp;
  playSound('hurt');
  if(player.hp<=0)cpuPlayerDeath();
}
function cpuPlayerDeath(){
  if(cpu.playerDown||cpu.over)return;
  cpu.playerDown=true;cpu.deaths++;cpu.respawn=2.6;
  recordStat('deaths');
  showMessage('YOU WERE ELIMINATED');
  playSound('kill');
  if(cpu.mode==='tdm'){
    cpu.score.red++;cpuHud();
    if(cpu.score.red>=CPU_TDM_TARGET)endCpuMatch(false);
  }else if(cpu.mode==='gungame'){
    cpu.score.red++;cpuHud();
    if(cpu.score.red>=CPU_GUN_TARGET)endCpuMatch(false);
  }else if(cpu.mode==='survival'){
    endCpuMatch(false);
  }
}
function cpuOnKill(bot){
  cpu.kills++;
  if(cpu.mode==='tdm'){
    cpu.score.blue++;cpuHud();
    if(cpu.score.blue>=CPU_TDM_TARGET){endCpuMatch(true);return;}
  }else if(cpu.mode==='gungame'){
    cpu.gunLevel++;
    if(cpu.gunLevel>=GUN_GAME_GUNS.length){endCpuMatch(true);return;}
    cpu.score.blue=cpu.gunLevel;cpuHud();
    forceWeapon(GUN_GAME_GUNS[cpu.gunLevel]);
    showMessage('UPGRADE · '+weaponDef(GUN_GAME_GUNS[cpu.gunLevel]).name);
    playSound('unlock');
  }else if(cpu.mode==='survival'){
    cpuHud();
  }
}
function cpuOnBotKilled(victim,killer){
  if(cpu.mode==='tdm'){
    if(killer.team==='blue')cpu.score.blue++;else cpu.score.red++;
    cpuHud();
    if(cpu.score.blue>=CPU_TDM_TARGET)endCpuMatch(true);
    else if(cpu.score.red>=CPU_TDM_TARGET)endCpuMatch(false);
  }else if(cpu.mode==='gungame'&&killer.team==='red'){
    cpu.score.red++;cpuHud();
    if(cpu.score.red>=CPU_GUN_TARGET)endCpuMatch(false);
  }
}
function endCpuMatch(won){
  if(cpu.over)return;
  cpu.over=true;cpu.result=!!won;cpu.reportTimer=1.5;
  recordStat(won?'wins':'losses');
  showMessage(won?'MATCH WON':'MATCH LOST');
  playSound(won?'unlock':'kill');
}
function showCpuReport(){
  const won=cpu.result,mode=cpu.mode;
  cpu.active=false;cpu.over=false;gameMode='lobby';
  bots.forEach(bot=>{bot.root.visible=false;});
  hideCountdown();
  document.body.classList.remove('match-open');
  const report=document.getElementById('singleReport');
  if(report){
    report.querySelector('h2').textContent=won?'MATCH WON':'MATCH LOST';
    let detail='';
    if(mode==='tdm')detail='Team score '+cpu.score.blue+' — '+cpu.score.red+' · '+cpu.kills+' eliminations';
    else if(mode==='survival')detail='Reached wave '+Math.max(1,cpu.wave)+' · '+cpu.kills+' eliminations';
    else detail=''+cpu.kills+' kills · reached gun '+Math.min(cpu.gunLevel+1,GUN_GAME_GUNS.length)+' of '+GUN_GAME_GUNS.length;
    report.querySelector('p').textContent=detail;
    report.classList.add('open');
  }
  if(document.pointerLockElement)document.exitPointerLock();
  netSendState();
}
function updateCpuBots(dt){
  if(cpu.over)return;
  cpu.invuln=Math.max(0,cpu.invuln-dt);
  if(cpu.mode==='survival'&&cpu.waveTimer>0){
    cpu.waveTimer-=dt;
    if(cpu.waveTimer<=0)startSurvivalWave();
  }
  if(cpu.playerDown){
    cpu.respawn-=dt;
    if(cpu.respawn<=0)respawnCpuPlayer();
  }
  for(const bot of bots){
    if(!bot.alive){
      if(cpu.mode!=='survival'&&bot.respawn>0){
        bot.respawn-=dt;
        if(bot.respawn<=0){
          const spawn=(bot.team==='blue'?CPU_BLUE_SPAWNS:CPU_RED_SPAWNS)[Math.floor(Math.random()*3)];
          spawnCpuBot(bot,spawn,bot.team);
        }
      }
      continue;
    }
    if(!bot.root.visible)continue;
    if(cpu.mode==='survival'&&cpu.waveTimer>0)continue;
    updateCpuBot(bot,dt);
  }
  if(cpu.mode==='survival'&&cpu.wave>0&&cpu.waveTimer<=0&&!bots.some(bot=>bot.team==='red'&&bot.alive)){
    cpu.waveTimer=3;
    player.hp=Math.min(100,player.hp+25);
    healthBarEl.style.width=player.hp+'%';hpTextEl.textContent=player.hp;
    showMessage('WAVE CLEARED · +25 HP');
    playSound('unlock');
  }
}
function updateCpuBot(bot,dt){
  bot.aiShotCooldown=(bot.aiShotCooldown||0)-dt;
  bot.aiLosTimer=(bot.aiLosTimer||0)-dt;
  let targetPos=null,targetBot=null,targetPlayer=false;
  if(bot.team==='blue'){
    let best=Infinity;
    for(const other of bots){
      if(!other.alive||other.team===bot.team)continue;
      const distance=other.root.position.distanceToSquared(bot.root.position);
      if(distance<best){best=distance;targetBot=other;}
    }
    if(targetBot){targetPos=targetBot.root.position.clone();targetPos.y=1.6;}
    else if(!cpu.playerDown&&player.hp>0){targetPos=player.pos.clone();targetPos.y=1.6;targetPlayer=true;}
  }else{
    if(!cpu.playerDown&&player.hp>0){targetPos=player.pos.clone();targetPos.y=1.6;targetPlayer=true;}
    else{
      let best=Infinity;
      for(const other of bots){
        if(!other.alive||other.team===bot.team)continue;
        const distance=other.root.position.distanceToSquared(bot.root.position);
        if(distance<best){best=distance;targetBot=other;}
      }
      if(targetBot){targetPos=targetBot.root.position.clone();targetPos.y=1.6;}
    }
  }
  if(!targetPos){
    bot.root.rotation.y+=(bot.strafe||1)*dt*.4;
    return;
  }
  const toTarget=targetPos.clone().sub(bot.root.position);toTarget.y=0;
  const gap=toTarget.length();
  const forward=gap>.001?toTarget.clone().normalize():new THREE.Vector3(0,0,1);
  const side=new THREE.Vector3(-forward.z,0,forward.x).multiplyScalar(bot.strafe||1);
  bot.cpuPathTimer=(bot.cpuPathTimer||0)-dt;
  if(!bot.aiLos&&bot.cpuPathTimer<=0){
    bot.cpuPath=findBotPath(bot.root.position,targetPos);
    bot.cpuPathTimer=1.1+Math.random()*.7;
  }
  if(bot.aiLos)bot.cpuPath=[];
  let desired;
  if(!bot.aiLos&&bot.cpuPath&&bot.cpuPath.length){
    const waypoint=bot.cpuPath[0];
    const toWay=waypoint.clone().sub(bot.root.position);toWay.y=0;
    if(toWay.length()<1.6){bot.cpuPath.shift();desired=forward;}
    else desired=toWay.normalize();
  }else{
    desired=gap>12?forward:side.addScaledVector(forward,gap>7?.2:-.25);
  }
  if(desired.lengthSq()>.0001)desired.normalize();
  const speed=(gap>15?4.9:3.5)*(cpu.mode==='survival'?1+Math.min(.45,cpu.wave*.05):1);
  const step=speed*dt;
  const probe=bot.root.position.clone();probe.y=2.2;
  const tryMove=(x,z)=>{
    probe.x=x;probe.z=z;
    if(blocked(probe))return false;
    bot.root.position.x=x;bot.root.position.z=z;
    return true;
  };
  if(!tryMove(bot.root.position.x+desired.x*step,bot.root.position.z+desired.z*step)){
    if(!tryMove(bot.root.position.x-side.x*step,bot.root.position.z-side.z*step))bot.cpuPathTimer=0;
  }
  bot.root.position.x=Math.max(-37,Math.min(37,bot.root.position.x));
  bot.root.position.z=Math.max(-37,Math.min(37,bot.root.position.z));
  bot.root.rotation.set(0,Math.atan2(targetPos.x-bot.root.position.x,targetPos.z-bot.root.position.z),0);
  animateFighter(bot.root,dt,speed,0);
  if(bot.aiLosTimer<=0){bot.aiLosTimer=.18;bot.aiLos=botHasLineOfSight(bot,targetPos);}
  if(!bot.aiLos||gap>36||bot.aiShotCooldown>0)return;
  const hard=single.difficulty==='hard';
  bot.aiShotCooldown=(hard?.55:.9)+Math.random()*(hard?.4:.8);
  const accuracy=targetPlayer?(hard?.6:.38):(hard?.5:.34);
  const hit=Math.random()<Math.max(.12,accuracy-Math.min(.22,gap*.007));
  const aim=targetPos.clone();
  if(!hit){
    aim.x+=(Math.random()*2-1)*2.6;
    aim.z+=(Math.random()*2-1)*2.6;
    aim.y+=(Math.random()*2-1)*1.1;
  }
  spawnBulletTracer(botMuzzlePosition(bot),aim,TRACER_ENEMY,.03);
  if(!hit)return;
  if(targetPlayer)cpuHurtPlayer(cpu.mode==='survival'?6+Math.min(8,cpu.wave):(hard?9:6));
  else if(targetBot)damageBot(targetBot,14+Math.random()*6,bot);
}


function botGridPoint(x,z){return {x:Math.max(-27,Math.min(27,Math.round(x/3)*3)),z:Math.max(-27,Math.min(27,Math.round(z/3)*3))};}
function botGridWalkable(x,z){const probe=new THREE.Vector3(x,2.2,z);return !blocked(probe);}
function findBotPath(from,to){
  const start=botGridPoint(from.x,from.z),goal=botGridPoint(to.x,to.z),key=(x,z)=>x+','+z;
  const open=[{x:start.x,z:start.z,g:0,f:0}],came=new Map(),cost=new Map([[key(start.x,start.z),0]]),dirs=[[3,0],[-3,0],[0,3],[0,-3]];
  let loops=0;
  while(open.length&&loops++<500){
    open.sort((a,b)=>a.f-b.f);const current=open.shift();
    if(current.x===goal.x&&current.z===goal.z){const path=[];let node=current,k=key(node.x,node.z);while(k!==key(start.x,start.z)){path.unshift(new THREE.Vector3(node.x,0,node.z));node=came.get(k);k=key(node.x,node.z);}return path;}
    for(const [dx,dz] of dirs){const x=current.x+dx,z=current.z+dz;if(!botGridWalkable(x,z))continue;const nk=key(x,z),ng=current.g+1;if(!cost.has(nk)||ng<cost.get(nk)){cost.set(nk,ng);came.set(nk,current);open.push({x,z,g:ng,f:ng+Math.abs(goal.x-x)+Math.abs(goal.z-z)});}}
  }
  return [];
}

function faceBotTowardPlayer(bot){
  // Rotate only around the vertical axis. Object3D.lookAt() also pitches the
  // whole bot toward the player's height, which made enemies appear to lie
  // down when they were close or far away.
  const dx=player.pos.x-bot.root.position.x;
  const dz=player.pos.z-bot.root.position.z;
  bot.root.rotation.set(0,Math.atan2(dx,dz),0);
}
function updateSingleBot(bot,dt){
  if(!single.active||single.roundOver||single.countdown>0)return;
  if(!bot.aiGoal||bot.aiGoalTimer<=0){
    const cover=[[-18,-12],[18,-12],[-18,12],[18,12],[-8,-7],[8,7],[0,-20],[0,20]];
    const point=Math.random()<(single.difficulty==='hard'?.3:.45)?cover[Math.floor(Math.random()*cover.length)]:[
      player.pos.x+(Math.random()*2-1)*10,player.pos.z+(Math.random()*2-1)*10
    ];
    bot.aiGoal=new THREE.Vector3(point[0],0,point[1]);
    bot.aiGoalTimer=1.2+Math.random()*2.3;
    bot.aiPath=findBotPath(bot.root.position,bot.aiGoal);
  }
  bot.aiGoalTimer-=dt;
  if(!bot.aiPath?.length)bot.aiPath=findBotPath(bot.root.position,bot.aiGoal);
  const waypoint=bot.aiPath?.[0]||bot.aiGoal;
  const toGoal=waypoint.clone().sub(bot.root.position);toGoal.y=0;
  const hard=single.difficulty==='hard';
  const toPlayer=player.pos.clone().sub(bot.root.position);toPlayer.y=0;
  const gap=toPlayer.length();
  const canMove=(x,z)=>{const probe=bot.root.position.clone();probe.y=2.2;probe.x=x;probe.z=z;return !blocked(probe);};
  const stepToward=(direction,speed,time)=>{const step=speed*time,hx=bot.root.position.x+direction.x*step,hz=bot.root.position.z+direction.z*step;
    if(canMove(hx,hz)){bot.root.position.x=hx;bot.root.position.z=hz;return true;}
    if(canMove(bot.root.position.x-direction.z*step,bot.root.position.z+direction.x*step)){bot.root.position.x-=direction.z*step;bot.root.position.z+=direction.x*step;return true;}
    return false;};
  // The opponent sprints at you in bursts and slides to close the gap or dodge
  // your aim. Hard bots sprint and slide more often, and their slides last longer.
  bot.aiSprint=(bot.aiSprint||0)-dt;
  if(bot.aiSprint<=0)bot.aiSprint=(hard?1.1:1.8)+Math.random()*(hard?1.8:2.4);
  bot.aiSlideTime=Math.max(0,(bot.aiSlideTime||0)-dt);
  bot.aiSlideCooldown=Math.max(0,(bot.aiSlideCooldown||0)-dt);
  const sprinting=bot.aiSprint<(hard?1.05:.85);
  if(bot.aiSlideTime<=0&&bot.aiSlideCooldown<=0&&sprinting&&gap>4&&Math.random()<dt*(hard?1.8:.9)){
    bot.aiSlideTime=hard?.78:.6;
    bot.aiSlideCooldown=(hard?1.8:3)+Math.random()*(hard?1.4:2);
    if(Math.random()<.6&&gap>6)bot.aiSlideDir=toPlayer.clone().normalize();
    else{
      const side=new THREE.Vector3(-toPlayer.z,0,toPlayer.x).normalize();
      if(Math.random()<.5)side.negate();
      bot.aiSlideDir=side;
    }
    bot.aiCrouchTimer=0;
  }
  const sliding=bot.aiSlideTime>0&&bot.aiSlideDir;
  const baseSpeed=hard?3.6:2.5;
  if(sliding){
    if(!stepToward(bot.aiSlideDir,baseSpeed*(sprinting?1.55:1)*2.2,dt)){bot.aiSlideTime=0;bot.aiSlideDir=null;bot.aiGoalTimer=0;bot.aiPath=[];}
  }else if(toGoal.length()<1.2)bot.aiGoalTimer=0;
  else{
    const direction=toGoal.normalize();if(toGoal.length()<1.8&&bot.aiPath?.length)bot.aiPath.shift();
    if(!stepToward(direction,baseSpeed*(sprinting?1.55:1),dt)){bot.aiGoalTimer=0;bot.aiPath=[];}
  }
  bot.aiCrouchTimer=(bot.aiCrouchTimer||0)-dt;if(bot.aiCrouchTimer<=0&&Math.random()<dt*.08)bot.aiCrouchTimer=.7+Math.random()*.8;bot.root.scale.y=sliding?.5:(bot.aiCrouchTimer>0?.72:1);
  bot.root.position.x=Math.max(-27,Math.min(27,bot.root.position.x));bot.root.position.z=Math.max(-27,Math.min(27,bot.root.position.z));faceBotTowardPlayer(bot);
  animateFighter(bot.root,dt,sliding?2:baseSpeed*(sprinting?1.25:1),bot.aiReload>0?1:0);
  bot.root.rotation.x=sliding?.2:0;
  bot.aiReload=(bot.aiReload||0)-dt;
  if(bot.aiReload>0)return;
  bot.aiAmmo=bot.aiAmmo??(single.difficulty==='hard'?8:6);
  if(bot.aiAmmo<=0){bot.aiReload=single.difficulty==='hard'?1.15:1.8;bot.aiAmmo=single.difficulty==='hard'?8:6;return;}
  bot.aiShotCooldown=(bot.aiShotCooldown||0)-dt;
  bot.aiLosTimer=(bot.aiLosTimer||0)-dt;
  if(bot.aiLosTimer<=0){bot.aiLosTimer=.15;bot.aiLos=bot.root.visible&&botHasLineOfSight(bot,player.pos);}
  const canShoot=bot.root.visible&&bot.aiLos;
  if(canShoot&&bot.root.position.distanceTo(player.pos)<34&&bot.aiShotCooldown<=0){
    bot.aiShotCooldown=single.difficulty==='hard'?.55+Math.random()*.35:1.25+Math.random()*1.1;
    const hit=Math.random()<(single.difficulty==='hard'?.88:.5);
    if(bot.root.visible){
      const to=player.pos.clone();
      if(!hit){
        to.x+=(Math.random()*2-1)*2.4;
        to.z+=(Math.random()*2-1)*2.4;
        to.y+=(Math.random()*2-1)*1.2;
      }
      spawnBulletTracer(botMuzzlePosition(bot),to,TRACER_ENEMY,.03);
    }
    if(hit){
      const damage=single.difficulty==='hard'?8:5;player.hp=Math.max(0,player.hp-damage);healthBarEl.style.width=player.hp+'%';hpTextEl.textContent=player.hp;playSound('hurt');
      bot.aiAmmo--;
      if(!player.hp){endSingleRound(false);}
    }
  }else if(!canShoot){
    // No firing lane: move to a new angle instead of shooting through cover.
    bot.aiSeekTimer=(bot.aiSeekTimer||0)-dt;
    if(bot.aiSeekTimer<=0){bot.aiSeekTimer=.9;bot.aiGoalTimer=0;bot.aiPath=[];}
  }
}
function damageBot(b,damage,source=null){
  b.hp-=damage;
  if(b.hp>0)return false;
  b.alive=false;b.root.visible=false;
  if(gameMode==='single'&&single.active){
    if(single.roundOver)return false;
    recordStat('kills');
    endSingleRound(true);
    return true;
  }
  if(isCpuMode()){
    if(cpu.mode!=='survival')b.respawn=3;
    if(source&&source!=='player')cpuOnBotKilled(b,source);
    else{recordStat('kills');cpuOnKill(b);}
    return true;
  }
  return true;
}
function isViewmodelObject(object){
  let current=object;
  while(current){if(current===weaponView||current===camera)return true;current=current.parent;}
  return false;
}
function isVisibleWorldObject(object){
  let current=object;
  while(current&&current!==scene){
    if(current.visible===false)return false;
    current=current.parent;
  }
  return true;
}
function firstShotHit(){
  const ray=new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0,0),camera);
  const hits=ray.intersectObjects(scene.children,true);
  for(const hit of hits){
    if(isViewmodelObject(hit.object))continue;
    if(hit.object.userData.decal||hit.object.userData.effect)continue;
    // Raycaster can still return meshes inside hidden groups. Ignore those
    // or hidden lobby/map geometry can act like invisible bullet walls.
    if(!isVisibleWorldObject(hit.object))continue;
    const bot=findBotByObject(hit.object);
    if(bot&&bot.alive)return {hit,bot,remote:null};
    const remote=findRemoteByObject(hit.object);
    if(remote&&remote.group.visible)return {hit,bot:null,remote};
    const rangeTarget=findRangeTargetByObject(hit.object);
    if(rangeTarget&&rangeTarget.alive)return {hit,bot:null,remote:null,rangeTarget};
    // Name tags and other transparent overlays should not stop a shot.
    if(hit.object.material?.transparent)continue;
    return {hit,bot:null,remote:null,wall:true};
  }
  return null;
}
function hitBot(){
  const result=firstShotHit();
  if(!result)return;
  const def=weaponDef(player.slot);
  if(result.wall){
    spawnBulletDecal(result.hit);
    spawnImpactSparks(result.hit,0xffd45c);
    playSound('impact');
    showMessage((def.base===2||def.base===4)?'MELEE HIT WALL':'WALL HIT');
    return;
  }
  if(result.rangeTarget){
    const h=result.hit,headshot=h.object.userData.hitZone==='head';
    const damage=damageFor(player.slot,headshot);
    const destroyed=damageRangeTarget(result.rangeTarget,damage);
    spawnImpactSparks(h,headshot?0xffd45c:0x7ee5ff);
    recordStat('hits');if(headshot)recordStat('headshots');
    showHit(damage,destroyed?'kill':headshot?'headshot':'body');
    if(destroyed){showKillMarker();showMessage('TARGET DOWN');}
    else showMessage(headshot?'TARGET HEAD':'TARGET HIT');
    return;
  }
  const h=result.hit,headshot=h.object.userData.hitZone==='head';
  if(result.bot){
    const b=result.bot;
    if(isCpuMode()&&cpu.mode==='tdm'&&b.team==='blue'){showMessage('FRIENDLY FIRE');return;}
    const distance=b.root.position.distanceTo(player.pos);
    if((def.base===2||def.base===4)&&distance>3.8){showMessage('TOO FAR');return;}
    const damage=damageFor(player.slot,headshot);
    if(h.object.material&&h.object.material.emissive){
      h.object.material.emissive.setHex(0xffffff);
      setTimeout(()=>{if(h.object.material&&h.object.material.emissive)h.object.material.emissive.setHex(b.team==='blue'?cyan:pink);},80);
    }
    spawnImpactSparks(h,0xff6f91);
    const killed=damageBot(b,damage);
    recordStat('hits');if(headshot)recordStat('headshots');
    showHit(damage,killed?'kill':headshot?'headshot':'body');
    if(killed){showKillMarker();showMessage(headshot?'HEADSHOT KILL':'ELIMINATED');}
    else showMessage(headshot?'HEADSHOT':'BODY SHOT');
    return;
  }
  const remote=result.remote;
  if(remote){
    if((def.base===2||def.base===4)&&player.pos.distanceTo(remote.group.position)>4.2){showMessage('TOO FAR');return;}
    const damage=damageFor(player.slot,headshot);
    net.send({t:'hit',to:remote.id,damage,name:netName});
    if(h.object.material&&h.object.material.emissive){
      h.object.material.emissive.setHex(0xffffff);
      setTimeout(()=>{if(h.object.material&&h.object.material.emissive)h.object.material.emissive.setHex(0x000000);},90);
    }
    spawnImpactSparks(h,remote.skin||0xff6f91);
    recordStat('hits');if(headshot)recordStat('headshots');
    showHit(damage,headshot?'headshot':'body');
    showMessage((headshot?'HEADSHOT ':'HIT ')+remote.name);
  }
}
function throwGrenade(){ if(player.grenades<=0){showMessage('NO GRENADES');return;} player.grenades--;updateAmmoHud(); const grenade=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8),mat(0x4a556e)); grenade.position.copy(camera.position); scene.add(grenade); const dir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation); const start=grenade.position.clone(); let t=0; const fly=()=>{t+=.035; grenade.position.copy(start).addScaledVector(dir,Math.min(t,1)*13);grenade.position.y-=Math.max(0,t-0.3)*2;if(t<1){requestAnimationFrame(fly);}else{for(const b of bots){if(!b.alive||b.root.position.distanceTo(grenade.position)>=7)continue;if(isCpuMode()&&cpu.mode==='tdm'&&b.team==='blue')continue;const killed=damageBot(b,50);showHit(50,killed?'kill':'body');}scene.remove(grenade);showMessage('GRENADE!');}};fly(); }
const TRACER_PLAYER=0xfff2a8,TRACER_ENEMY=0xff6b4a;
function muzzleWorldPosition(){
  weaponView.updateWorldMatrix(true,false);
  return weaponView.localToWorld(muzzleLocal.clone());
}
function botMuzzlePosition(bot){
  const gun=bot.root.userData.gun;
  if(gun){
    gun.updateWorldMatrix(true,false);
    return gun.localToWorld(new THREE.Vector3(0,.02,1.25));
  }
  return new THREE.Vector3(bot.root.position.x,bot.root.position.y+1.35,bot.root.position.z);
}
// Enemy fire needs a clear line to the player: bots cannot shoot through
// arena cover. Only solid, visible world geometry counts as a blocker.
function botHasLineOfSight(bot,target){
  const from=bot.root.position.clone();from.y+=2.1;
  const to=target.clone();
  const delta=to.clone().sub(from);
  const distance=delta.length();
  if(distance<.6)return true;
  const ray=new THREE.Raycaster(from,delta.normalize(),.1,Math.max(.1,distance-.5));
  // Sprite raycasting (name tags) needs a camera on the raycaster.
  ray.camera=camera;
  const hits=ray.intersectObjects(scene.children,true);
  for(const hit of hits){
    if(isViewmodelObject(hit.object))continue;
    if(hit.object.userData.decal||hit.object.userData.effect)continue;
    if(!isVisibleWorldObject(hit.object))continue;
    if(hit.object.material?.transparent)continue;
    let node=hit.object,ownBody=false;
    while(node){
      if(node===bot.root){ownBody=true;break;}
      node=node.parent;
    }
    if(ownBody)continue;
    const otherBot=bots.find(candidate=>candidate.root===hit.object.parent||candidate.root===hit.object.parent?.parent);
    if(otherBot)continue;
    return false;
  }
  return true;
}
// A tracer is a thin line plus a fast travelling dot, both fading out quickly.
// They are purely visual: damage still comes from the crosshair raycast.
function spawnBulletTracer(from,to,color=TRACER_PLAYER,width=.035){
  const delta=to.clone().sub(from);
  const length=delta.length();
  if(length<.25)return;
  const lineMaterial=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  const line=new THREE.Mesh(new THREE.CylinderGeometry(width,width*.45,1,6,1,true),lineMaterial);
  line.position.copy(from).addScaledVector(delta,.5);
  line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  line.scale.y=length;
  scene.add(line);
  const dotMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const dot=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.05,width*1.9),6,6),dotMaterial);
  dot.position.copy(from);
  scene.add(dot);
  const started=performance.now();
  const travel=Math.min(.18,Math.max(.05,length/280));
  const step=()=>{
    const elapsed=(performance.now()-started)/1000;
    const progress=Math.min(1,elapsed/travel);
    dot.position.copy(from).addScaledVector(delta,progress);
    const fade=Math.max(0,1-elapsed/.3);
    lineMaterial.opacity=.7*fade;
    dotMaterial.opacity=Math.min(1,fade*1.3);
    if(progress>=1||fade<=0){
      scene.remove(line);scene.remove(dot);
      line.geometry.dispose();lineMaterial.dispose();
      dot.geometry.dispose();dotMaterial.dispose();
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function spawnTracer(){
  const result=firstShotHit();
  const dir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation);
  const maxDistance=result?.hit?.distance||70;
  const end=result?.hit?.point?result.hit.point.clone():camera.position.clone().addScaledVector(dir,maxDistance);
  const from=muzzleWorldPosition();
  spawnBulletTracer(from,end,TRACER_PLAYER,.035);
  const now=performance.now();
  if(now-(spawnTracer.lastSent||0)>90){
    spawnTracer.lastSent=now;
    net.send({t:'shot',o:[from.x,from.y,from.z],e:[end.x,end.y,end.z],w:player.slot});
  }
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.11,8,8),mat(0xffe78a,0xffa31a));
  flash.position.copy(muzzleLocal);
  weaponView.add(flash);
  setTimeout(()=>weaponView.remove(flash),55);
}
function scytheDash(){
  if(matchFrozen())return;
  if(player.scytheCooldown>0){showMessage('SCYTHE COOLING');return;}
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,0),camera);
  const hits=ray.intersectObjects(scene.children,true);let target=null;
  for(const h of hits){
    if(isViewmodelObject(h.object)||!isVisibleWorldObject(h.object)||h.object.material?.transparent)continue;
    target=findBotByObject(h.object);
    if(target&&target.alive)break;
    showMessage('MELEE HIT WALL');return;
  }
  const aimDir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation).normalize();
  if(player.grounded&&aimDir.y<0)aimDir.y=0;aimDir.normalize();
  const destination=target?target.root.position.clone().addScaledVector(aimDir,-2.1):player.pos.clone().addScaledVector(aimDir,7);
  if(target)destination.y=2.2;else destination.y=Math.max(2.2,destination.y);
  const old=player.pos.clone();player.pos.copy(destination);if(blocked(player.pos))player.pos.copy(old);
  player.scytheCooldown=1.1;weaponView.rotation.z=-.7;setTimeout(()=>weaponView.rotation.z=0,180);
  if(target&&target.alive&&player.pos.distanceTo(target.root.position)<3.8){if(isCpuMode()&&cpu.mode==='tdm'&&target.team==='blue'){showMessage('FRIENDLY FIRE');return;}const damage=damageFor(player.slot,false);const killed=damageBot(target,damage);recordStat('hits');showHit(damage,killed?'kill':'body');if(killed)showKillMarker();showMessage('SCYTHE HIT');playSound('hit');}
  else showMessage(aimDir.y>.15?'UPWARD DASH':aimDir.y<-.15?'DOWNWARD DASH':'DASH');
}
function useWeapon(){
  if(player.reloading||matchFrozen())return;
  const def=weaponDef(player.slot);
  if(def.base===3){weaponAnim.throw=1;throwGrenade();return;}
  if(def.base===4||def.base===2){weaponAnim.swing=1.2;playSound('swing');hitBot();return;}
  const a=player.ammo[def.id];if(!a)return;
  if(a.mag<=0){playSound('dry');reloadWeapon();return;}
  a.mag--;updateAmmoHud();recordStat('shots');playSound('shot',{base:def.base});
  if(a.mag<=0)reloadWeapon();
  weaponAnim.recoil=1;weaponAnim.bolt=1;spawnTracer();hitBot();
}
function doQuickMelee(){
  if(gameMode==='lobby'||player.quickMeleeTimer>0)return;
  if(matchFrozen())return;
  const current=player.slot;
  const target=duel.active?duel.weapons[2]:player.meleeChoice;
  if(current===target){weaponAnim.swing=1.2;playSound('swing');hitBot();return;}
  player.prevSlot=current;
  forceWeapon(target);
  showMessage(weaponDef(target).name);
  weaponAnim.swing=1.2;playSound('swing');hitBot();
  player.quickMeleeTimer=0.5;
}
function showMessage(t){ const el=document.getElementById('message');el.textContent=t;el.style.opacity=1;clearTimeout(showMessage.t);showMessage.t=setTimeout(()=>el.style.opacity=0,650); }
const move=new THREE.Vector3(), clock=new THREE.Clock();
document.getElementById('playMenu').onclick=()=>{document.getElementById('start').classList.add('choosing');document.getElementById('playMenu').style.display='none';document.getElementById('modePicker').style.display='block';document.getElementById('lobbyText').textContent='Pick Single Player, or challenge a player to a 1v1 from the list.';}; document.getElementById('singleMode').onclick=()=>{single.difficulty=document.getElementById('singleDifficulty').value;single.round=1;single.wins=0;single.losses=0;single.botIndex=0;startGame('single');}; document.getElementById('singleReportClose').onclick=()=>{document.getElementById('singleReport').classList.remove('open');enterLobby();}; document.getElementById('loadoutMelee').onchange=e=>{player.meleeChoice=Number(e.target.value);saveActiveProfile();}; document.getElementById('loadoutPrimary').onchange=e=>{player.primaryChoice=Number(e.target.value);saveActiveProfile();}; document.getElementById('singleDifficulty').onchange=e=>{single.difficulty=e.target.value;saveActiveProfile();};
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
document.getElementById('sensitivity').oninput=e=>{player.sensitivity=Number(e.target.value);document.getElementById('sensitivityValue').textContent=player.sensitivity.toFixed(1);saveActiveProfile();}; document.getElementById('scopeSensitivity').oninput=e=>{player.scopeSensitivity=Number(e.target.value);document.getElementById('scopeSensitivityValue').textContent=player.scopeSensitivity.toFixed(1);saveActiveProfile();}; document.getElementById('crosshairColor').onchange=()=>{updateCrosshair();saveActiveProfile();}; document.getElementById('crosshairStyle').onchange=()=>{updateCrosshair();saveActiveProfile();}; updateCrosshair();
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;if(gameMode==='lobby'&&!locked)document.getElementById('start').style.display='grid';});
document.addEventListener('mousemove',e=>{if(!locked)return;const lookSensitivity=player.aiming?player.scopeSensitivity:player.sensitivity;player.yaw-=e.movementX*.0022*lookSensitivity;player.pitch+=(player.invertY?1:-1)*e.movementY*.0022*lookSensitivity;player.pitch=Math.max(-1.35,Math.min(1.35,player.pitch));});
const CATEGORY_KEYS=['primary','secondary','melee','utility'];
function inputFocused(target){
  return !!(target&&(target.tagName==='INPUT'||target.tagName==='SELECT'||target.tagName==='TEXTAREA'||target.isContentEditable));
}
addEventListener('keydown',e=>{
  if(inputFocused(e.target))return;
  if(e.code.startsWith('Arrow'))e.preventDefault();
  const code=translatedKey(e.code);
  keys[code]=true;
  if(code==='KeyR'&&!e.repeat)reloadWeapon();
  if(code==='KeyF'&&!e.repeat)doQuickMelee();
  if(code==='KeyP'&&!e.repeat)toggleSettings();
  if(code==='Escape'&&settings.classList.contains('open'))toggleSettings(false);
  if(code==='Escape'){
    const progress=document.getElementById('progressPanel');
    const leaderboard=document.getElementById('leaderboardPanel');
    if(progress&&progress.classList.contains('open'))progress.classList.remove('open');
    if(leaderboard&&leaderboard.classList.contains('open'))leaderboard.classList.remove('open');
  }
  if(code==='Escape'&&document.getElementById('duelSetup').classList.contains('open'))cancelDuelSetup();
  if(code==='Escape'&&duel.pending){const declined=duel.pending;hideDuelPrompt();net.send({t:'duel-decline',to:declined,name:netName});}
  if(code==='KeyE'&&!e.repeat){
    const base=weaponDef(player.slot).base;
    if(base===4||base===2)doQuickMelee();
    else if(base!==3){player.aimKey=true;updateAim();}
  }
  if(duel.active){
    const digit=/^Digit([1-4])$/.exec(e.code);
    if(digit){const index=Number(digit[1])-1;if(index<duel.weapons.length)forceWeapon(duel.weapons[index]);}
  }else if(!(isCpuMode()&&cpu.mode==='gungame')&&gameMode!=='lobby'){
    const digit=/^Digit([1-4])$/.exec(e.code);
    if(digit)selectCategory(CATEGORY_KEYS[Number(digit[1])-1]);
    if(e.code==='KeyG')selectCategory('utility');
  }
  if(code==='Space'&&!player.fly&&!matchFrozen()){
    if(player.grounded){player.vertical=8.5;player.grounded=false;player.doubleJumpUsed=false;playSound('jump');}
    else if(weaponDef(player.slot).base===2&&!player.doubleJumpUsed){player.vertical=8.5;player.doubleJumpUsed=true;playSound('jump');}
  }
  if(code==='KeyC'&&!player.sliding&&!player.fly&&!matchFrozen()){
    const moving=keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD;
    const sprinting=keys.ShiftLeft||keys.ShiftRight;
    if(moving&&sprinting&&player.slideCooldown<=0){player.sliding=true;player.slideTime=.65;player.slideCooldown=1.05;}
  }
});
addEventListener('keyup',e=>{
  const code=translatedKey(e.code);
  keys[code]=false;
  if(code==='KeyE'&&weaponDef(player.slot).base!==2&&weaponDef(player.slot).base!==4){player.aimKey=false;updateAim();}
});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;player.aimHold=false;player.aimKey=false;shooting=false;updateAim();});
addEventListener('mousedown',e=>{
  if(!locked||matchFrozen())return;
  if(e.button===2){
    if(weaponDef(player.slot).base===4)scytheDash();
    else if(player.aimMode==='toggle'){player.aimHold=!player.aimHold;updateAim();}
    else{player.aimHold=true;updateAim();}
  }else if(e.button===0)shooting=true;
});
addEventListener('mouseup',e=>{
  if(e.button===2&&weaponDef(player.slot).base!==4&&player.aimMode!=='toggle'){player.aimHold=false;updateAim();}
  else if(e.button===0)shooting=false;
});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{if(e.target&&e.target.id==='dbgInput')return;if(e.code==='KeyV'&&!e.repeat&&gameMode!=='lobby'){weaponAnim.inspect=1.35;showMessage('INSPECT');}});
function applySlidePose(dt,pose){const k=Math.min(1,dt*14);const slide=pose>0;const walk=slide?0:player.walkBlend;const swing=Math.sin(player.walkPhase)*walk;const bob=Math.abs(Math.sin(player.walkPhase))*.05*walk;const approach=(object,property,target)=>{object[property]+=(target-object[property])*k;};approach(avatarBody.position,'y',slide?.78:1.4+bob);approach(avatarBody.rotation,'x',slide?1.12:0);approach(avatarBody.rotation,'z',slide?0:swing*.06);approach(avatarHead.position,'y',slide?1.1:2.05+bob);approach(avatarHead.position,'z',slide?-.58:0);approach(avatarFace.position,'y',slide?1.13:2.08+bob);approach(avatarFace.position,'z',slide?-.94:-.365);approach(avatarLeftArm.position,'x',slide?-.58:-.63);approach(avatarLeftArm.position,'y',slide?.58:1.4);approach(avatarLeftArm.position,'z',slide?-.42:0);approach(avatarLeftArm.rotation,'x',slide?1.28:-swing*.6);approach(avatarRightArm.position,'x',slide?.5:.63);approach(avatarRightArm.position,'y',slide?.7:1.4);approach(avatarRightArm.position,'z',slide?-.72:0);approach(avatarRightArm.rotation,'x',slide?1.42:swing*.6);approach(avatarLeftLeg.position,'y',slide?.38:.43);approach(avatarLeftLeg.position,'z',slide?.48:0);approach(avatarLeftLeg.rotation,'x',slide?1.38:swing*.7);approach(avatarLeftLeg.rotation,'z',slide?.16:0);approach(avatarRightLeg.position,'y',slide?.3:.43);approach(avatarRightLeg.position,'z',slide?.62:0);approach(avatarRightLeg.rotation,'x',slide?1.48:-swing*.7);approach(avatarRightLeg.rotation,'z',slide?-.18:0);}
function updateLobby(dt){document.querySelector('.hud').classList.add('lobby');const moving=keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||keys.ArrowUp||keys.ArrowDown;const sprinting=keys.ShiftLeft||keys.ShiftRight;player.cameraYaw+=((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0))*dt*2.4;player.slideCooldown=Math.max(0,player.slideCooldown-dt);if(keys.KeyC&&moving&&sprinting&&!player.sliding&&player.slideCooldown<=0){player.sliding=true;player.slideTime=.65;player.slideCooldown=1.05;}let speed=sprinting?11:7;if(player.sliding){speed=15;player.slideTime-=dt;if(player.slideTime<=0||!moving||!sprinting)player.sliding=false;}player.crouching=player.sliding||(keys.KeyC&&!moving);if(player.crouching&&!player.sliding)speed=4;const moveLobby=new THREE.Vector3((keys.KeyD?1:0)-(keys.KeyA?1:0),0,((keys.KeyS||keys.ArrowDown)?1:0)-((keys.KeyW||keys.ArrowUp)?1:0));if(moveLobby.lengthSq()){moveLobby.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),player.cameraYaw);player.pos.addScaledVector(moveLobby,dt*speed);const want=Math.atan2(-moveLobby.x,-moveLobby.z);let diff=((want-player.avatarYaw+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;player.avatarYaw+=diff*Math.min(1,dt*10);}player.vertical-=22*dt;player.pos.y+=player.vertical*dt;if(player.pos.y<=2.2){player.pos.y=2.2;player.vertical=0;player.grounded=true;}player.pos.x=Math.max(-22,Math.min(22,player.pos.x));player.pos.z=Math.max(-22,Math.min(22,player.pos.z));if(moveLobby.lengthSq()&&!player.sliding)player.walkPhase+=dt*speed*1.6;player.walkBlend+=(((moving&&!player.sliding)?1:0)-player.walkBlend)*Math.min(1,dt*10);const pose=player.sliding?1:0;applySlidePose(dt,pose);lobbyAvatar.position.set(player.pos.x,player.pos.y-2.2,player.pos.z);lobbyAvatar.rotation.y=player.avatarYaw;weaponView.visible=false;const behind=new THREE.Vector3(0,3.4+(player.crouching?-.4:0),6.5).applyAxisAngle(new THREE.Vector3(0,1,0),player.cameraYaw);camera.position.copy(player.pos).add(behind);camera.lookAt(player.pos.x,player.pos.y-.7,player.pos.z);}
function aimbotPoint(){
  const eye=player.pos;
  let point=null,best=Infinity;
  if(aimbot.target==='enemies'||aimbot.target==='both'){
    for(const b of bots){
      if(!b.alive||!b.root.visible)continue;
      const d=b.root.position.distanceToSquared(eye);
      if(d>90*90||d>=best)continue;
      best=d;point=b.root.position.clone();point.y+=2.4;
    }
  }
  if(aimbot.target==='pvp'||aimbot.target==='both'){
    const remotes=duel.active&&duel.opponent?[remotePlayers.get(duel.opponent)]:[...remotePlayers.values()];
    for(const remote of remotes){
      // In PVP, use the latest network position rather than the interpolated
      // mesh. The mesh can briefly be hidden while a duel is starting, which
      // used to make the trace silently skip the opponent.
      if(!remote||!remote.target?.isVector3||remote.mode!==gameMode||performance.now()-remote.lastSeen>20000)continue;
      const target=remote.target.clone();
      // Network positions are the player's world/eye position (normally y=2.2),
      // not the remote avatar group's feet. Adding 1.7 here aimed well above
      // the head; a small offset keeps the trace on the player's upper body.
      target.y+=.25;
      const d=target.distanceToSquared(eye);
      if(d>90*90||d>=best)continue;
      best=d;point=target;
    }
  }
  return point;
}
function aimbotAim(dt){
  if(!aimbot.enabled||gameMode==='lobby')return;
  const point=aimbotPoint();
  if(!point)return;
  const eye=player.pos.clone();
  if(player.crouching)eye.y-=.65;
  const dir=point.sub(eye);
  const flat=Math.hypot(dir.x,dir.z);
  if(flat<.001)return;
  const wantYaw=Math.atan2(-dir.x,-dir.z);
  const wantPitch=Math.atan2(dir.y,flat);
  const delta=((wantYaw-player.yaw+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  const k=Math.min(1,dt*aimbot.speed);
  player.yaw+=delta*k;
  player.pitch+=(wantPitch-player.pitch)*k;
}
function update(dt){
  animateWeaponClip();
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
  if(gameMode==='lobby'){updateLobby(dt);return;} 
  // Single-player round intro: 3, 2, 1, GO. Everything is frozen until GO.
  if(single.active&&single.countdown>0){
    single.countdown=Math.max(0,single.countdown-dt);
    const number=Math.ceil(single.countdown);
    if(number!==single.countdownShown){
      single.countdownShown=number;
      if(number>0)showCountdown(String(number));
      else{showCountdown('GO',true);single.goFlash=.65;}
    }
  }else if(single.goFlash>0){
    single.goFlash=Math.max(0,single.goFlash-dt);
    if(single.goFlash<=0)hideCountdown();
  }
  if(gameMode==='range')updateRangeTargets(dt);
  if(cpu.active&&cpu.over){
    cpu.reportTimer-=dt;
    if(cpu.reportTimer<=0)showCpuReport();
  }
  const frozen=matchFrozen();
  weaponView.visible=true; if(player.reloading){player.reloadTime-=dt;if(player.reloadTime<=0)finishReload();}
  // Ability cooldowns must tick down or an ability can only ever fire once.
  player.scytheCooldown=Math.max(0,player.scytheCooldown-dt);
  if(player.quickMeleeTimer>0){player.quickMeleeTimer-=dt;if(player.quickMeleeTimer<=0&&player.prevSlot!==null){const previous=player.prevSlot;player.prevSlot=null;forceWeapon(previous);showMessage(weaponDef(previous).name);}}
  // ---- MOVEMENT ----
  const fwd=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
  const strafe=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  const sprinting=keys.ShiftLeft||keys.ShiftRight;
  const crouchKey=keys.KeyC;
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
  if(!frozen&&dir.lengthSq()>0){
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
    const rise=(keys.Space?1:0)-((keys.ShiftLeft||keys.KeyC)?1:0);
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
  player.pos.x=Math.max(-worldBounds,Math.min(worldBounds,player.pos.x));
  player.pos.z=Math.max(-worldBounds,Math.min(worldBounds,player.pos.z));
  const eye=player.pos.clone();eye.y-=player.crouching?.65:0; camera.position.lerp(eye,.35); camera.fov+=((player.aiming?48:72)-camera.fov)*Math.min(1,dt*12); camera.updateProjectionMatrix(); aimbotAim(dt); camera.rotation.set(player.pitch,player.yaw,0); const viewX=weaponDef(player.slot).base===2?0:(player.aiming?.30:.48);weaponView.position.lerp(new THREE.Vector3(viewX,player.aiming?-.34:-.42,player.aiming?-.64:-.82),.2); weaponAnim.recoil=Math.max(0,weaponAnim.recoil-dt*8);weaponAnim.bolt=Math.max(0,weaponAnim.bolt-dt*14);weaponAnim.swing=Math.max(0,weaponAnim.swing-dt*5);weaponAnim.throw=Math.max(0,weaponAnim.throw-dt*3);weaponView.position.z-=weaponAnim.recoil*.13;weaponView.position.y-=player.sliding?.16:0;const reloadPose=player.reloading?Math.sin(Math.min(1,1-player.reloadTime/player.reloadTotal)*Math.PI):0;weaponView.position.y-=reloadPose*.22;weaponView.position.z+=reloadPose*.08;weaponView.rotation.x=weaponAnim.recoil*.2+weaponAnim.throw*.35-reloadPose*.85;weaponView.rotation.z=weaponAnim.swing*.7+reloadPose*.5;
  if(weaponAnim.inspect>0){const p=1-weaponAnim.inspect/1.35;const lift=Math.sin(Math.min(1,p)*Math.PI);weaponView.position.x+=((player.aiming?.30:.48)+lift*.2-weaponView.position.x)*Math.min(1,dt*10);weaponView.position.y+=((player.aiming?-.34:-.42)+lift*.22-weaponView.position.y)*Math.min(1,dt*10);weaponView.position.z+=((player.aiming?-.64:-.82)-lift*.12-weaponView.position.z)*Math.min(1,dt*10);weaponView.rotation.y+=(lift*.6-weaponView.rotation.y)*Math.min(1,dt*10);weaponView.rotation.z+=(-lift*.5-weaponView.rotation.z)*Math.min(1,dt*10);}else{weaponView.rotation.y*=Math.max(0,1-dt*12);weaponView.rotation.z*=Math.max(0,1-dt*12);}
  const fireRate=weapons[player.slot].rate;if(!frozen&&shooting&&performance.now()-lastShot>fireRate){lastShot=performance.now();useWeapon();}
  if(gameMode==='single'&&single.active&&!duel.active){
    for(const b of bots){
      if(b!==bots[single.botIndex]){b.root.visible=false;continue;}
      if(!b.alive)continue;
      updateSingleBot(b,dt);
    }
  }else if(isCpuMode()){
    updateCpuBots(dt);
  }
  beacon.intensity=4.5+Math.sin(performance.now()*.004)*1.5;
}
/* ---------------- MULTIPLAYER (two tabs of the same browser) ---------------- */
const MP_SKINS=[0x4be3a2,0xffa63d,0xb06bff,0xffd45c,0x4bc9ff,0xff8054];
const MP_NAMES=['PLAYER','RIVAL','GHOST','NOVA','ECHO','BLAZE','VOLT','ONYX'];
const remotePlayers=new Map();
let netSkin=0, netTagColor=0, netName='', netAcc=0, lobbyListAcc=0, onlineAcc=0;

function readSession(key){try{return sessionStorage.getItem(key);}catch(error){return null;}}
function writeSession(key,value){try{sessionStorage.setItem(key,value);}catch(error){}}
/* ---------------- PLAYER PROFILES (localStorage) ----------------
 * Profiles survive closing the browser. The live identity for this tab stays
 * in sessionStorage so two tabs can still hold separate names and skins. */
const PROFILE_KEY='beathim-profiles';
function readLocal(key){try{return localStorage.getItem(key);}catch(error){return null;}}
function writeLocal(key,value){try{localStorage.setItem(key,value);}catch(error){}}
let profiles=[];
let activeProfileId=readSession('beathim-profile-id')||'';
let profilesEnabled=false;

/* ================================================================== */
/* SOUND: small procedural WebAudio kit (no asset files needed)        */
/* ================================================================== */
const sound={ctx:null,gain:null,volume:.7,muted:false};
function applySoundVolume(){if(sound.gain)sound.gain.gain.value=sound.muted?0:Math.max(0,Math.min(1,sound.volume));}
function initSound(){
  if(sound.ctx){if(sound.ctx.state==='suspended')sound.ctx.resume().catch(()=>{});return;}
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)return;
  try{
    sound.ctx=new Ctx();
    sound.gain=sound.ctx.createGain();
    sound.gain.connect(sound.ctx.destination);
    applySoundVolume();
  }catch(error){sound.ctx=null;}
}
let noiseBuffer=null;
function tone(freq,dur,type='sine',vol=.2,slide=0,delay=0){
  const ctx=sound.ctx;if(!ctx)return;
  const t=ctx.currentTime+delay;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(Math.max(20,freq),t);
  if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+dur);
  gain.gain.setValueAtTime(.0001,t);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
  osc.connect(gain);gain.connect(sound.gain);
  osc.start(t);osc.stop(t+dur+.03);
}
function noiseBurst(dur=.12,vol=.3,freq=1800,delay=0){
  const ctx=sound.ctx;if(!ctx)return;
  if(!noiseBuffer){
    noiseBuffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.5),ctx.sampleRate);
    const data=noiseBuffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  }
  const source=ctx.createBufferSource();source.buffer=noiseBuffer;
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=freq;
  const gain=ctx.createGain();const t=ctx.currentTime+delay;
  gain.gain.setValueAtTime(Math.max(.0002,vol),t);
  gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
  source.connect(filter);filter.connect(gain);gain.connect(sound.gain);
  source.start(t);source.stop(t+dur);
}
function playSound(name,options={}){
  if(sound.muted||sound.volume<=0)return;
  initSound();if(!sound.ctx)return;
  try{
    if(name==='shot'){
      const base=options.base??0;
      noiseBurst(base===5?.18:.1,base===5?.42:.3,base===5?900:1800);
      tone(base===5?95:140,.1,'square',.12,-60);
      if(base===1)noiseBurst(.06,.16,2600);
    }else if(name==='dry')tone(900,.04,'square',.08,-200);
    else if(name==='reload'){tone(300,.05,'square',.08);tone(220,.06,'square',.07,0,.12);}
    else if(name==='reloaded'){tone(520,.05,'square',.09);tone(720,.06,'square',.08,0,.08);}
    else if(name==='hit')tone(1200,.05,'triangle',.15,-300);
    else if(name==='headshot'){tone(1500,.06,'triangle',.18);tone(2100,.06,'triangle',.12,0,.05);}
    else if(name==='kill'){tone(380,.12,'sawtooth',.14,420);tone(760,.16,'triangle',.12,520,.08);}
    else if(name==='hurt'){tone(160,.18,'sawtooth',.2,-80);noiseBurst(.08,.16,700);}
    else if(name==='swing')noiseBurst(.09,.12,1200);
    else if(name==='impact')noiseBurst(.05,.12,900);
    else if(name==='jump')tone(340,.08,'sine',.1,180);
    else if(name==='explosion'){noiseBurst(.38,.5,500);tone(70,.35,'sawtooth',.3,-30);}
    else if(name==='ui')tone(660,.035,'sine',.07);
    else if(name==='unlock'){tone(520,.08,'triangle',.12);tone(780,.1,'triangle',.12,0,.09);tone(1040,.16,'triangle',.12,0,.18);}
  }catch(error){}
}
addEventListener('pointerdown',()=>initSound(),{once:true});
addEventListener('keydown',()=>initSound(),{once:true});

/* ================================================================== */
/* PROGRESSION: daily quests, keys, chests, wraps, lifetime stats      */
/* ================================================================== */
const PROGRESS_KEY='beathim-progress-v1';
const WRAPS=[
  {id:'cyan',name:'NEON CYAN',color:0x36d9ff},
  {id:'ember',name:'EMBER',color:0xff6b3d},
  {id:'violet',name:'VIOLET',color:0xb06bff},
  {id:'gold',name:'GOLD',color:0xffd45c},
  {id:'toxin',name:'TOXIN',color:0x9eff6c},
  {id:'crimson',name:'CRIMSON',color:0xff4e86}
];
const DAILY_QUESTS=[
  {id:'kills',name:'GET 15 ELIMINATIONS',goal:15,reward:2,stat:'kills'},
  {id:'hits',name:'LAND 40 SHOTS ON TARGET',goal:40,reward:1,stat:'hits'},
  {id:'rounds',name:'WIN 3 SINGLE-PLAYER ROUNDS',goal:3,reward:2,stat:'rounds'},
  {id:'pvp',name:'WIN A PVP DUEL',goal:1,reward:3,stat:'pvp'}
];
function progressDay(){
  const date=new Date();
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
}
function defaultProgress(){
  return {
    keys:0,
    unlocks:{weapons:[],wraps:['cyan']},
    wrap:'cyan',
    stats:{kills:0,deaths:0,wins:0,losses:0,rounds:0,shots:0,hits:0,headshots:0,pvp:0,range:0},
    daily:{day:progressDay(),counts:{kills:0,hits:0,rounds:0,pvp:0},claimed:[]}
  };
}
function loadProgression(){
  let data=null;
  try{data=JSON.parse(readLocal(PROGRESS_KEY)||'null');}catch(error){data=null;}
  const fresh=defaultProgress();
  if(!data||typeof data!=='object')return fresh;
  const merged={...fresh,...data};
  merged.unlocks={...fresh.unlocks,...(data.unlocks||{})};
  merged.unlocks.weapons=Array.isArray(merged.unlocks.weapons)?merged.unlocks.weapons:[];
  merged.unlocks.wraps=Array.isArray(merged.unlocks.wraps)&&merged.unlocks.wraps.length?merged.unlocks.wraps:['cyan'];
  merged.stats={...fresh.stats,...(data.stats||{})};
  merged.daily={...fresh.daily,...(data.daily||{})};
  merged.daily.counts={...fresh.daily.counts,...((data.daily&&data.daily.counts)||{})};
  merged.daily.claimed=Array.isArray(merged.daily.claimed)?merged.daily.claimed:[];
  if(merged.daily.day!==progressDay())merged.daily={day:progressDay(),counts:{kills:0,hits:0,rounds:0,pvp:0},claimed:[]};
  return merged;
}
let progression=loadProgression();
function saveProgression(){writeLocal(PROGRESS_KEY,JSON.stringify(progression));}
function ownedWeapon(id){const def=weaponDef(id);return !def.price||progression.unlocks.weapons.includes(def.id);}
function ownedWrap(id){return progression.unlocks.wraps.includes(id);}
function wrapDef(id){return WRAPS.find(wrap=>wrap.id===id)||WRAPS[0];}
function equippedWrapDef(){return progression.wrap?wrapDef(progression.wrap):null;}
function colorCss(color){return '#'+Number(color).toString(16).padStart(6,'0');}
function updateKeyBadge(){
  const badge=document.getElementById('keyBadge');
  if(badge)badge.textContent=progression.keys+' 🔑';
  const keys=document.getElementById('keyCount');
  if(keys)keys.textContent=String(progression.keys);
  const reset=document.getElementById('questReset');
  if(reset){
    const now=new Date();
    const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
    const hours=Math.max(0,Math.ceil((midnight-now)/3600000));
    reset.textContent='RESETS IN '+hours+'H';
  }
}
function recordStat(key,amount=1){
  if(!isFinite(progression.stats[key]))progression.stats[key]=0;
  progression.stats[key]+=amount;
  if(progression.daily.counts[key]!==undefined)progression.daily.counts[key]+=amount;
  scheduleProgressSave();
  scheduleProfileStats();
  updateKeyBadge();
}
let progressSaveTimer=0;
function scheduleProgressSave(){
  clearTimeout(progressSaveTimer);
  progressSaveTimer=setTimeout(saveProgression,350);
}
let statsSyncTimer=0;
function scheduleProfileStats(){
  clearTimeout(statsSyncTimer);
  statsSyncTimer=setTimeout(()=>{
    const profile=profiles.find(entry=>entry.id===activeProfileId);
    if(!profile)return;
    profile.stats={...progression.stats};
    profile.updated=Date.now();
    persistProfiles();
  },900);
}
function equipWrap(id){
  if(!ownedWrap(id))return;
  progression.wrap=id;saveProgression();
  equippedWrap=wrapDef(id);rebuildWeapon();
  renderProgressPanel();lobbyStatus('WRAP EQUIPPED · '+wrapDef(id).name);playSound('ui');
}
function claimQuest(id){
  const quest=DAILY_QUESTS.find(entry=>entry.id===id);
  if(!quest)return;
  if(progression.daily.claimed.includes(id))return;
  if((progression.daily.counts[quest.stat]||0)<quest.goal)return;
  progression.daily.claimed.push(id);
  progression.keys+=quest.reward;
  saveProgression();updateKeyBadge();renderProgressPanel();playSound('unlock');
}
let progressStatusTimer=0;
function progressMessage(text){
  const element=document.getElementById('progressStatus');
  if(!element)return;
  element.textContent=text;
  clearTimeout(progressStatusTimer);
  progressStatusTimer=setTimeout(()=>{element.textContent='';},4000);
}
function openChest(kind){
  const cost=kind==='weapon'?4:2;
  if(progression.keys<cost){progressMessage('NOT ENOUGH KEYS · NEED '+cost+' 🔑');playSound('dry');return;}
  if(kind==='weapon'){
    const pool=weapons.filter(def=>def.price>0&&!ownedWeapon(def.id));
    if(!pool.length){progressMessage('ALL WEAPONS ALREADY UNLOCKED');return;}
    progression.keys-=cost;
    const reward=pool[Math.floor(Math.random()*pool.length)];
    progression.unlocks.weapons.push(reward.id);
    saveProgression();
    progressMessage('UNLOCKED '+reward.name+' · '+reward.desc);
  }else{
    const pool=WRAPS.filter(wrap=>!ownedWrap(wrap.id));
    if(!pool.length){progressMessage('ALL WRAPS ALREADY UNLOCKED');return;}
    progression.keys-=cost;
    const reward=pool[Math.floor(Math.random()*pool.length)];
    progression.unlocks.wraps.push(reward.id);
    saveProgression();
    progressMessage('UNLOCKED WRAP · '+reward.name);
  }
  updateKeyBadge();renderProgressPanel();renderWeaponPickers();playSound('unlock');
}
function tryUnlockWeapon(id){
  const def=weaponDef(id);
  if(!def.price){return;}
  if(progression.keys<def.price){lobbyStatus(def.name+' LOCKED · NEED '+def.price+' KEYS');playSound('dry');return;}
  progression.keys-=def.price;
  progression.unlocks.weapons.push(def.id);
  saveProgression();updateKeyBadge();renderWeaponPickers();playSound('unlock');
  lobbyStatus('UNLOCKED '+def.name);
}
function renderProgressPanel(){
  updateKeyBadge();
  const list=document.getElementById('questList');
  if(list){
    list.innerHTML=DAILY_QUESTS.map(quest=>{
      const progress=Math.min(quest.goal,progression.daily.counts[quest.stat]||0);
      const claimed=progression.daily.claimed.includes(quest.id);
      const ready=progress>=quest.goal&&!claimed;
      return '<div class="quest-row'+(claimed?' done':'')+'">'
        +'<div class="q-info"><div class="q-name">'+escapeHtml(quest.name)+'</div>'
        +'<div class="q-bar"><i style="width:'+Math.round(progress/quest.goal*100)+'%"></i></div>'
        +'<div class="q-progress">'+progress+' / '+quest.goal+' · +'+quest.reward+' 🔑</div></div>'
        +'<button class="q-claim'+(ready?' ready':'')+'" data-quest="'+quest.id+'"'+(ready?'':' disabled')+'>'+(claimed?'CLAIMED':'CLAIM')+'</button></div>';
    }).join('');
  }
  const wraps=document.getElementById('wrapList');
  if(wraps){
    wraps.innerHTML=WRAPS.map(wrap=>{
      const owned=ownedWrap(wrap.id);
      const selected=progression.wrap===wrap.id;
      return '<button class="wrap-chip'+(selected?' selected':'')+(owned?'':' locked')+'" data-wrap="'+wrap.id+'"'+(owned?'':' disabled')+' style="--wrap:'+colorCss(wrap.color)+'"><i></i>'+escapeHtml(wrap.name)+(owned?'':' 🔒')+'</button>';
    }).join('');
  }
}
function renderLeaderboard(){
  const body=document.getElementById('leaderboardBody');
  if(!body)return;
  const rows=new Map();
  for(const profile of profiles){
    rows.set(profile.id,{name:profile.name||'PLAYER',stats:profile.stats||{}});
  }
  const me=rows.get(activeProfileId);
  rows.set(activeProfileId||'me',{name:netName||'YOU',stats:progression.stats,me:true});
  if(!me&&activeProfileId)rows.delete(activeProfileId);
  const list=[...rows.values()].sort((a,b)=>{
    const ak=a.stats.kills||0,bk=b.stats.kills||0;
    if(bk!==ak)return bk-ak;
    const aw=a.stats.wins||0,bw=b.stats.wins||0;
    return bw-aw;
  });
  const header='<div class="lb-row head"><span>#</span><span>PLAYER</span><span class="lb-num">KILLS</span><span class="lb-num">WINS</span><span class="lb-num">ACC</span><span class="lb-kd">K/D</span></div>';
  body.innerHTML=header+list.map((row,index)=>{
    const stats=row.stats||{};
    const shots=stats.shots||0,hits=stats.hits||0;
    const accuracy=shots?Math.round(hits/shots*100)+'%':'—';
    const kd=(stats.deaths||0)>0?((stats.kills||0)/(stats.deaths)).toFixed(2):String(stats.kills||0);
    return '<div class="lb-row'+(row.me?' me':'')+'"><span class="lb-rank">'+(index+1)+'</span><span class="lb-name">'+escapeHtml(row.name)+(row.me?' · YOU':'')+'</span>'
      +'<span class="lb-num">'+(stats.kills||0)+'</span><span class="lb-num">'+(stats.wins||0)+'</span><span class="lb-num">'+accuracy+'</span><span class="lb-kd">'+kd+'</span></div>';
  }).join('');
}

/* ================================================================== */
/* KEYBINDS: rebindable movement/action keys via a canonical layer     */
/* ================================================================== */
const DEFAULT_BINDS={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',crouch:'KeyC',sprint:'ShiftLeft',reload:'KeyR',melee:'KeyF',aim:'KeyE',settings:'KeyP'};
const BIND_LABELS={forward:'FORWARD',back:'BACK',left:'LEFT',right:'RIGHT',jump:'JUMP',crouch:'CROUCH / SLIDE',sprint:'SPRINT',reload:'RELOAD',melee:'QUICK MELEE',aim:'AIM',settings:'SETTINGS'};
const BIND_CANONICAL={...DEFAULT_BINDS};
let binds={...DEFAULT_BINDS};
try{
  const savedBinds=JSON.parse(readLocal('beathim-binds')||'null');
  if(savedBinds)for(const action in DEFAULT_BINDS)if(typeof savedBinds[action]==='string')binds[action]=savedBinds[action];
}catch(error){}
let bindingAction=null;
function bindActionForCode(code){for(const action in binds)if(binds[action]===code)return action;return null;}
function translatedKey(code){const action=bindActionForCode(code);return action?BIND_CANONICAL[action]:code;}
const KEY_LABELS={Space:'SPACE',ShiftLeft:'L SHIFT',ShiftRight:'R SHIFT',ControlLeft:'L CTRL',ControlRight:'R CTRL',AltLeft:'L ALT',AltRight:'R ALT',Escape:'ESC',ArrowUp:'ARROW UP',ArrowDown:'ARROW DOWN',ArrowLeft:'ARROW LEFT',ArrowRight:'ARROW RIGHT',Backquote:'`'};
function keyLabel(code){
  if(KEY_LABELS[code])return KEY_LABELS[code];
  return String(code||'').replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'NUM ');
}
function saveBinds(){writeLocal('beathim-binds',JSON.stringify(binds));}
function renderBindList(){
  const list=document.getElementById('bindList');
  if(!list)return;
  list.innerHTML=Object.keys(DEFAULT_BINDS).map(action=>'<div class="bind-row"><b>'+BIND_LABELS[action]+'</b><button class="bind-key'+(bindingAction===action?' capturing':'')+'" data-bind="'+action+'">'+(bindingAction===action?'PRESS…':escapeHtml(keyLabel(binds[action])))+'</button></div>').join('');
  const status=document.getElementById('bindStatus');
  if(status&&bindingAction)status.textContent='PRESS A KEY TO BIND · ESC CANCELS';
  else if(status)status.textContent='CLICK A KEY TO REBIND';
  updateBindsDisplay();
}
function updateBindsDisplay(){
  const help=document.querySelector('.help');
  if(help)help.textContent='WASD / ↑↓ MOVE · '+keyLabel(binds.sprint)+' SPRINT · '+keyLabel(binds.jump)+' JUMP · '+keyLabel(binds.crouch)+' CROUCH / SLIDE · '+keyLabel(binds.aim)+' / RMB SCOPE · '+keyLabel(binds.reload)+' RELOAD · '+keyLabel(binds.melee)+' MELEE · 1-4 LOADOUT · '+keyLabel(binds.settings)+' SETTINGS';
}
addEventListener('keydown',event=>{
  if(!bindingAction)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(event.code==='Escape'){bindingAction=null;renderBindList();return;}
  binds[bindingAction]=event.code;
  bindingAction=null;saveBinds();renderBindList();playSound('ui');
},true);

/* ================================================================== */
/* ICON WEAPON PICKERS                                                 */
/* ================================================================== */
function fillWeaponSelect(select,category){
  if(!select)return;
  const current=select.value;
  select.innerHTML=weapons.filter(def=>def.category===category).map(def=>'<option value="'+def.id+'">'+escapeHtml(def.name)+'</option>').join('');
  if(current&&weapons.some(def=>def.id===Number(current)&&def.category===category))select.value=current;
}
function weaponCardHtml(def,selectedId,scope){
  const locked=!ownedWeapon(def.id);
  const selected=Number(selectedId)===def.id;
  const wrap=selected&&equippedWrap?'<span class="wc-wrap" style="--wrap:'+colorCss(equippedWrap.color)+'"></span>':'';
  const tag=locked?'<span class="wc-price">UNLOCK '+def.price+' 🔑</span>':escapeHtml(def.desc);
  return '<button type="button" class="weapon-card'+(selected?' selected':'')+(locked?' locked':'')+'" data-weapon="'+def.id+'" data-scope="'+scope+'" title="'+escapeHtml(def.name+' · '+def.desc)+'">'
    +(locked?'<span class="wc-lock">🔒 '+def.price+'</span>':'')
    +weaponIconSvg(def.icon)
    +'<span class="wc-name">'+escapeHtml(def.name)+'</span>'
    +'<span class="wc-tag">'+tag+'</span>'+wrap+'</button>';
}
function renderPicker(containerId,selectId,category,scope){
  const container=document.getElementById(containerId);
  const select=document.getElementById(selectId);
  if(!container||!select)return;
  fillWeaponSelect(select,category);
  const selected=Number(select.value);
  container.innerHTML=weapons.filter(def=>def.category===category).map(def=>weaponCardHtml(def,selected,scope)).join('');
}
function renderWeaponPickers(){
  renderPicker('loadoutPrimaryIcons','loadoutPrimary','primary','loadout');
  renderPicker('loadoutSecondaryIcons','loadoutSecondary','secondary','loadout');
  renderPicker('loadoutMeleeIcons','loadoutMelee','melee','loadout');
  renderPicker('loadoutUtilityIcons','loadoutUtility','utility','loadout');
  renderPicker('duelPrimaryIcons','duelPrimary','primary','duel');
  renderPicker('duelSecondaryIcons','duelSecondary','secondary','duel');
  renderPicker('duelMeleeIcons','duelMelee','melee','duel');
  renderPicker('duelUtilityIcons','duelUtility','utility','duel');
}
document.addEventListener('click',event=>{
  const card=event.target.closest('.weapon-card');
  if(!card)return;
  const id=Number(card.dataset.weapon);
  if(!ownedWeapon(id)){tryUnlockWeapon(id);renderWeaponPickers();return;}
  const def=weaponDef(id);
  if(card.dataset.scope==='duel'){
    document.getElementById('duel'+def.category[0].toUpperCase()+def.category.slice(1)).value=String(id);
    renderWeaponPickers();playSound('ui');
    return;
  }
  if(def.category==='primary')player.primaryChoice=id;
  else if(def.category==='secondary')player.secondaryChoice=id;
  else if(def.category==='melee')player.meleeChoice=id;
  else player.utilityChoice=id;
  const select=document.getElementById('loadout'+def.category[0].toUpperCase()+def.category.slice(1));
  if(select)select.value=String(id);
  renderWeaponPickers();saveActiveProfile();playSound('ui');
});
equippedWrap=equippedWrapDef();
rebuildWeapon();

function loadProfiles(){
  try{
    const list=JSON.parse(readLocal(PROFILE_KEY)||'[]');
    profiles=Array.isArray(list)?list.filter(profile=>profile&&typeof profile.name==='string'&&profile.name.trim()).slice(0,20):[];
  }catch(error){profiles=[];}
  return profiles;
}
function persistProfiles(){
  profiles=profiles.slice(-20);
  writeLocal(PROFILE_KEY,JSON.stringify(profiles));
}
function sanitizeDisplayName(value){
  return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,16);
}
function currentProfile(){
  const field=id=>document.getElementById(id)?.value;
  return {
    id:activeProfileId||('p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),
    name:sanitizeDisplayName(netName),
    skin:netSkin,
    tagColor:netTagColor,
    primary:Number(field('loadoutPrimary')??player.primaryChoice),
    secondary:Number(field('loadoutSecondary')??player.secondaryChoice),
    melee:Number(field('loadoutMelee')??player.meleeChoice),
    utility:Number(field('loadoutUtility')??player.utilityChoice),
    difficulty:field('singleDifficulty')||single.difficulty,
    sensitivity:Number(field('sensitivity')??player.sensitivity),
    scopeSensitivity:Number(field('scopeSensitivity')??player.scopeSensitivity),
    crosshairColor:field('crosshairColor')||'#ffffff',
    crosshairStyle:field('crosshairStyle')||'',
    aimMode:player.aimMode,
    invertY:!!player.invertY,
    soundVolume:sound.volume,
    soundMuted:sound.muted,
    stats:{...progression.stats},
    updated:Date.now()
  };
}
function saveActiveProfile(){
  if(!profilesEnabled||!netName)return;
  const profile=currentProfile();
  activeProfileId=profile.id;
  writeSession('beathim-profile-id',activeProfileId);
  const index=profiles.findIndex(entry=>entry.id===profile.id);
  if(index>=0)profiles[index]=profile;else profiles.push(profile);
  persistProfiles();
  renderProfileOptions();
}
function deleteActiveProfile(){
  const index=profiles.findIndex(entry=>entry.id===activeProfileId);
  if(index>=0)profiles.splice(index,1);
  activeProfileId='';
  writeSession('beathim-profile-id','');
  persistProfiles();
  renderProfileOptions();
}
function renderProfileOptions(){
  const select=document.getElementById('profileSelect');
  if(!select)return;
  select.innerHTML='<option value="">— NEW PROFILE —</option>'+profiles.map(profile=>'<option value="'+escapeHtml(profile.id)+'">'+escapeHtml(profile.name)+'</option>').join('');
  select.value=profiles.some(profile=>profile.id===activeProfileId)?activeProfileId:'';
}
function applyProfile(profile,announce=true){
  if(!profile)return;
  activeProfileId=profile.id||activeProfileId;
  if(activeProfileId)writeSession('beathim-profile-id',activeProfileId);
  const skin=Number(profile.skin);
  if(MP_SKINS.includes(skin)){netSkin=skin;writeSession('beathim-skin',String(netSkin));}
  const tag=Number(profile.tagColor);
  if(Number.isFinite(tag)&&tag>0){netTagColor=tag;writeSession('beathim-tag-color',String(netTagColor));}
  if(profile.name){netName=sanitizeDisplayName(profile.name);writeSession('beathim-name',netName);}
  const setField=(id,value)=>{const element=document.getElementById(id);if(element&&value!==undefined&&value!==null){element.value=String(value);return true;}return false;};
  if(setField('loadoutPrimary',profile.primary))player.primaryChoice=Number(profile.primary);
  if(setField('loadoutSecondary',profile.secondary))player.secondaryChoice=Number(profile.secondary);
  if(setField('loadoutMelee',profile.melee))player.meleeChoice=Number(profile.melee);
  if(setField('loadoutUtility',profile.utility))player.utilityChoice=Number(profile.utility);
  if(setField('singleDifficulty',profile.difficulty))single.difficulty=String(profile.difficulty);
  if(typeof profile.soundVolume==='number'){sound.volume=Math.max(0,Math.min(1,profile.soundVolume));applySoundVolume();}
  if(typeof profile.soundMuted==='boolean'){sound.muted=profile.soundMuted;applySoundVolume();}
  if(profile.aimMode){player.aimMode=profile.aimMode==='toggle'?'toggle':'hold';setField('aimMode',player.aimMode);}
  if(typeof profile.invertY==='boolean'){player.invertY=profile.invertY;const field=document.getElementById('invertY');if(field)field.checked=player.invertY;}
  syncSoundControls();
  if(setField('sensitivity',profile.sensitivity)){
    player.sensitivity=Number(profile.sensitivity);
    const label=document.getElementById('sensitivityValue');if(label)label.textContent=player.sensitivity.toFixed(1);
  }
  if(setField('scopeSensitivity',profile.scopeSensitivity)){
    player.scopeSensitivity=Number(profile.scopeSensitivity);
    const label=document.getElementById('scopeSensitivityValue');if(label)label.textContent=player.scopeSensitivity.toFixed(1);
  }
  setField('crosshairColor',profile.crosshairColor);
  setField('crosshairStyle',profile.crosshairStyle);
  renderWeaponPickers();
  updateCrosshair();
  applyLocalSkin();
  applyLobbyColors();
  renderProfileOptions();
  if(announce){netSendHello();netSendState();renderLobbyList();}
}
(function initIdentity(){
  loadProfiles();
  const lastProfile=profiles.slice().sort((a,b)=>(b.updated||0)-(a.updated||0))[0];
  const savedSkin=Number(readSession('beathim-skin'));
  if(MP_SKINS.includes(savedSkin))netSkin=savedSkin;
  else if(lastProfile&&MP_SKINS.includes(Number(lastProfile.skin)))netSkin=Number(lastProfile.skin);
  else netSkin=MP_SKINS[Math.floor(Math.random()*MP_SKINS.length)];
  const savedTag=Number(readSession('beathim-tag-color'));
  netTagColor=Number.isFinite(savedTag)&&savedTag>0?savedTag:(lastProfile&&Number(lastProfile.tagColor)>0?Number(lastProfile.tagColor):netSkin);
  netName=readSession('beathim-name')||(lastProfile&&lastProfile.name)||(MP_NAMES[Math.floor(Math.random()*MP_NAMES.length)]+' '+(10+Math.floor(Math.random()*89)));
  writeSession('beathim-skin',String(netSkin));
  writeSession('beathim-tag-color',String(netTagColor));
  writeSession('beathim-name',netName);
  if(!readSession('beathim-profile-id')&&lastProfile&&lastProfile.id){
    activeProfileId=lastProfile.id;
    writeSession('beathim-profile-id',activeProfileId);
  }
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
  // Babylon's right-handed billboard plane presents the texture from its
  // back side, so pre-mirror the canvas text to keep the in-world label
  // readable. The adapter also flips the plane vertically for the billboard
  // orientation; keeping this correction here makes every label use the same
  // readable raster regardless of its avatar's parent rotation.
  context.save();
  context.scale(-1,1);
  context.textAlign='center';context.textBaseline='middle';
  context.fillStyle=skinCss(color);
  context.fillText(text,-128,34);
  context.restore();
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
function makeRemoteAvatar(color,name,tagColor=color){
  const fighter=buildFighter(color,color);
  const group=fighter.group;
  const gunRig=new THREE.Group();
  gunRig.position.set(.55,1.3,.45);
  const guns={};
  for(const slot of [0,1,4,5]){
    const model=buildGunModel(slot);
    model.visible=slot===0;
    guns[slot]=model;
    gunRig.add(model);
  }
  group.add(gunRig);
  group.userData.guns=guns;
  group.userData.gunRig=gunRig;
  group.userData.parts=fighter.parts;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.05,8,24),mat(color,color));
  ring.rotation.x=Math.PI/2;ring.position.y=.06;group.add(ring);
  const tag=makeNameTag(name,tagColor);
  group.userData.nameTag=tag;
  group.add(tag);
  group.visible=false;
  return group;
}
const net=createNet(handleNetMessage,{onReady:()=>{netSendHello();netSendState();}});
function netSendHello(){net.send({t:'hello',skin:netSkin,tagColor:netTagColor,name:netName});}
function netSendState(){
  net.send({t:'state',skin:netSkin,tagColor:netTagColor,name:netName,p:[player.pos.x,player.pos.y,player.pos.z],yaw:player.yaw,hp:player.hp,mode:gameMode,score:duel.myScore,deaths:duel.deaths,dueling:duel.active?1:0,slot:player.slot,reload:player.reloading?1:0});
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
  const messageTagColor=Number.isFinite(Number(message.tagColor))?Number(message.tagColor):message.skin;
  const fresh=!remote||remote.skin!==message.skin||remote.tagColor!==messageTagColor;
  if(fresh){
    if(remote)scene.remove(remote.group);
    remote={id:message.from,skin:message.skin,tagColor:messageTagColor,name:message.name||'PLAYER',group:makeRemoteAvatar(message.skin,message.name||'PLAYER',messageTagColor),target:new THREE.Vector3(),yaw:0,hp:100,mode:message.mode||'',lastSeen:performance.now()};
    scene.add(remote.group);
    remotePlayers.set(message.from,remote);
    if(message.mode===gameMode)showMessage(remote.name+' JOINED');
  }
  remote.target.set(message.p[0],message.p[1],message.p[2]);
  if(fresh)remote.group.position.set(message.p[0],message.p[1]-2.2,message.p[2]);
  remote.yaw=message.yaw||0;
  remote.slot=Number.isFinite(Number(message.slot))?Number(message.slot):0;
  remote.reloading=!!message.reload;
  const guns=remote.group.userData.guns;
  if(guns){
    const base=weaponDef(remote.slot).base;
    for(const key in guns)guns[key].visible=Number(key)===base;
  }
  remote.hp=message.hp;
  remote.mode=message.mode||'';
  remote.tagColor=messageTagColor;
  if(!fresh&&message.name&&message.name!==remote.name){
    remote.name=message.name;
    renameNameTag(remote.group.userData.nameTag,remote.name,remote.tagColor);
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
      recordStat('deaths');
      if(!duel.weapons.includes(player.slot))forceWeapon(duel.weapons[0]);
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
  }else if(message.t==='shot'){
    if(!Array.isArray(message.o)||!Array.isArray(message.e))return;
    const remote=remotePlayers.get(message.from);
    if(!remote||!remote.group.visible)return;
    if(remote.mode!==gameMode)return;
    if(gameMode!=='lobby'&&!(duel.active&&remote.id===duel.opponent))return;
    const from=new THREE.Vector3(message.o[0],message.o[1],message.o[2]);
    const to=new THREE.Vector3(message.e[0],message.e[1],message.e[2]);
    if(from.distanceToSquared(camera.position)>140*140)return;
    spawnBulletTracer(from,to,remote.skin||TRACER_ENEMY,.03);
  }else if(message.t==='duel-invite'){
    if(message.to!==net.id)return;
    if(duel.pending===message.from)return;
    if(duel.active||duel.pending){net.send({t:'duel-decline',to:message.from,name:netName});return;}
    showDuelPrompt(message.from,message.name);
    lobbyStatus((message.name||'PLAYER')+' CHALLENGES YOU');
  }else if(message.t==='duel-accept'){
    if(message.to!==net.id)return;
    if(duel.active){if(duel.opponent!==message.from)net.send({t:'duel-end',to:message.from,reason:'busy'});return;}
    // Both players configure their own map and weapon categories after the
    // request is accepted.
    openDuelSetup(message.from,message.name,'challenger');
  }else if(message.t==='duel-choice'){
    if(message.to!==net.id||duel.active)return;
    const choices=Array.isArray(message.weapons)?message.weapons:[];
    duel.peerMap=DUEL_MAPS.includes(message.map)?message.map:'arena';
    duel.peerWeapons=choices.map(Number).filter(slot=>DUEL_WEAPONS.includes(slot));
    if(!duel.peerWeapons.length)duel.peerWeapons=[0];
    if(!duel.setupTarget)openDuelSetup(message.from,message.name,'challenger');
    tryStartDuel();
  }else if(message.t==='duel-start'){
    if(message.to!==net.id||duel.active)return;
    startDuel(message.from,message.name,message.map,message.acceptorWeapons||message.weapons);
  }else if(message.t==='duel-decline'){
    if(message.to!==net.id)return;
    lobbyStatus((message.name||'PLAYER')+' DECLINED');
  }else if(message.t==='duel-end'){
    if(message.to!==net.id||!duel.active)return;
    if(!duel.over){
      duel.over=true;
      showMessage(message.reason==='win'?'YOU LOST THE PVP':'OPPONENT LEFT THE PVP');
    }
    setTimeout(finishDuel,1600);
  }else if(message.t==='bye'){
    removeRemote(message.from);
    if(duel.active&&message.from===duel.opponent){
      if(!duel.over){duel.over=true;showMessage('OPPONENT LEFT THE PVP');}
      setTimeout(finishDuel,1200);
    }
  }
}
function findBotByObject(object){
  let node=object;
  while(node){
    const bot=bots.find(candidate=>candidate.root===node);
    if(bot)return bot;
    node=node.parent;
  }
  return null;
}
function findRemoteByObject(object){
  let node=object;
  while(node){
    for(const remote of remotePlayers.values())if(remote.group===node)return remote;
    node=node.parent;
  }
  return null;
}
function updateRemotePlayers(dt){
  const now=performance.now();
  for(const remote of remotePlayers.values()){
    // Normal maps are solo instances: remote players stay hidden there.
    // The lobby shows lobby players, while an active PVP shows only its
    // opponent. This prevents players in unrelated matches from appearing.
    const allowed=gameMode==='lobby'
      ? remote.mode==='lobby'
      : duel.active&&remote.id===duel.opponent&&remote.mode===gameMode;
    const visible=allowed&&now-remote.lastSeen<20000;
    remote.group.visible=visible;
    if(!visible)continue;
    const k=Math.min(1,dt*12);
    remote.group.position.x+=(remote.target.x-remote.group.position.x)*k;
    remote.group.position.y+=((remote.target.y-2.2)-remote.group.position.y)*k;
    remote.group.position.z+=(remote.target.z-remote.group.position.z)*k;
    remote.group.rotation.y=remote.yaw+Math.PI;
    const dx=remote.target.x-remote.group.position.x,dz=remote.target.z-remote.group.position.z;
    animateFighter(remote.group,dt,Math.min(9,Math.hypot(dx,dz)*14),remote.reloading?1:0);
  }
}

/* ---------------- PVP DUELS + LOBBY PLAYER LIST ---------------- */
const DUEL_TARGET=5;
const DUEL_WEAPONS=weapons.map(def=>def.id);
const DUEL_MAPS=['arena','battleground'];
const WEAPON_SHORT=Object.fromEntries(weapons.map(def=>[def.id,def.short]));
const duel={active:false,over:false,opponent:null,opponentName:'',myScore:0,theirScore:0,deaths:0,pending:null,pendingName:'',map:'arena',weapons:[0,1,2,3],lastMap:'arena',lastWeapons:[0,1,2,3],setupTarget:null,setupName:'',setupMap:'arena',setupStep:1,setupRole:'acceptor',peerMap:'arena',peerWeapons:[],waitingChoice:false,setupSubmitted:false};
function duelSpawnZ(){
  const spread=duel.map==='battleground'?24:18;
  return String(net.id)<String(duel.opponent)?spread:-spread;
}
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
    rows.push('<div class="mp-row"><span class="mp-dot" style="background:'+skinCss(remote.skin)+';color:'+skinCss(remote.skin)+'"></span><b>'+escapeHtml(remote.name)+'</b><button class="mp-duel" data-id="'+escapeHtml(remote.id)+'">PVP</button></div>');
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
  if(duel.active){lobbyStatus('FINISH YOUR PVP FIRST');return;}
  net.send({t:'duel-invite',to:id,name:netName,skin:netSkin});
  lobbyStatus('PVP REQUEST SENT TO '+remote.name);
}
function showDuelPrompt(fromId,name){
  if(duel.pending)return;
  duel.pending=fromId;duel.pendingName=name||'PLAYER';
  document.getElementById('duelPromptText').textContent=(name||'PLAYER')+' wants to PVP. First to '+DUEL_TARGET+' wins.';
  document.getElementById('duelPrompt').classList.add('open');
}
function markMapChoice(){
  document.querySelectorAll('#duelSetup .map-option').forEach(button=>{
    button.classList.toggle('selected',button.dataset.map===duel.setupMap);
  });
}
function showDuelStep(step){
  duel.setupStep=step;
  document.getElementById('duelStepMap').hidden=step!==1;
  document.getElementById('duelStepWeapons').hidden=step!==2;
  document.getElementById('duelSetupTitle').textContent=step===1?'CHOOSE A MAP':'CHOOSE YOUR WEAPONS';
}
function openDuelSetup(target,name,role='acceptor'){
  duel.setupTarget=target;duel.setupName=name||'PLAYER';duel.setupRole=role;
  duel.setupMap=duel.lastMap;
  duel.setupStep=1;
  duel.setupSubmitted=false;
  document.getElementById('duelSetupWho').textContent='VS '+(name||'PLAYER')+(role==='challenger'?' · THEY CHOSE '+duel.peerMap.toUpperCase():'');
  markMapChoice();
  document.getElementById('duelPrimary').value=String(duel.lastWeapons[0]??0);
  document.getElementById('duelSecondary').value=String(duel.lastWeapons[1]??1);
  document.getElementById('duelMelee').value=String(duel.lastWeapons[2]??2);
  document.getElementById('duelUtility').value=String(duel.lastWeapons[3]??3);
  showDuelStep(1);
  document.getElementById('duelSetup').classList.add('open');
}
function closeDuelSetup(keepTarget=false){
  document.getElementById('duelSetup').classList.remove('open');
  if(!keepTarget)duel.setupTarget=null;
}
function cancelDuelSetup(){
  const target=duel.setupTarget;
  closeDuelSetup();
  if(target)net.send({t:'duel-decline',to:target,name:netName});
}
function startSetupDuel(){
  const target=duel.setupTarget, name=duel.setupName;
  if(!target){closeDuelSetup();return;}
  const remote=remotePlayers.get(target);
  const map=duel.setupMap==='battleground'?'battleground':'arena';
  const chosen=[
    Number(document.getElementById('duelPrimary').value),
    Number(document.getElementById('duelSecondary').value),
    Number(document.getElementById('duelMelee').value),
    Number(document.getElementById('duelUtility').value)
  ];
  if(chosen.some(slot=>!DUEL_WEAPONS.includes(slot))){lobbyStatus('CHOOSE A VALID WEAPON');return;}
  duel.setupSubmitted=true;
  duel.lastMap=map;duel.lastWeapons=chosen;
  closeDuelSetup(true);
  if(!remote){lobbyStatus('THAT PLAYER IS GONE');return;}
  net.send({t:'duel-choice',to:target,name:netName,map,weapons:chosen});
  duel.waitingChoice=true;
  lobbyStatus('PVP CHOICE SENT — WAITING FOR THEIR MAP AND WEAPONS');
  tryStartDuel();
}
function duelResolvedMap(localMap,peerMap,localId,peerId){
  if(localMap===peerMap)return localMap;
  const firstOwn=String(localId)<String(peerId)?localMap:peerMap;
  const seed=(String(localId)+String(peerId)+localMap+peerMap).split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
  return seed%2===0?firstOwn:(firstOwn===localMap?peerMap:localMap);
}
function tryStartDuel(){
  if(duel.active||!duel.setupSubmitted||!duel.setupTarget||!duel.peerWeapons?.length)return;
  const remote=remotePlayers.get(duel.setupTarget);
  if(!remote)return;
  const map=duelResolvedMap(duel.setupMap,duel.peerMap,net.id,duel.setupTarget);
  const chosen=duel.lastWeapons.slice();
  // The selected list is captured before the setup card closes.
  startDuel(duel.setupTarget,duel.setupName,map,chosen);
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
function startDuel(opponentId,opponentName,map,weapons){
  duel.active=true;duel.over=false;
  duel.waitingChoice=false;
  duel.setupTarget=null;duel.setupSubmitted=false;
  duel.opponent=opponentId;duel.opponentName=opponentName||'OPPONENT';
  duel.map=DUEL_MAPS.includes(map)?map:'arena';
  const pool=(Array.isArray(weapons)?weapons:[weapons])
    .map(Number)
    .filter(slot=>DUEL_WEAPONS.includes(slot));
  duel.weapons=pool.length?[...new Set(pool)]:[0];
  duel.lastMap=duel.map;duel.lastWeapons=duel.weapons.slice();
  duel.myScore=0;duel.theirScore=0;duel.deaths=0;
  const opponent=remotePlayers.get(opponentId);
  if(opponent)opponent.deaths=0;
  hideDuelPrompt();
  document.body.classList.add('duel');
  startGame(duel.map);
  const info=document.getElementById('roundInfo');
  if(info)info.innerHTML='PVP<br><span style="color:#ffd45c">FIRST TO '+DUEL_TARGET+' · '+duel.map.toUpperCase()+' · '+duel.weapons.map(slot=>WEAPON_SHORT[slot]).join(' + ')+'</span>';
  updateDuelHud();
  showMessage('PVP VS '+duel.opponentName);
  netSendState();
  setTimeout(()=>{if(!document.pointerLockElement&&duel.active)dbgLockMouse();},150);
}
function winDuel(){
  if(duel.over)return;
  duel.over=true;
  recordStat('wins');recordStat('pvp');
  showMessage('YOU WIN THE PVP');
  net.send({t:'duel-end',to:duel.opponent,reason:'win'});
  setTimeout(finishDuel,2600);
}
function loseDuel(){
  if(duel.over)return;
  duel.over=true;
  recordStat('losses');
  showMessage('YOU LOST THE PVP');
  setTimeout(finishDuel,2600);
}
function finishDuel(){
  if(!duel.active)return;
  duel.active=false;duel.over=false;duel.opponent=null;
  duel.waitingChoice=false;duel.setupRole='acceptor';
  duel.myScore=0;duel.theirScore=0;duel.deaths=0;
  document.body.classList.remove('duel');
  enterLobby();
}
function enterLobby(){
  gameMode='lobby';
  cpu.active=false;cpu.over=false;cpu.mode='';cpu.playerDown=false;
  single.active=false;single.countdown=0;single.goFlash=0;
  hideCountdown();
  document.body.classList.remove('match-open');
  const report=document.getElementById('singleReport');
  if(report)report.classList.remove('open');
  blueScoreEl.textContent='0';
  redScoreEl.textContent='0';
  const roundEl=document.getElementById('roundInfo');
  if(roundEl)roundEl.innerHTML='LOBBY<br><span style="color:#6cd9ff">1V1 PVP · SINGLE PLAYER</span>';
  document.querySelector('.hud').classList.add('lobby');
  const startScreen=document.getElementById('start');
  startScreen.style.display='block';
  startScreen.classList.remove('choosing');
  document.getElementById('playMenu').style.display='';
  document.getElementById('modePicker').style.display='';
  lobbyGroup.visible=true;
  arenaMapGroup.visible=false;
  rangeGroup.visible=false;
  battlegroundParts.forEach(object=>object.visible=false);
  scene.background.setHex(0x2b4f8c);scene.fog.color.setHex(0x2b4f8c);
  scene.fog.near=55;scene.fog.far=140;
  worldHemi.visible=worldAmbient.visible=sun.visible=false;
  bots.forEach(b=>b.root.visible=false);
  player.pos.set(0,2.2,6);player.vertical=0;player.hp=100;
  player.yaw=0;player.cameraYaw=0;player.pitch=0;player.avatarYaw=0;
  player.reloading=false;player.sliding=false;player.crouching=false;
  healthBarEl.style.width='100%';hpTextEl.textContent=100;
  weaponView.visible=false;
  clearDecals();
  if(document.pointerLockElement)document.exitPointerLock();
  renderWeaponPickers();
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
  openDuelSetup(target,name,'acceptor');
};
document.getElementById('duelNext').onclick=()=>showDuelStep(2);
document.getElementById('duelBack').onclick=()=>showDuelStep(1);
document.getElementById('duelStart').onclick=startSetupDuel;
document.getElementById('duelCancel').onclick=cancelDuelSetup;
document.querySelectorAll('#duelSetup .map-option').forEach(button=>{
  button.onclick=()=>{duel.setupMap=button.dataset.map;markMapChoice();};
});
document.getElementById('duelDecline').onclick=()=>{
  const target=duel.pending;
  hideDuelPrompt();
  if(target)net.send({t:'duel-decline',to:target,name:netName});
};
document.getElementById('leaveDuel').onclick=()=>{
  if(!duel.active)return;
  net.send({t:'duel-end',to:duel.opponent,reason:'left'});
  showMessage('LEFT THE PVP');
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
  localTag=makeNameTag(netName,netTagColor);
  localTag.position.y=2.85;
  lobbyAvatar.add(localTag);
}
applyLocalSkin();
function colorValue(color){return '#'+Number(color).toString(16).padStart(6,'0');}
function applyLobbyColors(){
  const skinInput=document.getElementById('playerSkinColor');
  const tagInput=document.getElementById('nameTagColor');
  if(skinInput)skinInput.value=colorValue(netSkin);
  if(tagInput)tagInput.value=colorValue(netTagColor);
}
function setLobbyColor(input,type){
  const value=Number.parseInt(String(input.value).replace('#',''),16);
  if(!Number.isFinite(value))return;
  if(type==='skin'){
    netSkin=value;
    writeSession('beathim-skin',String(netSkin));
    applyLocalSkin();
  }else{
    netTagColor=value;
    writeSession('beathim-tag-color',String(netTagColor));
    applyLocalSkin();
  }
  netSendHello();netSendState();renderLobbyList();
  saveActiveProfile();
}
document.getElementById('playerSkinColor').oninput=e=>setLobbyColor(e.target,'skin');
document.getElementById('nameTagColor').oninput=e=>setLobbyColor(e.target,'tag');
applyLobbyColors();
// Restore the saved profile's loadout and settings once every control exists.
(function restoreProfile(){
  const profile=profiles.find(entry=>entry.id===activeProfileId);
  if(profile)applyProfile(profile,false);
  renderProfileOptions();
})();
/* ---------------- DISPLAY NAME ---------------- */
const nameGate=document.getElementById('nameGate');
const nameInput=document.getElementById('nameInput');
const profileSelect=document.getElementById('profileSelect');
function openNameGate(){
  nameInput.value=netName;
  renderProfileOptions();
  nameGate.classList.add('open');
  setTimeout(()=>{nameInput.focus();nameInput.select();},120);
}
function submitDisplayName(){
  const cleaned=sanitizeDisplayName(nameInput.value);
  if(cleaned&&cleaned!==netName){
    netName=cleaned;
    writeSession('beathim-name',netName);
    applyLocalSkin();
    renderLobbyList();
    netSendHello();
    netSendState();
  }
  profilesEnabled=true;
  saveActiveProfile();
  nameGate.classList.remove('open');
}
document.getElementById('nameConfirm').onclick=submitDisplayName;
profileSelect.onchange=()=>{
  const profile=profiles.find(entry=>entry.id===profileSelect.value);
  if(!profile){
    activeProfileId='';
    writeSession('beathim-profile-id','');
    return;
  }
  profilesEnabled=true;
  applyProfile(profile);
  nameInput.value=netName;
};
document.getElementById('profileDelete').onclick=()=>{
  deleteActiveProfile();
  nameInput.value=netName;
};
document.getElementById('profileOpen').onclick=()=>{
  toggleSettings(false);
  openNameGate();
};
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
// Do not store the debug password itself in the public client. This is only
// obfuscation, not real security: anything shipped to a browser can be
// inspected. A server-side verifier is required for a truly private console.
const DEBUG_PASSWORD_HASH='9b957b1d705f13eef55410bc0c7138238b7d7339f01aa6ab850657bb3130d13f';
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
  +'<div class="dbg-fly"><span class="dbg-flylabel">AIMBOT</span>'
  +'<button class="dbg-btn dbg-aimbtn" data-dbg="aimon">ON</button>'
  +'<button class="dbg-btn dbg-aimbtn" data-dbg="aimoff">OFF</button>'
  +'<label class="dbg-flylabel">TRACE <select id="dbgAimTarget" class="dbg-aimsel"><option value="enemies">ENEMIES</option><option value="pvp">PVP OPPONENT</option><option value="both">BOTH</option></select></label>'
  +'<span class="dbg-tip">locks the closest target</span></div>'
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

const dbgAimOn=dbgPanel.querySelector('[data-dbg="aimon"]');
const dbgAimOff=dbgPanel.querySelector('[data-dbg="aimoff"]');
const dbgAimTarget=dbgPanel.querySelector('#dbgAimTarget');
function dbgSyncAimbot(){
  dbgAimOn.classList.toggle('on',aimbot.enabled);
  dbgAimOff.classList.toggle('on',!aimbot.enabled);
  if(dbgAimTarget&&document.activeElement!==dbgAimTarget)dbgAimTarget.value=aimbot.target;
}
dbgAimOn.onclick=()=>{aimbot.enabled=true;dbgSyncAimbot();dbgAppend('info','aimbot ON · trace '+aimbot.target);};
dbgAimOff.onclick=()=>{aimbot.enabled=false;dbgSyncAimbot();dbgAppend('info','aimbot OFF');};
dbgAimTarget.onchange=()=>{aimbot.target=dbgAimTarget.value;dbgAppend('info','aimbot trace -> '+aimbot.target);};
dbgSyncAimbot();
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
  const currentWeapon=weaponDef(player.slot);
  const ammo=player.ammo[currentWeapon.id];
  const hasMag=!!currentWeapon.mag;
  const states=[player.sliding?'SLIDE':'',player.crouching&&!player.sliding?'CROUCH':'',player.grounded?'GROUND':'AIR',player.aiming?'AIM':'',player.reloading?'RELOAD':''].filter(Boolean).join(' ')||'IDLE';
  const rows=[
    ['fps',dbg.fps.toFixed(0)+(dbg.fps?' ('+(1000/dbg.fps).toFixed(1)+'ms)':'')],
    ['mode',gameMode],
    ['pos',player.pos.x.toFixed(2)+', '+player.pos.y.toFixed(2)+', '+player.pos.z.toFixed(2)],
    ['speed',dbg.speed.toFixed(2)+' u/s'],
    ['look',(player.yaw*57.2958).toFixed(0)+'deg / '+(player.pitch*57.2958).toFixed(0)+'deg'],
    ['weapon',currentWeapon.name+' #'+currentWeapon.id],
    ['ammo',hasMag?(ammo.mag+' / '+ammo.reserve):(currentWeapon.base===3?player.grenades+' grenades':'-')],
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
async function dbgUnlock(){
  const bytes=new TextEncoder().encode(dbgPass.value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(hash!==DEBUG_PASSWORD_HASH){
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
/* ---------------- NEW UI: modes, progression panels, settings ---------------- */
function openPanel(id){
  const panel=document.getElementById(id);
  if(!panel)return;
  if(document.pointerLockElement)document.exitPointerLock();
  if(id==='progressPanel'){renderProgressPanel();updateKeyBadge();}
  if(id==='leaderboardPanel')renderLeaderboard();
  panel.classList.add('open');
  playSound('ui');
}
function closePanel(id){
  const panel=document.getElementById(id);
  if(panel)panel.classList.remove('open');
  playSound('ui');
}
{
  const openProgress=document.getElementById('openProgress');
  const openLeaderboard=document.getElementById('openLeaderboard');
  const closeProgress=document.getElementById('closeProgress');
  const closeLeaderboard=document.getElementById('closeLeaderboard');
  if(openProgress)openProgress.onclick=()=>openPanel('progressPanel');
  if(openLeaderboard)openLeaderboard.onclick=()=>openPanel('leaderboardPanel');
  if(closeProgress)closeProgress.onclick=()=>closePanel('progressPanel');
  if(closeLeaderboard)closeLeaderboard.onclick=()=>closePanel('leaderboardPanel');
  const progressPanel=document.getElementById('progressPanel');
  if(progressPanel)progressPanel.addEventListener('click',event=>{
    if(event.target===progressPanel){closePanel('progressPanel');return;}
    const quest=event.target.closest('[data-quest]');
    if(quest&&!quest.disabled){claimQuest(quest.dataset.quest);return;}
    const wrap=event.target.closest('[data-wrap]');
    if(wrap&&!wrap.disabled)equipWrap(wrap.dataset.wrap);
  });
  const leaderboardPanel=document.getElementById('leaderboardPanel');
  if(leaderboardPanel)leaderboardPanel.addEventListener('click',event=>{if(event.target===leaderboardPanel)closePanel('leaderboardPanel');});
  const chestWeapon=document.getElementById('chestWeapon');
  const chestWrap=document.getElementById('chestWrap');
  if(chestWeapon)chestWeapon.onclick=()=>openChest('weapon');
  if(chestWrap)chestWrap.onclick=()=>openChest('wrap');
}
function launchCpu(mode){
  single.difficulty=document.getElementById('singleDifficulty').value;
  startCpuMode(mode);
}
{
  const tdm=document.getElementById('tdmMode');
  const survival=document.getElementById('survivalMode');
  const gunGame=document.getElementById('gunGameMode');
  const range=document.getElementById('rangeMode');
  if(tdm)tdm.onclick=()=>launchCpu('tdm');
  if(survival)survival.onclick=()=>launchCpu('survival');
  if(gunGame)gunGame.onclick=()=>launchCpu('gungame');
  if(range)range.onclick=()=>enterRange();
  const leaveMatch=document.getElementById('leaveMatch');
  if(leaveMatch)leaveMatch.onclick=()=>{
    if(gameMode==='range')exitRange();
    else if(gameMode==='single'){single.active=false;enterLobby();}
    else if(isCpuMode()){cpu.active=false;cpu.over=false;enterLobby();}
  };
}
/* sound settings */
try{
  const saved=JSON.parse(readLocal('beathim-sound-v1')||'null');
  if(saved&&typeof saved.volume==='number')sound.volume=Math.max(0,Math.min(1,saved.volume));
  if(saved&&typeof saved.muted==='boolean')sound.muted=saved.muted;
}catch(error){}
function saveSoundSettings(){writeLocal('beathim-sound-v1',JSON.stringify({volume:sound.volume,muted:sound.muted}));}
function syncSoundControls(){
  const volume=document.getElementById('soundVolume');
  if(volume)volume.value=String(Math.round(sound.volume*100));
  const label=document.getElementById('soundValue');
  if(label)label.textContent=String(Math.round(sound.volume*100));
  const mute=document.getElementById('soundMute');
  if(mute)mute.checked=sound.muted;
}
syncSoundControls();
applySoundVolume();
{
  const volume=document.getElementById('soundVolume');
  const mute=document.getElementById('soundMute');
  if(volume){
    volume.oninput=()=>{
      sound.volume=Math.max(0,Math.min(1,Number(volume.value)/100));
      syncSoundControls();applySoundVolume();saveSoundSettings();
    };
    volume.onchange=()=>playSound('ui');
  }
  if(mute)mute.onchange=()=>{
    sound.muted=mute.checked;
    applySoundVolume();saveSoundSettings();
    if(!sound.muted)playSound('ui');
  };
}
{
  const aimMode=document.getElementById('aimMode');
  const invertY=document.getElementById('invertY');
  if(aimMode){
    aimMode.value=player.aimMode;
    aimMode.onchange=()=>{player.aimMode=aimMode.value;playSound('ui');saveActiveProfile();};
  }
  if(invertY){
    invertY.checked=player.invertY;
    invertY.onchange=()=>{player.invertY=invertY.checked;saveActiveProfile();};
  }
}
{
  const bindList=document.getElementById('bindList');
  if(bindList)bindList.addEventListener('click',event=>{
    const button=event.target.closest('[data-bind]');
    if(!button)return;
    bindingAction=button.dataset.bind;
    renderBindList();
    playSound('ui');
  });
  const reset=document.getElementById('bindsReset');
  if(reset)reset.onclick=()=>{binds={...DEFAULT_BINDS};saveBinds();renderBindList();playSound('ui');};
  renderBindList();
}
{
  const loadoutSecondary=document.getElementById('loadoutSecondary');
  const loadoutUtility=document.getElementById('loadoutUtility');
  if(loadoutSecondary)loadoutSecondary.onchange=event=>{player.secondaryChoice=Number(event.target.value);renderWeaponPickers();saveActiveProfile();};
  if(loadoutUtility)loadoutUtility.onchange=event=>{player.utilityChoice=Number(event.target.value);renderWeaponPickers();saveActiveProfile();};
}
renderWeaponPickers();
renderProgressPanel();
updateKeyBadge();
updateBindsDisplay();

window.BEATHIM={player,bots,scene,camera,keys,weapons,THREE,startGame,setWeapon,useWeapon,reloadWeapon,damageFor,damageBot,hitBot,blocked,scytheDash,dbg,dbgToggle,dbgSetFly,update,setFly:dbgSetFly,aimbot,remotePlayers,net,duel,single,profiles,muzzleWorldPosition,spawnBulletTracer,botHasLineOfSight,mode:()=>gameMode,netSkin:()=>netSkin,netName:()=>netName,inviteDuel,startDuel,enterLobby,renderLobbyList,progression,cpu,weaponDef,renderWeaponPickers,startCpuMode,enterRange,rangeTargets,rangeStats,decals,playSound,claimQuest,openChest,equipWrap,WRAPS,DAILY_QUESTS};

function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);update(dt);renderer.render(scene,camera);dbg.frames++;dbg.acc+=dt;if(dbg.acc>=.5){dbg.fps=dbg.frames/dbg.acc;dbg.frames=0;dbg.acc=0;}if(dbg.open)dbgRefresh();} loop();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
