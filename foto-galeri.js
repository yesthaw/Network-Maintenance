// FOTO DOKUMENTASI & PROFIL - via PHP API
const FotoGaleri = {
    data: [],
    init: async function() {
        try { this.data = await (await nmFetch('api.php?ep=photos')).json(); } catch(e) { this.data=[]; }
        if(!Array.isArray(this.data)) this.data=[];
        const pd=document.getElementById('photoDate'); if(pd&&!pd.value) pd.value=new Date().toISOString().split('T')[0];
    },
    add: async function(item) {
        await nmFetch('api.php?ep=photos&act=add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});
        this.data.unshift(item);
    },
    remove: async function(id) {
        await nmFetch('api.php?ep=photos&act=delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})});
        this.data=this.data.filter(p=>p.id!==id);
    },
    preview: function(input) {
        const p=document.getElementById('photoPreview');
        if(input.files&&input.files[0]){
            if(input.files[0].size>2*1024*1024){showToast('Maks 2MB!','error');input.value='';p.innerHTML='';return;}
            const r=new FileReader(); r.onload=e=>{p.innerHTML='<img src="'+e.target.result+'">';}; r.readAsDataURL(input.files[0]);
        }
    },
    render: function(user) {
        const g=document.getElementById('photoGallery'),c=document.getElementById('photoCount');
        if(!g)return; c.textContent=this.data.length+' foto';
        if(!this.data.length){g.innerHTML='<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-secondary)"><i class="fas fa-images" style="font-size:2.5rem;opacity:0.3"></i><p>Belum ada foto</p></div>';return;}
        const fmt=d=>new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
        const admin=user&&user.role==='admin';
        g.innerHTML=this.data.map(p=>
            '<div class="photo-card"><img class="photo-card-img" src="'+p.photo+'" onclick="FotoGaleri.lightbox(this.src)" loading="lazy">'+
            '<div class="photo-card-body"><h4>'+p.caption+'</h4><p><i class="fas fa-map-marker-alt"></i> '+p.location+'</p><p><i class="fas fa-calendar"></i> '+fmt(p.date)+'</p><p><i class="fas fa-user"></i> '+p.uploadedBy+'</p></div>'+
            '<div class="photo-card-actions">'+(admin?'<button class="btn btn-danger btn-sm" onclick="FotoGaleri.del('+p.id+')"><i class="fas fa-trash"></i></button>':'')+'</div></div>'
        ).join('');
    },
    del: async function(id){ if(!confirm('Hapus foto ini?'))return; await this.remove(id); this.render(currentUser); showToast('Foto dihapus!','error'); },
    lightbox: function(s){ document.getElementById('lightboxImg').src=s; document.getElementById('photoLightbox').classList.add('show'); },
    close: function(){ document.getElementById('photoLightbox').classList.remove('show'); },
    reset: function(){ document.getElementById('photoForm').reset(); document.getElementById('photoPreview').innerHTML=''; document.getElementById('photoFile').value=''; document.getElementById('photoDate').value=new Date().toISOString().split('T')[0]; }
};

const FotoProfil = {
    profiles: {},
    load: async function(){ try{ const j=await(await nmFetch('api.php?ep=profiles')).json(); this.profiles=(j&&!j.error)?j:{}; }catch(e){this.profiles={};} },
    save: async function(u,p){ await nmFetch('api.php?ep=profiles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,photo:p})}); this.profiles[u]=p; },
    get: function(u){ return this.profiles[u]||null; },
    update: function(user){
        const el=document.getElementById('sidebarAvatar'); if(!el||!user)return;
        const p=this.get(user.username);
        if(p){el.innerHTML='<img src="'+p+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';el.style.background='none';el.style.overflow='hidden';}
        else{el.innerHTML=user.fullname.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();el.style.background=user.role==='admin'?'linear-gradient(135deg,#6366f1,#a855f7)':'linear-gradient(135deg,#10b981,#06b6d4)';}
    },
    pick: function(){ document.getElementById('profilePhotoInput').click(); },
    onPick: function(input){
        if(!input.files||!input.files[0])return;
        if(input.files[0].size>1024*1024){showToast('Maks 1MB!','error');input.value='';return;}
        const r=new FileReader(); r.onload=async e=>{await FotoProfil.save(currentUser.username,e.target.result);FotoProfil.update(currentUser);showToast('Foto profil diubah!','success');}; r.readAsDataURL(input.files[0]);
    }
};
