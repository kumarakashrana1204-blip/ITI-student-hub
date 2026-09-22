import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";


/* =========================
   FIREBASE
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyAdlKjT_iVGK6vOEOb_fhkSu2ZFJikPK-s",
  authDomain: "iti-student-hub.firebaseapp.com",
  projectId: "iti-student-hub",
  storageBucket: "iti-student-hub.firebasestorage.app",
  messagingSenderId: "185676168422",
  appId: "1:185676168422:web:8ee0c6aae719265e258f27",
  measurementId: "G-TNBRNQVRR3"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


/* =========================
   ADMIN
========================= */

const ADMIN_EMAIL =
  "kumarakashrana1204@gmail.com";


let currentUser = null;
let allNotes = [];


/* =========================
   HELPERS
========================= */

const $ = id =>
  document.getElementById(id);


function isAdmin() {

  return (
    currentUser &&
    currentUser.email.toLowerCase() ===
    ADMIN_EMAIL.toLowerCase()
  );

}


function escapeHtml(value) {

  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );

}


function showMessage(id, message) {

  const element = $(id);

  if (element) {
    element.textContent = message;
  }

}


/* =========================
   LOGIN / SIGNUP TABS
========================= */

$("loginTab")?.addEventListener(
  "click",
  () => {

    $("loginForm")?.classList.remove("hidden");
    $("signupForm")?.classList.add("hidden");

    $("loginTab")?.classList.add("active");
    $("signupTab")?.classList.remove("active");

  }
);


$("signupTab")?.addEventListener(
  "click",
  () => {

    $("signupForm")?.classList.remove("hidden");
    $("loginForm")?.classList.add("hidden");

    $("signupTab")?.classList.add("active");
    $("loginTab")?.classList.remove("active");

  }
);


/* =========================
   FIREBASE ERROR
========================= */

function firebaseError(error) {

  const messages = {

    "auth/invalid-credential":
      "Email ya password galat hai.",

    "auth/invalid-email":
      "Valid email enter karo.",

    "auth/email-already-in-use":
      "Ye email already registered hai.",

    "auth/weak-password":
      "Password minimum 6 characters ka hona chahiye.",

    "auth/network-request-failed":
      "Internet connection check karo."

  };

  return (
    messages[error.code] ||
    "Something went wrong."
  );

}


/* =========================
   SIGNUP
========================= */

$("signupForm")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    showMessage(
      "signupMessage",
      "Account create ho raha hai..."
    );

    try {

      const name =
        $("signupName").value.trim();

      const trade =
        $("signupTrade").value.trim();

      const batch =
        $("signupBatch").value.trim();

      const email =
        $("signupEmail").value.trim();

      const password =
        $("signupPassword").value;


      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      const user =
        credential.user;


      await setDoc(
        doc(
          db,
          "students",
          user.uid
        ),
        {

          uid: user.uid,

          name,

          trade,

          batch,

          email,

          role:
            email.toLowerCase() ===
            ADMIN_EMAIL.toLowerCase()
              ? "admin"
              : "student",

          createdAt:
            serverTimestamp()

        }
      );


      showMessage(
        "signupMessage",
        "✅ Account successfully created."
      );


      $("signupForm").reset();


    } catch (error) {

      showMessage(
        "signupMessage",
        firebaseError(error)
      );

    }

  }
);


/* =========================
   LOGIN
========================= */

$("loginForm")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    showMessage(
      "loginMessage",
      "Logging in..."
    );

    try {

      await signInWithEmailAndPassword(
        auth,
        $("loginEmail").value.trim(),
        $("loginPassword").value
      );


      showMessage(
        "loginMessage",
        "✅ Login successful."
      );


    } catch (error) {

      showMessage(
        "loginMessage",
        firebaseError(error)
      );

    }

  }
);


/* =========================
   FILE SELECT
========================= */

$("noteFile")?.addEventListener(
  "change",
  () => {

    const file =
      $("noteFile").files[0];

    if (!file) {

      $("fileName").textContent =
        "No file selected";

      return;

    }


    $("fileName").textContent =
      `${file.name} • ${
        (file.size / 1024 / 1024).toFixed(2)
      } MB`;

  }
);


/* =========================
   UPLOAD NOTE
========================= */

$("uploadForm")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    if (!currentUser) {

      showMessage(
        "uploadMessage",
        "⚠️ Pehle login karo."
      );

      return;

    }


    const file =
      $("noteFile").files[0];


    if (!file) {

      showMessage(
        "uploadMessage",
        "⚠️ File select karo."
      );

      return;

    }


    if (
      file.size >
      15 * 1024 * 1024
    ) {

      showMessage(
        "uploadMessage",
        "⚠️ Maximum file size 15 MB hai."
      );

      return;

    }


    if (
      !file.type.includes("pdf") &&
      !file.type.startsWith("image/")
    ) {

      showMessage(
        "uploadMessage",
        "⚠️ Sirf PDF ya image upload kar sakte ho."
      );

      return;

    }


    showMessage(
      "uploadMessage",
      "📤 Upload ho raha hai..."
    );


    try {

      const safeName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );


      const storagePath =
        `notes/${currentUser.uid}/${Date.now()}_${safeName}`;


      const fileRef =
        ref(storage, storagePath);


      await uploadBytes(
        fileRef,
        file,
        {
          contentType: file.type
        }
      );


      const fileUrl =
        await getDownloadURL(fileRef);


      await addDoc(
        collection(db, "uploads"),
        {

          title:
            $("noteTitle").value.trim(),

          trade:
            $("noteTrade").value.trim(),

          subject:
            $("noteSubject").value.trim(),

          description:
            $("noteDescription").value.trim(),

          fileName:
            file.name,

          fileType:
            file.type,

          fileUrl,

          storagePath,

          uploadedBy:
            currentUser.uid,

          uploaderEmail:
            currentUser.email,

          status:
            "pending",

          createdAt:
            serverTimestamp()

        }
      );


      $("uploadForm").reset();


      $("fileName").textContent =
        "No file selected";


      showMessage(
        "uploadMessage",
        "✅ Upload successful! Admin approval ke baad note students ko dikhega."
      );


    } catch (error) {

      console.error(error);

      showMessage(
        "uploadMessage",
        "❌ Upload failed: " +
        firebaseError(error)
      );

    }

  }
);


/* =========================
   LOAD APPROVED NOTES
========================= */

async function loadNotes() {

  if (!$("notesList")) return;


  $("notesList").innerHTML =
    "<p class='muted'>📚 Notes loading...</p>";


  try {

    const q =
      query(
        collection(db, "uploads"),
        where("status", "==", "approved")
      );


    const snapshot =
      await getDocs(q);


    allNotes =
      snapshot.docs.map(
        item => ({
          id: item.id,
          ...item.data()
        })
      );


    populateTrades();

    renderNotes();


  } catch (error) {

    console.error(error);

    $("notesList").innerHTML =
      `<p class="muted">
        ❌ Notes load nahi ho paaye.
      </p>`;

  }

}


/* =========================
   TRADE FILTER
========================= */

function populateTrades() {

  if (!$("tradeFilter")) return;


  const trades =
    [
      ...new Set(
        allNotes
          .map(note => note.trade)
          .filter(Boolean)
      )
    ].sort();


  $("tradeFilter").innerHTML =
    `<option value="">All Trades</option>` +
    trades.map(
      trade =>
        `<option value="${escapeHtml(trade)}">
          ${escapeHtml(trade)}
        </option>`
    ).join("");

}


/* =========================
   RENDER NOTES
========================= */

function renderNotes() {

  if (!$("notesList")) return;


  const search =
    $("searchInput")?.value
      ?.trim()
      .toLowerCase() || "";


  const trade =
    $("tradeFilter")?.value || "";


  const filtered =
    allNotes.filter(note => {

      const text =
        `${note.title || ""}
         ${note.subject || ""}
         ${note.trade || ""}
         ${note.description || ""}`
        .toLowerCase();


      return (
        (!search || text.includes(search)) &&
        (!trade || note.trade === trade)
      );

    });


  if (!filtered.length) {

    $("notesList").innerHTML =
      `<p class="muted">
        📭 Koi approved note nahi mila.
      </p>`;

    return;

  }


  $("notesList").innerHTML =
    filtered.map(note => `

      <article class="note">

        <div class="note-main">

          <div class="note-title">
            📄 ${escapeHtml(note.title)}
          </div>

          <div class="note-meta">

            ${escapeHtml(note.trade || "")}
            •
            ${escapeHtml(note.subject || "")}

            <br>

            ${escapeHtml(
              note.description || ""
            )}

          </div>

        </div>

        <div class="note-actions">

          <a
            class="open-btn"
            href="${note.fileUrl}"
            target="_blank"
            rel="noopener">

            Open / Download

          </a>

        </div>

      </article>

    `).join("");

}


/* =========================
   ADMIN PANEL
========================= */

async function loadAdminPanel() {

  if (!$("admin-section")) return;


  if (!isAdmin()) {

    $("admin-section")
      .classList.add("hidden");


    return;

  }


  $("admin-section")
    .classList.remove("hidden");


  showMessage(
    "adminMessage",
    "⏳ Loading admin data..."
  );


  try {

    const snapshot =
      await getDocs(
        collection(db, "uploads")
      );


    const uploads =
      snapshot.docs.map(
        item => ({
          id: item.id,
          ...item.data()
        })
      );


    const pending =
      uploads.filter(
        item => item.status === "pending"
      );


    const approved =
      uploads.filter(
        item => item.status === "approved"
      );


    if ($("pendingCount"))
      $("pendingCount").textContent =
        pending.length;


    if ($("approvedCount"))
      $("approvedCount").textContent =
        approved.length;


    if ($("studentCount")) {

      const students =
        await getDocs(
          collection(db, "students")
        );

      $("studentCount").textContent =
        students.size;

    }


    renderAdminNotes(pending);


    showMessage(
      "adminMessage",
      pending.length
        ? "⏳ Pending notes review karo."
        : "✅ Koi pending note nahi hai."
    );


  } catch (error) {

    console.error(error);

    showMessage(
      "adminMessage",
      "❌ Admin data load nahi hua."
    );

  }

}


/* =========================
   ADMIN NOTE LIST
========================= */

function renderAdminNotes(notes) {

  if (!$("adminList")) return;


  if (!notes.length) {

    $("adminList").innerHTML =
      `<p class="muted">
        🎉 No pending uploads.
      </p>`;

    return;

  }


  $("adminList").innerHTML =
    notes.map(note => `

      <article class="note admin-note">

        <div class="note-main">

          <div class="note-title">
            📄 ${escapeHtml(note.title)}
          </div>

          <div class="note-meta">

            Trade:
            ${escapeHtml(note.trade)}

            <br>

            Subject:
            ${escapeHtml(note.subject)}

            <br>

            Uploaded by:
            ${escapeHtml(note.uploaderEmail)}

          </div>

        </div>


        <div class="note-actions">

          <a
            class="open-btn"
            href="${note.fileUrl}"
            target="_blank"
            rel="noopener">

            👁️ View

          </a>


          <button
            class="approve-btn"
            data-id="${note.id}">

            ✅ Approve

          </button>


          <button
            class="reject-btn"
            data-id="${note.id}">

            ❌ Reject

          </button>

        </div>

      </article>

    `).join("");


  document
    .querySelectorAll(".approve-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          updateNoteStatus(
            button.dataset.id,
            "approved"
          )
      );

    });


  document
    .querySelectorAll(".reject-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          updateNoteStatus(
            button.dataset.id,
            "rejected"
          )
      );

    });

}


/* =========================
   APPROVE / REJECT
========================= */

async function updateNoteStatus(
  noteId,
  status
) {

  if (!isAdmin()) {

    alert(
      "Admin access required."
    );

    return;

  }


  try {

    await updateDoc(
      doc(
        db,
        "uploads",
        noteId
      ),
      {

        status,

        reviewedBy:
          currentUser.email,

        reviewedAt:
          serverTimestamp()

      }
    );


    alert(
      status === "approved"
        ? "✅ Note approved."
        : "❌ Note rejected."
    );


    await loadAdminPanel();

    await loadNotes();


  } catch (error) {

    console.error(error);

    alert(
      "❌ Status update failed."
    );

  }

}


/* =========================
   SEARCH
========================= */

$("searchInput")?.addEventListener(
  "input",
  renderNotes
);


$("tradeFilter")?.addEventListener(
  "change",
  renderNotes
);


$("refreshBtn")?.addEventListener(
  "click",
  loadNotes
);


$("adminRefresh")?.addEventListener(
  "click",
  loadAdminPanel
);


/* =========================
   NAVIGATION
========================= */

function scrollToSection(id) {

  $(id)?.scrollIntoView({
    behavior: "smooth"
  });

}


$("navHome")?.addEventListener(
  "click",
  () =>
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })
);


$("navNotes")?.addEventListener(
  "click",
  () =>
    scrollToSection("notes-section")
);


$("navUpload")?.addEventListener(
  "click",
  () =>
    scrollToSection("upload-section")
);


$("navInfo")?.addEventListener(
  "click",
  () =>
    scrollToSection("info-section")
);


$("navNotesCard")?.addEventListener(
  "click",
  () =>
    scrollToSection("notes-section")
);


$("navUploadCard")?.addEventListener(
  "click",
  () =>
    scrollToSection("upload-section")
);


$("navInfoCard")?.addEventListener(
  "click",
  () =>
    scrollToSection("info-section")
);


$("navAdminCard")?.addEventListener(
  "click",
  () =>
    scrollToSection("admin-section")
);


$("exploreBtn")?.addEventListener(
  "click",
  () =>
    scrollToSection("notes-section")
);


/* =========================
   AUTH STATE
========================= */

onAuthStateChanged(
  auth,
  async user => {

    currentUser = user;


    if (user) {

      $("authCard")
        ?.classList.add("hidden");


      $("appSection")
        ?.classList.remove("hidden");


      if ($("headerUser")) {

        $("headerUser").innerHTML = `

          <span>
            👤 ${escapeHtml(user.email)}
          </span>

          <button
            id="logout"
            class="secondary">

            Logout

          </button>

        `;


        $("logout").addEventListener(
          "click",
          () => signOut(auth)
        );

      }


      if ($("navAdminCard")) {

        $("navAdminCard")
          .classList.toggle(
            "hidden",
            !isAdmin()
          );

      }


      await loadNotes();

      await loadAdminPanel();


    } else {

      $("authCard")
        ?.classList.remove("hidden");


      $("appSection")
        ?.classList.add("hidden");


      if ($("headerUser")) {

        $("headerUser").innerHTML =
          "";

      }

    }

  }
);
/* =========================
   NOTICE SYSTEM
========================= */

async function loadNotices() {

  const noticeList = $("noticeList");

  if (!noticeList) return;

  noticeList.innerHTML =
    "<p class='muted'>📢 Notices loading...</p>";

  try {

    const snapshot = await getDocs(
      collection(db, "notices")
    );

    const notices = snapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data()
      }))
      .sort((a, b) => {

        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return bTime - aTime;

      });


    if (!notices.length) {

      noticeList.innerHTML =
        `<p class="muted">
          📭 अभी कोई notice नहीं है।
        </p>`;

      return;
    }


    noticeList.innerHTML =
      notices.map(notice => `

        <article class="note">

          <div class="note-main">

            <div class="note-title">
              📢 ${escapeHtml(notice.title)}
            </div>

            <div class="note-meta">
              ${escapeHtml(notice.text)}
            </div>

          </div>

        </article>

      `).join("");


  } catch (error) {

    console.error(error);

    noticeList.innerHTML =
      `<p class="muted">
        ❌ Notices load नहीं हो सके।
      </p>`;

  }

}


/* =========================
   CREATE NOTICE
========================= */

$("noticeForm")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    if (!isAdmin()) {

      showMessage(
        "noticeMessage",
        "❌ केवल Admin notice बना सकता है।"
      );

      return;
    }


    const title =
      $("noticeTitle")
        .value
        .trim();

    const text =
      $("noticeText")
        .value
        .trim();


    if (!title || !text) {

      showMessage(
        "noticeMessage",
        "⚠️ Title और notice details भरें।"
      );

      return;
    }


    showMessage(
      "noticeMessage",
      "📢 Notice publish हो रहा है..."
    );


    try {

      await addDoc(
        collection(db, "notices"),
        {

          title,

          text,

          createdBy:
            currentUser.email,

          createdAt:
            serverTimestamp()

        }
      );


      $("noticeForm").reset();


      showMessage(
        "noticeMessage",
        "✅ Notice successfully published!"
      );


      await loadNotices();


    } catch (error) {

      console.error(error);

      showMessage(
        "noticeMessage",
        "❌ Notice publish नहीं हुआ।"
      );

    }

  }
);


/* =========================
   ADMIN NOTICE VISIBILITY
========================= */

async function setupNoticeSystem() {

  await loadNotices();


  const adminNotice =
    $("admin-notice-section");


  if (adminNotice) {

    adminNotice.classList.toggle(
      "hidden",
      !isAdmin()
    );

  }

}


/* =========================
   RUN NOTICE SYSTEM
========================= */

if (currentUser) {
  setupNoticeSystem();
}
