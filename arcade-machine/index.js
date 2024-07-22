document.addEventListener("DOMContentLoaded", (event) => {
  /**
   * Modal
   */
  const openModal = (modal) => {
    if (modal) {
      modal.style.display = "flex";
    }
  };

  const closeModal = (modal) => {
    if (modal) {
      modal.style.display = "none";
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

  // window.addEventListener('click', (event) => {
  //   if (event.target.classList.contains('modal')) {
  //     closeModal(event.target);
  //   }
  // });

  document.querySelectorAll("[data-modal-auto-open]").forEach((modal) => {
    openModal(modal);
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
});
