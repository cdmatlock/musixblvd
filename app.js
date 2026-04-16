// app.js — demo email/password + Firebase social providers
const DEMO_USER = { email: "demo@musixblvd.com", password: "playmusic" };

const form   = document.getElementById("loginForm");
const toggle = document.getElementById("togglePass");
const pw     = document.getElementById("password");

toggle.addEventListener("click", () => {
  const isPwd = pw.type === "password";
  pw.type = isPwd ? "text" : "password";
  toggle.textContent = isPwd ? "Hide" : "Show";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const email = (data.get("email") || "").toString().trim().toLowerCase();
  const password = (data.get("password") || "").toString();
  const ok = email === DEMO_USER.email && password === DEMO_USER.password;
  if (ok) afterAuth({ email, uid: "demo-user" }, !!data.get("remember"));
  else shake(form);
});

function shake(el){ el.style.transition="transform 120ms ease";
  el.style.transform="translateX(-6px)"; setTimeout(()=>el.style.transform="translateX(6px)",120);
  setTimeout(()=>el.style.transform="translateX(0)",240); }

// Firebase providers
const auth = firebase.auth();
const providers = {
  google:   new firebase.auth.GoogleAuthProvider(),
  apple:    new firebase.auth.OAuthProvider('apple.com'),
  facebook: new firebase.auth.FacebookAuthProvider(),
  twitter:  new firebase.auth.TwitterAuthProvider()
};

const btnGoogle   = document.getElementById('btn-google');
const btnApple    = document.getElementById('btn-apple');
const btnFacebook = document.getElementById('btn-facebook');
const btnTwitter  = document.getElementById('btn-twitter');
const btnInstagram= document.getElementById('btn-instagram');

btnGoogle.addEventListener('click',  () => socialSignIn('google'));
btnApple.addEventListener('click',   () => socialSignIn('apple'));
btnFacebook.addEventListener('click',() => socialSignIn('facebook'));
btnTwitter.addEventListener('click', () => socialSignIn('twitter'));
btnInstagram.addEventListener('click', () => socialSignIn('facebook', { from:'instagram' }));

function socialSignIn(name, meta={}){
  const provider = providers[name]; if(!provider) return alert('Provider not available.');
  if(name==='facebook'){ provider.addScope('public_profile'); provider.addScope('email'); }
  if(name==='apple'){ provider.addScope('email'); provider.addScope('name'); }
  auth.signInWithPopup(provider).then((result)=>{
    const user = result.user; if(meta.from==='instagram'){ try{ user.mbLoginAlias='instagram-via-facebook'; }catch{} }
    afterAuth(user, true);
  }).catch((err)=>{ console.error(err); alert(cleanFirebaseError(err.message)); });
}

function cleanFirebaseError(msg=""){
  if(msg.includes('domain is not authorized')) return 'Add this domain to Firebase Auth • Authorized domains.';
  if(msg.includes('Popup closed')) return 'Sign-in window was closed.';
  if(msg.includes('operation-not-allowed')) return 'Enable this provider in Firebase Authentication settings.';
  return msg;
}

function afterAuth(user, remember){
  const payload = { uid:user.uid || 'demo', email:user.email || '', t:Date.now() };
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('mb_auth', JSON.stringify(payload));
  window.location.href = 'dashboard.html';
}
