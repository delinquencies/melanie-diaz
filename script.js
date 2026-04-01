document.addEventListener("DOMContentLoaded", () => {
  const galleryMainImage = document.getElementById("galleryMainImage");
  const galleryThumbs = document.querySelectorAll(".gallery-thumb");

  const hero = document.getElementById("hero");
  const header = document.getElementById("siteHeader");
  const sparkle = document.querySelector(".hero-sparkle");
  const langToggle = document.getElementById("heroLangToggle");

  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("mobileMenu");
  const navLinks = navMenu ? navMenu.querySelectorAll("a") : [];

  const serviceSelect = document.getElementById("service");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const messageInput = document.getElementById("message");

  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const formSubmitBtn = document.getElementById("formSubmitBtn");

  const successModal = document.getElementById("successModal");
  const modalClose = document.getElementById("modalClose");
  const modalOkay = document.getElementById("modalOkay");

  const dictionary = {
    en: {
      navServices: "SERVICES",
      navAbout: "ABOUT",
      navGallery: "GALLERY",
      navContact: "CONTACT",

      heroTag: "Textured Hair Specialist",
      heroCopy: "Modern, intentional hair artistry for curls, texture, and confidence.",
      heroBtnPrimary: "BOOK NOW",
      heroBtnSecondary: "VIEW SERVICES",

      servicesEyebrow: "Services",
      servicesTitle: "What Melanie Offers",
      servicesCta: "Book Your Appointment",

      service1Title: "Curly Dry Cut",
      service1Copy:
        "Shape, balance, and care tailored to your natural texture. Curly haircut on dry hair. No wash or styling included.",

      service2Title: "Haircut",
      service2Copy:
        "Haircut only for any texture hair. No wash or styling included.",

      service3Title: "Curly Cut & Define",
      service3Copy:
        "Curly haircut, wash, hydration, curl defining products and diffuse styling.",

      service4Title: "Silk Press + Trim",
      service4Copy:
        "A smoothing service for natural hair that creates a silky, straight finish without chemicals. Includes shampoo, blow-dry, trim, and flat iron styling for smooth shiny hair with natural movement.",

      service5Title: "Shampoo",
      service5Copy:
        "Specialized shampoos for all hair types: Hydrating, repairing, purifying, or for oily hair.",

      service6Title: "Relaxer",
      service6Copy:
        "Relaxer is a treatment that softens and straightens hair, eliminating frizz and leaving a smooth finish that is shiny and manageable.",

      service7Title: "Blow-Dry with Wash",
      service7Copy:
        "Includes shampoo, conditioning, and blow-dry styling.",

      aboutEyebrow: "About Melanie",
      aboutTitle: "Care, style, and healthy hair first.",
      aboutCopy1:
        "Melanie Diaz is a stylist focused on textured hair, curl care, and polished results that still feel like you. Her approach is modern, detail-driven, and rooted in helping clients feel confident in their natural beauty.",
      aboutCopy2:
        "Melanie will help you embrace your natural texture and shape, or explore whole new looks! Get in touch for a consult today.",
      aboutBtn: "BOOK NOW",
      aboutPoint1: "Textured hair focused",
      aboutPoint2: "Modern, clean styling",
      aboutPoint3: "Healthy hair mindset",
      aboutPoint4: "Personalized service",

      galleryEyebrow: "Gallery",
      galleryTitle: "A look at the work.",

      contactEyebrow: "Contact",
      contactTitle: "Let’s get you in the chair.",
      contactCopy:
        "Send a message, ask a question, or reach out for your next appointment.",

      formNameLabel: "Name",
      formEmailLabel: "Email",
      formPhoneLabel: "Phone",
      formServiceLabel: "Service",
      formServicePlaceholder: "Select a service",
      formMessageLabel: "Message",
      formSubmit: "Send Message",

      contactInfoTitle: "Reach Out",
      contactInfoCopy:
        "Prefer to message directly? Use Instagram, text, or send a note through the form.",
      contactBtnSecondary: "Instagram",

      footerName: "Melanie Diaz",
      footerTag: "Textured Hair Specialist",

      placeholderName: "Your name",
      placeholderEmail: "you@example.com",
      placeholderPhone: "(555) 555-5555",
      placeholderMessage:
        "Tell Melanie a little about your hair and what you're looking for.",

      optionCurlyDryCut: "Curly Dry Cut",
      optionHaircut: "Haircut",
      optionCurlyDefine: "Curly Cut & Define",
      optionSilkPressTrim: "Silk Press + Trim",
      optionShampoo: "Shampoo",
      optionRelaxer: "Relaxer",
      optionBlowDryWash: "Blow-Dry with Wash",

      formSending: "Sending...",
      formError: "Something went wrong. Please try again.",
      formNetworkError: "Network error. Please try again.",
      modalEyebrow: "Message Sent",
      modalTitle: "Thank you.",
      modalCopy:
        "Your message was sent successfully. Melanie will get back to you soon.",
      modalDone: "Done"
    },

    es: {
      navServices: "SERVICIOS",
      navAbout: "SOBRE MELANIE",
      navGallery: "GALERÍA",
      navContact: "CONTACTO",

      heroTag: "Especialista en cabello con textura",
      heroCopy: "Arte moderno e intencional para rizos, textura y confianza.",
      heroBtnPrimary: "RESERVAR",
      heroBtnSecondary: "VER SERVICIOS",

      servicesEyebrow: "Servicios",
      servicesTitle: "Lo Que Ofrece Melanie",
      servicesCta: "Reserva Tu Cita",

      service1Title: "Corte en Seco para Rizos",
      service1Copy:
        "Forma, balance y cuidado adaptados a tu textura natural. Corte para rizos sobre cabello seco. No incluye lavado ni peinado.",

      service2Title: "Corte de Cabello",
      service2Copy:
        "Corte solamente para cualquier textura de cabello. No incluye lavado ni peinado.",

      service3Title: "Corte de Rizos + Definición",
      service3Copy:
        "Corte para rizos, lavado, hidratación, productos para definir y secado con difusor.",

      service4Title: "Silk Press + Recorte",
      service4Copy:
        "Un servicio alisador para cabello natural que crea un acabado sedoso y liso sin químicos. Incluye shampoo, secado, recorte y planchado para un cabello brillante y con movimiento natural.",

      service5Title: "Shampoo",
      service5Copy:
        "Shampoos especializados para todo tipo de cabello: hidratante, reparador, purificante o para cabello graso.",

      service6Title: "Relajante",
      service6Copy:
        "El relajante es un tratamiento que suaviza y alisa el cabello, elimina el frizz y deja un acabado liso, brillante y manejable.",

      service7Title: "Blow-Dry con Lavado",
      service7Copy:
        "Incluye shampoo, acondicionamiento y peinado con secado.",

      aboutEyebrow: "Sobre Melanie",
      aboutTitle: "Cuidado, estilo y salud para tu cabello.",
      aboutCopy1:
        "Melanie Diaz es una estilista enfocada en cabello con textura, cuidado de rizos y resultados pulidos que todavía se sienten como tú. Su enfoque es moderno, detallista y está basado en ayudar a cada cliente a sentirse segura en su belleza natural.",
      aboutCopy2:
        "Melanie te ayudará a abrazar tu textura y forma natural, o a explorar looks completamente nuevos. Comunícate hoy para una consulta.",
      aboutBtn: "RESERVAR",
      aboutPoint1: "Enfoque en cabello con textura",
      aboutPoint2: "Estilo moderno y limpio",
      aboutPoint3: "Mentalidad de cabello saludable",
      aboutPoint4: "Servicio personalizado",

      galleryEyebrow: "Galería",
      galleryTitle: "Una mirada al trabajo.",

      contactEyebrow: "Contacto",
      contactTitle: "Vamos a ponerte en la silla.",
      contactCopy:
        "Envía un mensaje, haz una pregunta o comunícate para tu próxima cita.",

      formNameLabel: "Nombre",
      formEmailLabel: "Correo",
      formPhoneLabel: "Teléfono",
      formServiceLabel: "Servicio",
      formServicePlaceholder: "Selecciona un servicio",
      formMessageLabel: "Mensaje",
      formSubmit: "Enviar Mensaje",

      contactInfoTitle: "Contáctame",
      contactInfoCopy:
        "¿Prefieres escribir directamente? Usa Instagram, texto o envía una nota por el formulario.",
      contactBtnSecondary: "Instagram",

      footerName: "Melanie Diaz",
      footerTag: "Especialista en cabello con textura",

      placeholderName: "Tu nombre",
      placeholderEmail: "tu@correo.com",
      placeholderPhone: "(555) 555-5555",
      placeholderMessage:
        "Cuéntale a Melanie un poco sobre tu cabello y lo que buscas.",

      optionCurlyDryCut: "Corte en Seco para Rizos",
      optionHaircut: "Corte de Cabello",
      optionCurlyDefine: "Corte de Rizos + Definición",
      optionSilkPressTrim: "Silk Press + Recorte",
      optionShampoo: "Shampoo",
      optionRelaxer: "Relajante",
      optionBlowDryWash: "Blow-Dry con Lavado",

      formSending: "Enviando...",
      formError: "Algo salió mal. Inténtalo de nuevo.",
      formNetworkError: "Error de red. Inténtalo de nuevo.",
      modalEyebrow: "Mensaje Enviado",
      modalTitle: "Gracias.",
      modalCopy:
        "Tu mensaje fue enviado correctamente. Melanie se pondrá en contacto contigo pronto.",
      modalDone: "Listo"
    }
  };

  let currentLang = "en";

  function updateModalCopy(lang) {
    const modalEyebrow = document.querySelector(".modal-eyebrow");
    const modalTitle = document.getElementById("modalTitle");
    const modalCopy = document.querySelector(".modal-copy");

    if (modalEyebrow) modalEyebrow.textContent = dictionary[lang].modalEyebrow;
    if (modalTitle) modalTitle.textContent = dictionary[lang].modalTitle;
    if (modalCopy) modalCopy.textContent = dictionary[lang].modalCopy;
    if (modalOkay) modalOkay.textContent = dictionary[lang].modalDone;
  }

  function setLanguage(lang) {
    currentLang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (dictionary[lang] && dictionary[lang][key]) {
        el.textContent = dictionary[lang][key];
      }
    });

    if (nameInput) nameInput.placeholder = dictionary[lang].placeholderName;
    if (emailInput) emailInput.placeholder = dictionary[lang].placeholderEmail;
    if (phoneInput) phoneInput.placeholder = dictionary[lang].placeholderPhone;
    if (messageInput) messageInput.placeholder = dictionary[lang].placeholderMessage;

    if (serviceSelect) {
      const options = serviceSelect.options;
      if (options[0]) options[0].textContent = dictionary[lang].formServicePlaceholder;
      if (options[1]) options[1].textContent = dictionary[lang].optionCurlyDryCut;
      if (options[2]) options[2].textContent = dictionary[lang].optionHaircut;
      if (options[3]) options[3].textContent = dictionary[lang].optionCurlyDefine;
      if (options[4]) options[4].textContent = dictionary[lang].optionSilkPressTrim;
      if (options[5]) options[5].textContent = dictionary[lang].optionShampoo;
      if (options[6]) options[6].textContent = dictionary[lang].optionRelaxer;
      if (options[7]) options[7].textContent = dictionary[lang].optionBlowDryWash;
    }

    updateModalCopy(lang);

    if (langToggle) {
      langToggle.textContent = lang === "en" ? "Español" : "English";
    }

    localStorage.setItem("melanieLang", lang);
    document.documentElement.lang = lang;
  }

  function openModal() {
    if (!successModal) return;
    successModal.classList.add("is-open");
    successModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!successModal) return;
    successModal.classList.remove("is-open");
    successModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (galleryMainImage && galleryThumbs.length) {
    galleryThumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const newSrc = thumb.dataset.full;
        const newAlt = thumb.dataset.alt || "";

        if (!newSrc) return;

        galleryMainImage.style.opacity = "0.55";

        window.setTimeout(() => {
          galleryMainImage.src = newSrc;
          galleryMainImage.alt = newAlt;
          galleryMainImage.style.opacity = "1";
        }, 120);

        galleryThumbs.forEach((item) => item.classList.remove("is-active"));
        thumb.classList.add("is-active");
      });
    });
  }

  if (langToggle) {
    const savedLang = localStorage.getItem("melanieLang");
    setLanguage(savedLang && dictionary[savedLang] ? savedLang : "en");

    langToggle.addEventListener("click", () => {
      setLanguage(currentLang === "en" ? "es" : "en");
    });
  }

  if (hero) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hero.classList.add("is-ready");
      });
    });
  }

  if (hero && header) {
    const heroObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || entry.intersectionRatio < 0.6) {
          header.classList.add("is-visible");
        } else {
          header.classList.remove("is-visible");
        }
      },
      { threshold: [0, 0.35, 0.6, 0.8, 1] }
    );

    heroObserver.observe(hero);
  }

  if (sparkle) {
    const fireSparkle = () => {
      sparkle.classList.remove("is-active");
      void sparkle.offsetWidth;
      sparkle.classList.add("is-active");

      const nextDelay = 7000 + Math.random() * 9000;
      window.setTimeout(fireSparkle, nextDelay);
    };

    window.setTimeout(fireSparkle, 3200);
  }

  if (navToggle && header) {
    navToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("menu-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      });
    });

    document.addEventListener("click", (event) => {
      const clickedInsideHeader = header.contains(event.target);

      if (!clickedInsideHeader && header.classList.contains("menu-open")) {
        header.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      }
    });
  }

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modalOkay) modalOkay.addEventListener("click", closeModal);

  if (successModal) {
    successModal.addEventListener("click", (event) => {
      if (event.target === successModal) closeModal();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && successModal?.classList.contains("is-open")) {
      closeModal();
    }
  });

  if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (formStatus) formStatus.textContent = dictionary[currentLang].formSending;
      if (formSubmitBtn) formSubmitBtn.disabled = true;

      try {
        const response = await fetch(contactForm.action, {
          method: "POST",
          body: new FormData(contactForm),
          headers: {
            Accept: "application/json"
          }
        });

        if (response.ok) {
          contactForm.reset();
          if (formStatus) formStatus.textContent = "";
          openModal();
        } else {
          if (formStatus) {
            formStatus.textContent = dictionary[currentLang].formError;
          }
        }
      } catch (error) {
        if (formStatus) {
          formStatus.textContent = dictionary[currentLang].formNetworkError;
        }
      } finally {
        if (formSubmitBtn) formSubmitBtn.disabled = false;
      }
    });
  }
});