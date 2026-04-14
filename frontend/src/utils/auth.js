export function getTokenUsername() {
  const token = localStorage.getItem("jwt");
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return typeof decoded.username === "string" ? decoded.username : null;
  } catch (error) {
    return null;
  }
}
