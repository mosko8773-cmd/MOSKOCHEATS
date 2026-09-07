// إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyAivD1yvv8id7MJtBZjy6lCi-6tQ2R_r3s",
  authDomain: "moskoalostora.firebaseapp.com",
  projectId: "moskoalostora",
  storageBucket: "moskoalostora.firebasestorage.app",
  messagingSenderId: "4323098726439",
  appId: "1:432309872643:web:6b39f4acce2b629d948636",
  measurementId: "G-D4GYMVWC7V"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// دالة توليد نص عشوائي
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// دالة إنشاء الكود وحفظه
async function generateAndSaveCode() {
  const resultElem = document.getElementById("result");
  const btn = document.getElementById("generateBtn");

  btn.disabled = true;
  resultElem.className = "";
  resultElem.innerText = "جاري إنشاء الكود...";

  const newCode = "CODE-" + generateRandomString(6);

  try {
    await db.collection("codes").doc(newCode).set({
      code: newCode,
      isUsed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    resultElem.className = "success";
    resultElem.innerText = "تم إنشاء الكود بنجاح:\n" + newCode;
  } catch (error) {
    console.error("خطأ:", error);
    resultElem.className = "error";
    resultElem.innerText = "حدث خطأ أثناء الحفظ! تفقد قواعد Firestore.";
  } finally {
    btn.disabled = false;
  }
}
