// Interakcje strony: menu mobilne, stan headera, rok w stopce.
(function () {
  function init() {
    document.documentElement.classList.add("js");
    var menuButton = document.querySelector("[data-menu-button]");
    var nav = document.querySelector("[data-nav]");

    if (menuButton && nav) {
      var closeMenu = function () {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Otwórz menu");
      };

      menuButton.addEventListener("click", function () {
        var isOpen = nav.classList.toggle("is-open");
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute(
          "aria-label",
          isOpen ? "Zamknij menu" : "Otwórz menu",
        );
      });

      nav.addEventListener("click", function (event) {
        if (event.target.closest("a")) {
          closeMenu();
        }
      });

      // Escape zamyka menu i przywraca fokus na przycisk; klik poza panelem
      // również je zamyka — standardowe zachowanie rozwijanego menu.
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
          closeMenu();
          menuButton.focus();
        }
      });

      document.addEventListener("click", function (event) {
        if (!nav.classList.contains("is-open")) return;
        if (nav.contains(event.target) || menuButton.contains(event.target)) {
          return;
        }
        closeMenu();
      });
    }

    var header = document.querySelector("[data-header]");
    if (header) {
      // Strażnik: aktualizujemy klasę tylko przy realnej zmianie stanu, żeby
      // nie dotykać DOM przy każdym zdarzeniu scroll (mniej pracy layoutu).
      var scrolled = false;
      var updateHeader = function () {
        var next = window.scrollY > 8;
        if (next !== scrolled) {
          scrolled = next;
          header.classList.toggle("is-scrolled", next);
        }
      };
      updateHeader();
      window.addEventListener("scroll", updateHeader, { passive: true });
    }

    var year = String(new Date().getFullYear());
    document.querySelectorAll("[data-current-year]").forEach(function (el) {
      el.textContent = year;
    });

    initPrefetch();
    // Zabezpieczenie: jeśli biblioteka Splide się nie wczytała, klasa .js
    // (dodana wyżej) ukryłaby karuzele na stałe — wymuszamy ich widoczność,
    // aby treść (opinie, certyfikaty) pozostała dostępna. Współpracuje z C6.
    if (typeof Splide === "undefined") {
      document.querySelectorAll(".splide").forEach(function (el) {
        el.style.visibility = "visible";
        // Klasa awaryjna: CSS pokazuje wtedy slajdy jako czytelną, zawijaną
        // listę zamiast przyciętego paska karuzeli (patrz assets/css/main.css).
        el.classList.add("no-splide");
      });
    }
    initCertsCarousel();
    initReviewsCarousel();
    initGalleryLightbox();
  }

  // Powiększony podgląd zdjęcia "przed/po" w galerii.
  //
  // Korzysta z tej samej warstwy stylów co podgląd certyfikatów
  // (.media-modal w main.css) i z tego samego natywnego <dialog>, ale ma
  // własne atrybuty data-*, bo galeria nie jest karuzelą — nie ma tu
  // autoodtwarzania ani Splide, więc logika jest prostsza.
  //
  // Gdy przeglądarka nie zna <dialog> (showModal), funkcja po prostu nic nie
  // robi: zdjęcia zostają zwykłymi kadrami w siatce, strona działa dalej.
  function initGalleryLightbox() {
    var gallery = document.querySelector(".gallery");
    var modal = document.querySelector("[data-gallery-modal]");
    if (!gallery || !modal || typeof modal.showModal !== "function") return;

    var modalImg = modal.querySelector("[data-gallery-modal-img]");
    var modalCap = modal.querySelector("[data-gallery-modal-cap]");
    var modalClose = modal.querySelector("[data-gallery-modal-close]");
    var modalPrev = modal.querySelector("[data-gallery-modal-prev]");
    var modalNext = modal.querySelector("[data-gallery-modal-next]");
    var modalThumbs = modal.querySelector("[data-gallery-modal-thumbs]");
    if (!modalImg || !modalClose) return;

    var triggers = Array.prototype.slice.call(
      gallery.querySelectorAll("[data-gallery-trigger]"),
    );
    if (!triggers.length) return;

    var shots = triggers.map(function (trigger) {
      var thumbImg = trigger.querySelector("img");
      return {
        fullSrc: trigger.getAttribute("data-full-src") || "",
        // Do paska miniaturek bierzemy ten sam mały plik, który siatka już
        // pobrała, zamiast dużego podglądu — pasek nie generuje transferu.
        thumbSrc: thumbImg ? thumbImg.currentSrc || thumbImg.src : "",
        title: trigger.getAttribute("data-gallery-title") || "",
        note: trigger.getAttribute("data-gallery-note") || "",
      };
    });

    var currentIndex = 0;
    // Element, z którego otwarto podgląd — po zamknięciu wraca na niego fokus,
    // żeby nawigacja klawiaturą nie zaczynała od początku strony.
    var lastTrigger = null;

    var thumbButtons = [];
    var ensureThumbs = function () {
      if (!modalThumbs || thumbButtons.length) return;
      shots.forEach(function (shot, i) {
        var item = document.createElement("li");
        item.className = "media-modal__thumb-item";

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "media-modal__thumb";
        btn.setAttribute("data-gallery-modal-thumb", "");
        btn.setAttribute("data-index", String(i));
        btn.setAttribute("aria-label", shot.title || "Zdjęcie " + (i + 1));

        var img = document.createElement("img");
        img.src = shot.thumbSrc;
        img.alt = "";
        img.width = 68;
        img.height = 48;
        img.loading = "lazy";
        img.decoding = "async";

        btn.appendChild(img);
        item.appendChild(btn);
        modalThumbs.appendChild(item);
      });
      thumbButtons = Array.prototype.slice.call(
        modalThumbs.querySelectorAll("[data-gallery-modal-thumb]"),
      );
    };

    var showAt = function (index) {
      currentIndex = (index + shots.length) % shots.length;
      var shot = shots[currentIndex];
      if (!shot) return;
      modalImg.src = shot.fullSrc;
      modalImg.alt = shot.title
        ? "Powiększone zdjęcie: " + shot.title + " - efekt przed i po"
        : "Powiększone zdjęcie efektu zabiegu";
      if (modalCap) {
        modalCap.textContent = shot.title;
        if (shot.note) {
          var note = document.createElement("span");
          note.className = "media-modal__cap-note";
          note.textContent = shot.note;
          modalCap.appendChild(note);
        }
      }
      thumbButtons.forEach(function (btn, i) {
        var isActive = i === currentIndex;
        btn.classList.toggle("is-active", isActive);
        if (isActive) {
          btn.setAttribute("aria-current", "true");
          if (modal.open) {
            btn.scrollIntoView({ block: "nearest", inline: "center" });
          }
        } else {
          btn.removeAttribute("aria-current");
        }
      });
    };

    gallery.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-gallery-trigger]");
      if (!trigger) return;
      lastTrigger = trigger;
      ensureThumbs();
      modal.showModal();
      showAt(triggers.indexOf(trigger));
    });

    if (modalThumbs) {
      modalThumbs.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-gallery-modal-thumb]");
        if (!btn) return;
        showAt(parseInt(btn.getAttribute("data-index"), 10) || 0);
      });
    }

    if (modalPrev) {
      modalPrev.addEventListener("click", function () {
        showAt(currentIndex - 1);
      });
    }
    if (modalNext) {
      modalNext.addEventListener("click", function () {
        showAt(currentIndex + 1);
      });
    }

    // Strzałki przełączają zdjęcia niezależnie od tego, który element wewnątrz
    // okna ma fokus — stąd nasłuch na "document", a nie na samym <dialog>.
    // Escape obsługuje natywnie <dialog>, więc nie trzeba go przechwytywać.
    document.addEventListener("keydown", function (event) {
      if (!modal.open) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showAt(currentIndex + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        showAt(currentIndex - 1);
      }
    });

    modalClose.addEventListener("click", function () {
      modal.close();
    });

    // Klik w tło zamyka podgląd. Porównanie event.target z samym <dialog>
    // odróżnia tło od treści okna i — w odróżnieniu od sprawdzania
    // współrzędnych kursora — nie zamyka okna przy aktywacji przycisku
    // klawiaturą (Enter/Spacja zgłaszają "click" ze współrzędnymi 0,0).
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.close();
    });

    modal.addEventListener("close", function () {
      if (lastTrigger) lastTrigger.focus();
    });
  }

  // Karuzela opinii pacjentów na stronie głównej: Splide, pętla i autoplay z
  // pauzą na hover/focus oraz wyłączeniem ruchu przy prefers-reduced-motion.
  // To wielokolumnowa karuzela kart z cytatami, bez powiększonego podglądu.
  function initReviewsCarousel() {
    var splideRoot = document.getElementById("opinie-splide");
    if (!splideRoot || typeof Splide === "undefined") return;

    var wrapper = splideRoot.closest(".reviews-carousel");
    var prevBtn = wrapper ? wrapper.querySelector("[data-reviews-prev]") : null;
    var nextBtn = wrapper ? wrapper.querySelector("[data-reviews-next]") : null;
    var toggleBtn = wrapper
      ? wrapper.querySelector("[data-reviews-toggle]")
      : null;
    var toggleIcon = toggleBtn
      ? toggleBtn.querySelector("[data-reviews-toggle-icon]")
      : null;

    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    var autoplayPausedByUser = false;

    var splide = new Splide(splideRoot, {
      type: "loop",
      perPage: 3,
      // Zmienna wysokosc: karta dopasowuje sie do dlugosci opinii, dzieki czemu
      // dluzsze opinie nie sa ucinane (zwlaszcza na telefonie, perPage 1).
      autoHeight: true,
      perMove: 1,
      gap: "22px",
      arrows: false,
      pagination: false,
      drag: true,
      speed: 500,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      autoplay: !reduceMotion,
      interval: 5000,
      pauseOnHover: true,
      pauseOnFocus: true,
      breakpoints: {
        980: { perPage: 2 },
        620: { perPage: 1 },
      },
    });

    // Pauza/wznowienie autoplay przez publiczne API Splide (zabezpieczone na
    // wypadek braku komponentu Autoplay, np. gdy reduceMotion wyłączył autoplay).
    var pauseAutoplay = function () {
      if (splide.Components.Autoplay) splide.Components.Autoplay.pause();
    };
    var resumeAutoplay = function () {
      if (reduceMotion || autoplayPausedByUser) return;
      if (splide.Components.Autoplay) splide.Components.Autoplay.play();
    };

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        splide.go("<");
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        splide.go(">");
      });
    }

    // Przycisk pauzy/wznowienia autoplay (WCAG 2.2.2) — wzorzec jak w
    // initCertsCarousel. Przy prefers-reduced-motion autoplay jest wyłączony,
    // więc przycisk jest zbędny i chowamy go.
    if (toggleBtn) {
      if (reduceMotion) {
        toggleBtn.hidden = true;
      } else {
        toggleBtn.addEventListener("click", function () {
          autoplayPausedByUser = !autoplayPausedByUser;
          toggleBtn.setAttribute(
            "aria-pressed",
            autoplayPausedByUser ? "true" : "false",
          );
          toggleBtn.setAttribute(
            "aria-label",
            autoplayPausedByUser
              ? "Wznów automatyczne przewijanie opinii"
              : "Wstrzymaj automatyczne przewijanie opinii",
          );
          if (toggleIcon) {
            toggleIcon.textContent = autoplayPausedByUser ? "▶" : "Ⅱ";
          }
          if (autoplayPausedByUser) {
            pauseAutoplay();
          } else {
            resumeAutoplay();
          }
        });
      }
    }

    splide.mount();
  }

  // Karuzela certyfikatów w sekcji "O mnie", zbudowana na bibliotece Splide.
  // Karuzela działa w ciągłej pętli, ale liczba klonów jest ograniczona do
  // czterech po każdej stronie. Zapewnia to płynne przejście między ostatnim
  // i pierwszym certyfikatem bez tworzenia kopii całej kolekcji. Autoplay
  // można w każdej chwili zatrzymać osobnym przyciskiem, a preferencja
  // ograniczenia ruchu wyłącza go od początku.
  // - Klasę "is-active", którą Splide sam nakłada na bieżący slajd,
  //   wykorzystujemy do efektu powiększenia (o 20%) i ramki wokół aktywnego
  //   certyfikatu.
  // - Kliknięcie certyfikatu otwiera natywny <dialog> z powiększonym
  //   zdjęciem, strzałkami do przewijania i paskiem miniaturek wszystkich
  //   certyfikatów, na wyszarzonym tle strony.
  function initCertsCarousel() {
    var splideRoot = document.getElementById("certs-splide");
    if (!splideRoot || typeof Splide === "undefined") return;

    var wrapper = splideRoot.closest(".certs-carousel");
    var prevBtn = wrapper ? wrapper.querySelector("[data-certs-prev]") : null;
    var nextBtn = wrapper ? wrapper.querySelector("[data-certs-next]") : null;
    var toggleBtn = wrapper
      ? wrapper.querySelector("[data-certs-toggle]")
      : null;
    var toggleIcon = toggleBtn
      ? toggleBtn.querySelector("[data-certs-toggle-icon]")
      : null;
    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    var autoplayPausedByUser = false;

    // Lista certyfikatów (źródło + nazwa) jest zbierana raz i służy również
    // jako źródło danych dla powiększonego podglądu.
    var certs = Array.prototype.map.call(
      splideRoot.querySelectorAll("[data-cert-trigger]"),
      function (trigger) {
        // "fullSrc" to większa, ostrzejsza wersja certyfikatu (osobno
        // wyrenderowana z PDF-a w wyższej rozdzielczości) pokazywana w
        // powiększonym podglądzie; "thumbSrc" to ta sama mała grafika co w
        // karuzeli, użyta w pasku miniaturek popupu, żeby nie ściągać
        // dużych plików tylko po to, by wyświetlić je jako 68×48 px.
        var thumbImgEl = trigger.querySelector("img");
        return {
          fullSrc: trigger.getAttribute("data-full-src") || "",
          thumbSrc: thumbImgEl
            ? thumbImgEl.getAttribute("src")
            : trigger.getAttribute("data-full-src") || "",
          name: trigger.getAttribute("data-cert-name") || "",
        };
      },
    );

    var splide = new Splide(splideRoot, {
      type: "loop",
      clones: 4,
      autoWidth: true,
      autoHeight: true,
      focus: "center",
      gap: "28px",
      arrows: false,
      pagination: false,
      drag: true,
      // Krótkie przejście zapewnia szybką reakcję na strzałki i przeciąganie.
      speed: 380,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      autoplay: !reduceMotion,
      interval: 5000,
      pauseOnHover: true,
      pauseOnFocus: true,
    });

    // Popup z powiększonym podglądem certyfikatu: zdjęcie, strzałki
    // poprzedni/następny i pasek miniaturek wszystkich certyfikatów do
    // szybkiego przełączania. Kliknięcie karty w głównej karuzeli otwiera
    // natywny <dialog> z wyszarzonym tłem (::backdrop).
    var certModal = document.querySelector("[data-cert-modal]");
    var certModalImg = certModal
      ? certModal.querySelector("[data-cert-modal-img]")
      : null;
    var certModalClose = certModal
      ? certModal.querySelector("[data-cert-modal-close]")
      : null;
    var certModalPrev = certModal
      ? certModal.querySelector("[data-cert-modal-prev]")
      : null;
    var certModalNext = certModal
      ? certModal.querySelector("[data-cert-modal-next]")
      : null;
    var certModalThumbs = certModal
      ? certModal.querySelector("[data-cert-modal-thumbs]")
      : null;

    var isCertModalOpen = function () {
      return !!(certModal && certModal.open);
    };

    var pauseAutoplay = function () {
      if (splide.Components.Autoplay) splide.Components.Autoplay.pause();
    };
    var resumeAutoplay = function () {
      if (reduceMotion || autoplayPausedByUser || isCertModalOpen()) return;
      if (splide.Components.Autoplay) splide.Components.Autoplay.play();
    };

    if (
      certModal &&
      certModalImg &&
      certModalClose &&
      certs.length &&
      typeof certModal.showModal === "function"
    ) {
      var currentModalIndex = 0;

      // Miniaturki powstają dopiero przy pierwszym otwarciu podglądu. Dzięki
      // temu zamknięty dialog nie wymusza pobrania wszystkich obrazów już
      // podczas wejścia na stronę.
      var certModalThumbButtons = [];
      var ensureModalThumbs = function () {
        if (!certModalThumbs || certModalThumbButtons.length) return;
        certs.forEach(function (cert, i) {
          var item = document.createElement("li");
          item.className = "cert-modal__thumb-item";

          var thumbBtn = document.createElement("button");
          thumbBtn.type = "button";
          thumbBtn.className = "cert-modal__thumb";
          thumbBtn.setAttribute("data-cert-modal-thumb", "");
          thumbBtn.setAttribute("data-index", String(i));
          thumbBtn.setAttribute(
            "aria-label",
            cert.name || "Certyfikat " + (i + 1),
          );

          var thumbImg = document.createElement("img");
          thumbImg.src = cert.thumbSrc;
          thumbImg.alt = "";
          thumbImg.width = 68;
          thumbImg.height = 48;
          thumbImg.loading = "lazy";
          thumbImg.decoding = "async";

          thumbBtn.appendChild(thumbImg);
          item.appendChild(thumbBtn);
          certModalThumbs.appendChild(item);
        });
        certModalThumbButtons = Array.prototype.slice.call(
          certModalThumbs.querySelectorAll("[data-cert-modal-thumb]"),
        );
      };

      // Podmienia zdjęcie i podświetla odpowiednią miniaturkę, bez zmiany
      // stanu otwarcia popupu — używane zarówno przy pierwszym otwarciu,
      // jak i przy przełączaniu strzałkami/miniaturkami.
      var showCertAt = function (index) {
        var cert = certs[(index + certs.length) % certs.length];
        if (!cert) return;
        currentModalIndex = (index + certs.length) % certs.length;
        certModalImg.src = cert.fullSrc;
        certModalImg.alt = cert.name
          ? "Powiększony podgląd: " + cert.name
          : "Powiększony podgląd certyfikatu";
        certModalThumbButtons.forEach(function (btn, i) {
          var isActive = i === currentModalIndex;
          btn.classList.toggle("is-active", isActive);
          if (isActive) {
            btn.setAttribute("aria-current", "true");
            if (isCertModalOpen()) {
              btn.scrollIntoView({ block: "nearest", inline: "center" });
            }
          } else {
            btn.removeAttribute("aria-current");
          }
        });
      };

      var openCertModal = function (index) {
        ensureModalThumbs();
        pauseAutoplay();
        certModal.showModal();
        showCertAt(index);
      };

      splideRoot.addEventListener("click", function (event) {
        var trigger = event.target.closest("[data-cert-trigger]");
        if (!trigger) return;
        var fullSrc = trigger.getAttribute("data-full-src");
        var index = certs.findIndex(function (cert) {
          return cert.fullSrc === fullSrc;
        });
        openCertModal(index === -1 ? 0 : index);
      });

      if (certModalThumbs) {
        certModalThumbs.addEventListener("click", function (event) {
          var thumbBtn = event.target.closest("[data-cert-modal-thumb]");
          if (!thumbBtn) return;
          showCertAt(parseInt(thumbBtn.getAttribute("data-index"), 10) || 0);
        });
      }

      if (certModalPrev) {
        certModalPrev.addEventListener("click", function () {
          showCertAt(currentModalIndex - 1);
        });
      }
      if (certModalNext) {
        certModalNext.addEventListener("click", function () {
          showCertAt(currentModalIndex + 1);
        });
      }

      // Strzałki klawiatury przełączają certyfikat, gdy popup jest otwarty.
      // Nasłuch na "document" (a nie na samym oknie dialogowym) działa
      // niezależnie od tego, na którym elemencie wewnątrz popupu aktualnie
      // znajduje się fokus.
      document.addEventListener("keydown", function (event) {
        if (!isCertModalOpen()) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          showCertAt(currentModalIndex + 1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          showCertAt(currentModalIndex - 1);
        }
      });

      certModalClose.addEventListener("click", function () {
        certModal.close();
      });

      // Klik w tło (backdrop) natywnego <dialog> zamyka popup. Kliknięcie na
      // rzeczywistej treści okna (zdjęcie, strzałki, miniaturki) ustawia
      // "event.target" na ten konkretny element potomny, więc porównanie z
      // samym elementem <dialog> odróżnia klik w tło od kliknięcia treści —
      // w przeciwieństwie do porównywania współrzędnych kursora, które
      // błędnie zamykałoby popup przy aktywacji przycisku klawiaturą
      // (Enter/Spacja wywołują "click" ze współrzędnymi 0,0).
      certModal.addEventListener("click", function (event) {
        if (event.target === certModal) certModal.close();
      });
      certModal.addEventListener("close", resumeAutoplay);
    }

    // Własne przyciski poprzedni/następny sterują karuzelą przez publiczne
    // API Splide zamiast ręcznego przewijania.
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        splide.go("<");
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        splide.go(">");
      });
    }

    if (toggleBtn) {
      if (reduceMotion) {
        toggleBtn.hidden = true;
      } else {
        toggleBtn.addEventListener("click", function () {
          autoplayPausedByUser = !autoplayPausedByUser;
          toggleBtn.setAttribute(
            "aria-pressed",
            autoplayPausedByUser ? "true" : "false",
          );
          toggleBtn.setAttribute(
            "aria-label",
            autoplayPausedByUser
              ? "Wznów automatyczne przewijanie certyfikatów"
              : "Wstrzymaj automatyczne przewijanie certyfikatów",
          );
          if (toggleIcon) {
            toggleIcon.textContent = autoplayPausedByUser ? "▶" : "Ⅱ";
          }
          if (autoplayPausedByUser) {
            pauseAutoplay();
          } else {
            resumeAutoplay();
          }
        });
      }
    }

    splide.mount();
  }

  // Prefetch stron tego samego pochodzenia po najechaniu/dotknięciu linku
  // (uzupełnia Speculation Rules tam, gdzie prerender nie jest wspierany).
  function initPrefetch() {
    var test = document.createElement("link");
    if (
      !test.relList ||
      !test.relList.supports ||
      !test.relList.supports("prefetch")
    ) {
      return;
    }
    var seen = {};
    var prefetch = function (url) {
      if (seen[url]) return;
      seen[url] = true;
      var link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      document.head.appendChild(link);
    };
    var onIntent = function (event) {
      var a = event.target.closest && event.target.closest("a[href]");
      if (!a) return;
      if (a.origin !== location.origin) return;
      if (a.protocol !== "http:" && a.protocol !== "https:") return;
      if (a.href === location.href) return;
      if (a.hash && a.pathname === location.pathname) return;
      prefetch(a.href);
    };
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("touchstart", onIntent, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
