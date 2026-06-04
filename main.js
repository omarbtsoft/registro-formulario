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

// Minutos por defecto si el formulario no tiene un campo 'duration' válido en Firestore.
const DEFAULT_DURATION_MINUTES = 10;

let countdownInterval = null;

function setLoading(isLoading) {
    const btnSubmit = document.getElementById("btn-submit");
    const btnText = btnSubmit.querySelector(".btn-text");
    btnSubmit.disabled = isLoading;
    btnSubmit.classList.toggle("loading", isLoading);
    if (btnText) {
        btnText.textContent = isLoading ? "Procesando..." : "Iniciar Formulario";
    }
}

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
                url: data.url,
                duration: data.duration
            });
            option.textContent = data.title;
            formSelect.appendChild(option);
        });
    } catch (error) {
        formSelect.innerHTML = '<option value="">Error al cargar</option>';
        Swal.fire({
            icon: 'error',
            title: 'No se pudieron cargar los formularios',
            text: 'Revisa tu conexión a internet e intenta recargar la página.'
        });
    }
}

function addParameter(url, parametro, valor) {
    const urlObj = new URL(url);
    urlObj.searchParams.set(parametro, valor);
    return urlObj.toString();
}

// Devuelve la duración en minutos: usa el campo de Firestore o el valor por defecto.
function getDurationMinutes(selectedForm) {
    const minutes = Number(selectedForm.duration);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_DURATION_MINUTES;
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function onTimeUp() {
    document.getElementById("time-up-overlay").classList.add("active");
    Swal.fire({
        icon: 'warning',
        title: 'Se acabó el tiempo',
        text: 'El tiempo para completar el formulario ha finalizado.',
        confirmButtonColor: '#3b82f6',
        allowOutsideClick: false
    });
}

function startTimer(totalSeconds) {
    const timerEl = document.getElementById("timer");
    let remaining = totalSeconds;

    const render = () => {
        timerEl.textContent = formatTime(remaining);
        timerEl.classList.toggle("warning", remaining <= 60);
    };

    render();
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            remaining = 0;
            render();
            clearInterval(countdownInterval);
            countdownInterval = null;
            onTimeUp();
            return;
        }
        render();
    }, 1000);
}

// Oculta la tarjeta de registro, embebe el formulario y arranca el cronómetro.
function startForm(url, durationMinutes) {
    const iframe = document.getElementById("form-iframe");
    const embeddedUrl = addParameter(url, 'embedded', 'true');

    iframe.src = embeddedUrl;
    document.getElementById("registro-card").style.display = "none";
    document.getElementById("form-view").classList.add("active");
    startTimer(durationMinutes * 60);
}

async function handleSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const formSelect = document.getElementById("form-select");

    if (!email || !validateEmail(email)) {
        Swal.fire({
            icon: 'warning',
            title: 'Email no válido',
            text: 'Ingresa un correo con formato correcto, por ejemplo: nombre@dominio.com'
        });
        return;
    }

    if (!formSelect.value) {
        Swal.fire({
            icon: 'info',
            title: 'Falta seleccionar',
            text: 'Elige un formulario de la lista para continuar.'
        });
        return;
    }

    const selectedForm = JSON.parse(formSelect.value);
    const durationMinutes = getDurationMinutes(selectedForm);

    // Validar la URL del formulario antes de continuar para dar un mensaje claro.
    let url;
    try {
        url = addParameter(selectedForm.url, 'emailAddress', email);
    } catch (urlError) {
        Swal.fire({
            icon: 'error',
            title: 'Formulario no válido',
            text: 'La URL del formulario no es válida. Por favor, contacta al administrador.'
        });
        return;
    }

    // Pedir confirmación ANTES de guardar nada: el correo solo se registra si decide comenzar.
    const result = await Swal.fire({
        icon: 'info',
        title: '¿Listo para comenzar?',
        html: `Tienes <b>${durationMinutes} minuto${durationMinutes === 1 ? '' : 's'}</b> para completar el formulario <b>${selectedForm.title}</b>.<br><br>` +
            'Al pulsar <b>Comenzar</b>, se registrará tu correo y el tiempo empezará a correr y <u>no se puede pausar</u>.',
        showCancelButton: true,
        confirmButtonText: 'Comenzar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6',
        allowOutsideClick: false
    });

    // Si cancela, no se guarda nada en Firestore.
    if (!result.isConfirmed) {
        return;
    }

    setLoading(true);
    Swal.fire({
        title: 'Procesando...',
        text: 'Guardando tu registro',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
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
        setLoading(false);
        Swal.close();

        startForm(url, durationMinutes);
    } catch (error) {
        setLoading(false);
        Swal.fire({
            icon: 'error',
            title: 'No se pudo procesar',
            text: 'Ocurrió un problema al guardar tu registro. Inténtalo de nuevo.'
        });
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
