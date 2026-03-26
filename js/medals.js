function createDefaultTexture(name) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(256,200,0,256,256,260);
  grad.addColorStop(0,'#ffe680'); grad.addColorStop(0.4,'#f5a623');
  grad.addColorStop(0.8,'#c17f00'); grad.addColorStop(1,'#7a4f00');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(256,256,256,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(256,256,230,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=6; ctx.stroke();
  ctx.beginPath(); ctx.arc(256,256,200,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,0.65)';
  ctx.font='bold 28px "Barlow Condensed",Arial';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  const words = (name.length>18?name.substring(0,18)+'…':name).split(' ');
  const lines=[]; let cur='';
  for(const w of words){
    const t=cur?cur+' '+w:w;
    if(ctx.measureText(t).width>340){if(cur)lines.push(cur);cur=w;}else cur=t;
  }
  if(cur)lines.push(cur);
  const startY=256-((lines.length-1)*36)/2;
  lines.forEach((l,i)=>ctx.fillText(l,256,startY+i*36));
  return canvas;
}

function buildMedalScene(canvas, imageUrl, name) {
  const w=canvas.offsetWidth||200, h=canvas.offsetHeight||200;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setSize(w,h,false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,w/h,0.1,100);
  camera.position.set(0,0,3.2);
  const geo=new THREE.CylinderGeometry(1,1,0.12,128);
  const loader=new THREE.TextureLoader();
  const makeMatl=tex=>[
    new THREE.MeshStandardMaterial({color:0xd4a017,metalness:0.9,roughness:0.15}),
    new THREE.MeshStandardMaterial({map:tex,metalness:0.6,roughness:0.2}),
    new THREE.MeshStandardMaterial({map:tex,metalness:0.6,roughness:0.2}),
  ];
  const medal=new THREE.Mesh(geo,makeMatl(new THREE.CanvasTexture(createDefaultTexture(name))));
  medal.rotation.x=Math.PI/2;
  scene.add(medal);
  if(imageUrl) loader.load(imageUrl,tex=>{ medal.material=makeMatl(tex); });
  scene.add(new THREE.AmbientLight(0xffffff,0.5));
  const kl=new THREE.PointLight(0xfff5cc,2.5,10); kl.position.set(2,3,3); scene.add(kl);
  const rl=new THREE.PointLight(0xff8800,0.8,8); rl.position.set(-3,-1,2); scene.add(rl);
  const fl=new THREE.PointLight(0x4488ff,0.4,8); fl.position.set(0,-3,2); scene.add(fl);
  let tx=0,ty=0,cx=0,cy=0;
  const wrap=canvas.parentElement;
  wrap.addEventListener('mousemove',e=>{
    const r=wrap.getBoundingClientRect();
    tx=((e.clientX-r.left)/r.width-0.5)*0.8;
    ty=-((e.clientY-r.top)/r.height-0.5)*0.8;
  });
  wrap.addEventListener('mouseleave',()=>{tx=0;ty=0;});
  let frame;
  function animate(){
    frame=requestAnimationFrame(animate);
    cx+=(tx-cx)*0.06; cy+=(ty-cy)*0.06;
    medal.rotation.y=performance.now()*0.0008+cx;
    medal.rotation.x=Math.PI/2+cy;
    renderer.render(scene,camera);
  }
  animate();
  new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){if(!frame)animate();}
    else{cancelAnimationFrame(frame);frame=null;}
  }),{threshold:0}).observe(canvas);
}

function initMedals(races) {
  const grid=document.getElementById('medalsGrid');
  const emptyEl=document.getElementById('medalsEmpty');
  if(!grid) return;
  if(!races||races.length===0){if(emptyEl)emptyEl.style.display='block';return;}
  races.forEach(race=>{
    const card=document.createElement('div');
    card.className='medal-card';
    const wrap=document.createElement('div');
    wrap.className='medal-canvas-wrap';
    const cvs=document.createElement('canvas');
    cvs.width=cvs.height=200;
    wrap.appendChild(cvs);
    const bibHTML=race.bib_number
      ?`<div class="medal-bib" data-event="${race.bib_event||race.name.substring(0,16)}">${race.bib_number}</div>`:'';
    card.innerHTML=`
      <span class="medal-date">${race.date?race.date.substring(0,4):''}</span>
      <p class="medal-name">${race.name}</p>
      <span class="medal-dist">${race.distance_km}km</span>
      ${bibHTML}
    `;
    card.insertBefore(wrap,card.firstChild);
    grid.appendChild(card);
    requestAnimationFrame(()=>buildMedalScene(cvs,race.medal_image||null,race.name));
  });
}

function animateMedals() {
  if(typeof gsap==='undefined') return;
  gsap.utils.toArray('.medal-card').forEach((card,i)=>{
    gsap.fromTo(card,{opacity:0,y:40,scale:0.96},
      {opacity:1,y:0,scale:1,duration:0.7,delay:i*0.1,ease:'power3.out',
       scrollTrigger:{trigger:card,start:'top 85%'}});
  });
}
