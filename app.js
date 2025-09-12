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

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBiqc5ymmQ0ZafBsbRSXLiwWGXSnl5gbJo",
  authDomain: "test-capstone-1-ffaa7.firebaseapp.com",
  projectId: "test-capstone-1-ffaa7",
  storageBucket: "test-capstone-1-ffaa7.firebasestorage.app",
  messagingSenderId: "908666517369",
  appId: "1:908666517369:web:a34e12a93e44afde6ca1a8",
  measurementId: "G-60B0LMR8JS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ==========================
   UI Elements
   ========================== */
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const addLicenseBtn = document.getElementById("addLicenseBtn");
const licensesList = document.getElementById("licensesList");
const adminSection = document.getElementById("adminSection");
const inviteUserBtn = document.getElementById("inviteUserBtn");

/* ==========================
   Auth
   ========================== */
const provider = new GoogleAuthProvider();

loginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    userInfo.textContent = `Logged in as: ${user.displayName}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    await checkAdmin(user);
  } catch (error) {
    console.error("Login failed", error);
    alert("Login failed. Check console for details.");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  userInfo.textContent = "Not logged in";
  loginBtn.style.display = "inline-block";
  logoutBtn.style.display = "none";
  adminSection.style.display = "none";
});

/* ==========================
   Firestore – Licenses
   ========================== */
addLicenseBtn.addEventListener("click", async () => {
  const licenseNumber = prompt("Enter license number:");
  if (!licenseNumber) return;
  try {
    await addDoc(collection(db, "licenses"), {
      number: licenseNumber,
      createdAt: serverTimestamp()
    });
    alert("License added!");
    loadLicenses();
  } catch (error) {
    console.error("Error adding license", error);
  }
});

async function loadLicenses() {
  licensesList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "licenses"));
  snapshot.forEach(docSnap => {
    const li = document.createElement("li");
    li.textContent = docSnap.data().number;
    licensesList.appendChild(li);
  });
}
loadLicenses();

/* ==========================
   Admin Features
   ========================== */
inviteUserBtn.addEventListener("click", async () => {
  const email = prompt("Enter email to invite:");
  if (!email) return;
  try {
    await setDoc(doc(db, "invites", email), {
      role: "user",
      invitedAt: serverTimestamp()
    });
    alert("User invited!");
  } catch (error) {
    console.error("Error inviting user", error);
  }
});

async function checkAdmin(user) {
  // Use email as document ID
  const inviteDoc = await getDoc(doc(db, "invites", user.email));
  if (inviteDoc.exists() && inviteDoc.data().role === "admin") {
    adminSection.style.display = "block";
  } else {
    adminSection.style.display = "none";
  }
}

/* ==========================
   Logging & Settings helpers
   ========================== */
async function logAction(action, user) {
  try {
    await addDoc(collection(db, "logs"), {
      action,
      user: user.email,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error logging action", error);
  }
}

async function saveSetting(key, value) {
  const user = auth.currentUser;
  if (!user) return;

  const inviteDoc = await getDoc(doc(db, "invites", user.email));
  if (inviteDoc.exists() && inviteDoc.data().role === "admin") {
    await setDoc(doc(db, "settings", key), { value });
  } else {
    alert("Not authorized to change settings.");
  }
}

async function createAuditLog(action) {
  const user = auth.currentUser;
  if (!user) return;
  await addDoc(collection(db, "auditLogs"), {
    action,
    user: user.email,
    timestamp: serverTimestamp()
  });
}
