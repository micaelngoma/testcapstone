/* ==========================
   Firebase Setup
   ========================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, addDoc,
  getDoc, getDocs, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXXXX",
  appId: "XXXXXX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ==========================
   UI Elements
   ========================== */
const btnSignIn = document.getElementById("btnSignIn");
const btnSignOut = document.getElementById("btnSignOut");
const btnDark = document.getElementById("btnDarkMode");
const authStatus = document.getElementById("authStatus");
const adminConsole = document.getElementById("adminConsole");
const toastContainer = document.getElementById("toastContainer");
const userTableBody = document.getElementById("userTableBody");

/* ==========================
   Toast Notification Helper
   ========================== */
function toast(msg, type = "info") {
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.textContent = msg;
  toastContainer.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

/* ==========================
   Dark Mode
   ========================== */
btnDark.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
};
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

/* ==========================
   Authentication
   ========================== */
btnSignIn.onclick = async () => {
  const provider = new GoogleAuthProvider();
  try { await signInWithPopup(auth, provider); toast("Signed in successfully","success"); }
  catch(err){ toast(err.message,"error"); }
};
btnSignOut.onclick = () => signOut(auth);

auth.onAuthStateChanged(user => {
  if(user){
    authStatus.textContent = `Signed in as ${user.email}`;
    btnSignIn.classList.add("hidden");
    btnSignOut.classList.remove("hidden");
    adminConsole.classList.remove("hidden");
    loadUsers(); // load users dynamically for admins
  } else {
    authStatus.textContent = "Not signed in";
    btnSignIn.classList.remove("hidden");
    btnSignOut.classList.add("hidden");
    adminConsole.classList.add("hidden");
  }
});

/* ==========================
   Audit Logging
   ========================== */
const colAudit = collection(db,"auditLogs");
async function logAudit(action, detail={}) {
  await addDoc(colAudit,{
    action,
    detail,
    user: auth.currentUser?.email || "guest",
    ts: serverTimestamp()
  });
}

/* ==========================
   License Verification
   ========================== */
const verifyForm = document.getElementById("verifyForm");
const verifyOutput = document.getElementById("verifyOutput");
const rlCache = {}; // rate limit cache

function canVerify(email){
  const now = Date.now();
  if(rlCache[email] && now - rlCache[email] < 60000) return false;
  rlCache[email] = now;
  return true;
}

verifyForm.onsubmit = async e => {
  e.preventDefault();
  const licNo = document.getElementById("vLicense").value.trim();
  const org = document.getElementById("vOrg").value.trim();
  const email = document.getElementById("vContactEmail").value.trim();
  if(!canVerify(email)){
    verifyOutput.innerHTML = "<p>⚠️ Too many requests. Try again later.</p>";
    return;
  }
  const ref = doc(db,"licenses",licNo);
  const snap = await getDoc(ref);
  if(snap.exists() && snap.data().org===org){
    verifyOutput.innerHTML = `<p>✅ License valid. Contact: ${snap.data().email}</p>`;
  } else verifyOutput.innerHTML = "<p>❌ Invalid license.</p>";
};

/* ==========================
   Admin: Add License
   ========================== */
const addLicenseForm = document.getElementById("addLicenseForm");
addLicenseForm.onsubmit = async e => {
  e.preventDefault();
  const licNo = document.getElementById("aLicenseNo").value.trim();
  const org = document.getElementById("aOrg").value.trim();
  const email = document.getElementById("aEmail").value.trim();
  await setDoc(doc(db,"licenses",licNo),{org,email,created:serverTimestamp()});
  await logAudit("Add License",{license:licNo});
  toast("License added","success");
};

/* ==========================
   Admin: Invite User
   ========================== */
const inviteForm = document.getElementById("inviteForm");
inviteForm.onsubmit = async e => {
  e.preventDefault();
  const email = document.getElementById("iEmail").value.trim();
  const role = document.getElementById("iRole").value;
  await addDoc(collection(db,"invites"),{email,role,ts:serverTimestamp()});
  await logAudit("Invite User",{email,role});
  toast("Invite recorded","success");
  loadUsers(); // refresh user table
};

/* ==========================
   Admin: User Management
   ========================== */
async function loadUsers(){
  userTableBody.innerHTML="";
  const snapshot = await getDocs(collection(db,"invites"));
  snapshot.forEach(docSnap=>{
    const data = docSnap.data();
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${data.email}</td>
      <td>${data.role}</td>
      <td><button class="btn deleteBtn">Remove</button></td>
    `;
    tr.querySelector(".deleteBtn").addEventListener("click", async ()=>{
      if(confirm(`Remove ${data.email}?`)){
        await deleteDoc(doc(db,"invites",docSnap.id));
        await logAudit("Remove User",{email:data.email});
        toast(`User ${data.email} removed`,"success");
        loadUsers();
      }
    });
    userTableBody.appendChild(tr);
  });
}

/* ==========================
   Admin: System Settings
   ========================== */
const settingsForm = document.getElementById("settingsForm");
settingsForm.onsubmit = async e => {
  e.preventDefault();
  const name = document.getElementById("sName").value.trim();
  await setDoc(doc(db,"settings","system"),{name});
  await logAudit("Update Settings",{name});
  toast("Settings saved","success");
};
