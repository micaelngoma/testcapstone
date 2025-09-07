const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

exports.verifyLicense = functions.https.onCall(async (data, context) => {
  const { licenseNumber, org, country, email, purpose } = data;
  if (!licenseNumber) {
    throw new functions.https.HttpsError("invalid-argument", "License number required.");
  }
  const ref = db.collection("licenses").doc(licenseNumber);
  const snap = await ref.get();

  let status = "Not Found";
  let detail = "License not found in registry.";
  if (snap.exists) {
    const lic = snap.data();
    const expired = lic.expiryDate && new Date(lic.expiryDate) < new Date();
    if (expired) {
      status = "Expired";
      detail = `Expired on ${lic.expiryDate}`;
    } else if (lic.status !== "Active") {
      status = lic.status;
      detail = `Status: ${lic.status}`;
    } else {
      status = "Verified";
      detail = `Holder: ${lic.fullName}, Class ${lic.class}, Expiry ${lic.expiryDate}`;
    }
  }
  await db.collection("verifications").add({
    licenseNumber, requestingOrg: org, country, contactEmail: email, purpose, status,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  return { success: status === "Verified", status, detail };
});

exports.sendInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Admin only.");
  const uid = context.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin only.");
  }
  const { email, role } = data;
  if (!email || !role) throw new functions.https.HttpsError("invalid-argument", "Email and role required.");
  const newUserRef = db.collection("users").doc();
  await newUserRef.set({ email, role });

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: "your.email@gmail.com", pass: "your-app-password" }
  });
  await transporter.sendMail({
    from: '"GDLVS Admin" <your.email@gmail.com>',
    to: email,
    subject: "GDLVS System Invite",
    text: `You have been invited to GDLVS as ${role}. Please contact admin for login setup.`
  });
  return { success: true, message: "Invite sent." };
});
