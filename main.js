const firebaseConfig = {
    apiKey: "AIzaSyAKHM9fOK5L4LQCHL1fghdcaqo-kxC52Sg",
    authDomain: "registro-formulario-fcabf.firebaseapp.com",
    projectId: "registro-formulario-fcabf",
    storageBucket: "registro-formulario-fcabf.appspot.com",
    messagingSenderId: "404568044312",
    appId: "1:404568044312:web:51457c287aeaddaefa246d",
    measurementId: "G-7N52KQCGZ7"
};

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colection_forms = 'forms';
const colection_registrations = 'registrations';

async function loadForms() {
    const formSelect = document.getElementById("form-select");
    formSelect.innerHTML = '<option value="">Cargando formularios...</option>';
    try {
        const querySnapshot = await getDocs(collection(db, colection_forms));
        formSelect.innerHTML = '<option value="">Selecciona un formulario</option>';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const option = document.createElement("option");
            option.value = JSON.stringify({
                id: doc.id,
                title: data.title,
                url: data.url
            });
            option.textContent = data.title;
            formSelect.appendChild(option);
        });
    } catch (error) {
        formSelect.innerHTML = '<option value="">Error al cargar</option>';
    }
}

function addParameter(url, parametro, valor) {
    const urlObj = new URL(url);
    urlObj.searchParams.set(parametro, valor);
    return urlObj.toString();
}

async function handleSubmit(e) {
    e.preventDefault();
    const btnSubmit = document.getElementById("btn-submit");
    const email = document.getElementById("email").value.trim();
    const formSelect = document.getElementById("form-select");

    if (!email || !validateEmail(email)) {
        alert("Por favor, ingresa un email válido.");
        return;
    }

    if (!formSelect.value) {
        alert("Por favor, selecciona un formulario.");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.style.cursor = "not-allowed";
    btnSubmit.style.opacity = 0.5;
    btnSubmit.innerText = "Procesando...";

    try {
        const selectedForm = JSON.parse(formSelect.value);
        const emailRef = doc(db, colection_registrations, email);
        const docSnap = await getDoc(emailRef);

        const data = {
            email,
            timestamp: docSnap.exists() ? docSnap.data().timestamp : new Date().toLocaleString('es-ES', {
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                hour12: false
            }),
            attempts: docSnap.exists() ? docSnap.data().attempts + 1 : 1,
            form_id: selectedForm.id,
            form_title: selectedForm.title,
        };

        await setDoc(emailRef, data);
        btnSubmit.style.cursor = "pointer";
        btnSubmit.style.opacity = 1;
        btnSubmit.innerText = "Iniciar Formulario";
        btnSubmit.disabled = false;
        const url = addParameter(selectedForm.url, 'emailAddress', email)
        window.location.href = url;
    } catch (error) {
        alert("Ocurrió un error al procesar la solicitud.");
        btnSubmit.disabled = false;
        btnSubmit.style.cursor = "pointer";
        btnSubmit.style.opacity = 1;
        btnSubmit.innerText = "Iniciar Formulario";
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

document.addEventListener('DOMContentLoaded', () => {
    loadForms();
    document.querySelector('form').addEventListener('submit', handleSubmit);
});