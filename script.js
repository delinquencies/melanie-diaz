document.addEventListener("DOMContentLoaded", () => {
  const galleryMainImage = document.getElementById("galleryMainImage");
  const galleryThumbs = document.querySelectorAll(".gallery-thumb");

  const hero = document.getElementById("hero");
  const header = document.getElementById("siteHeader");
  const sparkle = document.querySelector(".hero-sparkle");

  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("mobileMenu");
  const navLinks = navMenu ? navMenu.querySelectorAll("a") : [];

  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const formSubmitBtn = document.getElementById("formSubmitBtn");

  const successModal = document.getElementById("successModal");
  const modalClose = document.getElementById("modalClose");
  const modalOkay = document.getElementById("modalOkay");

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

  const galleryFeature = galleryMainImage?.closest(".gallery-feature");
  const galleryMainVideo = document.getElementById("galleryMainVideo");

  function showGalleryImage(src, alt) {
    if (galleryMainVideo) {
      galleryMainVideo.pause();
      galleryMainVideo.removeAttribute("src");
      galleryMainVideo.load();
      galleryMainVideo.classList.remove("is-visible");
    }
    if (galleryFeature) galleryFeature.classList.remove("gallery-feature--video");
    if (galleryMainImage) {
      galleryMainImage.style.display = "block";
      galleryMainImage.src = src;
      galleryMainImage.alt = alt;
    }
  }

  function showGalleryVideo(src, alt) {
    if (!galleryMainVideo || !galleryMainImage) return;
    galleryMainImage.style.display = "none";
    if (galleryFeature) galleryFeature.classList.add("gallery-feature--video");
    galleryMainVideo.setAttribute("aria-label", alt || "Gallery video");
    galleryMainVideo.src = src;
    galleryMainVideo.load();
    galleryMainVideo.classList.add("is-visible");
    const prefersReduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduced) {
      galleryMainVideo.play().catch(() => {});
    }
  }

  if (galleryMainImage && galleryThumbs.length) {
    galleryThumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const newSrc = thumb.dataset.full;
        const newAlt = thumb.dataset.alt || "";
        const isVideo = thumb.dataset.isVideo === "true";

        if (!newSrc) return;

        const mainEl = galleryFeature || galleryMainImage.parentElement;
        if (mainEl) mainEl.style.opacity = "0.92";

        window.setTimeout(() => {
          if (isVideo) {
            showGalleryVideo(newSrc, newAlt);
          } else {
            showGalleryImage(newSrc, newAlt);
          }
          if (mainEl) mainEl.style.opacity = "1";
        }, 120);

        galleryThumbs.forEach((item) => item.classList.remove("is-active"));
        thumb.classList.add("is-active");
      });
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

      if (formStatus) formStatus.textContent = "Sending…";
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
        } else if (formStatus) {
          formStatus.textContent = "Something went wrong. Please try again.";
        }
      } catch {
        if (formStatus) {
          formStatus.textContent = "Network error. Please try again.";
        }
      } finally {
        if (formSubmitBtn) formSubmitBtn.disabled = false;
      }
    });
  }
});
