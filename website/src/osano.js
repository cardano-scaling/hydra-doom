document.addEventListener("DOMContentLoaded", () => {
  /**
   * Helpers
   */
  function matchBreakpoint(breakpoint, callback) {
    const mediaQuery = window.matchMedia(breakpoint);
    if (mediaQuery.matches) callback();

    mediaQuery.addEventListener("change", (event) => {
      if (event.matches) callback();
    });
  }

  /**
   * Modal
   */
  const openModal = (modal) => {
    if (modal) {
      modal.style.display = "flex";

      if (
        modal.id === "modal-game" ||
        modal.id === "modal-intro" ||
        modal.id === "modal-fallback"
      ) {
        document
          .querySelectorAll(".js-hide-when-modal-opens")
          .forEach((element) => {
            element.style.display = "none";
          });
      }
    }
  };

  const closeModal = (modal) => {
    if (modal) {
      modal.style.display = "none";

      if (modal.id === "modal-intro") {
        document
          .querySelectorAll(".js-hide-when-modal-opens")
          .forEach((element) => {
            element.style.display = "flex";
          });
      }
    }
  };

  document.querySelectorAll("[data-modal-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.getAttribute("data-modal-target");
      const modal = document.getElementById(modalId);
      openModal(modal);
    });
  });

  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = button.closest(".modal");
      closeModal(modal);
    });
  });

  document.querySelectorAll("[data-modal-auto-open]").forEach((modal) => {
    openModal(modal);
  });

  // Prevents game from being played on mobile devices
  matchBreakpoint("(max-width: 1024px)", () => {
    document.querySelectorAll(".modal").forEach((modal) => {
      closeModal(modal);
      const fallback = document.getElementById("modal-fallback");
      openModal(fallback);
    });
  });

  /**
   * Copy to clipboard
   */
  document.querySelectorAll("[data-copy-clipboard]").forEach((element) => {
    element.addEventListener("click", (event) => {
      const data = event.target.getAttribute("data-copy-clipboard");
      navigator.clipboard.writeText(data).then(function () {
        alert("Copied to clipboard: " + data);
      });
    });
  });

  /**
   * Speedometer
   */

  // Map range from [0, 500] to [0, 180]
  function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }

  document.querySelectorAll("[data-speedometer-value]").forEach((element) => {
    const value = element.getAttribute("data-speedometer-value");
    const degree = mapRange(value, 0, 500, 0, 180);
    element.style.transform = `rotate(${degree}deg)`;
  });
});
