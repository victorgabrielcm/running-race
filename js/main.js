(function(){
  'use strict';
  if(typeof gsap!=='undefined'&&typeof ScrollTrigger!=='undefined')
    gsap.registerPlugin(ScrollTrigger);

  const nav=document.getElementById('nav');
  window.addEventListener('scroll',()=>{
    nav.classList.toggle('scrolled',window.scrollY>60);
  },{passive:true});

  function heroReveal(){
    if(typeof gsap==='undefined'){
      document.querySelectorAll('.hero-eyebrow,.hero-tagline,.hero-cta,.hero-title span')
        .forEach(el=>{el.style.opacity='1';el.style.transform='none';});
      document.getElementById('heroStats').style.opacity='1';
      const sh=document.querySelector('.scroll-hint');
      if(sh) sh.style.opacity='1';
      return;
    }
    const tl=gsap.timeline({delay:0.2});
    tl.to('.hero-eyebrow',{opacity:1,y:0,duration:0.6,ease:'power3.out'})
      .to('.hero-title span',{opacity:1,y:0,duration:0.8,ease:'power3.out',stagger:0.12},'-=0.3')
      .to('.hero-tagline',{opacity:1,y:0,duration:0.6,ease:'power3.out'},'-=0.4')
      .to('.hero-cta',{opacity:1,y:0,duration:0.6,ease:'power3.out'},'-=0.4')
      .to('#heroStats',{opacity:1,duration:0.8,ease:'power3.out'},'-=0.2')
      .to('.scroll-hint',{opacity:1,duration:0.6},'-=0.4');
  }

  function initParallax(){
    if(typeof gsap==='undefined') return;
    const m=document.querySelector('.hero-media');
    if(!m) return;
    gsap.to(m,{yPercent:25,ease:'none',scrollTrigger:{
      trigger:'.hero',start:'top top',end:'bottom top',scrub:true
    }});
  }

  function initSectionReveals(){
    if(typeof gsap==='undefined') return;
    gsap.utils.toArray('.section-intro').forEach(el=>{
      gsap.fromTo(el,{opacity:0,y:50},{opacity:1,y:0,duration:1,ease:'power3.out',
        scrollTrigger:{trigger:el,start:'top 80%'}});
    });
  }

  function initSpine(){
    if(typeof gsap==='undefined') return;
    const spine=document.querySelector('.timeline-spine');
    if(!spine) return;
    gsap.fromTo(spine,{scaleY:0,transformOrigin:'top center'},{scaleY:1,ease:'none',
      scrollTrigger:{trigger:'.timeline',start:'top 70%',end:'bottom 80%',scrub:1}});
  }

  function initActiveNav(){
    if(typeof ScrollTrigger==='undefined') return;
    ['corridas','medalhas','midia'].forEach(id=>{
      ScrollTrigger.create({trigger:`#${id}`,start:'top 50%',end:'bottom 50%',
        onToggle:({isActive})=>{
          const l=document.querySelector(`.nav-links a[href="#${id}"]`);
          if(l) l.style.color=isActive?'var(--white)':'';
        }
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(link=>{
    link.addEventListener('click',e=>{
      const t=document.querySelector(link.getAttribute('href'));
      if(!t) return;
      e.preventDefault();
      window.scrollTo({top:t.getBoundingClientRect().top+window.scrollY-80,behavior:'smooth'});
    });
  });

  document.addEventListener('DOMContentLoaded',()=>{
    heroReveal(); initParallax(); initSectionReveals(); initSpine(); initActiveNav();
    setTimeout(()=>{ if(typeof animateMedals==='function') animateMedals(); },600);
  });
})();
