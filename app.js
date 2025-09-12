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
  storageBucket: "test-capstone-1-ffaa7.appspot.com",
  messagingSenderId: "908666517369",
  appId: "1:908666517369:web:a34e12a93e44afde6ca1a8",
  measurementId: "G-60B0LMR8JS"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Get UI elements (IDs corrected!)
const loginBtn = document.getElementById("btnSignIn");
const logoutBtn = document.getElementById("btnSignOut");
const authStatus = document.getElementById("authStatus");
const adminConsole = document.getElementById("adminConsole");

// Auth
const provider = new GoogleAuthProvider();

loginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    authStatus.textContent = `Logged in as: ${user.displayName}`;
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    await checkAdmin(user.uid);
  } catch (error) {
    console.error("Login failed", error);
    authStatus.textContent = "Login failed";
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  authStatus.textContent = "Not signed in";
  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  adminConsole.classList.add("hidden");
});

// Show/hide admin on login
async function checkAdmin(uid) {
  const inviteDoc = await getDoc(doc(db, "invites", uid));
  if (inviteDoc.exists() && inviteDoc.data().role === "admin") {
    adminConsole.classList.remove("hidden");
  } else {
    adminConsole.classList.add("hidden");
  }
}

// Verify License
document.getElementById("verifyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const license = document.getElementById("vLicense").value;
  const org = document.getElementById("vOrg").value;
  const email = document.getElementById("vContactEmail").value;
  // Example logic: Query Firestore for license info
  const licensesRef = collection(db, "licenses");
  const snapshot = await getDocs(licensesRef);
  let found = false;
  snapshot.forEach(docSnap => {
    if (docSnap.data().number === license) found = true;
  });
  document.getElementById("verifyOutput").textContent =
    found ? "License is valid." : "License not found.";
});

// Add License (Admin)
document.getElementById("addLicenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const licenseNo = document.getElementById("aLicenseNo").value;
  const org = document.getElementById("aOrg").value;
  const email = document.getElementById("aEmail").value;
  try {
    await addDoc(collection(db, "licenses"), {
      number: licenseNo,
      org,
      email,
      createdAt: serverTimestamp()
    });
    alert("License added!");
  } catch (error) {
    alert("Error adding license");
    console.error(error);
  }
});

// Invite User (Admin)
document.getElementById("inviteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("iEmail").value;
  const role = document.getElementById("iRole").value;
  try {
    await setDoc(doc(db, "invites", email), {
      role,
      invitedAt: serverTimestamp()
    });
    alert("User invited!");
  } catch (error) {
    alert("Error inviting user");
    console.error(error);
  }
});

// System Settings (Admin)
document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("sName").value;
  const user = auth.currentUser;
  if (user) {
    const inviteDoc = await getDoc(doc(db, "invites", user.uid));
    if (inviteDoc.exists() && inviteDoc.data().role === "admin") {
      await setDoc(doc(db, "settings", "systemName"), { value: name });
      alert("Setting saved");
    } else {
      alert("Not authorized");
    }
  }
});
