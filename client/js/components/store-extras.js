// Service-backed customer tools; all user text inserted as text, not HTML.
(() => {
 const api=new ApiService();
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.className='btn-gold';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){toast.error(e.message);}finally{b.disabled=false;}};return b;};
 const list=(parent,rows,render)=>{parent.replaceChildren();if(!rows.length)parent.append(el('p','Chưa có dữ liệu.'));rows.forEach(r=>parent.append(render(r)));};
 const productLink=r=>{const a=el('a',`${r.name} · ${r.brand}${r.price!==undefined?' · '+api.formatCurrency(r.price):''}`);a.href='#trang-chi-tiet?id='+Number(r.id);return a;};
 window.mountStoreExtras=async(container,p)=>{
  const panel=el('section');panel.className='store-extras';container.append(panel);
  panel.append(el('h2','Đánh giá từ khách đã mua'));
  const reviews=el('div');panel.append(reviews);
  const load=async()=>list(reviews,await api.get(`/products/${p.id}/reviews`),r=>el('p',`${r.fullName} · ${r.rating}/5 ★ — ${r.comment}`));
  const rating=el('select');for(let i=5;i>=1;i--){const o=el('option',`${i} sao`);o.value=i;rating.append(o);}rating.setAttribute('aria-label','Số sao');
  const comment=el('textarea');comment.placeholder='Chia sẻ trải nghiệm của bạn';comment.maxLength=500;comment.setAttribute('aria-label','Nhận xét');
  panel.append(rating,comment,button('Gửi đánh giá',async()=>{await api.post(`/products/${p.id}/reviews`,{rating:Number(rating.value),comment:comment.value});comment.value='';await load();toast.success('Đã lưu đánh giá');}),button('♡ Lưu yêu thích',async()=>{await api.put(`/favorites/${p.id}`,{});toast.success('Đã lưu sản phẩm');}),button('Bỏ yêu thích',async()=>{await api.delete(`/favorites/${p.id}`);toast.success('Đã bỏ yêu thích');}));
  try{await load();}catch(e){reviews.textContent=e.message;}
 };
 const launch=()=>{
  const toggle=button('Tư vấn hương thơm',()=>{dialog.showModal();});toggle.classList.add('scent-launch');
  const dialog=el('dialog');dialog.className='scent-dialog';dialog.append(el('h2','Tìm mùi hương của bạn'),el('p','Chọn ngân sách tối đa và từ khóa để lọc nhanh các dòng nước hoa phù hợp.'));
  const budget=el('input');budget.type='number';budget.min=0;budget.value=3000000;budget.setAttribute('aria-label','Ngân sách tối đa (đồng)');
  const search=el('input');search.placeholder='Thương hiệu, tên hoặc mô tả hương';search.setAttribute('aria-label','Từ khóa');
  const out=el('div');out.className='scent-results';dialog.append(el('label','Ngân sách tối đa (VNĐ)'),budget,search,button('Gợi ý cho tôi',async()=>list(out,await api.get('/recommendations',{budget:budget.value,search:search.value}),productLink)),button('Sản phẩm yêu thích',async()=>list(out,await api.get('/favorites'),productLink)),out,button('Đóng',()=>dialog.close()));
  out.addEventListener('click',e=>{if(e.target.closest('a'))dialog.close();});document.body.append(toggle,dialog);
 };if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch);else launch();
})();
