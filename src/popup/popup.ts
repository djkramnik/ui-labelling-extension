document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("myButton");
  if (!button) return;

  button.addEventListener("click", () => {
    alert("Button clicked!");
  });
});
