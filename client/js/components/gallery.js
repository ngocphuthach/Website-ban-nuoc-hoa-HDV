function escapeGallery(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function galleryUrl(path) { return typeof path === 'string' && /^pic\/[a-z0-9_./ -]+\.(jpg|jpeg|png|webp|gif)$/i.test(path) && !path.includes('..') ? '../../'+path : '../../pic/banner-hero.jpg'; }
function productGalleryImages(p) { return [...new Set([p.image, ...(Array.isArray(p.images)?p.images:[])].filter(Boolean))].slice(0,5); }
function mountProductGallery(root, product) {
    const paths=productGalleryImages(product); if(!paths.length) paths.push('pic/banner-hero.jpg');
    let index=0, start=0; const name=product.name||'Nước hoa';
    root.innerHTML=`<div class="gallery-stage"><button type="button" class="gallery-main" aria-label="Phóng to hình ảnh"><img alt="${escapeGallery(name)}"></button>${paths.length>1?'<button type="button" class="gallery-prev" aria-label="Ảnh trước">‹</button><button type="button" class="gallery-next" aria-label="Ảnh tiếp">›</button>':''}<span class="gallery-counter"></span></div><div class="gallery-thumbs">${paths.map((p,i)=>`<button type="button" aria-label="Ảnh ${i+1}"><img src="${escapeGallery(galleryUrl(p))}" alt="Góc ảnh ${i+1}" loading="lazy"></button>`).join('')}</div><dialog class="gallery-lightbox"><button type="button" class="gallery-close" aria-label="Đóng">×</button><img alt="${escapeGallery(name)}"><div class="gallery-light-controls"><button type="button" class="btn-outline light-prev">‹</button><button type="button" class="btn-outline light-next">›</button></div></dialog>`;
    const main=root.querySelector('.gallery-main img'), dialog=root.querySelector('dialog'), thumbs=[...root.querySelectorAll('.gallery-thumbs button')];
    function select(i){index=(i+paths.length)%paths.length; const src=galleryUrl(paths[index]); main.src=src; dialog.querySelector('img').src=src; root.querySelector('.gallery-counter').textContent=`${index+1} / ${paths.length}`; thumbs.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===index))); }
    thumbs.forEach((b,i)=>b.onclick=()=>select(i));
    root.querySelector('.gallery-prev')?.addEventListener('click',()=>select(index-1)); root.querySelector('.gallery-next')?.addEventListener('click',()=>select(index+1));
    root.querySelector('.gallery-main').onclick=()=>dialog.showModal(); root.querySelector('.gallery-close').onclick=()=>dialog.close();
    root.querySelector('.light-prev').onclick=()=>select(index-1); root.querySelector('.light-next').onclick=()=>select(index+1);
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()}); root.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();select(index+(e.key==='ArrowLeft'?-1:1));}});
    const stage=root.querySelector('.gallery-stage'); stage.addEventListener('touchstart',e=>{start=e.changedTouches[0].clientX},{passive:true}); stage.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-start;if(Math.abs(dx)>45)select(index+(dx<0?1:-1));},{passive:true});
    select(0);
}
