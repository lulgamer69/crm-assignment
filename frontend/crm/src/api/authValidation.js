const LOCAL_PART_PATTERN =
  /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_LABEL_PATTERN = /^[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?$/i;

export const isValidEmail = (email) => {
  if (typeof email !== "string") return false;

  const normalizedEmail = email.trim();
  if (new TextEncoder().encode(normalizedEmail).length > 254) return false;

  const separator = normalizedEmail.lastIndexOf("@");
  if (separator < 1) return false;

  const localPart = normalizedEmail.slice(0, separator);
  const domainLabels = normalizedEmail.slice(separator + 1).split(".");

  return (
    new TextEncoder().encode(localPart).length <= 64 &&
    LOCAL_PART_PATTERN.test(localPart) &&
    domainLabels.length >= 2 &&
    domainLabels.every(
      (label) => label.length <= 63 && DOMAIN_LABEL_PATTERN.test(label)
    )
  );
};

