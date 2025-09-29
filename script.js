// drawer
const drawer = document.getElementById("drawer");
const toggleBtn = document.getElementById("drawer-toggle");

// button
const button =document.querySelector('.pixel-button');

const normalImg = 'assets/unpressedbutton1.png';
const hoverImg = 'assets/unpressedbutton2.png';
const pressedImg = 'assets/pressedbutton.png';

let isHovering = false;
let isPressed = false;
// button

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

function flashPressed(){
  if (isPressed) return;

  isPressed = true;

  button.style.backgroundImage = `url(${pressedImg})`;
  setTimeout(() => {
    button.style.backgroundImage = isHovering ? `url(${hoverImg})` : `url(${normalImg})`;
    isPressed = false;
  }, 350);
}

button.addEventListener('mouseenter', () => {
  isHovering = true;
  button.style.backgroundImage = `url(${hoverImg})`;
});

button.addEventListener('mouseleave', () => {
  isHovering = false;
  button.style.backgroundImage = `url(${normalImg})`;
});

button.addEventListener('mousedown', () => {
  flashPressed();
});
document.addEventListener("keydown", function(event) {
  // " " or "Spacebar" (older browsers) can be used, but " " is standard
  if (event.code === "Space") {
    event.preventDefault(); // optional: prevent page from scrolling
    flashPressed();
  }
});
