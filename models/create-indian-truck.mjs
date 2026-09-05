import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { readFileSync, writeFileSync } from 'node:fs';

// Metres; +Z is forward. Named parts remain editable in the Three.js editor.
const truck = new T.Group();
truck.name = 'Rajasthan Express · Indian cargo truck';
const font = new FontLoader().parse(JSON.parse(readFileSync(new URL('../node_modules/three/examples/fonts/helvetiker_bold.typeface.json', import.meta.url))));
const materials = {};
for (const [name, color] of Object.entries({ saffron: '#eee5cf', red: '#af262e', teal: '#164f66', cream: '#fff1c4', gold: '#ffc94b', black: '#20252b', rubber: '#14191d', chrome: '#b9c7c9', glass: '#153d50', blue: '#1669c1', green: '#333e3b', white: '#ffffff' })) {
  materials[name] = new T.MeshStandardMaterial({ name, color, roughness: name === 'rubber' ? 0.92 : 0.4, metalness: name === 'chrome' ? 0.8 : 0.12 });
}
function mesh(name, geometry, material, x, y, z, parent = truck) {
  const m = new T.Mesh(geometry, materials[material]);
  m.name = name; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(name, w, h, d, mat, x, y, z) { return mesh(name, new T.BoxGeometry(w,h,d), mat,x,y,z); }
function rounded(name,w,h,d,mat,x,y,z,r=.08) { return mesh(name,new T.BufferGeometry().copy(new RoundedBoxGeometry(w,h,d,3,r)),mat,x,y,z); }
function cyl(name, r, h, mat, x,y,z) { return mesh(name, new T.CylinderGeometry(r,r,h,24),mat,x,y,z); }
function label(text, size, mat, x,y,z, rotation = 0) {
  const geo = new TextGeometry(text,{font,size,depth:0.009,curveSegments:3}); geo.computeBoundingBox(); geo.translate(-(geo.boundingBox.max.x)/2,0,0);
  const m = mesh(text,new T.BufferGeometry().copy(geo),mat,x,y,z); m.rotation.y = rotation; return m;
}
function rod(name,a,b,r,mat) {
  const av = new T.Vector3(...a), bv = new T.Vector3(...b), delta = bv.clone().sub(av);
  const m = cyl(name,r,delta.length(),mat,...av.clone().add(bv).multiplyScalar(.5).toArray()); m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()); return m;
}
for(const x of [-.72,.72]) box('Chassis rail',.16,.28,8,'black',x,1.02,-.2);
for(const z of [-3,-1,1,3]) box('Chassis crossmember',1.6,.16,.15,'black',0,1,z);
box('Cargo floor',2.55,.22,5.4,'red',0,1.38,-1.48);
// Cab-over body, with separate glazing and painted doors.
rounded('Cab lower body',2.42,.77,2.25,'saffron',0,1.92,2.43);
box('Cab rear skirt',2.42,.45,.42,'saffron',0,1.36,1.51);
box('Cab nose skirt',2.42,.45,.4,'saffron',0,1.36,3.35);
rounded('Cab upper body',2.42,1.22,2.1,'saffron',0,2.9,2.37);
rounded('Ivory cab roof',2.62,.18,2.35,'cream',0,3.56,2.43);
box('Front windshield surround',2.2,.94,.06,'black',0,2.98,3.45);
for(const x of [-.545,.545]) box('Split windshield',1.035,.8,.065,'glass',x,2.99,3.49);
box('Windshield center pillar',.065,.94,.09,'cream',0,2.99,3.54);
box('Red sun visor',2.62,.18,.48,'red',0,3.48,3.51);
box('Front cream stripe',2.45,.13,.05,'cream',0,2.4,3.58);
box('Radiator grille',1.5,.5,.08,'black',0,1.93,3.59);
for(let y=1.74;y<2.2;y+=.085) box('Grille chrome slat',1.45,.027,.04,'chrome',0,y,3.65);
box('Front bumper',2.68,.25,.25,'chrome',0,1.16,3.68);
box('Bumper red inset',1.48,.15,.04,'red',0,1.17,3.82);
label('INDIA',.14,'cream',0,2.24,3.63);
box('Registration plate',.78,.19,.045,'gold',0,.98,3.8);
label('RJ 14 GA 1986',.073,'black',0,.955,3.83);
for(const x of [-.99,.99]) {
  box('Headlight bezel',.39,.4,.11,'cream',x,1.91,3.61);
  const light = cyl('Round headlamp',.145,.05,'white',x,1.93,3.7); light.rotation.x=Math.PI/2;
  box('Amber indicator',.3,.09,.065,'gold',x,1.64,3.66);
}
for(const side of [-1,1]) {
  box('Door window',.035,.77,1.5,'glass',side*1.223,3,2.36);
  box('Door lower panel',.045,.59,1.6,'saffron',side*1.23,2.09,2.35);
  box('Door cream trim',.055,.055,1.65,'cream',side*1.26,2.47,2.35);
  box('Door handle',.075,.06,.24,'chrome',side*1.29,2.36,1.85);
  box('Cab step',.34,.12,1.28,'chrome',side*1.3,1.16,2.35);
  rod('Mirror arm',[side*1.2,3.2,3.1],[side*1.6,3.15,3.3],.032,'chrome');
  box('Side mirror',.16,.47,.25,'black',side*1.62,3.05,3.3);
  box('Mirror glass',.035,.38,.2,'chrome',side*1.71,3.05,3.3);
  // Five framed cargo panels on each side.
  box('Cargo side',.12,2.05,5.35,'red',side*1.24,2.50,-1.48);
  for(let i=0;i<5;i++) {
    const z=.63-i*1.055;
    box('Cargo recessed red frame',.035,1.72,.88,'cream',side*1.31,2.50,z);
    box('Cargo cream border',.04,1.64,.80,'teal',side*1.333,2.50,z);
    box('Cargo red inset',.045,1.52,.70,'red',side*1.356,2.50,z);
    for(let y=1.82;y<3.2;y+=.16) box('Pressed cargo rib',.035,.025,.65,'saffron',side*1.39,y,z);
    const diamond=box('Hand-painted diamond',.05,.28,.28,'gold',side*1.416,2.50,z); diamond.rotation.x=Math.PI/4;
    for(const dy of [-.3,.3]) mesh('Painted rosette',new T.SphereGeometry(.065,8,6),'cream',side*1.42,2.50+dy,z);
  }
  for(let i=0;i<=5;i++) box('Cargo vertical stake',.16,2.18,.09,'saffron',side*1.29,2.50,1.2-i*1.07);
  for(const y of [1.46,3.57]) box('Cargo border rail',.2,.11,5.55,'gold',side*1.28,y,-1.48);
  box('Side underrun rail',.12,.1,2.05,'cream',side*1.22,.73,-.35);
  box('Fuel tank',.48,.58,1.05,'chrome',side*.98,1.03,.3);
  for(const z of [-2.5,-1.35,2.5]) {
    const wheelX=side*1.15;
    const tire = cyl('Heavy tire',.59,.37,'rubber',wheelX,.62,z); tire.rotation.z=Math.PI/2;
    const rim = cyl('Painted wheel rim',.37,.39,'cream',wheelX,.62,z); rim.rotation.z=Math.PI/2;
    const hub = cyl('Red wheel hub',.17,.43,'red',wheelX,.62,z); hub.rotation.z=Math.PI/2;
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5;
      const nut=cyl('Wheel lug',.032,.035,'chrome',wheelX+side*.225,.62+Math.cos(a)*.25,z+Math.sin(a)*.25);nut.rotation.z=Math.PI/2;
    }
    for(let i=0;i<32;i++) {
      const a=i*Math.PI/16;
      const tread=box('Tire tread block',.38,.04,.085,'black',wheelX,.62+Math.cos(a)*.585,z+Math.sin(a)*.585);tread.rotation.x=a;
    }
    box('Mudflap',.45,.48,.06,'rubber',wheelX,.45,z-.62);
  }
}
box('Cargo front bulkhead',2.5,2.1,.12,'red',0,2.5,1.22);
box('Rear tailgate',2.5,2.1,.13,'red',0,2.5,-4.17);
for(const x of [-1.15,1.15]) box('Tailgate stake',.1,2.1,.16,'cream',x,2.5,-4.25);
box('Rear slogan board',2.27,.54,.06,'red',0,2.23,-4.28);
label('HORN OK PLEASE',.185,'cream',0,2.17,-4.32,Math.PI);
label('USE DIPPER AT NIGHT',.105,'gold',0,1.7,-4.28,Math.PI);
box('Rear bumper',2.55,.15,.22,'chrome',0,1.13,-4.29);
for(const x of [-1,1]) box('Tail lamp',.26,.17,.08,'red',x,1.29,-4.33);
for(const x of [-.72,0,.72]) {
  box('Rear upper panel frame',.63,.77,.04,'cream',x,3.03,-4.26);
  box('Rear upper panel inset',.55,.69,.045,'teal',x,3.03,-4.29);
  const ornament=box('Rear diamond',.19,.19,.025,'gold',x,3.03,-4.33);ornament.rotation.z=Math.PI/4;
}
// A single symmetric, closed tarp profile; sampled ropes sit outside its surface.
const profile = new T.Shape();
profile.moveTo(-1.27,3.48); profile.lineTo(-1.27,3.89);
profile.quadraticCurveTo(-1.24,4.12,-.87,4.18);
profile.quadraticCurveTo(0,4.36,.87,4.18);
profile.quadraticCurveTo(1.24,4.12,1.27,3.89);
profile.lineTo(1.27,3.48);profile.closePath();
const tarpGeo = new T.ExtrudeGeometry(profile,{depth:5.3,bevelEnabled:false,curveSegments:16});
mesh('Continuous canvas tarpaulin',new T.BufferGeometry().copy(tarpGeo),'green',0,0,-4.13);
materials.green.roughness=.98;materials.green.metalness=0;
for(let i=0;i<9;i++) {
  const z=1.10-i*.645;
  const points=[[-1.4,3.02,z-.18],[-1.30,3.5,z],[-1.30,3.91,z],[-1.15,4.13,z],[-.87,4.22,z],[0,4.31,z],[.87,4.22,z],[1.15,4.13,z],[1.30,3.91,z],[1.30,3.5,z],[1.4,3.02,z+.18]];
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  mesh('Continuous tied cargo rope',new T.TubeGeometry(curve,64,.014,6,false),'cream',0,0,0);
}
rounded('Coachbuilt roof crown',2.58,.52,1.55,'red',0,3.84,2.64);
box('Roof sign',2.36,.36,.08,'teal',0,3.87,3.44);
box('Roof sign upper trim',2.6,.07,1.66,'gold',0,4.14,2.64);
label('GOODS CARRIER',.17,'cream',0,3.82,3.50);
for(const x of [-.94,-.47,0,.47,.94]) {
  mesh('Roof marker lamp',new T.SphereGeometry(.065,12,8),'gold',x,3.7,3.4);
}
for(const x of [-.88,.88]) {
  const horn=mesh('Roof air horn',new T.CylinderGeometry(.15,.045,.58,16),'chrome',x,4.28,2.12);horn.rotation.x=Math.PI/2;
}
// Marigold garland around the windscreen and traditional bumper tassels.
for(let i=0;i<23;i++) {
  const x=-1.1+i*.1, y=2.61-.16*(1-Math.abs(x)/1.1);
  mesh('Marigold garland',new T.SphereGeometry(.059,8,6),i%2?'gold':'saffron',x,y,3.65);
}
for(const x of [-1.1,-.85,.85,1.1]) {
  rod('Tassel cord',[x,1.1,3.78],[x,.75,3.78],.012,'black');
  mesh('Bumper tassel',new T.ConeGeometry(.055,.18,8),'red',x,.72,3.78);
}
// Fine coachwork: wheel arches, wipers, pinstripes, venting, roof rails and dual rear tires.
for(const side of [-1,1]) {
  const arch = new T.Shape();
  arch.absarc(0,0,.76,0,Math.PI,false);
  arch.absarc(0,0,.65,Math.PI,0,true);arch.closePath();
  const g = new T.ExtrudeGeometry(arch,{depth:.19,bevelEnabled:false,curveSegments:24});
  const f=mesh('Curved front wheel arch',new T.BufferGeometry().copy(g),'teal',side*1.2,.62,2.5);f.rotation.y=side*Math.PI/2;
  for(const z of [-2.5,-1.35]) {
    const inner=cyl('Inner dual rear tire',.59,.28,'rubber',side*.81,.62,z);inner.rotation.z=Math.PI/2;
  }
  for(const y of [1.7,1.77,2.39]) box('Cab painted pinstripe',.028,.025,1.75,'red',side*1.255,y,2.38);
  for(let z=1.65;z<2.04;z+=.075) box('Cab ventilation slit',.027,.17,.025,'black',side*1.26,2.18,z);
  label('ALL INDIA',.115,'teal',side*1.266,1.9,2.48,side*Math.PI/2);
  for(let i=0;i<5;i++) {
    const z=2.05+i*.27;
    rod('Roof rack upright',[side*1.16,4.15,z],[side*1.16,4.4,z],.017,'chrome');
  }
  rod('Roof rack rail',[side*1.16,4.4,2.02],[side*1.16,4.4,3.2],.022,'chrome');
  for(const z of [-2.5,-1.35,2.5]) rod('Axle',[side*.72,.64,z],[side*1.1,.64,z],.09,'black');
}
for(const x of [-.56,.56]) {
  rod('Wiper arm',[x,2.64,3.55],[x+.23,2.98,3.56],.016,'black');
  rod('Wiper blade',[x+.03,2.91,3.57],[x+.47,3.06,3.57],.024,'black');
}
for(const y of [2.31,2.37]) box('Front fine red stripe',2.36,.018,.025,'red',0,y,3.61);
label('TATA',.17,'chrome',0,2.18,3.69);
label('PUBLIC       CARRIER',.105,'cream',0,3.48,3.78);
for(const x of [-.99,.99]) {
  box('Headlight black recess',.34,.25,.04,'black',x,1.92,3.73);
  rounded('Rectangular headlamp lens',.26,.17,.05,'white',x,1.92,3.77,.025);
}
for(let x=-1.2;x<=1.2;x+=.15) {
  box('Bumper painted bands',.07,.18,.02,Math.round(x*20)%2?'red':'teal',x,1.16,3.82);
}
// Painted flowers across the sign: small petals remain flush with the panel.
for(const x of [-1.05,1.05]) {
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    const petal=mesh('Painted floral petal',new T.SphereGeometry(.04,8,6),'gold',x+Math.cos(a)*.065,3.99+Math.sin(a)*.065,3.502);petal.scale.z=.15;
  }
}
truck.userData = { units: 'metres', forward: '+Z', description: 'Original stylized Indian three-axle cargo truck with editable mesh lettering and decoration.' };
truck.updateMatrixWorld(true);
writeFileSync(new URL('indian-truck.json',import.meta.url), JSON.stringify(truck.toJSON()));
console.log(`Saved Indian truck: ${truck.children.length} editable parts`);
