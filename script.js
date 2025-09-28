const drawer = document.getElementById("drawer");
const toggleBtn = document.getElementById("drawer-toggle");

// Drawer toggle
toggleBtn.addEventListener("click", () => {
  drawer.classList.toggle("open");
});

// Accordion for side containers in drawer
document.querySelectorAll(".drawer-section-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const content = btn.nextElementSibling;
    content.classList.toggle("open");
  });
});

