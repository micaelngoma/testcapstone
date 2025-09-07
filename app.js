// ---------------------------
// Firebase init
// ---------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1) Replace these with your project values
const firebaseConfig = {
    apiKey: "AIzaSyBi72AiS2JvqCzfCUorrRRoPGqfnKLl16o",
  authDomain: "test-capstone-37cfd.firebaseapp.com",
  projectId: "test-capstone-37cfd",
  storageBucket: "test-capstone-37cfd.firebasestorage.app",
  messagingSenderId: "514218901602",
  appId: "1:514218901602:web:e811660fa835347966913b",
  measurementId: "G-56523ELVV5"
};
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Collections
const colLicenses = collection(db, "licenses");
const colVerifs = collection(db, "verifications");
const colUsers = collection(db, "users");
const colSettings = collection(db, "settings");

// ---------------------------
// Minimal router
// ---------------------------
const views = document.querySelectorAll(".view");
const menuItems = document.querySelectorAll(".menu li");
const titleEl = document.getElementById("viewTitle");

menuItems.forEach(li=>{
  li.addEventListener("click", ()=>{
    menuItems.forEach(x=>x.classList.remove("active"));
    li.classList.add("active");
    showView(li.dataset.view);
  });
});

function showView(name){
  titleEl.textContent = ({
    dashboard:"System Dashboard",
    analytics:"Analytics Dashboard",
    licenses:"License Management",
    verification:"International Verification Portal",
    users:"User Management",
    settings:"System Settings"
  })[name] || "GDLVS";

  views.forEach(v=>v.classList.remove("visible"));
  document.getElementById("view-"+name).classList.add("visible");
  // lazy load per view
  if(name==="dashboard") loadDashboard();
  if(name==="analytics") loadAnalytics();
  if(name==="licenses") loadLicenses();
  if(name==="verification") initPortal();
  if(name==="users") loadUsers();
  if(name==="settings") loadSettings();
}
showView("dashboard");

// ---------------------------
// Auth (email/password prototype)
// Admin role is stored in /users/{uid}.role = 'admin' | 'verifier'
// ---------------------------
const authStatus = document.getElementById("authStatus");
const btnSignIn = document.getElementById("btnSignIn");
const btnSignOut = document.getElementById("btnSignOut");

btnSignIn.addEventListener("click", async ()=>{
  const email = prompt("Email:");
  const password = prompt("Password:");
  if(!email||!password) return;
  try{
    await signInWithEmailAndPassword(auth, email, password);
  }catch(e){ alert("Sign-in failed: "+e.message); }
});

btnSignOut.addEventListener("click", ()=>signOut(auth));

let currentUserRole = "guest";

onAuthStateChanged(auth, async (user)=>{
  if(user){
    authStatus.textContent = user.email;
    btnSignIn.classList.add("hidden");
    btnSignOut.classList.remove("hidden");
    // read role
    const udoc = await getDoc(doc(colUsers, user.uid));
    currentUserRole = udoc.exists() ? (udoc.data().role || "verifier") : "verifier";
  }else{
    authStatus.textContent = "Not signed in";
    btnSignIn.classList.remove("hidden");
    btnSignOut.classList.add("hidden");
    currentUserRole = "guest";
  }
  applyRoleVisibility();
});

function applyRoleVisibility(){
  const adminEls = document.querySelectorAll(".admin-only");
  adminEls.forEach(el=>{
    el.style.display = (currentUserRole==="admin") ? "" : "none";
  });
}

// ---------------------------
// Dashboard
// ---------------------------
async function loadDashboard(){
  // Stats
  const licSnap = await getDocs(colLicenses);
  const total = licSnap.size;
  let active=0;
  licSnap.forEach(d=>{ if((d.data().status||"") === "Active") active++; });

  // Today’s verifications
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todaySnap = await getDocs(query(colVerifs, orderBy("timestamp","desc"), limit(50)));
  let todayCount=0, ok=0, totalRecent=0;
  todaySnap.forEach(d=>{
    const ts = d.data().timestamp?.toDate?.() || new Date(0);
    if(ts>=todayStart) todayCount++;
    totalRecent++;
    if(d.data().status==="Verified") ok++;
  });

  document.getElementById("statTotalLicenses").textContent = total;
  document.getElementById("statActive").textContent = active;
  document.getElementById("statToday").textContent = todayCount;
  document.getElementById("statSuccess").textContent = totalRecent ? Math.round(100*ok/totalRecent)+"%" : "—";

  // Recent verifications table
  const tbody = document.querySelector("#tblRecentVerifications tbody");
  tbody.innerHTML = "";
  todaySnap.forEach(d=>{
    const v = d.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.licenseNumber}</td>
      <td>${v.requestingOrg || "-"}</td>
      <td>${v.country || "-"}</td>
      <td><span class="pill ${v.status==='Verified'?'active':'expired'}">${v.status}</span></td>
      <td>${v.timestamp?.toDate?.().toLocaleString() || "-"}</td>
    `;
    tbody.appendChild(tr);
  });

  // Alerts (simple: show licenses expiring in <30 days)
  const alerts = document.getElementById("systemAlerts");
  alerts.innerHTML = "";
  const soon = [];
  licSnap.forEach(d=>{
    const {expiryDate, fullName} = d.data();
    if(expiryDate){
      const diff = (new Date(expiryDate) - new Date())/86400000;
      if(diff>0 && diff<30) soon.push({id:d.id, fullName, days:Math.ceil(diff)});
    }
  });
  if(!soon.length) {
    alerts.innerHTML = `<li class="muted">No alerts.</li>`;
  } else {
    soon.sort((a,b)=>a.days-b.days).slice(0,5).forEach(a=>{
      const li = document.createElement("li");
      li.textContent = `License ${a.id} (${a.fullName}) expires in ${a.days} day(s).`;
      alerts.appendChild(li);
    });
  }

  // Quick actions
  document.getElementById("qaAddLicense").onclick = ()=>openLicenseModal();
  document.getElementById("qaOpenPortal").onclick = ()=>{ 
    document.querySelector('[data-view="verification"]').click();
  };

  // Fake health metrics
  document.getElementById("metricDbLatency").textContent = (20+Math.round(Math.random()*20));
}

// ---------------------------
// Analytics
// ---------------------------
let chartStatus, chartClasses, chartVerifications;
async function loadAnalytics(){
  const licSnap = await getDocs(colLicenses);
  const statusCounts = {Active:0,Expired:0,Suspended:0};
  const classCounts = {A:0,B:0,C:0,D:0,E:0};

  licSnap.forEach(d=>{
    const v=d.data();
    statusCounts[v.status] = (statusCounts[v.status]||0)+1;
    classCounts[v.class] = (classCounts[v.class]||0)+1;
  });

  const verSnap = await getDocs(query(colVerifs, orderBy("timestamp","desc"), limit(200)));
  let verified=0, notFound=0, expired=0;
  verSnap.forEach(d=>{
    const s=d.data().status;
    if(s==="Verified") verified++;
    else if(s==="Not Found") notFound++;
    else if(s==="Expired") expired++;
  });

  // destroy previous
  [chartStatus,chartClasses,chartVerifications].forEach(c=>c?.destroy?.());

  chartStatus = new Chart(document.getElementById("chartStatus"), {
    type:"doughnut",
    data:{labels:Object.keys(statusCounts),datasets:[{data:Object.values(statusCounts)}]},
    options:{responsive:true}
  });
  chartClasses = new Chart(document.getElementById("chartClasses"), {
    type:"bar",
    data:{labels:Object.keys(classCounts),datasets:[{data:Object.values(classCounts)}]},
    options:{responsive:true}
  });
  chartVerifications = new Chart(document.getElementById("chartVerifications"), {
    type:"bar",
    data:{labels:["Verified","Not Found","Expired"],datasets:[{data:[verified,notFound,expired]}]},
    options:{responsive:true}
  });
}

// ---------------------------
// License Management (CRUD)
// ---------------------------
const tblLicensesBody = document.querySelector("#tblLicenses tbody");
const searchLicense = document.getElementById("searchLicense");
const filterStatus = document.getElementById("filterStatus");
const filterClass = document.getElementById("filterClass");
document.getElementById("btnAddLicense").onclick = ()=>openLicenseModal();

searchLicense.oninput = loadLicenses;
filterStatus.onchange = loadLicenses;
filterClass.onchange = loadLicenses;

async function loadLicenses(){
  const snap = await getDocs(query(colLicenses, orderBy("issueDate","desc")));
  tblLicensesBody.innerHTML="";
  snap.forEach(d=>{
    const v=d.data();
    // filters
    const q = (searchLicense.value||"").toLowerCase();
    if(q && !(`${d.id} ${v.fullName}`.toLowerCase().includes(q))) return;
    if(filterStatus.value && v.status!==filterStatus.value) return;
    if(filterClass.value && v.class!==filterClass.value) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.id}</td>
      <td>${v.fullName}</td>
      <td>${v.class}</td>
      <td><span class="pill ${v.status==='Active'?'active':(v.status==='Expired'?'expired':'suspended')}">${v.status}</span></td>
      <td>${v.issueDate||"-"}</td>
      <td>${v.expiryDate||"-"}</td>
      <td>
        <button class="btn ghost" data-edit="${d.id}">Edit</button>
        <button class="btn danger" data-del="${d.id}">Delete</button>
      </td>
    `;
    tblLicensesBody.appendChild(tr);
  });

  tblLicensesBody.querySelectorAll("[data-edit]").forEach(b=>{
    b.onclick = ()=>openLicenseModal(b.dataset.edit);
  });
  tblLicensesBody.querySelectorAll("[data-del]").forEach(b=>{
    b.onclick = async ()=>{
      if(currentUserRole!=="admin") return alert("Admins only.");
      if(confirm("Delete this license?")){
        await deleteDoc(doc(colLicenses, b.dataset.del));
        loadLicenses();
      }
    };
  });
}

function openLicenseModal(id){
  if(currentUserRole!=="admin") return alert("Admins only.");
  const dlg = document.getElementById("modal");
  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");
  const ok = document.getElementById("modalOk");
  title.textContent = id ? "Edit License" : "Add License";
  body.innerHTML = `
    <label>License Number<input id="mLic" class="input" ${id?"disabled":""}></label>
    <label>Full Name<input id="mName" class="input"></label>
    <label>Class
      <select id="mClass" class="input"><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option></select>
    </label>
    <label>Status
      <select id="mStatus" class="input"><option>Active</option><option>Expired</option><option>Suspended</option></select>
    </label>
    <label>Issue Date<input id="mIssue" type="date" class="input"></label>
    <label>Expiry Date<input id="mExpiry" type="date" class="input"></label>
  `;
  dlg.showModal();

  if(id){
    getDoc(doc(colLicenses,id)).then(s=>{
      const v=s.data();
      document.getElementById("mLic").value = id;
      document.getElementById("mName").value = v.fullName||"";
      document.getElementById("mClass").value = v.class||"B";
      document.getElementById("mStatus").value = v.status||"Active";
      document.getElementById("mIssue").value = v.issueDate||"";
      document.getElementById("mExpiry").value = v.expiryDate||"";
    });
  }

  ok.onclick = async (e)=>{
    e.preventDefault();
    const payload = {
      fullName: document.getElementById("mName").value.trim(),
      class: document.getElementById("mClass").value,
      status: document.getElementById("mStatus").value,
      issueDate: document.getElementById("mIssue").value,
      expiryDate: document.getElementById("mExpiry").value
    };
    if(!payload.fullName) return alert("Full name is required.");
    if(id){
      await updateDoc(doc(colLicenses,id), payload);
    }else{
      const licNo = document.getElementById("mLic").value.trim();
      if(!licNo) return alert("License number is required.");
      await setDoc(doc(colLicenses, licNo), payload);
    }
    dlg.close(); loadLicenses(); loadAnalytics(); loadDashboard();
  };
  document.getElementById("modalCancel").onclick = ()=>dlg.close();
}

// ---------------------------
// Verification Portal
// ---------------------------
function initPortal(){
  const form = document.getElementById("formVerify");
  const out = document.getElementById("verifyResult");
  form.onsubmit = async (e)=>{
    e.preventDefault();
    const licenseNumber = document.getElementById("vLicenseNumber").value.trim();
    const requestingOrg = document.getElementById("vRequestingOrg").value.trim();
    const country = document.getElementById("vCountry").value.trim();
    const contactEmail = document.getElementById("vContactEmail").value.trim();
    const purpose = document.getElementById("vPurpose").value;

    out.textContent = "Verifying…";
    const ref = doc(colLicenses, licenseNumber);
    const snap = await getDoc(ref);

    let status = "Not Found";
    let detail = "This license was not found in the registry.";
    if(snap.exists()){
      const v = snap.data();
      const expired = v.expiryDate && (new Date(v.expiryDate) < new Date());
      if(expired) { status="Expired"; detail=`Expired on ${v.expiryDate}.`; }
      else if(v.status!=="Active") { status=v.status; detail=`Status: ${v.status}.`; }
      else { status="Verified"; detail=`License holder: ${v.fullName} • Class ${v.class} • Expiry ${v.expiryDate}`; }
    }

    await addDoc(colVerifs, {
      licenseNumber, requestingOrg, country, contactEmail, purpose, status,
      timestamp: serverTimestamp()
    });

    out.innerHTML = status==="Verified"
      ? `<p>✅ <strong>Verified.</strong> ${detail}</p>`
      : (status==="Expired"
          ? `<p>🟠 <strong>Expired.</strong> ${detail}</p>`
          : `<p>❌ <strong>Not Found.</strong> ${detail}</p>`);

    loadDashboard(); loadAnalytics();
  };
}

// ---------------------------
// User Management (admin)
// ---------------------------
async function loadUsers(){
  if(currentUserRole!=="admin"){ document.querySelector("#tblUsers tbody").innerHTML="<tr><td colspan='3'>Admins only.</td></tr>"; return;}
  const snap = await getDocs(colUsers);
  const tbody = document.querySelector("#tblUsers tbody");
  tbody.innerHTML="";
  snap.forEach(d=>{
    const u=d.data();
    const tr=document.createElement("tr");
    tr.innerHTML = `
      <td>${u.email}</td>
      <td>${u.role||"verifier"}</td>
      <td>
        <button class="btn ghost" data-role="verifier" data-id="${d.id}">Make Verifier</button>
        <button class="btn ghost" data-role="admin" data-id="${d.id}">Make Admin</button>
        <button class="btn danger" data-remove="${d.id}">Remove</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll("[data-role]").forEach(b=>{
    b.onclick = async ()=>{
      await updateDoc(doc(colUsers,b.dataset.id), {role:b.dataset.role});
      loadUsers();
    };
  });
  tbody.querySelectorAll("[data-remove]").forEach(b=>{
    b.onclick = async ()=>{
      await deleteDoc(doc(colUsers,b.dataset.remove));
      loadUsers();
    };
  });

  document.getElementById("btnInviteUser").onclick = async ()=>{
    const email = prompt("Invitee email:");
    const role = (prompt("Role (admin/verifier):","verifier")||"verifier").toLowerCase();
    // In a real system you’d send an invite. For prototype: create a placeholder user doc.
    const fakeUid = crypto.randomUUID();
    await setDoc(doc(colUsers,fakeUid), {email, role});
    loadUsers();
  };
}

// ---------------------------
// Settings (prototype)
// ---------------------------
async function loadSettings(){
  const docRef = doc(colSettings, "main");
  const snap = await getDoc(docRef);
  const setAllowedDomains = document.getElementById("setAllowedDomains");
  const setAlertDays = document.getElementById("setAlertDays");
  if(snap.exists()){
    const s = snap.data();
    setAllowedDomains.value = s.allowedDomains || "";
    setAlertDays.value = s.alertDays || 30;
  }
  document.getElementById("btnSaveSettings").onclick = async ()=>{
    await setDoc(docRef, {
      allowedDomains: setAllowedDomains.value.trim(),
      alertDays: Number(setAlertDays.value||30)
    }, {merge:true});
    alert("Settings saved.");
  };
}

// ---------------------------
// (Optional) Seed sample data once
// ---------------------------
// Run from console: window.seed()
window.seed = async function(){
  const samples = [
    ["GAB21543211","Jean Baptiste Moussavou","B","Active","2018-04-20","2028-04-20"],
    ["GAB87435217","Marie-Claire Nzebi","A","Active","2019-12-08","2029-12-08"],
    ["GAB98531121","Paul Obame","C","Suspended","2020-03-10","2030-03-10"],
    ["GAB61234590","Ousso Ndombele","D","Expired","2015-01-14","2025-01-14"],
    ["GAB78123321","Daniel Koumba Biyoghe","B","Active","2021-04-12","2031-09-19"]
  ];
  for (const [id,name,cls,status,issue,exp] of samples){
    await setDoc(doc(colLicenses,id), {fullName:name,class:cls,status,issueDate:issue,expiryDate:exp});
  }
  alert("Seeded sample licenses.");
  loadDashboard(); loadLicenses(); loadAnalytics();
};
