const firebaseConfig = {
    apiKey: "AIzaSyAKHM9fOK5L4LQCHL1fghdcaqo-kxC52Sg",
    authDomain: "registro-formulario-fcabf.firebaseapp.com",
    projectId: "registro-formulario-fcabf",
    storageBucket: "registro-formulario-fcabf.appspot.com",
    messagingSenderId: "404568044312",
    appId: "1:404568044312:web:51457c287aeaddaefa246d",
    measurementId: "G-7N52KQCGZ7"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function handleSubmit(e) {
    e.preventDefault();
    const  btnSubmit = document.getElementById("btn-submit");
    btnSubmit.disabled = true;
    btnSubmit.style.cursor = "not-allowed";
    btnSubmit.style.opacity = 0.5;
    btnSubmit.innerText = "Procesando...";
    const email = document.getElementById("email").value.trim();

    if (!email || !validateEmail(email)) {
        alert("Por favor, ingresa un email válido.");
        return;
    }

    try {
        const emailRef = doc(db, "registrations", email);
        const docSnap = await getDoc(emailRef);

        const data = {
            email,
            timestamp: docSnap.exists() ? docSnap.data().timestamp : new Date().toLocaleString('es-ES', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, hour12: false }),
            attempts: docSnap.exists() ? docSnap.data().attempts + 1 : 1,
        };

        await setDoc(emailRef, data);
        window.location.href = `https://docs.google.com/forms/d/e/1FAIpQLScA7vFoBHWxkpjBr-ybPseVcOL9EhyQUW9j_93bTbfS5-sPyQ/viewform?emailAddress=${encodeURIComponent(email)}`;
    } catch (error) {
        console.error("Error al guardar los datos: ", error);
        alert("Hubo un error al procesar tu solicitud. Por favor, intenta nuevamente.");
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');            
    form.addEventListener('submit', handleSubmit);
});