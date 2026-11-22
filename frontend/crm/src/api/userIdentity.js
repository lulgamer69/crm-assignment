export const getUserInitials = (user) => {
  const name = typeof user?.name === "string" ? user.name.trim() : "";
  if (name) {
    return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }
  const localPart = typeof user?.email === "string" ? user.email.split("@")[0] : "";
  const words = localPart.split(/[._+-]+/).filter(Boolean);
  return words.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
};
