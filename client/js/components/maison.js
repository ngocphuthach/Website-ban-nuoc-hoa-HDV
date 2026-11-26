(()=>{const image=document.getElementById('maison-hero-image');if(!image)return;
const slides=[['banner-hero.jpg','Hương thơm đậm dấu ấn'],['banner-contact.jpg','Vẻ đẹp của hương hoa'],['banner-story.jpg','Nghệ thuật tối giản']];let i=0;
function show(n){i=(n+slides.length)%slides.length;image.src='../../pic/'+slides[i][0];document.getElementById('maison-image-caption').textContent=slides[i][1];image.classList.remove('maison-image-in');void image.offsetWidth;image.classList.add('maison-image-in');}
document.getElementById('maison-prev').addEventListener('click',()=>show(i-1));document.getElementById('maison-next').addEventListener('click',()=>show(i+1));
})();